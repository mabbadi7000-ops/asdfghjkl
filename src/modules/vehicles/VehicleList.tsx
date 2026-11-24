import React, { useState, useEffect } from 'react';
import {
  Truck,
  PlusCircle,
  Eye,
  Edit2,
  Trash2,
  AlertTriangle,
  Wrench,
  CheckCircle2,
  Navigation,
  Sparkles,
  BarChart3,
  Layers,
  Radio,
  Gauge,
} from 'lucide-react';
import { Table, Column } from '../../components/common/Table';
import { StatCard } from '../../components/common/StatCard';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { DeleteWithPasswordModal } from '../../components/common/DeleteWithPasswordModal';
import { VehicleDetailModal } from './VehicleDetailModal';
import { VehicleFormModal } from './VehicleFormModal';
import { SmartVehicleTracking } from './SmartVehicleTracking';
import { PredictiveMaintenanceAlerts } from './PredictiveMaintenanceAlerts';
import { AssetConsumptionAnalytics } from './AssetConsumptionAnalytics';
import {
  Vehicle,
  VehicleStatus,
  Driver,
  FuelRecord,
  MaintenanceRecord,
  VehicleShift,
  ViolationRecord,
} from '../../types';
import {
  subscribeToCollection,
  createDocument,
  updateDocument,
  deleteDocument,
  softDeleteDocumentWithPassword,
  fetchCollection,
  appendSessionToken,
} from '../../services/dataService';
import { logAuditAction } from '../../services/auditService';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { VehicleShiftManager } from './VehicleShiftManager';
import { ShiftFormModal } from './ShiftFormModal';
import { Clock } from 'lucide-react';

export const VehicleList: React.FC = () => {
  const { currentUser, canAccess } = useAuth();
  const { t, tx, language } = useLanguage();

  const [activeSubTab, setActiveSubTab] = useState<'fleet' | 'shifts' | 'tracking' | 'predictive' | 'analytics'>('fleet');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [fuelRecords, setFuelRecords] = useState<FuelRecord[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [shifts, setShifts] = useState<VehicleShift[]>([]);
  const [violations, setViolations] = useState<ViolationRecord[]>([]);

  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Shift Modals State
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<VehicleShift | null>(null);
  const [shiftVehiclePreselect, setShiftVehiclePreselect] = useState<Vehicle | null>(null);

  useEffect(() => {
    const unsubVehicles = subscribeToCollection<Vehicle>('vehicles', setVehicles);
    const unsubDrivers = subscribeToCollection<Driver>('drivers', setDrivers);
    const unsubFuel = subscribeToCollection<FuelRecord>('fuel_records', setFuelRecords);
    const unsubMaint = subscribeToCollection<MaintenanceRecord>('maintenance', setMaintenanceRecords);
    const unsubShifts = subscribeToCollection<VehicleShift>('vehicle_shifts', setShifts);
    const unsubViolations = subscribeToCollection<ViolationRecord>('violations', setViolations);

    return () => {
      unsubVehicles();
      unsubDrivers();
      unsubFuel();
      unsubMaint();
      unsubShifts();
      unsubViolations();
    };
  }, []);

  const handleCreateOrUpdate = async (data: Partial<Vehicle>): Promise<string> => {
    if (editingVehicle) {
      await updateDocument<Vehicle>('vehicles', editingVehicle.id, data);
      await logAuditAction(
        currentUser,
        'UPDATE_VEHICLE',
        'vehicles',
        editingVehicle.id,
        `تعديل بيانات ومستندات المركبة لوحة ${data.plateNumber || editingVehicle.plateNumber}`
      );
      return editingVehicle.id;
    }
    const id = await createDocument<Omit<Vehicle, 'id'>>('vehicles', data as any);
    await logAuditAction(
      currentUser,
      'CREATE_VEHICLE',
      'vehicles',
      id,
      `إضافة مركبة جديدة ومستنداتها للأسطول: ${data.plateNumber}`
    );
    return id;
  };

  const handleCreateOrUpdateShift = async (data: Partial<VehicleShift>) => {
    if (editingShift) {
      await updateDocument<VehicleShift>('vehicle_shifts', editingShift.id, {
        ...data,
        updatedAt: new Date().toISOString(),
      });

      await logAuditAction(
        currentUser,
        'UPDATE_VEHICLE_SHIFT',
        'vehicle_shifts',
        editingShift.id,
        `تعديل وردية المركبة ${data.vehicleId} للمندوب ${data.driverId}`
      );
    } else {
      const shiftId = await createDocument<Omit<VehicleShift, 'id'>>('vehicle_shifts', {
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any);

      await logAuditAction(
        currentUser,
        'CREATE_VEHICLE_SHIFT',
        'vehicle_shifts',
        shiftId,
        `تسجيل وإسناد وردية (11 ساعة) للمركبة ${data.vehicleId} مع المندوب ${data.driverId}`
      );
    }
    setEditingShift(null);
  };

  const handleEndShift = async (shift: VehicleShift) => {
    const endOdo = (shift.startOdometer || 0) + 120; // Default estimate or prompt
    await updateDocument<VehicleShift>('vehicle_shifts', shift.id, {
      status: 'completed',
      endOdometer: endOdo,
      updatedAt: new Date().toISOString(),
    });

    // If handover driver exists, switch vehicle's current driver to partner
    if (shift.vehicleId && shift.handoverToDriverId) {
      await updateDocument<Vehicle>('vehicles', shift.vehicleId, {
        currentDriverId: shift.handoverToDriverId,
        currentOdometer: endOdo,
        status: 'in_operation',
        updatedAt: new Date().toISOString(),
      });
    }

    await logAuditAction(
      currentUser,
      'COMPLETE_VEHICLE_SHIFT',
      'vehicle_shifts',
      shift.id,
      `إنهاء وتسليم وردية المركبة للمندوب الزميل`
    );
  };

  const handleDeleteShift = async (shift: VehicleShift) => {
    await deleteDocument('vehicle_shifts', shift.id);
    await logAuditAction(
      currentUser,
      'DELETE_VEHICLE_SHIFT',
      'vehicle_shifts',
      shift.id,
      `حذف وردية مركبة مسجلة`
    );
  };

  const handleDeleteConfirm = async (reason: string) => {
    if (!vehicleToDelete || !currentUser) return;
    setDeleteLoading(true);
    await softDeleteDocumentWithPassword(
      'vehicles',
      vehicleToDelete.id,
      `المركبة: ${vehicleToDelete.make} ${vehicleToDelete.model} (${vehicleToDelete.plateNumber})`,
      vehicleToDelete,
      currentUser,
      reason,
      `سنة الصنع: ${vehicleToDelete.year} • الفرع: ${vehicleToDelete.branchId} • الحالة: ${vehicleToDelete.status}`
    );
    await logAuditAction(
      currentUser,
      'SOFT_DELETE_VEHICLE',
      'vehicles',
      vehicleToDelete.id,
      `حذف ونقل المركبة ${vehicleToDelete.plateNumber} لسلة المحذوفات (${reason})`
    );
    setDeleteLoading(false);
    setVehicleToDelete(null);
  };

  const inOperationCount = vehicles.filter((v) => v.status === 'in_operation').length;
  const availableCount = vehicles.filter((v) => v.status === 'available').length;
  const maintenanceCount = vehicles.filter((v) => v.status === 'maintenance').length;

  const nowTime = new Date().getTime();

  const statusBadges: Record<VehicleStatus, { label: string; color: string }> = {
    available: { label: tx('متاحة', 'Available'), color: 'bg-blue-100 text-blue-800' },
    assigned: { label: tx('مسندة', 'Assigned'), color: 'bg-indigo-100 text-indigo-800' },
    in_operation: { label: tx('بالخدمة', 'In Operation'), color: 'bg-emerald-100 text-emerald-800' },
    maintenance: { label: tx('بالصيانة', 'In Maintenance'), color: 'bg-amber-100 text-amber-800' },
    accident: { label: tx('حادث', 'Accident'), color: 'bg-rose-100 text-rose-800' },
    inactive: { label: tx('غير نشطة', 'Inactive'), color: 'bg-slate-100 text-slate-700' },
    sold: { label: tx('مباعة', 'Sold'), color: 'bg-slate-200 text-slate-600' },
  };

  const columns: Column<Vehicle>[] = [
    {
      header: tx('رقم اللوحة', 'Plate Number'),
      accessor: 'plateNumber',
      sortable: true,
      render: (v) => (
        <div className="flex items-center gap-2">
          {v.photoUrl ? (
            <img
              src={appendSessionToken(v.photoUrl)}
              alt={v.plateNumber}
              className="w-8 h-8 rounded-xl object-cover border border-slate-200 shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
              <Truck className="w-4 h-4" />
            </div>
          )}
          <div>
            <p className="font-black text-slate-900 tracking-wider text-xs font-mono">{v.plateNumber}</p>
            <p className="text-[10px] text-slate-400 font-mono">{v.vin}</p>
          </div>
        </div>
      ),
    },
    {
      header: tx('النوع والموديل', 'Make & Model'),
      accessor: 'make',
      sortable: true,
      render: (v) => (
        <span className="font-semibold text-slate-800">
          {v.make} {v.model} ({v.year})
        </span>
      ),
    },
    {
      header: tx('العداد الحالي', 'Current Odometer'),
      accessor: 'currentOdometer',
      sortable: true,
      render: (v) => (
        <span className="font-mono font-bold text-slate-700">
          {v.currentOdometer.toLocaleString()} {t('km')}
        </span>
      ),
    },
    {
      header: tx('السائق / الورديات', 'Driver / Shifts'),
      accessor: 'currentDriverId',
      render: (v) => {
        if (v.shiftModeEnabled) {
          const dayD = drivers.find((d) => d.id === v.dayDriverId);
          const nightD = drivers.find((d) => d.id === v.nightDriverId);
          return (
            <div className="space-y-1">
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 block w-fit">
                ورديات مزدوجة (11h)
              </span>
              <div className="text-[11px] space-y-0.5">
                <p className="text-amber-900 font-bold flex items-center gap-1">
                  <span>☀️ {dayD?.fullName || 'شاغر صباحي'}</span>
                </p>
                <p className="text-indigo-900 font-bold flex items-center gap-1">
                  <span>🌙 {nightD?.fullName || 'شاغر مسائي'}</span>
                </p>
              </div>
            </div>
          );
        }

        const driver = drivers.find((d) => d.id === v.currentDriverId);
        return (
          <div>
            <p className="font-semibold text-slate-800 text-xs">{driver?.fullName || '—'}</p>
            {driver?.phone && <p className="text-[10px] text-slate-400 font-mono">{driver.phone}</p>}
          </div>
        );
      },
    },
    {
      header: tx('نوع الوقود', 'Fuel Type'),
      accessor: 'fuelType',
      render: (v) => {
        const fuelLabels: Record<string, string> = {
          gasoline_91: 'بنزين 91',
          gasoline_95: 'بنزين 95',
          diesel: 'ديزل',
          hybrid: 'هايبرد',
          electric: 'كهرباء',
        };
        return (
          <span className="text-xs text-slate-700 font-medium">
            {fuelLabels[v.fuelType] || v.fuelType}
          </span>
        );
      },
    },
    {
      header: tx('انتهاء الاستمارة', 'Istemara Expiry'),
      accessor: 'istemaraExpiryDate',
      sortable: true,
      render: (v) => {
        const expTime = new Date(v.istemaraExpiryDate).getTime();
        const daysLeft = Math.ceil((expTime - nowTime) / (1000 * 60 * 60 * 24));
        const isExpiring = daysLeft <= 30 && daysLeft >= 0;
        const isExpired = daysLeft < 0;

        return (
          <div>
            <span className="font-mono text-xs block text-slate-700">{v.istemaraExpiryDate}</span>
            {isExpired ? (
              <span className="text-[10px] text-rose-600 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                <span>{tx('منتهية', 'Expired')}</span>
              </span>
            ) : isExpiring ? (
              <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                <span>{tx(`متبقي ${daysLeft} يوم`, `${daysLeft} days left`)}</span>
              </span>
            ) : null}
          </div>
        );
      },
    },
    {
      header: tx('الحالة', 'Status'),
      accessor: 'status',
      sortable: true,
      render: (v) => (
        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${statusBadges[v.status]?.color}`}>
          {statusBadges[v.status]?.label || v.status}
        </span>
      ),
    },
    {
      header: tx('الإجراءات', 'Actions'),
      className: 'text-end',
      render: (v) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedVehicle(v);
              setIsDetailOpen(true);
            }}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title={t('view')}
          >
            <Eye className="w-4 h-4" />
          </button>
          {canAccess(['general_manager', 'operations_manager']) && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingVehicle(v);
                  setIsFormOpen(true);
                }}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title={t('edit')}
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setVehicleToDelete(v);
                }}
                className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                title={t('delete')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {tx('إدارة وتتبع أسطول المركبات', 'Fleet Vehicle Management & Telemetry')}
            </h2>
            <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full flex items-center gap-1">
              <Radio className="w-3 h-3 animate-pulse" />
              <span>{tx('تتبع ذكي وتحليل استهلاك', 'Smart Tracking & AI Wear')}</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {tx(
              'متابعة أسطول المركبات، قراءات العدادات، تتبع استهلاك الأصول والتنبيهات الاستباقية للصيانة الدورية.',
              'Track vehicle fleet, odometer readings, asset wear analytics, and proactive maintenance alerts.'
            )}
          </p>
        </div>

        {canAccess(['general_manager', 'operations_manager']) && (
          <button
            onClick={() => {
              setEditingVehicle(null);
              setIsFormOpen(true);
            }}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{tx('إضافة مركبة جديدة', 'Add New Vehicle')}</span>
          </button>
        )}
      </div>

      {/* Sub-tabs Navigation */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 overflow-x-auto">
        {[
          { id: 'fleet', label: tx(`أسطول المركبات (${vehicles.length})`, `Vehicle Fleet (${vehicles.length})`), icon: Truck },
          { id: 'shifts', label: tx(`إدارة الورديات (11h) (${shifts.length})`, `Vehicle Shifts (11h) (${shifts.length})`), icon: Clock },
          { id: 'tracking', label: tx('التتبع الذكي واستهلاك الأصول', 'Smart Tracking & Telemetry'), icon: Navigation },
          { id: 'predictive', label: tx('تنبيهات الصيانة الاستباقية', 'Predictive Maintenance Alerts'), icon: Sparkles },
          { id: 'analytics', label: tx('تحليل الاستهلاك والتكلفة/كم', 'Asset Consumption & CPK'), icon: BarChart3 },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeSubTab === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SUB-TAB 1: VEHICLE FLEET & TABLE */}
      {activeSubTab === 'fleet' && (
        <div className="space-y-6">
          {/* KPI Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              title={tx('إجمالي المركبات', 'Total Vehicles')}
              value={vehicles.length}
              subtitle={tx('أسطول الشركة المسجل', 'Registered fleet')}
              icon={Truck}
              colorScheme="blue"
            />
            <StatCard
              title={tx('قيد التشغيل', 'In Operation')}
              value={inOperationCount}
              subtitle={tx('توصيل مباشر بالخدمة', 'Active deliveries')}
              icon={CheckCircle2}
              colorScheme="emerald"
            />
            <StatCard
              title={tx('متاحة للإسناد', 'Available')}
              value={availableCount}
              subtitle={tx('جاهزة بانتظار سائق', 'Ready for assignment')}
              icon={Truck}
              colorScheme="slate"
            />
            <StatCard
              title={tx('في الصيانة والورش', 'In Maintenance')}
              value={maintenanceCount}
              subtitle={tx('أوامر إصلاح نشطة', 'Active work orders')}
              icon={Wrench}
              colorScheme="amber"
            />
          </div>

          {/* Table */}
          <Table
            data={vehicles}
            columns={columns}
            keyExtractor={(item) => item.id}
            searchPlaceholder={tx('بحث برقم اللوحة أو الموديل أو رقم الهيكل...', 'Search by plate, model, or VIN...')}
            searchFilter={(item, query) =>
              item.plateNumber.toLowerCase().includes(query) ||
              item.make.toLowerCase().includes(query) ||
              item.model.toLowerCase().includes(query) ||
              item.vin.toLowerCase().includes(query)
            }
            filterOptions={[
              { label: tx('بالخدمة (In Operation)', 'In Operation'), filterFn: (v) => v.status === 'in_operation' },
              { label: tx('متاحة (Available)', 'Available'), filterFn: (v) => v.status === 'available' },
              { label: tx('في الصيانة (Maintenance)', 'In Maintenance'), filterFn: (v) => v.status === 'maintenance' },
              { label: tx('حادث (Accident)', 'Accident'), filterFn: (v) => v.status === 'accident' },
            ]}
            onRowClick={(item) => {
              setSelectedVehicle(item);
              setIsDetailOpen(true);
            }}
            exportFileName="fleetops_vehicles"
          />
        </div>
      )}

      {/* SUB-TAB: VEHICLE SHIFTS MANAGER (11h) */}
      {activeSubTab === 'shifts' && (
        <VehicleShiftManager
          shifts={shifts}
          vehicles={vehicles}
          drivers={drivers}
          violations={violations}
          onOpenCreateShift={(v) => {
            setShiftVehiclePreselect(v || null);
            setEditingShift(null);
            setIsShiftModalOpen(true);
          }}
          onEditShift={(s) => {
            setEditingShift(s);
            setIsShiftModalOpen(true);
          }}
          onEndShift={handleEndShift}
          onDeleteShift={handleDeleteShift}
        />
      )}

      {/* SUB-TAB 2: SMART VEHICLE TRACKING */}
      {activeSubTab === 'tracking' && (
        <SmartVehicleTracking
          vehicles={vehicles}
          drivers={drivers}
          fuelRecords={fuelRecords}
          onSelectVehicle={(v) => {
            setSelectedVehicle(v);
            setIsDetailOpen(true);
          }}
        />
      )}

      {/* SUB-TAB 3: PREDICTIVE MAINTENANCE ALERTS */}
      {activeSubTab === 'predictive' && (
        <PredictiveMaintenanceAlerts
          vehicles={vehicles}
          maintenanceRecords={maintenanceRecords}
        />
      )}

      {/* SUB-TAB 4: ASSET CONSUMPTION ANALYTICS */}
      {activeSubTab === 'analytics' && (
        <AssetConsumptionAnalytics
          vehicles={vehicles}
          fuelRecords={fuelRecords}
          maintenanceRecords={maintenanceRecords}
        />
      )}

      {/* Modals */}
      <VehicleDetailModal
        vehicle={selectedVehicle}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedVehicle(null);
        }}
      />

      <VehicleFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingVehicle(null);
        }}
        onSubmit={handleCreateOrUpdate}
        initialData={editingVehicle}
      />

      <ShiftFormModal
        isOpen={isShiftModalOpen}
        onClose={() => {
          setIsShiftModalOpen(false);
          setEditingShift(null);
          setShiftVehiclePreselect(null);
        }}
        onSubmit={handleCreateOrUpdateShift}
        preselectedVehicle={shiftVehiclePreselect}
        editingShift={editingShift}
      />

      <DeleteWithPasswordModal
        isOpen={!!vehicleToDelete}
        onClose={() => setVehicleToDelete(null)}
        onConfirm={handleDeleteConfirm}
        itemTitle={`المركبة: ${vehicleToDelete?.plateNumber || ''}`}
        itemType={language === 'ar' ? 'مركبة' : 'Vehicle'}
        warningNote={
          language === 'ar'
            ? 'سيتم حفظ بيانات المركبة في إدارة المحذوفات للمدير العام مع إمكانية استعادتها لاحقاً.'
            : 'Vehicle will be archived in the Recycle Bin and can be restored by the General Manager.'
        }
        loading={deleteLoading}
      />
    </div>
  );
};
