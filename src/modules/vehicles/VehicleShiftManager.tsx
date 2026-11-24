import React, { useState } from 'react';
import {
  Clock,
  Sun,
  Moon,
  PlusCircle,
  Truck,
  User,
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Gauge,
  Fuel,
  Edit2,
  Trash2,
  Calendar,
  Filter,
  Check,
  Search,
} from 'lucide-react';
import { Table, Column } from '../../components/common/Table';
import { StatCard } from '../../components/common/StatCard';
import { VehicleShift, VehicleShiftType, ShiftStatus, Vehicle, Driver, ViolationRecord } from '../../types';
import { SHIFT_PRESETS } from '../../services/shiftService';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

interface VehicleShiftManagerProps {
  shifts: VehicleShift[];
  vehicles: Vehicle[];
  drivers: Driver[];
  violations?: ViolationRecord[];
  onOpenCreateShift: (vehicle?: Vehicle) => void;
  onEditShift: (shift: VehicleShift) => void;
  onEndShift: (shift: VehicleShift) => void;
  onDeleteShift: (shift: VehicleShift) => void;
}

export const VehicleShiftManager: React.FC<VehicleShiftManagerProps> = ({
  shifts,
  vehicles,
  drivers,
  violations = [],
  onOpenCreateShift,
  onEditShift,
  onEndShift,
  onDeleteShift,
}) => {
  const { currentUser, canAccess } = useAuth();
  const { t, tx } = useLanguage();
  const [selectedShiftFilter, setSelectedShiftFilter] = useState<'all' | 'active' | 'day' | 'night'>('all');

  const getVehicleInfo = (vId: string) => {
    const v = vehicles.find((item) => item.id === vId);
    return v ? `${v.make} ${v.model} (${v.plateNumber})` : vId;
  };

  const getDriverName = (dId: string) => {
    const d = drivers.find((item) => item.id === dId);
    return d ? d.fullName : dId;
  };

  const getShiftBadge = (type: VehicleShiftType) => {
    if (type === 'day_shift') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 w-fit">
          <Sun className="w-3 h-3 text-amber-600" />
          <span>الوردية الصباحية (11h)</span>
        </span>
      );
    }
    if (type === 'night_shift') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-300 flex items-center gap-1 w-fit">
          <Moon className="w-3 h-3 text-indigo-600" />
          <span>الوردية المسائية (11h)</span>
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1 w-fit">
        <Clock className="w-3 h-3 text-emerald-600" />
        <span>وردية مخصصة</span>
      </span>
    );
  };

  const getStatusBadge = (status: ShiftStatus) => {
    switch (status) {
      case 'active':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>قيد التشغيل الميداني</span>
          </span>
        );
      case 'completed':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
            مكتملة ومسلّمة
          </span>
        );
      case 'scheduled':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800">
            مجدولة قادمة
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800">
            ملغاة
          </span>
        );
    }
  };

  // KPI Calculations
  const activeShiftsCount = shifts.filter((s) => s.status === 'active').length;
  const dayShiftsCount = shifts.filter((s) => s.shiftType === 'day_shift').length;
  const nightShiftsCount = shifts.filter((s) => s.shiftType === 'night_shift').length;
  const dualShiftVehiclesCount = vehicles.filter(
    (v) => v.shiftModeEnabled || (v.dayDriverId && v.nightDriverId)
  ).length;

  // Filtered shifts
  const filteredShifts = shifts.filter((s) => {
    if (selectedShiftFilter === 'active') return s.status === 'active';
    if (selectedShiftFilter === 'day') return s.shiftType === 'day_shift';
    if (selectedShiftFilter === 'night') return s.shiftType === 'night_shift';
    return true;
  });

  const columns: Column<VehicleShift>[] = [
    {
      header: 'المركبة ولوحة التسجيل',
      accessor: 'vehicleId',
      sortable: true,
      render: (s) => (
        <div>
          <span className="font-bold text-slate-900 block text-xs">
            {getVehicleInfo(s.vehicleId)}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            {s.shiftDate}
          </span>
        </div>
      ),
    },
    {
      header: 'نوع الوردية (11 ساعة)',
      accessor: 'shiftType',
      sortable: true,
      render: (s) => (
        <div className="space-y-1">
          {getShiftBadge(s.shiftType)}
          <span className="text-[10px] text-slate-600 font-mono block">
            {s.startTime} ⬅️ {s.endTime} ({s.plannedHours || 11} ساعة)
          </span>
        </div>
      ),
    },
    {
      header: 'المندوب المستلم (قائد المركبة)',
      accessor: 'driverId',
      sortable: true,
      render: (s) => {
        // Find if this shift had traffic fines during its execution window
        const relatedFines = violations.filter(
          (v) => v.shiftId === s.id || (v.driverId === s.driverId && v.date === s.shiftDate)
        );
        return (
          <div>
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="font-bold text-slate-900 text-xs">
                {getDriverName(s.driverId)}
              </span>
            </div>
            {relatedFines.length > 0 ? (
              <span className="text-[10px] text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 mt-1 inline-flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-rose-600" />
                <span>{relatedFines.length} مخالفة مرورية بالوردية</span>
              </span>
            ) : (
              <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
                سجل وردية نظيف ✓
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: 'التسليم للمندوب الزميل',
      accessor: 'handoverToDriverId',
      render: (s) => (
        <div>
          {s.handoverToDriverId ? (
            <div className="flex items-center gap-1 text-slate-800 text-xs">
              <ArrowRightLeft className="w-3 h-3 text-emerald-600 shrink-0" />
              <span className="font-semibold">{getDriverName(s.handoverToDriverId)}</span>
            </div>
          ) : (
            <span className="text-slate-400 text-xs">—</span>
          )}
          {s.handoverCheckNotes && (
            <span className="text-[10px] text-slate-500 block truncate max-w-xs">
              {s.handoverCheckNotes}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'قراءات العداد والوقود',
      accessor: 'startOdometer',
      render: (s) => (
        <div className="space-y-0.5 font-mono text-xs">
          <span className="text-slate-700 block">
            البدء: <strong>{s.startOdometer?.toLocaleString() || 0}</strong> كم
          </span>
          {s.endOdometer ? (
            <span className="text-emerald-700 font-bold block">
              التسليم: {s.endOdometer.toLocaleString()} كم ({s.endOdometer - (s.startOdometer || 0)} كم مقطوعة)
            </span>
          ) : (
            <span className="text-slate-400 text-[10px] block">
              الوقود: {s.fuelLevel === 'full' ? 'فل 100%' : s.fuelLevel || 'عادي'}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'حالة الوردية',
      accessor: 'status',
      sortable: true,
      render: (s) => getStatusBadge(s.status),
    },
    {
      header: 'الإجراءات',
      className: 'text-end',
      render: (s) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          {s.status === 'active' && (
            <button
              onClick={() => onEndShift(s)}
              title="إغلاق وتسليم الوردية للمندوب الزميل"
              className="px-2.5 py-1 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer transition-colors flex items-center gap-1"
            >
              <Check className="w-3 h-3" />
              <span>تسليم الوردية</span>
            </button>
          )}
          <button
            onClick={() => onEditShift(s)}
            title="تعديل بيانات الوردية"
            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          {canAccess(['general_manager', 'operations_manager']) && (
            <button
              onClick={() => onDeleteShift(s)}
              title="حذف الوردية"
              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner and Actions */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-600" />
              <span>إدارة ورديات المركبات الثنائية (11 ساعة لكل مندوب)</span>
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              ربط آلي مع المخالفات المرورية
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            تشغيل المركبة المزدوج مع مندوبين اثنين (11 ساعة للوردية الصباحية و11 ساعة للوردية المسائية). يحدد النظام بدقة من كان يقود المركبة لحظة حدوث أي مخالفة مرورية لتقييدها عليه مباشرة.
          </p>
        </div>

        <button
          onClick={() => onOpenCreateShift()}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer self-start md:self-auto shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>إسناد وردية جديدة (11 ساعة)</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="الورديات النشطة حالياً"
          value={activeShiftsCount}
          subtitle="مركبات قيد التوصيل الميداني"
          icon={Clock}
          colorScheme="emerald"
        />
        <StatCard
          title="مركبات بنظام الورديات المزدوجة"
          value={dualShiftVehiclesCount}
          subtitle="سيارات مسندة لمندوبين اثنين"
          icon={Truck}
          colorScheme="blue"
        />
        <StatCard
          title="ورديات الفترة الصباحية (11h)"
          value={dayShiftsCount}
          subtitle="من 07:00 ص إلى 06:00 م"
          icon={Sun}
          colorScheme="amber"
        />
        <StatCard
          title="ورديات الفترة المسائية (11h)"
          value={nightShiftsCount}
          subtitle="من 07:00 م إلى 06:00 ص"
          icon={Moon}
          colorScheme="indigo"
        />
      </div>

      {/* Filter Quick Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 overflow-x-auto">
        {[
          { id: 'all', label: `كافة الورديات المسجلة (${shifts.length})` },
          { id: 'active', label: `الورديات الميدانية النشطة (${activeShiftsCount})` },
          { id: 'day', label: `الورديات الصباحية 11h (${dayShiftsCount})` },
          { id: 'night', label: `الورديات المسائية 11h (${nightShiftsCount})` },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setSelectedShiftFilter(f.id as any)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedShiftFilter === f.id
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <Table
        data={filteredShifts}
        columns={columns}
        keyExtractor={(item) => item.id}
        searchPlaceholder="بحث برقم اللوحة، المندوب، الوردية، أو التاريخ..."
        searchFilter={(item, query) =>
          getVehicleInfo(item.vehicleId).toLowerCase().includes(query) ||
          getDriverName(item.driverId).toLowerCase().includes(query) ||
          item.shiftDate.includes(query) ||
          item.shiftType.toLowerCase().includes(query)
        }
        filterOptions={[
          { label: 'الوردية الصباحية', filterFn: (s) => s.shiftType === 'day_shift' },
          { label: 'الوردية المسائية', filterFn: (s) => s.shiftType === 'night_shift' },
          { label: 'قيد التشغيل', filterFn: (s) => s.status === 'active' },
          { label: 'مكتملة ومسلّمة', filterFn: (s) => s.status === 'completed' },
        ]}
        exportFileName="fleetops_vehicle_shifts_11h"
        title="سجل ورديات المركبات (11 ساعة × مندوبين)"
        subtitle="توثيق تسليم المركبات والربط المباشر مع المسؤولية القانونية والمخالفات المرورية"
      />
    </div>
  );
};
