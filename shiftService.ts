import { VehicleShift, Vehicle, Driver, ViolationRecord } from '../types';

/**
 * Default preset hours for an 11-hour dual shift system:
 * Day shift: 07:00 -> 18:00 (11 hours)
 * Night shift: 19:00 -> 06:00 (11 hours)
 * Handover window: 1 hour between shifts for vehicle inspection, wash, and rest.
 */
export const SHIFT_PRESETS = {
  day_shift: {
    labelAr: 'الوردية الصباحية (11 ساعة)',
    labelEn: 'Day Shift (11h)',
    startTime: '07:00',
    endTime: '18:00',
    hours: 11,
    iconColor: 'text-amber-500',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
  },
  night_shift: {
    labelAr: 'الوردية المسائية (11 ساعة)',
    labelEn: 'Night Shift (11h)',
    startTime: '19:00',
    endTime: '06:00',
    hours: 11,
    iconColor: 'text-indigo-500',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  },
  custom_shift: {
    labelAr: 'وردية مخصصة',
    labelEn: 'Custom Shift',
    startTime: '08:00',
    endTime: '19:00',
    hours: 11,
    iconColor: 'text-emerald-500',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  },
};

/**
 * Checks if a given time (HH:mm) falls within a shift period, handling shifts that cross midnight.
 */
export function isTimeInShift(
  timeStr: string,
  startTimeStr: string,
  endTimeStr: string
): boolean {
  if (!timeStr || !startTimeStr || !endTimeStr) return false;

  const toMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const target = toMinutes(timeStr);
  const start = toMinutes(startTimeStr);
  const end = toMinutes(endTimeStr);

  if (start < end) {
    // Standard daytime interval (e.g. 07:00 to 18:00)
    return target >= start && target <= end;
  } else {
    // Overnight interval crossing midnight (e.g. 19:00 to 06:00 next day)
    return target >= start || target <= end;
  }
}

export interface ShiftMatchResult {
  matchedShift: VehicleShift | null;
  matchedDriverId: string | null;
  shiftType?: VehicleShift['shiftType'];
  explanationAr: string;
  confidence: 'exact' | 'date_only' | 'vehicle_assigned' | 'none';
}

/**
 * Automatically resolves which driver was operating a vehicle during a traffic violation,
 * based on vehicle ID, violation date, and violation time.
 */
export function matchDriverForViolation(
  vehicleId: string,
  violationDate: string,
  violationTime: string | undefined,
  shifts: VehicleShift[],
  vehicle?: Vehicle | null
): ShiftMatchResult {
  if (!vehicleId) {
    return {
      matchedShift: null,
      matchedDriverId: null,
      explanationAr: 'لم يتم تحديد مركبة',
      confidence: 'none',
    };
  }

  // 1. Filter all shifts for this vehicle on this date
  const vehicleDateShifts = shifts.filter(
    (s) => s.vehicleId === vehicleId && s.shiftDate === violationDate
  );

  // If time is provided, find exact match in active or completed shifts
  if (violationTime && vehicleDateShifts.length > 0) {
    for (const shift of vehicleDateShifts) {
      if (isTimeInShift(violationTime, shift.startTime, shift.endTime)) {
        const shiftLabel =
          shift.shiftType === 'day_shift'
            ? 'الوردية الصباحية (11 ساعة)'
            : shift.shiftType === 'night_shift'
            ? 'الوردية المسائية (11 ساعة)'
            : 'وردية مخصصة';
        return {
          matchedShift: shift,
          matchedDriverId: shift.driverId,
          shiftType: shift.shiftType,
          confidence: 'exact',
          explanationAr: `تمت المطابقة التلقائية الدقيقة مع ${shiftLabel} (من ${shift.startTime} إلى ${shift.endTime}) في تاريخ ${violationDate} الساعة ${violationTime}.`,
        };
      }
    }
  }

  // 2. If time wasn't provided or didn't fall exactly, check if only one shift was recorded on that date
  if (vehicleDateShifts.length === 1) {
    const singleShift = vehicleDateShifts[0];
    return {
      matchedShift: singleShift,
      matchedDriverId: singleShift.driverId,
      shiftType: singleShift.shiftType,
      confidence: 'date_only',
      explanationAr: `تمت المطابقة استناداً إلى الوردية الوحيدة المسجلة للمركبة في تاريخ ${violationDate}.`,
    };
  }

  // 3. Fallback to vehicle's currently assigned driver
  if (vehicle?.currentDriverId) {
    return {
      matchedShift: null,
      matchedDriverId: vehicle.currentDriverId,
      confidence: 'vehicle_assigned',
      explanationAr: `لم توجد وردية مطابقة للوقت، تم اختيار السائق الأساسي المسند للمركبة.`,
    };
  }

  return {
    matchedShift: null,
    matchedDriverId: null,
    confidence: 'none',
    explanationAr: `لم يتم العثور على وردية مطابقة لتاريخ ووقت المخالفة على هذه المركبة.`,
  };
}
