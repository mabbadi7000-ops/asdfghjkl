import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  UserPlus,
  KeyRound,
  Calendar,
  CreditCard,
  DollarSign,
  ShieldCheck,
  AlertTriangle,
  FileCheck,
  Phone,
  Hash,
  User,
  CheckCircle2,
  Clock,
  Banknote,
  Receipt,
  Sparkles,
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { FinancialAuditBanner } from '../../components/common/FinancialOperatorBadge';
import {
  FreelancerRental,
  RentedAccount,
  Driver,
  AccountBillingCycle,
  DepositStatus,
  FreelancerPaymentMethod,
} from '../../types';
import { fetchCollection } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

interface FreelancerRentalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    rentalData: Partial<FreelancerRental>,
    accountToUpdate?: RentedAccount,
    customDriverData?: { isNew: boolean; fullName: string; iqamaNumber: string; phone: string }
  ) => Promise<void>;
  preselectedAccountId?: string;
  preselectedDriverId?: string;
  initialData?: FreelancerRental | null;
}

export type RentalPaymentStatus = 'paid_full' | 'partially_paid' | 'unpaid';

export const FreelancerRentalModal: React.FC<FreelancerRentalModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  preselectedAccountId,
  preselectedDriverId,
  initialData,
}) => {
  const { tx, t } = useLanguage();
  const { currentUser } = useAuth();

  const [availableAccounts, setAvailableAccounts] = useState<RentedAccount[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);

  // Account
  const [accountId, setAccountId] = useState(preselectedAccountId || '');

  // Driver input mode: 'manual' (freelancer without prior profile) or 'select' (existing driver profile)
  const [driverInputMode, setDriverInputMode] = useState<'manual' | 'select'>('manual');
  const [selectedDriverId, setSelectedDriverId] = useState(preselectedDriverId || '');
  const [manualDriverName, setManualDriverName] = useState('');
  const [manualDriverIqama, setManualDriverIqama] = useState('');
  const [manualDriverPhone, setManualDriverPhone] = useState('+966 5');

  // Billing & Rates
  const [billingCycle, setBillingCycle] = useState<AccountBillingCycle>('monthly');
  const [rentAmount, setRentAmount] = useState<number>(850);
  const [securityDeposit, setSecurityDeposit] = useState<number>(300);
  const [depositStatus, setDepositStatus] = useState<DepositStatus>('held');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [nextPaymentDueDate, setNextPaymentDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );

  // Payment Status & Settlement
  const [paymentStatus, setPaymentStatus] = useState<RentalPaymentStatus>('paid_full');
  const [paidAmount, setPaidAmount] = useState<number>(850 + 300);
  const [paymentMethod, setPaymentMethod] = useState<FreelancerPaymentMethod>('cash');
  const [paymentReference, setPaymentReference] = useState('');

  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadMeta() {
      const [accs, drvs] = await Promise.all([
        fetchCollection<RentedAccount>('rented_accounts'),
        fetchCollection<Driver>('drivers'),
      ]);
      setAvailableAccounts(accs);
      setDrivers(drvs);

      if (!accountId && accs.length > 0) {
        const firstAvail = accs.find((a) => a.status === 'available') || accs[0];
        setAccountId(preselectedAccountId || firstAvail.id);
        updateRatesForAccount(firstAvail, billingCycle);
      }

      if (preselectedDriverId && drvs.length > 0) {
        const matched = drvs.find((d) => d.id === preselectedDriverId);
        if (matched) {
          setSelectedDriverId(matched.id);
          setManualDriverName(matched.fullName);
          setManualDriverIqama(matched.iqamaNumber);
          setManualDriverPhone(matched.phone);
          setDriverInputMode('select');
        }
      }
    }
    loadMeta();
  }, [isOpen, preselectedAccountId, preselectedDriverId]);

  useEffect(() => {
    if (initialData) {
      setAccountId(initialData.accountId || '');
      setSelectedDriverId(initialData.driverId || '');
      setManualDriverName(initialData.driverName || '');
      setManualDriverIqama(initialData.driverIqama || '');
      setManualDriverPhone(initialData.driverPhone || '+966 5');
      setBillingCycle(initialData.billingCycle || 'monthly');
      setRentAmount(initialData.rentAmount || 850);
      setSecurityDeposit(initialData.securityDeposit || 300);
      setDepositStatus(initialData.depositStatus || 'held');
      setStartDate(initialData.startDate || new Date().toISOString().slice(0, 10));
      setNextPaymentDueDate(initialData.nextPaymentDueDate || new Date().toISOString().slice(0, 10));
      setPaymentStatus(initialData.paymentStatus || (initialData.balanceDue === 0 ? 'paid_full' : initialData.totalPaid > 0 ? 'partially_paid' : 'unpaid'));
      setPaidAmount(initialData.totalPaid || 0);
      setPaymentMethod(initialData.paymentMethod || 'cash');
      setPaymentReference(initialData.paymentReference || '');
      setNotes(initialData.notes || '');
    }
  }, [initialData]);

  const updateRatesForAccount = (acc: RentedAccount, cycle: AccountBillingCycle) => {
    let rate = 850;
    if (cycle === 'daily') rate = acc.dailyRate || 35;
    else if (cycle === 'weekly') rate = acc.weeklyRate || 220;
    else rate = acc.monthlyRate || 850;

    const deposit = acc.securityDeposit || 300;
    setRentAmount(rate);
    setSecurityDeposit(deposit);

    if (paymentStatus === 'paid_full') {
      setPaidAmount(rate + deposit);
    } else if (paymentStatus === 'unpaid') {
      setPaidAmount(0);
    }
  };

  const handleAccountSelect = (accId: string) => {
    setAccountId(accId);
    const selAcc = availableAccounts.find((a) => a.id === accId);
    if (selAcc) {
      updateRatesForAccount(selAcc, billingCycle);
    }
  };

  const handleCycleChange = (cycle: AccountBillingCycle) => {
    setBillingCycle(cycle);
    const selAcc = availableAccounts.find((a) => a.id === accountId);
    if (selAcc) {
      updateRatesForAccount(selAcc, cycle);
    }
    const now = new Date(startDate);
    if (cycle === 'daily') now.setDate(now.getDate() + 1);
    else if (cycle === 'weekly') now.setDate(now.getDate() + 7);
    else now.setDate(now.getDate() + 30);
    setNextPaymentDueDate(now.toISOString().slice(0, 10));
  };

  const handleDriverSelectDropdown = (dId: string) => {
    setSelectedDriverId(dId);
    const matched = drivers.find((d) => d.id === dId);
    if (matched) {
      setManualDriverName(matched.fullName);
      setManualDriverIqama(matched.iqamaNumber);
      setManualDriverPhone(matched.phone);
    }
  };

  const handlePaymentStatusChange = (status: RentalPaymentStatus) => {
    setPaymentStatus(status);
    const totalDue = Number(rentAmount) + Number(securityDeposit);
    if (status === 'paid_full') {
      setPaidAmount(totalDue);
    } else if (status === 'unpaid') {
      setPaidAmount(0);
    } else if (status === 'partially_paid') {
      // Default to half or deposit
      setPaidAmount(Math.round(totalDue / 2));
    }
  };

  const totalContractDue = Number(rentAmount) + Number(securityDeposit);
  const calculatedBalanceDue = Math.max(0, totalContractDue - Number(paidAmount));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const selAcc = availableAccounts.find((a) => a.id === accountId);
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const rentalNum = initialData?.rentalNumber || `RNT-${new Date().getFullYear()}-${randomSuffix}`;
    const fraudCode = `SEC-RNT-${Math.floor(100000 + Math.random() * 900000)}`;

    const finalDriverName = manualDriverName.trim() || 'كابتن فريلانسر حر';
    const finalDriverIqama = manualDriverIqama.trim();
    const finalDriverPhone = manualDriverPhone.trim();

    const effectiveDriverId = selectedDriverId;

    await onSubmit(
      {
        rentalNumber: rentalNum,
        accountId,
        accountCode: selAcc?.accountCode || 'N/A',
        platformName: selAcc?.platformName || 'منصة توصيل',
        driverId: effectiveDriverId,
        driverName: finalDriverName,
        driverIqama: finalDriverIqama,
        driverPhone: finalDriverPhone,
        rentalType: 'direct_freelancer',
        startDate,
        billingCycle,
        rentAmount: Number(rentAmount),
        securityDeposit: Number(securityDeposit),
        depositStatus,
        totalBilled: totalContractDue,
        totalPaid: Number(paidAmount),
        balanceDue: calculatedBalanceDue,
        paymentStatus,
        paymentMethod,
        paymentReference,
        lastPaymentDate: Number(paidAmount) > 0 ? startDate : undefined,
        nextPaymentDueDate,
        status: calculatedBalanceDue > 0 ? 'active' : 'active',
        assignedById: currentUser?.id || 'sys',
        assignedByName: currentUser?.fullName || 'إدارة التأجير',
        assignedByRole: currentUser?.role || 'operations_manager',
        fraudVerificationCode: fraudCode,
        notes,
      },
      selAcc,
      {
        isNew: !selectedDriverId,
        fullName: finalDriverName,
        iqamaNumber: finalDriverIqama,
        phone: finalDriverPhone,
      }
    );

    setLoading(false);
    onClose();
  };

  const selAccountObj = availableAccounts.find((a) => a.id === accountId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? tx('تعديل عقد تأجير الحساب', 'Edit Account Rental') : tx('تأجير يوزر / حساب لكابتن فريلانسر', 'Rent Account to Freelance Courier')}
      subtitle={tx('إصدار وتوثيق عقد تأجير مباشر لحساب تطبيق توصيل مع بيانات المندوب وحالة السداد المالي', 'Issue and document direct account rental with tenant details and payment status')}
      maxWidth="4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Anti-Fraud Operator Identity Banner */}
        <FinancialAuditBanner
          currentUserFullName={currentUser?.fullName}
          currentUserRole={currentUser?.role}
          actionDescription={tx('يتم ربط عملية تسليم الحساب وتحصيل الإيجار رقمياً بهوية المسؤول المالي ورقم إقامة الكابتن المستأجر.', 'Handover and cash collection is bound to the operator identity and courier Iqama.')}
        />

        {/* 1. Account Selection */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
          <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-indigo-600" />
              <span>{tx('اختر الحساب / اليوزر المراد تأجيره *', 'Select Account to Rent *')}</span>
            </span>
            {selAccountObj && (
              <span className="text-[10px] text-indigo-700 font-mono font-bold bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                {selAccountObj.platformName} • {selAccountObj.accountCode}
              </span>
            )}
          </label>
          <select
            required
            value={accountId}
            onChange={(e) => handleAccountSelect(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-1 focus:ring-indigo-500 outline-hidden"
          >
            <option value="">{tx('اختر حساباً متاحاً من المخزون...', 'Select available account...')}</option>
            {availableAccounts.map((a) => (
              <option key={a.id} value={a.id} disabled={a.status !== 'available' && a.id !== initialData?.accountId}>
                {a.platformName} • كود: {a.accountCode} ({a.appUsername}) — {a.monthlyRate} ر.س/شهر {a.originDriverName ? `[مستخرج من: ${a.originDriverName}]` : ''} {a.status !== 'available' ? `[${a.status}]` : '🟢 متاح للتأجير'}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Driver Info (Manual Input or Select from DB) */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                <User className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block">{tx('بيانات الكابتن المستأجر (الفريلانسر)', 'Tenant Courier Information')}</span>
                <span className="text-[10px] text-slate-400">يمكنك كتابة بيانات المندوب يدوياً أو استيرادها من القائمة</span>
              </div>
            </div>

            {/* Switch Mode Pills */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setDriverInputMode('manual')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  driverInputMode === 'manual'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {tx('إدخال يدوي مباشر', 'Manual Input')}
              </button>
              <button
                type="button"
                onClick={() => setDriverInputMode('select')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  driverInputMode === 'select'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {tx('اختيار من القائمة', 'Select from DB')}
              </button>
            </div>
          </div>

          {/* If Select Mode is Active */}
          {driverInputMode === 'select' && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                {tx('اختر من قاعدة بيانات المناديب المسجلين:', 'Select registered driver:')}
              </label>
              <select
                value={selectedDriverId}
                onChange={(e) => handleDriverSelectDropdown(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-hidden"
              >
                <option value="">-- اختر الكابتن لتعبئة بياناته تلقائياً --</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.fullName} ({d.phone}) • إقامة: {d.iqamaNumber}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 3 Manual Input Fields: Name, Iqama, Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Courier Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {tx('اسم المندوب المستأجر *', 'Courier Full Name *')}
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={manualDriverName}
                  onChange={(e) => setManualDriverName(e.target.value)}
                  placeholder={tx('مثال: محمد عبدالله أحمد', 'e.g. Courier Name')}
                  className="w-full ps-8 pe-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white outline-hidden focus:ring-1 focus:ring-blue-500"
                />
                <User className="w-3.5 h-3.5 text-slate-400 absolute start-2.5 top-2.5" />
              </div>
            </div>

            {/* Iqama / National ID */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {tx('رقم الإقامة / الهوية *', 'Iqama / National ID *')}
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  pattern=".*\\S.*"
                  value={manualDriverIqama}
                  onChange={(e) => setManualDriverIqama(e.target.value)}
                  placeholder="10 أرقام"
                  className="w-full ps-8 pe-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white outline-hidden focus:ring-1 focus:ring-blue-500"
                />
                <Hash className="w-3.5 h-3.5 text-slate-400 absolute start-2.5 top-2.5" />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {tx('رقم الجوال / الهاتف *', 'Phone Number *')}
              </label>
              <div className="relative">
                <input
                  type="tel"
                  required
                  value={manualDriverPhone}
                  onChange={(e) => setManualDriverPhone(e.target.value)}
                  placeholder="+966 5x xxx xxxx"
                  className="w-full ps-8 pe-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white outline-hidden focus:ring-1 focus:ring-blue-500"
                />
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute start-2.5 top-2.5" />
              </div>
            </div>
          </div>
        </div>

        {/* 3. Rates & Billing Cycle */}
        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>{tx('دورة سداد الإيجار المعتمدة:', 'Rental Billing Cycle:')}</span>
            </span>
            <div className="flex items-center gap-1.5">
              {(['daily', 'weekly', 'monthly'] as AccountBillingCycle[]).map((cycle) => (
                <button
                  key={cycle}
                  type="button"
                  onClick={() => handleCycleChange(cycle)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    billingCycle === cycle
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {cycle === 'daily' ? 'يومي (Daily)' : cycle === 'weekly' ? 'أسبوعي (Weekly)' : 'شهري (Monthly)'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">{tx('قيمة الإيجار للدورة (SAR) *', 'Rent Rate per Cycle *')}</label>
              <div className="relative">
                <input
                  type="number"
                  required
                  min={1}
                  value={rentAmount}
                  onChange={(e) => setRentAmount(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-black text-emerald-700 outline-hidden"
                />
                <span className="absolute end-2.5 top-1.5 text-[10px] text-slate-400 font-bold">ر.س</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">{tx('مبلغ التأمين المسترد (SAR) *', 'Security Deposit *')}</label>
              <div className="relative">
                <input
                  type="number"
                  required
                  min={0}
                  value={securityDeposit}
                  onChange={(e) => setSecurityDeposit(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-amber-700 outline-hidden"
                />
                <span className="absolute end-2.5 top-1.5 text-[10px] text-slate-400 font-bold">ر.س</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Payment Status & Settlement (حالة السداد والتحصيل المالي) */}
        <div className="p-4 bg-linear-to-r from-emerald-500/5 via-teal-500/5 to-slate-50 border-2 border-emerald-500/30 rounded-2xl space-y-3.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
                <Banknote className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-black text-slate-900 block">{tx('حالة السداد والتحصيل المالي للدفعة الأولى', 'Initial Payment & Settlement Status')}</span>
                <span className="text-[10px] text-slate-500">إجمالي المستحق (الإيجار + التأمين): <strong className="text-slate-900 font-mono">{totalContractDue} ر.س</strong></span>
              </div>
            </div>

            {/* Payment Status Selector Pills */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handlePaymentStatusChange('paid_full')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  paymentStatus === 'paid_full'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-emerald-50'
                }`}
              >
                🟢 {tx('مسدد بالكامل', 'Fully Paid')}
              </button>

              <button
                type="button"
                onClick={() => handlePaymentStatusChange('partially_paid')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  paymentStatus === 'partially_paid'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-amber-50'
                }`}
              >
                🟡 {tx('مسدد جزئياً', 'Partially Paid')}
              </button>

              <button
                type="button"
                onClick={() => handlePaymentStatusChange('unpaid')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  paymentStatus === 'unpaid'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-rose-50'
                }`}
              >
                🔴 {tx('غير مسدد (آجل)', 'Unpaid / Deferred')}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {/* Amount Paid */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                {tx('المبلغ المسدد والمدفوع فعلياً (SAR) *', 'Actual Amount Paid (SAR) *')}
              </label>
              <input
                type="number"
                required
                min={0}
                max={totalContractDue}
                value={paidAmount}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setPaidAmount(val);
                  if (val === totalContractDue) setPaymentStatus('paid_full');
                  else if (val === 0) setPaymentStatus('unpaid');
                  else setPaymentStatus('partially_paid');
                }}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-black text-emerald-800 outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Remaining Balance Due */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                {tx('المبلغ المتبقي كذمة مستحقة', 'Remaining Due Balance')}
              </label>
              <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-black text-rose-700 flex items-center justify-between">
                <span>{calculatedBalanceDue.toLocaleString()} ر.س</span>
                {calculatedBalanceDue === 0 && <span className="text-[10px] text-emerald-700 font-bold">✓ لا يوجد متبقي</span>}
              </div>
            </div>

            {/* Payment Method (if paid > 0) */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                {tx('طريقة السداد المالي *', 'Payment Method *')}
              </label>
              <select
                disabled={Number(paidAmount) === 0}
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as FreelancerPaymentMethod)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-hidden disabled:opacity-50"
              >
                <option value="cash">نقدي / كاش (Cash)</option>
                <option value="bank_transfer">تحويل بنكي (Bank Transfer)</option>
                <option value="pos_network">شبكة / مدى (POS Card)</option>
                <option value="stc_pay">STC Pay / محفظة</option>
              </select>
            </div>
          </div>

          {/* Reference if non-cash */}
          {paymentMethod !== 'cash' && Number(paidAmount) > 0 && (
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                {tx('الرقم المرجعي للعملية / رقم الحوالة البنكية', 'Bank Transfer / POS Reference #')}
              </label>
              <input
                type="text"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="e.g. TR-998120349"
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:bg-white outline-hidden"
              />
            </div>
          )}
        </div>

        {/* 5. Dates & Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Start Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{tx('تاريخ بدء عقد التأجير *', 'Rental Start Date *')}</label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:bg-white outline-hidden"
            />
          </div>

          {/* Next Due Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{tx('تاريخ استحقاق الدفعة القادمة *', 'Next Payment Due Date *')}</label>
            <input
              type="date"
              required
              value={nextPaymentDueDate}
              onChange={(e) => setNextPaymentDueDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-rose-700 focus:bg-white outline-hidden"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">{tx('شروط العقد وملاحظات التسليم', 'Contract Terms & Handover Notes')}</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={tx('تم تسليم الحساب والشريحة، الكابتن مسؤول عن أي مخالفات أو حظر يطرأ على الحساب...', 'Terms...')}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden resize-none"
          />
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="text-xs text-slate-500 font-mono">
            {tx('المبلغ المسدد الآن:', 'Paid Now:')} <strong className="text-emerald-700 font-bold">{paidAmount} ر.س</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
            >
              {tx('إلغاء', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <FileCheck className="w-4 h-4" />
              <span>{loading ? tx('جارٍ الإصدار...', 'Processing...') : tx('اعتماد عقد التأجير وتسليم الحساب', 'Approve Rental & Handover')}</span>
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
