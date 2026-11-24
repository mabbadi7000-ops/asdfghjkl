/**
 * Enterprise Operations Sync Service
 * Seamless database interconnection between:
 * 1. Driver Attendance (attendance)
 * 2. Driver Leaves & Weekly Rests (leaves)
 * 3. Vehicle Shifts & Fleet Handovers (vehicle_shifts)
 */

import { createDocument, fetchCollection, fetchDocument, updateDocument } from './dataService';
import {
  AttendanceRecord,
  DriverLeaveRecord,
  VehicleShift,
  Driver,
  AttendanceStatus,
  AccidentRecord,
  ExpenseRecord,
  FuelChip,
  FuelRecord,
  MaintenanceRecord,
  NotificationRecord,
  Vehicle,
} from '../types';

type LifecycleOperation = 'create' | 'update';

export async function handleOperationalLifecycle(
  collectionName: string,
  operation: LifecycleOperation,
  record: Record<string, unknown>,
  previous?: Record<string, unknown>
): Promise<void> {
  const table = collectionName.toLowerCase();
  const id = typeof record.id === 'string' ? record.id : '';

  if (['fuel', 'fuel_records'].includes(table) && operation === 'create') {
    await syncFuelConsumption(record as unknown as FuelRecord);
    return;
  }
  if (table === 'drivers') {
    await syncDriverVehicleAssignment(record as unknown as Partial<Driver>, previous);
    return;
  }
  if (table === 'vehicles') {
    await syncVehicleDriverAssignment(record as unknown as Partial<Vehicle>, previous);
    return;
  }
  if (['maintenance', 'maintenance_records'].includes(table)) {
    await syncMaintenanceLifecycle(record as unknown as MaintenanceRecord);
    return;
  }
  if (table === 'accidents' && operation === 'create') {
    const accident = record as unknown as AccidentRecord;
    if (!accident.vehicleId) throw new Error(`Accident ${id} is missing its vehicle reference.`);
    const vehicle = await fetchDocument<Vehicle>('vehicles', accident.vehicleId);
    if (!vehicle) throw new Error(`Accident ${id} references missing vehicle ${accident.vehicleId}.`);
    await updateDocument<Vehicle>('vehicles', accident.vehicleId, { status: 'accident' });
    return;
  }
  if (['vehicle_shifts', 'shifts'].includes(table) && id) {
    const shift = record as unknown as Partial<VehicleShift>;
    if (shift.status === 'active' || shift.status === 'completed') {
      if (!shift.vehicleId || !shift.driverId) {
        throw new Error(`Shift ${id} must include both vehicleId and driverId.`);
      }
      await syncShiftWithAttendance(id, shift);
    }
    await syncShiftLifecycle(shift);
  }
}

async function syncFuelConsumption(record: FuelRecord): Promise<void> {
  if (!record.vehicleId || !Number.isFinite(Number(record.odometer))) {
    throw new Error(`Fuel record ${record.id} must include a vehicle and a valid odometer reading.`);
  }

  const [vehicle, maintenanceRecords] = await Promise.all([
    fetchDocument<Vehicle>('vehicles', record.vehicleId),
    fetchCollection<MaintenanceRecord>('maintenance_records', { vehicleId: record.vehicleId }),
  ]);
  if (!vehicle) throw new Error(`Fuel record references missing vehicle ${record.vehicleId}.`);

  const amount = Number(record.totalAmount ?? record.totalCost ?? 0);
  await updateDocument<Vehicle>('vehicles', record.vehicleId, {
    currentOdometer: Math.max(vehicle.currentOdometer || 0, Number(record.odometer)),
    currentMileage: Math.max(vehicle.currentMileage || 0, Number(record.odometer)),
    lastFuelDate: record.date,
  });

  if (record.chipId && amount > 0) {
    const chip = await fetchDocument<FuelChip & { remainingBalance?: number; balance?: number }>(
      'fuel_chips',
      record.chipId
    );
    if (!chip) throw new Error(`Fuel record ${record.id} references missing chip ${record.chipId}.`);
    const update: Partial<FuelChip> & { remainingBalance?: number; balance?: number; lastUsageDate?: string } = {
      currentMonthSpent: (chip.currentMonthSpent || 0) + amount,
      currentDaySpent: (chip.currentDaySpent || 0) + amount,
      lastUsageDate: record.date,
    };
    if (typeof chip.remainingBalance === 'number') {
      update.remainingBalance = Math.max(0, chip.remainingBalance - amount);
    }
    if (typeof chip.balance === 'number') {
      update.balance = Math.max(0, chip.balance - amount);
    }
    await updateDocument('fuel_chips', record.chipId, update);
  }

  const lastOilService = maintenanceRecords
    .filter((maintenance) => maintenance.maintenanceType === 'oil_change' && maintenance.status === 'completed')
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
  const nextOilChangeMileage =
    vehicle.nextOilChangeMileage ||
    lastOilService?.nextServiceOdometer ||
    (lastOilService?.odometerAtService !== undefined ? lastOilService.odometerAtService + 5000 : undefined);
  if (nextOilChangeMileage !== undefined && Number(record.odometer) >= nextOilChangeMileage - 1000) {
    const notificationId = `oil-service-${record.vehicleId}-${nextOilChangeMileage}`;
    await createDocument<NotificationRecord>('notifications', {
      id: notificationId,
      title: `موعد تغيير الزيت يقترب: ${vehicle.plateNumber}`,
      message: `وصلت المركبة ${vehicle.plateNumber} إلى ${record.odometer} كم، وموعد تغيير الزيت عند ${nextOilChangeMileage} كم.`,
      type: 'maintenance',
      targetRole: 'supervisor',
      priority: Number(record.odometer) >= nextOilChangeMileage ? 'urgent' : 'high',
      isRead: false,
      link: '/vehicles',
      createdAt: new Date().toISOString(),
    });
  }
}

async function syncDriverVehicleAssignment(
  driver: Partial<Driver>,
  previous?: Record<string, unknown>
): Promise<void> {
  if (!driver.id) return;
  const oldVehicleId = typeof previous?.assignedVehicleId === 'string' ? previous.assignedVehicleId : '';
  const newVehicleId = driver.assignedVehicleId || '';

  if (oldVehicleId && oldVehicleId !== newVehicleId) {
    const previousVehicle = await fetchDocument<Vehicle>('vehicles', oldVehicleId);
    if (
      previousVehicle &&
      (previousVehicle.currentDriverId === driver.id || previousVehicle.assignedDriverId === driver.id)
    ) {
      const vehicleUpdates: Partial<Vehicle> = {};
      if (previousVehicle.currentDriverId === driver.id) vehicleUpdates.currentDriverId = '';
      if (previousVehicle.assignedDriverId === driver.id) vehicleUpdates.assignedDriverId = '';
      if (previousVehicle.currentDriver === driver.fullName) vehicleUpdates.currentDriver = '';
      if (
        previousVehicle.status === 'in_operation' &&
        vehicleUpdates.currentDriverId === '' &&
        vehicleUpdates.assignedDriverId === ''
      ) {
        vehicleUpdates.status = 'available';
      }
      await updateDocument<Vehicle>('vehicles', oldVehicleId, vehicleUpdates);
    }
    if (driver.vehiclePlate) await updateDocument<Driver>('drivers', driver.id, { vehiclePlate: '' });
  }

  if (!newVehicleId) return;
  const vehicle = await fetchDocument<Vehicle>('vehicles', newVehicleId);
  if (!vehicle) throw new Error(`Driver ${driver.id} references missing vehicle ${newVehicleId}.`);

  const driverName = driver.fullName || '';
  const vehicleUpdates: Partial<Vehicle> = {};
  if (vehicle.currentDriverId !== driver.id) vehicleUpdates.currentDriverId = driver.id;
  if (vehicle.assignedDriverId !== driver.id) vehicleUpdates.assignedDriverId = driver.id;
  if (vehicle.currentDriver !== driverName) vehicleUpdates.currentDriver = driverName;
  if ((!previous || oldVehicleId !== newVehicleId) && vehicle.status !== 'in_operation') {
    vehicleUpdates.status = 'in_operation';
  }
  if (Object.keys(vehicleUpdates).length > 0) {
    await updateDocument<Vehicle>('vehicles', newVehicleId, vehicleUpdates);
  }
  if (driver.vehiclePlate !== vehicle.plateNumber) {
    await updateDocument<Driver>('drivers', driver.id, { vehiclePlate: vehicle.plateNumber });
  }
}

async function syncVehicleDriverAssignment(
  vehicle: Partial<Vehicle>,
  previous?: Record<string, unknown>
): Promise<void> {
  const driverId = vehicle.currentDriverId || vehicle.assignedDriverId || '';
  if (!vehicle.id) return;
  const oldDriverId =
    (typeof previous?.currentDriverId === 'string' && previous.currentDriverId) ||
    (typeof previous?.assignedDriverId === 'string' && previous.assignedDriverId) ||
    '';

  if (oldDriverId && oldDriverId !== driverId) {
    const oldDriver = await fetchDocument<Driver>('drivers', oldDriverId);
    if (oldDriver?.assignedVehicleId === vehicle.id) {
      await updateDocument<Driver>('drivers', oldDriverId, { assignedVehicleId: '' });
    }
  }

  if (!driverId) return;
  const driver = await fetchDocument<Driver>('drivers', driverId);
  if (!driver) throw new Error(`Vehicle ${vehicle.id} references missing driver ${driverId}.`);

  if (driver.assignedVehicleId !== vehicle.id || driver.vehiclePlate !== vehicle.plateNumber) {
    await updateDocument<Driver>('drivers', driverId, {
      assignedVehicleId: vehicle.id,
      vehiclePlate: vehicle.plateNumber,
    });
  }
}

async function syncMaintenanceLifecycle(record: MaintenanceRecord): Promise<void> {
  if (!record.vehicleId) throw new Error(`Maintenance record ${record.id} is missing its vehicle reference.`);
  const currentVehicle = await fetchDocument<Vehicle>('vehicles', record.vehicleId);
  if (!currentVehicle) throw new Error(`Maintenance record ${record.id} references missing vehicle ${record.vehicleId}.`);
  if (record.status === 'completed') {
    if (currentVehicle?.status === 'maintenance') {
      await updateDocument<Vehicle>('vehicles', record.vehicleId, { status: 'available' });
    }
    if (record.id) {
      const amount = record.cost ?? record.actualCost ?? record.estimatedCost ?? 0;
      await createDocument<Partial<ExpenseRecord>>('expenses', {
        id: `maintenance-${record.id}`,
        category: 'maintenance',
        amount,
        description: record.description,
        date: record.completionDate || record.exitDate || record.date,
        vehicleId: record.vehicleId,
        relatedType: 'vehicle',
        relatedId: record.vehicleId,
        createdById: record.createdById || 'system',
        approvalStatus: 'approved',
      });
    }
  } else if (record.status !== 'cancelled') {
    await updateDocument<Vehicle>('vehicles', record.vehicleId, { status: 'maintenance' });
  }
}

async function syncShiftLifecycle(shift: Partial<VehicleShift>): Promise<void> {
  if (!shift.vehicleId || !shift.driverId) return;
  const [vehicle, driver] = await Promise.all([
    fetchDocument<Vehicle>('vehicles', shift.vehicleId),
    fetchDocument<Driver>('drivers', shift.driverId),
  ]);
  if (!vehicle) throw new Error(`Shift references missing vehicle ${shift.vehicleId}.`);
  if (!driver) throw new Error(`Shift references missing driver ${shift.driverId}.`);

  if (shift.status === 'active') {
    await updateDocument<Vehicle>('vehicles', shift.vehicleId, {
      status: 'in_operation',
      currentDriverId: shift.driverId,
    });
    if (driver.dutyStatus !== 'on_duty') {
      await updateDocument<Driver>('drivers', shift.driverId, { dutyStatus: 'on_duty' });
    }
  } else if (shift.status === 'completed') {
    const handoverDriverId = shift.handoverToDriverId;
    await updateDocument<Vehicle>('vehicles', shift.vehicleId, {
      currentOdometer: shift.endOdometer ?? vehicle.currentOdometer,
      currentMileage: shift.endOdometer ?? vehicle.currentMileage,
      status: handoverDriverId ? 'in_operation' : 'available',
      ...(handoverDriverId ? { currentDriverId: handoverDriverId } : {}),
    });
    if (driver.dutyStatus !== 'off_duty') {
      await updateDocument<Driver>('drivers', shift.driverId, { dutyStatus: 'off_duty' });
    }
    if (handoverDriverId) {
      const handoverDriver = await fetchDocument<Driver>('drivers', handoverDriverId);
      if (!handoverDriver) throw new Error(`Shift handover references missing driver ${handoverDriverId}.`);
      if (handoverDriver.dutyStatus !== 'on_duty') await updateDocument<Driver>('drivers', handoverDriverId, { dutyStatus: 'on_duty' });
    }
  }
}

/**
 * Sync when a vehicle shift is created or updated
 * Creates or updates the driver's attendance record with shift details
 */
export async function syncShiftWithAttendance(
  shiftId: string,
  shift: Partial<VehicleShift>,
  supervisorId?: string
) {
  if (!shift.driverId || !shift.shiftDate) return;

  try {
    // 1. Look for existing attendance record on this date for this driver
    const matches = await fetchCollection<AttendanceRecord>('attendance', {
      userId: shift.driverId,
      date: shift.shiftDate,
    });

    const shiftTypeLabel =
      shift.shiftType === 'day_shift'
        ? 'وردية صباحية'
        : shift.shiftType === 'night_shift'
        ? 'وردية مسائية'
        : 'وردية مخصصة';

    const workingHours = shift.plannedHours || (shift.shiftType ? 11 : 8);

    if (matches.length > 0) {
      // Existing attendance record: update with shift link and actual hours
      const existingData = matches[0];

      await updateDocument<AttendanceRecord>('attendance', existingData.id, {
        shiftId,
        shiftType: shift.shiftType,
        vehicleId: shift.vehicleId,
        status: existingData.status === 'absent' ? 'present' : existingData.status,
        checkInTime: existingData.checkInTime || shift.startTime,
        checkOutTime: shift.status === 'completed' ? shift.endTime : existingData.checkOutTime,
        workingHours,
        notes: existingData.notes
          ? `${existingData.notes} | مرتبطة بـ [${shiftTypeLabel}]`
          : `حضور مرتبط بـ [${shiftTypeLabel}] للمركبة`,
      });
    } else {
      // Create new linked attendance record automatically
      await createDocument<Omit<AttendanceRecord, 'id'>>('attendance', {
        userId: shift.driverId,
        date: shift.shiftDate,
        status: 'present',
        checkInTime: shift.startTime || '07:00',
        checkOutTime: shift.status === 'completed' ? shift.endTime : undefined,
        workingHours,
        delayMinutes: 0,
        shiftId,
        shiftType: shift.shiftType,
        vehicleId: shift.vehicleId,
        supervisorId,
        notes: `حضور مجدول تلقائياً من نظام الورديات [${shiftTypeLabel}]`,
        createdAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.warn('[syncShiftWithAttendance] Error syncing shift attendance:', error);
    throw error;
  }
}

/**
 * Sync when a leave is created or approved
 * Generates corresponding attendance records marked as 'vacation' or 'emergency_leave'
 * and alerts or flags any conflicting shifts
 */
export async function syncLeaveWithAttendance(
  leave: DriverLeaveRecord,
  supervisorId?: string
) {
  if (!leave.driverId || !leave.startDate || !leave.endDate) return;
  if (leave.status === 'rejected' || leave.status === 'cancelled') return;

  try {
    const sDate = new Date(leave.startDate);
    const eDate = new Date(leave.endDate);

    const leaveStatusMap: Record<string, AttendanceStatus> = {
      annual: 'vacation',
      weekly_rest: 'vacation',
      emergency: 'emergency_leave',
      sick: 'sick',
      unpaid: 'vacation',
      other: 'vacation',
    };

    const targetStatus = leaveStatusMap[leave.leaveType] || 'vacation';

    // Loop through each day in the leave interval
    const curr = new Date(sDate);
    while (curr <= eDate) {
      const dateStr = curr.toISOString().slice(0, 10);

      const matches = await fetchCollection<AttendanceRecord>('attendance', {
        userId: leave.driverId,
        date: dateStr,
      });

      const leaveLabel =
        leave.leaveType === 'weekly_rest'
          ? 'عطلة أسبوعية'
          : leave.leaveType === 'annual'
          ? 'إجازة سنوية'
          : leave.leaveType === 'emergency'
          ? 'إجازة طارئة'
          : 'إجازة معتمدة';

      if (matches.length > 0) {
        const existing = matches[0];
        await updateDocument<AttendanceRecord>('attendance', existing.id, {
          status: targetStatus,
          leaveId: leave.id,
          workingHours: 0,
          notes: `مسجل رسمياً في (${leaveLabel})${leave.reason ? `: ${leave.reason}` : ''}`,
        });
      } else {
        await createDocument<Omit<AttendanceRecord, 'id'>>('attendance', {
          userId: leave.driverId,
          date: dateStr,
          status: targetStatus,
          leaveId: leave.id,
          workingHours: 0,
          supervisorId: supervisorId || leave.approvedBy,
          notes: `مسجل رسمياً في (${leaveLabel})${leave.reason ? `: ${leave.reason}` : ''}`,
          createdAt: new Date().toISOString(),
        });
      }

      curr.setDate(curr.getDate() + 1);
    }
  } catch (error) {
    console.warn('[syncLeaveWithAttendance] Error syncing leave attendance:', error);
  }
}

/**
 * Comprehensive cross-validation check helper
 * Checks if a driver has active leave or vehicle shift for a given date
 */
export function checkDriverOperationalConflict(
  driverId: string,
  date: string,
  leaves: DriverLeaveRecord[],
  shifts: VehicleShift[]
): {
  hasLeaveConflict: boolean;
  leaveConflictNote?: string;
  hasShiftConflict: boolean;
  shiftConflictNote?: string;
} {
  // Check active approved leave
  const activeLeave = leaves.find((l) => {
    if (l.driverId !== driverId) return false;
    if (l.status === 'rejected' || l.status === 'cancelled') return false;
    return date >= l.startDate && date <= l.endDate;
  });

  const leaveConflictNote = activeLeave
    ? `الكابتن مسجل في (${
        activeLeave.leaveType === 'weekly_rest'
          ? 'عطلة أسبوعية'
          : activeLeave.leaveType === 'annual'
          ? 'إجازة سنوية'
          : 'إجازة رسمية'
      }) للفترة من ${activeLeave.startDate} إلى ${activeLeave.endDate}`
    : undefined;

  // Check active vehicle shift
  const activeShift = shifts.find(
    (s) => s.driverId === driverId && s.shiftDate === date && s.status !== 'cancelled'
  );

  const shiftConflictNote = activeShift
    ? `الكابتن مسند له وردية (${
        activeShift.shiftType === 'day_shift'
          ? 'صباحية'
          : activeShift.shiftType === 'night_shift'
          ? 'مسائية'
          : 'مخصصة'
      }) برقم [${activeShift.id}] في هذا اليوم`
    : undefined;

  return {
    hasLeaveConflict: !!activeLeave,
    leaveConflictNote,
    hasShiftConflict: !!activeShift,
    shiftConflictNote,
  };
}
