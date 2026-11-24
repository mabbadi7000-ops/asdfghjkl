import React, { useState, useEffect } from 'react';
import {
  Clock,
  Sun,
  Moon,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  PlusCircle,
  Truck,
  User,
  Gauge,
  ArrowRightLeft,
  Fuel,
  Info,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { VehicleShift, VehicleShiftType, ShiftStatus, Vehicle, Driver, DriverLeaveRecord } from '../../types';
import { fetchCollection } from '../../services/dataService';
import { SHIFT_PRESETS } from '../../services/shiftService';
import { useLanguage } from '../../context/LanguageContext';

interface ShiftFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (shiftData: Partial<VehicleShift>) => Promise<void>;
  preselectedVehicle?: Vehicle | null;
  editingShift?: VehicleShift | null;
}

export const ShiftFormModal: React.FC<ShiftFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  preselectedVehicle,
  editingShift,
}) => {
  const { t, tx } = useLanguage();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(false);

  const [vehicleId, setVehicleId] = useState(preselectedVehicle?.id || '');
  const [driverId, setDriverId] = useState('');
  const [shiftType, setShiftType] = useState<VehicleShiftType>('day_shift');
  const [shiftDate, setShiftDate] = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState(SHIFT_PRESETS.day_shift.startTime);
  const [endTime, setEndTime] = useState(SHIFT_PRESETS.day_shift.endTime);
  const [plannedHours, setPlannedHours] = useState(11);
  const [startOdometer, setStartOdometer] = useState<number>(0);
  const [endOdometer, setEndOdometer] = useState<number | undefined>(undefined);
  const [status, setStatus] = useState<ShiftStatus>('active');
  const [fuelLevel, setFuelLevel] = useState<'full' | 'half' | 'quarter' | 'empty'>('full');
  const [handoverToDriverId, setHandoverToDriverId] = useState('');
  const [handoverCheckNotes, setHandoverCheckNotes] = useState('');
  const [notes, setNotes] = useState('');

  const [leaves, setLeaves] = useState<DriverLeaveRecord[]>([]);
  const [leaveWarning, setLeaveWarning] = useState<string | null>(null);

  useEffect(() => {
    async function loadMeta() {
      const [v, d, l] = await Promise.all([
        fetchCollection<Vehicle>('vehicles'),
        fetchCollection<Driver>('drivers'),
        fetchCollection<DriverLeaveRecord>('leaves'),
      ]);
      setVehicles(v);
      setDrivers(d);
      setLeaves(l);

      if (!editingShift) {
        const initialVId = preselectedVehicle?.id || (v.length > 0 ? v[0].id : '');
        setVehicleId(initialVId);
        const selV = v.find((item) => item.id === initialVId);
        if (selV) {
          setStartOdometer(selV.currentOdometer || 0);
          if (selV.dayDriverId) {
            setDriverId(selV.dayDriverId);
          } else if (selV.currentDriverId) {
            setDriverId(selV.currentDriverId);
          }
          if (selV.nightDriverId) {
            setHandoverToDriverId(selV.nightDriverId);
          }
        }
      }
    }
    loadMeta();
  }, [isOpen, preselectedVehicle]);

  useEffect(() => {
    if (editingShift) {
      setVehicleId(editingShift.vehicleId);
      setDriverId(editingShift.driverId);
      setShiftType(editingShift.shiftType);
      setShiftDate(editingShift.shiftDate);
      setStartTime(editingShift.startTime);
      setEndTime(editingShift.endTime);
      setPlannedHours(editingShift.plannedHours || 11);
      setStartOdometer(editingShift.startOdometer || 0);
      setEndOdometer(editingShift.endOdometer);
      setStatus(editingShift.status);
      setFuelLevel(editingShift.fuelLevel || 'full');
      setHandoverToDriverId(editingShift.handoverToDriverId || '');
      setHandoverCheckNotes(editingShift.handoverCheckNotes || '');
      setNotes(editingShift.notes || '');
    } else {
      // reset defaults
      const preset = SHIFT_PRESETS.day_shift;
      setShiftType('day_shift');
      setStartTime(preset.startTime);
      setEndTime(preset.endTime);
      setPlannedHours(preset.hours);
      setStatus('active');
      setFuelLevel('full');
      setHandoverCheckNotes('');
      setNotes('');
    }
  }, [editingShift, isOpen]);

  const handleShiftTypeChange = (type: VehicleShiftType) => {
    setShiftType(type);
    const preset = SHIFT_PRESETS[type];
    if (preset) {
      setStartTime(preset.startTime);
      setEndTime(preset.endTime);
      setPlannedHours(preset.hours);
    }
    // Auto-pick day or night driver if configured on vehicle
    const currentV = vehicles.find((v) => v.id === vehicleId);
    if (currentV) {
      if (type === 'day_shift' && currentV.dayDriverId) {
        setDriverId(currentV.dayDriverId);
        if (currentV.nightDriverId) setHandoverToDriverId(currentV.nightDriverId);
      } else if (type === 'night_shift' && currentV.nightDriverId) {
        setDriverId(currentV.nightDriverId);
        if (currentV.dayDriverId) setHandoverToDriverId(currentV.dayDriverId);
      }
    }
  };

  const handleVehicleChange = (vId: string) => {
    setVehicleId(vId);
    const selV = vehicles.find((v) => v.id === vId);
    if (selV) {
      setStartOdometer(selV.currentOdometer || 0);
      if (shiftType === 'day_shift' && selV.dayDriverId) {
        setDriverId(selV.dayDriverId);
        if (selV.nightDriverId) setHandoverToDriverId(selV.nightDriverId);
      } else if (shiftType === 'night_shift' && selV.nightDriverId) {
        setDriverId(selV.nightDriverId);
        if (selV.dayDriverId) setHandoverToDriverId(selV.dayDriverId);
      } else if (selV.currentDriverId) {
        setDriverId(selV.currentDriverId);
      }
    }
  };

  // Check if selected driver has an active or approved leave on shiftDate
  useEffect(() => {
    if (!driverId || !shiftDate || leaves.length === 0) {
      setLeaveWarning(null);
      return;
    }
    const activeLeave = leaves.find((l) => {
      if (l.driverId !== driverId) return false;
      if (l.status === 'rejected' || l.status === 'cancelled') return false;
      return shiftDate >= l.startDate && shiftDate <= l.endDate;
    });

    if (activeLeave) {
      const typeLabel =
        activeLeave.leaveType === 'annual'
          ? 'إجازة سنوية'
          : activeLeave.leaveType === 'weekly_rest'
          ? 'عطلة أسبوعية'
          : activeLeave.leaveType === 'emergency'
          ? 'إجازة طارئة'
          : activeLeave.leaveType === 'sick'
          ? 'إجازة مرضية'
          : 'إجازة معتمدة';
      setLeaveWarning(`⚠️ تنبيه تعارض: هذا المندوب في (${typeLabel}) من ${activeLeave.startDate} إلى ${activeLeave.endDate}.`);
    } else {
      setLeaveWarning(null);
    }
  }, [driverId, shiftDate, leaves]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId || !driverId) return;

    setLoading(true);
    try {
      await onSubmit({
        vehicleId,
        driverId,
        shiftType,
        shiftDate,
        startTime,
        endTime,
        plannedHours: Number(plannedHours),
        startOdometer: Number(startOdometer),
        endOdometer: endOdometer ? Number(endOdometer) : undefined,
        status,
        fuelLevel,
        handoverToDriverId: handoverToDriverId || undefined,
        handoverCheckNotes,
        notes,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingShift ? 'تعديل بيانات وردية المركبة' : 'تسجيل وإسناد وردية مركبة جديدة (11 ساعة)'}
      subtitle="نظام الورديات المزدوجة: تشغيل المركبة مع مندوبين كل وردية 11 ساعة مع التوثيق والمطابقة اللحظية للمخالفات"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Shift Type Selection Cards */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1.5">
            نوع فترة الوردية (11 ساعة لكل فترة) *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {[
              {
                id: 'day_shift',
                label: 'الوردية الصباحية (11h)',
                timeRange: '07:00 ص - 06:00 م',
                icon: Sun,
                color: 'amber',
                desc: 'مندوب الفترة النهارية',
              },
              {
                id: 'night_shift',
                label: 'الوردية المسائية (11h)',
                timeRange: '07:00 م - 06:00 ص',
                icon: Moon,
                color: 'indigo',
                desc: 'مندوب الفترة الليلية',
              },
              {
                id: 'custom_shift',
                label: 'وردية مخصصة',
                timeRange: 'تحديد يدوي للساعات',
                icon: Clock,
                color: 'emerald',
                desc: 'ورديات خاصة حسب الطلب',
              },
            ].map((p) => {
              const Icon = p.icon;
              const isSelected = shiftType === p.id;
              return (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => handleShiftTypeChange(p.id as VehicleShiftType)}
                  className={`p-3 rounded-xl border text-start transition-all cursor-pointer relative ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-400/20'
                      : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Icon className={`w-3.5 h-3.5 text-${p.color}-500`} />
                      {p.label}
                    </span>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                  </div>
                  <p className="text-[10px] font-mono font-bold text-slate-700">{p.timeRange}</p>
                  <p className="text-[9px] text-slate-400 mt-0.5">{p.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Vehicle and Primary Driver */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-slate-500" />
              <span>المركبة المستلمة *</span>
            </label>
            <select
              value={vehicleId}
              onChange={(e) => handleVehicleChange(e.target.value)}
              required
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white outline-hidden cursor-pointer"
            >
              <option value="">-- اختر المركبة --</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.make} {v.model} ({v.plateNumber}) {v.shiftModeEnabled ? '⚡ [ورديات مزدوجة]' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>المندوب المستلم للوردية *</span>
            </label>
            <select
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
              required
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white outline-hidden cursor-pointer"
            >
              <option value="">-- اختر المندوب --</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.fullName} ({d.phone || d.iqamaNumber})
                </option>
              ))}
            </select>
            {leaveWarning && (
              <p className="mt-1.5 text-[11px] font-bold text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-200 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>{leaveWarning}</span>
              </p>
            )}
          </div>
        </div>

        {/* Shift Date, Time, and Hours */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 bg-slate-50/80 p-3 rounded-xl border border-slate-200">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              تاريخ الوردية *
            </label>
            <input
              type="date"
              required
              value={shiftDate}
              onChange={(e) => setShiftDate(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono outline-hidden"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              وقت البدء *
            </label>
            <input
              type="time"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold outline-hidden"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              وقت الانتهاء *
            </label>
            <input
              type="time"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold outline-hidden"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              إجمالي الساعات
            </label>
            <div className="px-2.5 py-1.5 bg-emerald-100/70 border border-emerald-300 rounded-lg text-xs font-mono font-black text-emerald-800 text-center">
              {plannedHours} ساعة عمل
            </div>
          </div>
        </div>

        {/* Odometers & Fuel Handover Check */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5 text-slate-500" />
              <span>عداد الاستلام (بداية الوردية)</span>
            </label>
            <input
              type="number"
              min={0}
              value={startOdometer}
              onChange={(e) => setStartOdometer(Number(e.target.value))}
              placeholder="العداد الحالي"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5 text-slate-500" />
              <span>عداد التسليم (اختياري عند الإغلاق)</span>
            </label>
            <input
              type="number"
              min={startOdometer}
              value={endOdometer !== undefined ? endOdometer : ''}
              onChange={(e) => setEndOdometer(e.target.value ? Number(e.target.value) : undefined)}
              placeholder="عند نهاية الوردية"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Fuel className="w-3.5 h-3.5 text-slate-500" />
              <span>مستوى الوقود عند الاستلام</span>
            </label>
            <select
              value={fuelLevel}
              onChange={(e) => setFuelLevel(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-hidden cursor-pointer"
            >
              <option value="full">ممتلئ (فل 100%)</option>
              <option value="half">نصف الخزان (50%)</option>
              <option value="quarter">ربع الخزان (25%)</option>
              <option value="empty">منخفض / يحتاج تعبئة</option>
            </select>
          </div>
        </div>

        {/* Handover to Partner Driver & Status */}
        <div className="p-3.5 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-white">
                إجراءات التسليم للمندوب الزميل (Handover to Partner Driver)
              </span>
            </div>
            <span className="text-[10px] text-emerald-400 font-bold px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800">
              تسليم مباشر
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-slate-300 font-semibold mb-1">
                المندوب الزميل المستلم للوردية التالية
              </label>
              <select
                value={handoverToDriverId}
                onChange={(e) => setHandoverToDriverId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-xl text-xs outline-hidden cursor-pointer"
              >
                <option value="">-- اختياري: المندوب المستلم للوردية التالية --</option>
                {drivers
                  .filter((d) => d.id !== driverId)
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.fullName}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-300 font-semibold mb-1">
                حالة الوردية الحالية
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ShiftStatus)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-xl text-xs outline-hidden cursor-pointer"
              >
                <option value="active">🟢 قيد التشغيل الميداني الآن (Active)</option>
                <option value="completed">✅ مكتملة ومسلّمة (Completed)</option>
                <option value="scheduled">📅 مجدولة قادمة (Scheduled)</option>
                <option value="cancelled">❌ ملغاة (Cancelled)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-slate-300 font-semibold mb-1">
              ملاحظات فحص المركبة وتقرير التسليم (Handover Inspection Notes)
            </label>
            <input
              type="text"
              value={handoverCheckNotes}
              onChange={(e) => setHandoverCheckNotes(e.target.value)}
              placeholder="نظافة المركبة، فحص الصدمات، تسليم المفتاح والشريحة الذكية للوقود..."
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-xl text-xs outline-hidden"
            />
          </div>
        </div>

        {/* General Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            ملاحظات إضافية
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="أي تفاصيل خاصة بتشغيل الوردية..."
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-hidden"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 shadow-xs"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{loading ? t('loading') : editingShift ? 'حفظ تعديل الوردية' : 'اعتماد وتسجيل الوردية'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
