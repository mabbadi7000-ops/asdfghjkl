import React, { useState, useEffect } from 'react';
import {
  Calculator,
  RefreshCw,
  User,
  Calendar,
  CreditCard,
  Banknote,
  ShieldAlert,
  Fuel,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Sparkles,
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { FileUploadZone } from '../../components/common/FileUploadZone';
import { FinancialAuditBanner } from '../../components/common/FinancialOperatorBadge';
import {
  DriverPayrollRecord,
  PayrollStatus,
  Driver,
  PlatformContract,
  CashSettlementRecord,
  ViolationRecord,
  DriverAdvanceRecord,
} from '../../types';
import { fetchCollection } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

interface PayrollCalculationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payrollData: Partial<DriverPayrollRecord>) => Promise<void>;
  initialData?: DriverPayrollRecord | null;
  selectedMonth?: string;
}

export const PayrollCalculationModal: React.FC<PayrollCalculationModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  selectedMonth = '2026-10',
}) => {
  const { t, tx } = useLanguage();
  const { currentUser } = useAuth();

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [platforms, setPlatforms] = useState<PlatformContract[]>([]);

  // Form Fields
  const [driverId, setDriverId] = useState('');
  const [month, setMonth] = useState(selectedMonth);
  const [bankIban, setBankIban] = useState('SA');
  const [bankName, setBankName] = useState('مصرف الراجحي');

  // Earnings Components (الاستحقاقات والبدلات: الراتب الأساسي + عدد الطلبات × عمولة الطلب + المكافآت والحوافز)
  // ملاحظة هامة: لا يوجد بدل سكن
  const [basicSalary, setBasicSalary] = useState<number>(3000);
  const [deliveriesCount, setDeliveriesCount] = useState<number>(0);
  const [commissionRatePerOrder, setCommissionRatePerOrder] = useState<number>(3.5);
  const [bonuses, setBonuses] = useState<number>(0);

  // Connected Deductions (الاستقطاعات المترابطة)
  const [advanceDeduction, setAdvanceDeduction] = useState<number>(0);
  const [cashShortageDeduction, setCashShortageDeduction] = useState<number>(0);
  const [violationDeduction, setViolationDeduction] = useState<number>(0);
  const [fuelExcessDeduction, setFuelExcessDeduction] = useState<number>(0);
  const [absenceDeduction, setAbsenceDeduction] = useState<number>(0);
  const [otherDeductions, setOtherDeductions] = useState<number>(0);

  // Status & Payment
  const [status, setStatus] = useState<PayrollStatus>('approved');
  const [paymentMethod, setPaymentMethod] = useState<'wps_bank' | 'bank_transfer' | 'cash' | 'cheque'>('wps_bank');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentReceiptUrl, setPaymentReceiptUrl] = useState('');
  const [notes, setNotes] = useState('');

  const [isAutoPulling, setIsAutoPulling] = useState(false);
  const [autoPullMessage, setAutoPullMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadMeta() {
      const d = await fetchCollection<Driver>('drivers');
      setDrivers(d);
      const p = await fetchCollection<PlatformContract>('platforms');
      setPlatforms(p);

      if (!driverId && d.length > 0 && !initialData) {
        applyDriverDefaults(d[0].id, d);
      }
    }
    loadMeta();
  }, [isOpen]);

  const applyDriverDefaults = (targetDriverId: string, currentDrivers: Driver[]) => {
    setDriverId(targetDriverId);
    const drv = currentDrivers.find((d) => d.id === targetDriverId);
    if (drv) {
      if (drv.basicSalary !== undefined) setBasicSalary(drv.basicSalary);
      if (drv.orderCommissionRate !== undefined) setCommissionRatePerOrder(drv.orderCommissionRate);
      if (drv.bankIban) setBankIban(drv.bankIban);
      if (drv.bankName) setBankName(drv.bankName);
    }
  };

  const handleDriverChange = (newDriverId: string) => {
    applyDriverDefaults(newDriverId, drivers);
  };

  useEffect(() => {
    if (initialData) {
      setDriverId(initialData.driverId || '');
      setMonth(initialData.month || selectedMonth);
      setBankIban(initialData.bankIban || 'SA');
      setBankName(initialData.bankName || 'مصرف الراجحي');
      setBasicSalary(initialData.basicSalary || 3000);
      setDeliveriesCount(initialData.deliveriesCount || 0);
      setCommissionRatePerOrder(initialData.commissionRatePerOrder || 3.5);
      setBonuses(initialData.bonuses || 0);

      setAdvanceDeduction(initialData.advanceDeduction || 0);
      setCashShortageDeduction(initialData.cashShortageDeduction || 0);
      setViolationDeduction(initialData.violationDeduction || 0);
      setFuelExcessDeduction(initialData.fuelExcessDeduction || 0);
      setAbsenceDeduction(initialData.absenceDeduction || 0);
      setOtherDeductions(initialData.otherDeductions || 0);

      setStatus(initialData.status || 'approved');
      setPaymentMethod(initialData.paymentMethod || 'wps_bank');
      setPaymentReference(initialData.paymentReference || '');
      setPaymentReceiptUrl(initialData.paymentReceiptUrl || '');
      setNotes(initialData.notes || '');
    } else {
      setMonth(selectedMonth);
      setDeliveriesCount(0);
      setBonuses(0);

      setAdvanceDeduction(0);
      setCashShortageDeduction(0);
      setViolationDeduction(0);
      setFuelExcessDeduction(0);
      setAbsenceDeduction(0);
      setOtherDeductions(0);

      setStatus('approved');
      setPaymentMethod('wps_bank');
      setPaymentReference('');
      setPaymentReceiptUrl('');
      setNotes('');
    }
    setAutoPullMessage('');
  }, [initialData, isOpen, selectedMonth]);

  // AUTO-PULL REAL DEDUCTIONS FROM SYSTEM FOR SELECTED DRIVER
  const handleAutoPull = async () => {
    if (!driverId) return;
    try {
      setIsAutoPulling(true);
      setAutoPullMessage('');

      // 1. Pull Real Cash Shortages from cash_settlements
      const allSettlements = await fetchCollection<CashSettlementRecord>('cash_settlements');
      const driverShortages = allSettlements
        .filter(
          (s) =>
            s.driverId === driverId &&
            s.difference < 0 &&
            ['pending', 'disputed'].includes(s.status) &&
            (s.date || '').startsWith(month.slice(0, 7))
        )
        .reduce((acc, s) => acc + Math.abs(s.difference), 0);
      setCashShortageDeduction(driverShortages);

      // 2. Pull unsettled violations explicitly marked for salary deduction.
      const allViolations = await fetchCollection<ViolationRecord>('violations');
      const driverViolations = allViolations
        .filter(
          (v) =>
            v.driverId === driverId &&
            v.deductedFromSalary === true &&
            v.status !== 'paid' &&
            v.date.startsWith(month.slice(0, 7))
        )
        .reduce((acc, v) => acc + (v.amount || 0), 0);
      setViolationDeduction(driverViolations);

      // 3. Pull approved advances issued during the selected payroll period.
      const allAdvances = await fetchCollection<DriverAdvanceRecord & { status: string }>('driver_advances');
      const driverActiveAdvances = allAdvances
        .filter(
          (a) =>
            a.driverId === driverId &&
            ['approved', 'active', 'partially_paid'].includes(a.status) &&
            a.requestDate.startsWith(month.slice(0, 7))
        )
        .reduce(
          (acc, a) => acc + Math.min(a.monthlyInstallment || 0, a.remainingAmount || a.monthlyInstallment || 0),
          0
        );
      setAdvanceDeduction(driverActiveAdvances);

      setAutoPullMessage(
        `تم سحب الاستقطاعات الفعلية بنجاح: عجز كاش (${driverShortages} ر.س) • مخالفات غير مسددة (${driverViolations} ر.س) • قسط سلفة (${driverActiveAdvances} ر.س)`
      );
    } catch (err) {
      console.error('Error auto pulling deductions:', err);
    } finally {
      setIsAutoPulling(false);
    }
  };

  useEffect(() => {
    if (isOpen && driverId && !initialData) {
      void handleAutoPull();
    }
  }, [driverId, month, isOpen, initialData]);

  // Accurate Calculations: Basic Salary + (Orders * Commission) + Bonuses
  const deliveryCommissions = Math.round(deliveriesCount * commissionRatePerOrder);
  const grossEarnings = Number(basicSalary) + deliveryCommissions + Number(bonuses);
  const totalDeductions =
    Number(advanceDeduction) +
    Number(cashShortageDeduction) +
    Number(violationDeduction) +
    Number(fuelExcessDeduction) +
    Number(absenceDeduction) +
    Number(otherDeductions);
  const netSalary = Math.max(0, grossEarnings - totalDeductions);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const selDriver = drivers.find((d) => d.id === driverId);
    const selPlat = platforms.find((p) => p.id === selDriver?.platformId);

    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const payNum = initialData?.payrollNumber || `PAY-${month}-${randomSuffix}`;
    const fraudCode = initialData?.fraudVerificationCode || `SEC-PAY-${Math.floor(100000 + Math.random() * 900000)}`;

    const payrollPayload: Partial<DriverPayrollRecord> = {
      payrollNumber: payNum,
      month,
      driverId,
      driverName: selDriver ? selDriver.fullName : 'كابتن توصيل',
      driverIqama: selDriver?.iqamaNumber || '',
      driverPhone: selDriver?.phone || '',
      platformName: selPlat ? selPlat.name : (selDriver?.primaryPlatform ? String(selDriver.primaryPlatform) : 'جاهز وهنقرستيشن'),
      bankIban,
      bankName,

      // Earnings (بدون بدل سكن)
      basicSalary: Number(basicSalary),
      housingAllowance: 0, // لا يوجد بدل سكن
      transportAllowance: 0,
      deliveriesCount: Number(deliveriesCount),
      commissionRatePerOrder: Number(commissionRatePerOrder),
      deliveryCommissions,
      bonuses: Number(bonuses),
      grossEarnings,

      // Deductions
      advanceDeduction: Number(advanceDeduction),
      cashShortageDeduction: Number(cashShortageDeduction),
      violationDeduction: Number(violationDeduction),
      fuelExcessDeduction: Number(fuelExcessDeduction),
      absenceDeduction: Number(absenceDeduction),
      otherDeductions: Number(otherDeductions),
      totalDeductions,

      netSalary,
      status,
      paymentMethod,
      paymentReference: paymentReference || '',
      paymentReceiptUrl,
      preparedById: currentUser?.id || 'sys',
      preparedByName: currentUser?.fullName || 'إدارة الرواتب والعمليات',
      preparedByRole: currentUser?.role || 'supervisor',
      fraudVerificationCode: fraudCode,
      notes: notes || '',
    };

    if (status === 'paid') {
      payrollPayload.paymentDate = new Date().toISOString().slice(0, 10);
      payrollPayload.disbursedById = currentUser?.id || 'sys';
      payrollPayload.disbursedByName = currentUser?.fullName || 'مسؤول الصرف المالي';
      payrollPayload.disbursedByRole = currentUser?.role || 'admin';
    }
    if (status === 'approved' || status === 'paid') {
      payrollPayload.approvedById = currentUser?.id || 'sys';
      payrollPayload.approvedByName = currentUser?.fullName || 'إدارة العمليات';
      payrollPayload.approvedByRole = currentUser?.role || 'general_manager';
    }

    try {
      await onSubmit(payrollPayload);
      onClose();
    } catch (err) {
      console.error('Error submitting payroll:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'تعديل مسير راتب الكابتن' : 'إعداد مسير راتب شهري للكابتن'}
      subtitle="احتساب الاستحقاقات: الراتب الأساسي + عدد الطلبات × عمولة الطلب + المكافآت (بدون بدل سكن)"
      maxWidth="4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Anti-Fraud Banner */}
        <FinancialAuditBanner
          currentUserFullName={currentUser?.fullName}
          currentUserRole={currentUser?.role}
          actionDescription="يتم توثيق إعداد واعتماد مسير الراتب استناداً إلى بيانات السائق الفعلية وتطابق الاستقطاعات المباشرة."
        />

        {/* Top Driver and Month bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">الكابتن المستفيد *</label>
            <select
              required
              value={driverId}
              onChange={(e) => handleDriverChange(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-1 focus:ring-emerald-500 outline-hidden"
            >
              <option value="">اختر الكابتن...</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.fullName} ({d.iqamaNumber})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">شهر الاستحقاق (YYYY-MM) *</label>
            <input
              type="month"
              required
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold outline-hidden"
            />
          </div>

          <div className="flex flex-col justify-end">
            <button
              type="button"
              onClick={handleAutoPull}
              disabled={isAutoPulling}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAutoPulling ? 'animate-spin' : ''}`} />
              <span>{isAutoPulling ? 'جاري السحب...' : 'سحب الاستقطاعات الفعلية من النظام'}</span>
            </button>
          </div>
        </div>

        {autoPullMessage && (
          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>{autoPullMessage}</span>
          </div>
        )}

        {/* Financial Inputs: Earnings vs Deductions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* EARNINGS SECTION (الاستحقاقات والبدلات: لا يوجد بدل سكن) */}
          <div className="p-4 bg-emerald-50/30 border border-emerald-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
              <span className="text-xs font-black text-emerald-900 flex items-center gap-1.5">
                <ArrowUpRight className="w-4 h-4 text-emerald-700" />
                <span>الاستحقاقات والبدلات (Earnings)</span>
              </span>
              <span className="font-mono font-black text-emerald-800 text-xs">
                {grossEarnings.toLocaleString()} ر.س
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">الراتب الأساسي (SAR) *</label>
                <input
                  type="number"
                  min={0}
                  value={basicSalary}
                  onChange={(e) => setBasicSalary(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl font-mono font-bold outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">عدد الطلبات المنفذة *</label>
                <input
                  type="number"
                  min={0}
                  value={deliveriesCount}
                  onChange={(e) => setDeliveriesCount(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl font-mono font-bold outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">عمولة الطلب (SAR/طلب) *</label>
                <input
                  type="number"
                  min={0}
                  step="0.1"
                  value={commissionRatePerOrder}
                  onChange={(e) => setCommissionRatePerOrder(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl font-mono outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">مكافآت وحوافز إضافية (SAR)</label>
                <input
                  type="number"
                  min={0}
                  value={bonuses}
                  onChange={(e) => setBonuses(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl font-mono text-emerald-700 font-bold outline-hidden"
                />
              </div>
            </div>

            {/* Calculated Order Commissions Box */}
            <div className="p-3 bg-emerald-100/70 rounded-xl text-xs flex justify-between items-center text-emerald-950 font-bold border border-emerald-200">
              <span className="flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-emerald-700" />
                <span>إجمالي عمولة الطلبات ({deliveriesCount} طلب × {commissionRatePerOrder} ر.س):</span>
              </span>
              <span className="font-mono font-black text-sm">{deliveryCommissions.toLocaleString()} ر.س</span>
            </div>

            <div className="p-2.5 bg-white rounded-xl border border-emerald-200 text-[11px] text-slate-600 flex justify-between items-center">
              <span>إجمالي الاستحقاقات (الأساسي + العمولة + الحوافز):</span>
              <strong className="font-mono text-emerald-800 text-xs">{grossEarnings.toLocaleString()} ر.س</strong>
            </div>
          </div>

          {/* DEDUCTIONS SECTION (الاستقطاعات والخصومات) */}
          <div className="p-4 bg-rose-50/30 border border-rose-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-rose-200 pb-2">
              <span className="text-xs font-black text-rose-900 flex items-center gap-1.5">
                <ArrowDownRight className="w-4 h-4 text-rose-700" />
                <span>الاستقطاعات المترابطة (Deductions)</span>
              </span>
              <span className="font-mono font-black text-rose-800 text-xs">
                -{totalDeductions.toLocaleString()} ر.س
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <CreditCard className="w-3 h-3 text-purple-600" />
                  <span>قسط السلفة المالية</span>
                </label>
                <input
                  type="number"
                  min={0}
                  value={advanceDeduction}
                  onChange={(e) => setAdvanceDeduction(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl font-mono text-rose-600 font-bold outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Banknote className="w-3 h-3 text-amber-600" />
                  <span>عجز تصفية الكاش (COD)</span>
                </label>
                <input
                  type="number"
                  min={0}
                  value={cashShortageDeduction}
                  onChange={(e) => setCashShortageDeduction(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl font-mono text-rose-600 font-bold outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3 text-rose-600" />
                  <span>مخالفات مرورية</span>
                </label>
                <input
                  type="number"
                  min={0}
                  value={violationDeduction}
                  onChange={(e) => setViolationDeduction(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl font-mono text-rose-600 font-bold outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Fuel className="w-3 h-3 text-orange-600" />
                  <span>تجاوز الوقود</span>
                </label>
                <input
                  type="number"
                  min={0}
                  value={fuelExcessDeduction}
                  onChange={(e) => setFuelExcessDeduction(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl font-mono text-rose-600 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">خصم غياب</label>
                <input
                  type="number"
                  min={0}
                  value={absenceDeduction}
                  onChange={(e) => setAbsenceDeduction(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl font-mono text-rose-600 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">خصومات أخرى</label>
                <input
                  type="number"
                  min={0}
                  value={otherDeductions}
                  onChange={(e) => setOtherDeductions(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl font-mono text-rose-600 outline-hidden"
                />
              </div>
            </div>

            <div className="p-2.5 bg-rose-100/60 rounded-xl text-xs flex justify-between items-center text-rose-950 font-bold border border-rose-200">
              <span>إجمالي الاستقطاعات المنفذة:</span>
              <span className="font-mono font-black">-{totalDeductions.toLocaleString()} ر.س</span>
            </div>
          </div>
        </div>

        {/* Banking and Payout Details */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">طريقة الصرف المعتمدة</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl font-bold outline-hidden"
            >
              <option value="wps_bank">نظام حماية الأجور (WPS البنكي)</option>
              <option value="bank_transfer">تحويل آيبان بنكي سريع</option>
              <option value="cash">صرف نقدي رسمي (سند قبض)</option>
              <option value="cheque">شيك مصرفي معتمد</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">رقم الآيبان البنكي (IBAN)</label>
            <input
              type="text"
              value={bankIban}
              onChange={(e) => setBankIban(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl font-mono outline-hidden"
              placeholder="SA..."
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">اسم البنك</label>
            <input
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl outline-hidden"
              placeholder="مصرف الراجحي / بنك الإنماء..."
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">ملاحظات المسير الإدارية</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl outline-hidden"
              placeholder="مسير راتب شهر معتمد بناءً على تقرير الطلبات الفعلي..."
            />
          </div>

          <div className="sm:col-span-2">
            <FileUploadZone
              label="إيصال التحويل البنكي / سند الصرف"
              value={paymentReceiptUrl}
              onChange={setPaymentReceiptUrl}
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">حالة المسير</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl font-bold outline-hidden"
            >
              <option value="draft">مسودة قيد المراجعة</option>
              <option value="reviewed">تم التدقيق</option>
              <option value="approved">معتمد وجاهز للصرف</option>
              <option value="paid">تم الصرف والتحويل</option>
            </select>
          </div>
        </div>

        {/* Final Net Pay Banner */}
        <div className="p-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl flex items-center justify-between shadow-md">
          <div>
            <span className="text-xs text-slate-400 block">صافي الراتب المستحق للمندوب (Net Payout):</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-2xl font-black font-mono text-emerald-400">
                {netSalary.toLocaleString()}
              </span>
              <span className="text-xs text-slate-300 font-bold">{t('sar')}</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
              الأساسي ({basicSalary}) + العمولات ({deliveryCommissions}) + الحوافز ({bonuses}) - الخصومات ({totalDeductions})
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            >
              {loading ? 'جاري الحفظ...' : initialData ? 'تحديث المسير' : 'اعتماد وحفظ المسير'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
