import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  PlusCircle,
  CreditCard,
  CheckCircle2,
  Trash2,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { Table, Column } from '../../components/common/Table';
import { StatCard } from '../../components/common/StatCard';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { DeleteWithPasswordModal } from '../../components/common/DeleteWithPasswordModal';
import { FinancialOperatorBadge, FinancialAuditBanner } from '../../components/common/FinancialOperatorBadge';
import { ViolationRecord, ViolationStatus, Driver, Vehicle, VehicleShift } from '../../types';
import {
  subscribeToCollection,
  createDocument,
  updateDocument,
  deleteDocument,
  softDeleteDocumentWithPassword,
  fetchCollection,
} from '../../services/dataService';
import { logAuditAction } from '../../services/auditService';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { matchDriverForViolation, ShiftMatchResult } from '../../services/shiftService';
import { Clock, Sun, Moon, Sparkles, Check, Info } from 'lucide-react';

export const ViolationManagement: React.FC = () => {
  const { currentUser, canAccess } = useAuth();
  const { t } = useLanguage();

  const [violations, setViolations] = useState<ViolationRecord[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [shifts, setShifts] = useState<VehicleShift[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [violationToDelete, setViolationToDelete] = useState<ViolationRecord | null>(null);

  // Form State
  const [driverId, setDriverId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [violationType, setViolationType] = useState('تجاوز السرعة المحددة');
  const [violationNumber, setViolationNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState('14:30'); // وقت المخالفة بالساعة والدقيقة للربط اللحظي بالوردية
  const [amount, setAmount] = useState<number>(300);
  const [status, setStatus] = useState<ViolationStatus>('unpaid');
  const [deductedFromSalary, setDeductedFromSalary] = useState(false);
  const [notes, setNotes] = useState('');

  // Auto match state
  const [matchResult, setMatchResult] = useState<ShiftMatchResult | null>(null);

  useEffect(() => {
    const unsub = subscribeToCollection<ViolationRecord>('violations', setViolations);
    const unsubShifts = subscribeToCollection<VehicleShift>('vehicle_shifts', setShifts);

    async function loadMeta() {
      const d = await fetchCollection<Driver>('drivers');
      setDrivers(d);
      if (d.length > 0 && !driverId) setDriverId(d[0].id);
      const v = await fetchCollection<Vehicle>('vehicles');
      setVehicles(v);
      if (v.length > 0 && !vehicleId) setVehicleId(v[0].id);
    }
    loadMeta();

    return () => {
      unsub();
      unsubShifts();
    };
  }, []);

  // Automatically match driver when vehicle, date, or time changes
  useEffect(() => {
    if (!vehicleId || !date) {
      setMatchResult(null);
      return;
    }
    const currentV = vehicles.find((v) => v.id === vehicleId);
    const result = matchDriverForViolation(vehicleId, date, time, shifts, currentV);
    setMatchResult(result);
    if (result.matchedDriverId) {
      setDriverId(result.matchedDriverId);
    }
  }, [vehicleId, date, time, shifts, vehicles]);

  const handleCreateViolation = async (e: React.FormEvent) => {
    e.preventDefault();
    const fraudCode = `SEC-VIOL-${Math.floor(100000 + Math.random() * 900000)}`;
    const id = await createDocument<Omit<ViolationRecord, 'id'>>('violations', {
      driverId,
      vehicleId,
      violationType,
      violationNumber: violationNumber || Math.floor(1000000000 + Math.random() * 9000000000).toString(),
      date,
      time,
      shiftId: matchResult?.matchedShift?.id,
      shiftType: matchResult?.shiftType,
      autoMatchedFromShift: matchResult?.confidence === 'exact' || matchResult?.confidence === 'date_only',
      amount: Number(amount),
      status,
      deductedFromSalary,
      recordedById: currentUser?.id || 'sys',
      recordedByName: currentUser?.fullName || 'مسؤول الحركة والمخالفات',
      recordedByRole: currentUser?.role || 'supervisor',
      fraudVerificationCode: fraudCode,
      notes,
    });

    await logAuditAction(
      currentUser,
      'RECORD_VIOLATION',
      'violations',
      id,
      `تسجيل مخالفة مرورية: ${violationType} بمبلغ ${amount} ر.س على المندوب ${driverId} (ربط وردية: ${matchResult?.shiftType || 'عادي'}) بواسطة ${currentUser?.fullName}`
    );

    setViolationNumber('');
    setNotes('');
    setDeductedFromSalary(false);
    setIsModalOpen(false);
  };

  const handleMarkPaid = async (v: ViolationRecord) => {
    await updateDocument<ViolationRecord>('violations', v.id, {
      status: 'paid',
      paidById: currentUser?.id || 'sys',
      paidByName: currentUser?.fullName || 'مسؤول السداد المالي',
      paidByRole: currentUser?.role || 'general_manager',
      paidDate: new Date().toISOString().slice(0, 10),
    });
    await logAuditAction(
      currentUser,
      'PAY_VIOLATION',
      'violations',
      v.id,
      `سداد المخالفة المرورية رقم ${v.violationNumber} بقيمة ${v.amount} ر.س بواسطة ${currentUser?.fullName}`
    );
  };

  const handleDeleteConfirm = async (reason: string) => {
    if (!violationToDelete || !currentUser) return;
    const driverName = getDriverName(violationToDelete.driverId);
    await softDeleteDocumentWithPassword(
      'violations',
      violationToDelete.id,
      `مخالفة مرورية: #${violationToDelete.violationNumber || violationToDelete.id} (${driverName})`,
      violationToDelete,
      currentUser,
      reason,
      `المبلغ: ${violationToDelete.amount} ر.س • النوع: ${violationToDelete.violationType}`
    );
    await logAuditAction(
      currentUser,
      'SOFT_DELETE_VIOLATION',
      'violations',
      violationToDelete.id,
      `حذف ونقل المخالفة المرورية رقم ${violationToDelete.violationNumber} لسلة المحذوفات (${reason})`
    );
    setViolationToDelete(null);
  };

  const totalAmount = violations.reduce((acc, v) => acc + (v.amount || 0), 0);
  const unpaidAmount = violations
    .filter((v) => v.status === 'unpaid')
    .reduce((acc, v) => acc + (v.amount || 0), 0);
  const unpaidCount = violations.filter((v) => v.status === 'unpaid').length;

  const getDriverName = (dId: string) => {
    const d = drivers.find((item) => item.id === dId);
    return d ? d.fullName : dId;
  };

  const getVehiclePlate = (vId: string) => {
    const v = vehicles.find((item) => item.id === vId);
    return v ? `${v.make} (${v.plateNumber})` : vId;
  };

  const statusBadges: Record<ViolationStatus, { label: string; color: string }> = {
    unpaid: { label: 'غير مسددة', color: 'bg-rose-100 text-rose-800' },
    paid: { label: 'مسددة', color: 'bg-emerald-100 text-emerald-800' },
    under_appeal: { label: 'قيد الاعتراض', color: 'bg-amber-100 text-amber-800' },
    disputed: { label: 'نزاع', color: 'bg-purple-100 text-purple-800' },
  };

  const columns: Column<ViolationRecord>[] = [
    {
      header: 'نوع المخالفة',
      accessor: 'violationType',
      sortable: true,
      render: (v) => (
        <div>
          <span className="font-bold text-slate-900 block text-xs">{v.violationType}</span>
          <span className="text-[10px] text-slate-400 font-mono">رقم: {v.violationNumber}</span>
        </div>
      ),
    },
    {
      header: 'الكابتن المسؤول والوردية',
      accessor: 'driverId',
      render: (v) => (
        <div>
          <span className="font-bold text-slate-900 block text-xs">{getDriverName(v.driverId)}</span>
          <span className="text-[10px] text-slate-500 block">{getVehiclePlate(v.vehicleId)}</span>
          {v.autoMatchedFromShift ? (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1 mt-0.5">
              <Clock className="w-2.5 h-2.5 text-emerald-700" />
              <span>
                {v.shiftType === 'day_shift'
                  ? 'مقيدة بوردية صباحية (11h)'
                  : v.shiftType === 'night_shift'
                  ? 'مقيدة بوردية مسائية (11h)'
                  : 'مقيدة بوردية المركبة'}
              </span>
            </span>
          ) : v.shiftType ? (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-100 text-slate-700 block mt-0.5">
              وردية: {v.shiftType === 'day_shift' ? 'صباحية' : 'مسائية'}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      header: 'التاريخ والوقت',
      accessor: 'date',
      sortable: true,
      render: (v) => (
        <div>
          <span className="font-mono text-xs text-slate-800 font-bold block">{v.date}</span>
          {v.time && (
            <span className="font-mono text-[10px] text-slate-400 block">
              الساعة: {v.time}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'المبلغ',
      accessor: 'amount',
      sortable: true,
      render: (v) => <span className="font-black text-slate-900 font-mono text-xs">{v.amount} ر.س</span>,
    },
    {
      header: 'المسؤول المالي / المسدد',
      accessor: 'recordedByName',
      render: (v) => (
        <FinancialOperatorBadge
          name={v.status === 'paid' && v.paidByName ? v.paidByName : v.recordedByName}
          role={v.status === 'paid' && v.paidByRole ? v.paidByRole : v.recordedByRole}
          actionTitle={v.status === 'paid' ? 'سداد مالي معتمد' : 'مسجل المخالفة'}
          verificationCode={v.fraudVerificationCode}
          variant="inline"
        />
      ),
    },
    {
      header: 'الحالة',
      accessor: 'status',
      render: (v) => {
        const badge = statusBadges[v.status];
        return <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${badge.color}`}>{badge.label}</span>;
      },
    },
    {
      header: 'الإجراءات',
      className: 'text-end',
      render: (v) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          {v.status === 'unpaid' && (
            <button
              onClick={() => handleMarkPaid(v)}
              className="px-2 py-1 text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg cursor-pointer flex items-center gap-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>سداد</span>
            </button>
          )}
          {canAccess(['general_manager']) && (
            <button
              onClick={() => setViolationToDelete(v)}
              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
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
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">المخالفات المرورية</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            تتبع المخالفات المسجلة عبر منصة إيفاء وأبشر، مبالغ السداد، والخصم من مستحقات السائقين.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>تسجيل مخالفة جديدة</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="مخالفات غير مسددة"
          value={unpaidCount}
          subtitle="تتطلب متابعة وسداد"
          icon={AlertTriangle}
          colorScheme={unpaidCount > 0 ? 'rose' : 'slate'}
        />
        <StatCard
          title="المبلغ المستحق للسداد"
          value={`${unpaidAmount.toLocaleString()} ر.س`}
          subtitle="إجمالي الغرامات المعلقة"
          icon={CreditCard}
          colorScheme="amber"
        />
        <StatCard
          title="إجمالي المخالفات"
          value={violations.length}
          subtitle="سجل المخالفات الكلي"
          icon={ShieldAlert}
          colorScheme="blue"
        />
        <StatCard
          title="إجمالي مبالغ الغرامات"
          value={`${totalAmount.toLocaleString()} ر.س`}
          subtitle="منذ بداية التشغيل"
          icon={CreditCard}
          colorScheme="slate"
        />
      </div>

      {/* Table */}
      <Table
        data={violations}
        columns={columns}
        keyExtractor={(item) => item.id}
        searchPlaceholder="بحث بنوع المخالفة أو الكابتن أو رقم المخالفة..."
        searchFilter={(item, query) =>
          item.violationType.toLowerCase().includes(query) ||
          item.violationNumber.includes(query) ||
          getDriverName(item.driverId).toLowerCase().includes(query)
        }
        filterOptions={[
          { label: 'غير مسددة (Unpaid)', filterFn: (v) => v.status === 'unpaid' },
          { label: 'مسددة (Paid)', filterFn: (v) => v.status === 'paid' },
        ]}
        exportFileName="fleetops_violations"
      />

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="تسجيل مخالفة مرورية جديدة"
        subtitle="توثيق المخالفة المسجلة عبر سداد أو أبشر"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateViolation} className="space-y-4">
          <FinancialAuditBanner
            currentUserFullName={currentUser?.fullName}
            currentUserRole={currentUser?.role}
            actionDescription="يتم تسجيل وتتبع سداد المخالفات المرورية بهوية المسؤول لضمان عدم التهرب المالي أو تسجيل مخالفات كيدية."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">المركبة المخالفة *</label>
              <select
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white outline-hidden cursor-pointer"
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.make} {v.model} ({v.plateNumber}) {v.shiftModeEnabled ? '⚡ [ورديات مزدوجة]' : ''}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={deductedFromSalary}
                onChange={(e) => setDeductedFromSalary(e.target.checked)}
                className="accent-emerald-600"
              />
              <span>خصم المخالفة من راتب المندوب عند إعداد المسير</span>
            </label>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">تاريخ المخالفة *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:bg-white outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>وقت رصد المخالفة (ساعة:دقيقة) *</span>
                <span className="text-[10px] text-emerald-600 font-bold">ربط آلي بالوردية</span>
              </label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-emerald-700 focus:bg-white outline-hidden"
              />
            </div>

            {/* Smart Shift Match Attribution Banner */}
            <div className="sm:col-span-2 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-300 rounded-xl">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-bold text-emerald-900">
                      نتيجة المطابقة الآلية مع ورديات المركبة (11 ساعة)
                    </h5>
                    <p className="text-[11px] text-emerald-700 mt-0.5 leading-relaxed">
                      {matchResult ? matchResult.explanationAr : 'اختر المركبة والتاريخ والوقت لتحديد المندوب المسؤول تلقائياً.'}
                    </p>
                  </div>
                </div>
                {matchResult?.confidence === 'exact' && (
                  <span className="px-2 py-0.5 bg-emerald-600 text-white rounded-full text-[10px] font-bold shrink-0 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>مطابقة وردية 100%</span>
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                الكابتن المنسوبة إليه المخالفة *
              </label>
              <select
                value={driverId}
                onChange={(e) => setDriverId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-white border border-emerald-400 rounded-xl text-xs font-bold text-slate-900 shadow-2xs outline-hidden cursor-pointer"
              >
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.fullName} ({d.phone || d.iqamaNumber})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">نوع المخالفة *</label>
              <input
                type="text"
                required
                value={violationType}
                onChange={(e) => setViolationType(e.target.value)}
                placeholder="تجاوز سرعة، حزام أمان، استخدام جوال..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">رقم المخالفة (سداد/إيفاء)</label>
              <input
                type="text"
                value={violationNumber}
                onChange={(e) => setViolationNumber(e.target.value)}
                placeholder="رقم السداد"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">مبلغ المخالفة (ر.س) *</label>
              <input
                type="number"
                required
                min={50}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:bg-white outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">ملاحظات وإجراء الخصم</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="هل تم الإشعار والخصم من المستحقات؟"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              تسجيل المخالفة
            </button>
          </div>
        </form>
      </Modal>

      <DeleteWithPasswordModal
        isOpen={!!violationToDelete}
        onClose={() => setViolationToDelete(null)}
        onConfirm={handleDeleteConfirm}
        itemTitle={violationToDelete ? `المخالفة رقم ${violationToDelete.violationNumber} (${getDriverName(violationToDelete.driverId)}) بمبلغ ${violationToDelete.amount} ر.س` : ''}
        itemType="مخالفة مرورية"
        warningNote="سيتم حفظ بيانات المخالفة وتفاصيلها في سلة المحذوفات الخاصة بالإدارة العامة."
      />
    </div>
  );
};
