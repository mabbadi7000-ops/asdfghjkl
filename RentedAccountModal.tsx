import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Smartphone,
  CreditCard,
  DollarSign,
  Building,
  ShieldCheck,
  Layers,
  AlertCircle,
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { FinancialAuditBanner } from '../../components/common/FinancialOperatorBadge';
import { RentedAccount, RentedAccountPlatform, RentedAccountStatus, Driver, PlatformContract } from '../../types';
import { subscribeToCollection } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

interface RentedAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (accountData: Partial<RentedAccount>) => Promise<void>;
  initialData?: RentedAccount | null;
}

export const RentedAccountModal: React.FC<RentedAccountModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const { tx } = useLanguage();
  const { currentUser } = useAuth();

  const [platform, setPlatform] = useState<RentedAccountPlatform>('other');
  const [contracts, setContracts] = useState<PlatformContract[]>([]);
  const [deliveryPlatforms, setDeliveryPlatforms] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedContractId, setSelectedContractId] = useState('');
  const [accountCode, setAccountCode] = useState('');
  const [appUsername, setAppUsername] = useState('');
  const [registeredPhone, setRegisteredPhone] = useState('');
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [currentFreelancerId, setCurrentFreelancerId] = useState('');
  const [originDriverId, setOriginDriverId] = useState<string>('');
  const [isOriginSponsored, setIsOriginSponsored] = useState<boolean>(false);
  const [dailyRate, setDailyRate] = useState<number>(0);
  const [weeklyRate, setWeeklyRate] = useState<number>(0);
  const [monthlyRate, setMonthlyRate] = useState<number>(0);
  const [securityDeposit, setSecurityDeposit] = useState<number>(0);
  const [city, setCity] = useState('');
  const [status, setStatus] = useState<RentedAccountStatus>('available');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubContracts = subscribeToCollection<PlatformContract>('platform_contracts', (data) => {
      setContracts(Array.isArray(data) ? data.filter((contract) => contract && (contract.status === 'active' || !contract.status)) : []);
    });
    const unsubDrivers = subscribeToCollection<Driver>('drivers', (data) => {
      setDrivers(Array.isArray(data) ? data.filter(Boolean) : []);
    });
    const unsubPlatforms = subscribeToCollection<{ id: string; name: string }>('delivery_platforms', (data) => {
      setDeliveryPlatforms(Array.isArray(data) ? data.filter(Boolean) : []);
    });
    return () => {
      unsubContracts();
      unsubDrivers();
      unsubPlatforms();
    };
  }, []);

  useEffect(() => {
    if (initialData) {
      setPlatform(initialData.platform || 'other');
      setSelectedContractId(initialData.platformContractId || initialData.platformId || '');
      setAccountCode(initialData.accountCode || '');
      setAppUsername(initialData.appUsername || '');
      setRegisteredPhone(initialData.registeredPhone || '');
      setCurrentFreelancerId(initialData.currentFreelancerId || '');
      setOriginDriverId(initialData.originDriverId || '');
      setIsOriginSponsored(initialData.isOriginSponsoredDriver ?? !!initialData.originDriverId);
      setDailyRate(initialData.dailyRate || 0);
      setWeeklyRate(initialData.weeklyRate || 0);
      setMonthlyRate(initialData.monthlyRate || 0);
      setSecurityDeposit(initialData.securityDeposit || 0);
      setCity(initialData.city || '');
      setStatus(initialData.status || 'available');
      setNotes(initialData.notes || '');
    } else {
      setPlatform('other');
      setSelectedContractId('');
      setAccountCode('');
      setAppUsername('');
      setRegisteredPhone('');
      setCurrentFreelancerId('');
      setOriginDriverId('');
      setIsOriginSponsored(false);
      setDailyRate(0);
      setWeeklyRate(0);
      setMonthlyRate(0);
      setSecurityDeposit(0);
      setCity('');
      setStatus('available');
      setNotes('');
    }
  }, [initialData, isOpen]);

  const handleDriverSelect = (dId: string) => {
    setOriginDriverId(dId);
    if (dId) {
      setIsOriginSponsored(true);
      const selD = drivers.find((d) => d.id === dId);
      if (selD) {
        setRegisteredPhone(selD.phone || registeredPhone);
      }
    } else {
      setIsOriginSponsored(false);
    }
  };

  const selectedContract = contracts.find((contract) => contract.id === selectedContractId);

  const handlePlatformChange = (contractId: string) => {
    setSelectedContractId(contractId);
    const contract = contracts.find((item) => item.id === contractId);
    const supportedPlatforms: RentedAccountPlatform[] = [
      'jahez', 'hungerstation', 'toyou', 'ninja', 'keeta', 'mrsool', 'barq', 'careem_box', 'other',
    ];
    const contractPlatformId = contract?.platformId || contract?.id;
    setPlatform(supportedPlatforms.includes(contractPlatformId as RentedAccountPlatform)
      ? contractPlatformId as RentedAccountPlatform
      : 'other');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContract || !currentUser) return;
    setLoading(true);
    const selDriver = drivers.find((d) => d.id === originDriverId);
    const selFreelancer = drivers.find((d) => d.id === currentFreelancerId);

    await onSubmit({
      platform,
      platformName: selectedContract.platformName || deliveryPlatforms.find((item) => item.id === selectedContract.platformId)?.name || selectedContract.name || '',
      platformContractId: selectedContract.id,
      platformId: selectedContract.platformId || selectedContract.id,
      accountCode,
      appUsername,
      registeredPhone,
      originDriverId: originDriverId || undefined,
      originDriverName: selDriver ? selDriver.fullName : initialData?.originDriverName,
      originDriverIqama: selDriver ? selDriver.iqamaNumber : initialData?.originDriverIqama,
      originDriverPhone: selDriver ? selDriver.phone : initialData?.originDriverPhone,
      isOriginSponsoredDriver: isOriginSponsored || !!originDriverId,
      originDriverActivePlatform: selDriver ? (selDriver.primaryPlatform || selDriver.platformId || '') : initialData?.originDriverActivePlatform,
      dailyRate: Number(dailyRate),
      weeklyRate: Number(weeklyRate),
      monthlyRate: Number(monthlyRate),
      securityDeposit: Number(securityDeposit),
      city,
      status,
      currentFreelancerId: status === 'rented' ? currentFreelancerId : '',
      currentFreelancerName: status === 'rented' ? selFreelancer?.fullName || '' : '',
      currentDriverId: status === 'rented' ? currentFreelancerId : '',
      currentDriverName: status === 'rented' ? selFreelancer?.fullName : '',
      totalRentalRevenue: initialData?.totalRentalRevenue || 0,
      notes,
      createdById: currentUser.id,
      createdByName: currentUser?.fullName || 'إدارة الحسابات المؤجرة',
      createdByRole: currentUser?.role || 'operations_manager',
    });

    setLoading(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? tx('تعديل بيانات الحساب المؤجر', 'Edit Rented Account') : tx('إضافة حساب / يوزر تطبيق جديد للتأجير', 'Add New Rented Account')}
      subtitle={tx('تسجيل حساب تطبيق توصيل في مخزون الحسابات المؤجرة للكباتن الفريلانسر أو المشرفين', 'Register courier app account into rented pool for freelancers or supervisors')}
      maxWidth="4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Anti-Fraud Banner */}
        <FinancialAuditBanner
          currentUserFullName={currentUser?.fullName}
          currentUserRole={currentUser?.role}
          actionDescription={tx('يتم توثيق إضافة الحساب والتحقق من رقم الشريحة والمنصة لضمان عدم ازدواجية الحسابات.', 'Account inventory record is securely bound to the authorized operator.')}
        />

        {/* Platform Selection Cards */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">{tx('منصة التوصيل التابع لها الحساب *', 'Delivery Platform *')}</label>
          <select
            required
            value={selectedContractId}
            onChange={(event) => handlePlatformChange(event.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-hidden"
          >
            <option value="">اختر عقد منصة نشطاً...</option>
            {contracts.map((contract) => (
              <option key={contract.id} value={contract.id}>
                {contract.platformName || deliveryPlatforms.find((item) => item.id === contract.platformId)?.name || contract.name || 'منصة'}
                {contract.contractNumber ? ` - عقد رقم: ${contract.contractNumber}` : ''}
              </option>
            ))}
          </select>
          {contracts.length === 0 && (
            <p className="mt-1 text-[11px] text-amber-700">لا توجد عقود منصات نشطة. يرجى إضافة عقد أولاً من قسم المنصات والعقود</p>
          )}
        </div>

        {/* Origin Sponsored Driver Linkage */}
        <div className="p-3 bg-emerald-50/50 border border-emerald-200/80 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-emerald-600" />
              <span>{tx('المندوب المكفول صاحب الهوية الأصلية (اختياري)', 'Origin Sponsored Driver (Optional)')}</span>
            </label>
            <span className="text-[10px] text-emerald-700 font-bold">
              {originDriverId ? 'حساب مستخرج من كفالة الشركة' : 'حساب تأجير مستقل'}
            </span>
          </div>

          <select
            value={originDriverId}
            onChange={(e) => handleDriverSelect(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-hidden focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">-- حساب مستقل / بدون ربط بمندوب مكفول --</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.fullName} (إقامة: {d.iqamaNumber}) - المنصة الأساسية: {d.primaryPlatform || d.platformId || 'جاهز'}
              </option>
            ))}
          </select>

          {originDriverId && (
            <p className="text-[10px] text-emerald-800 leading-tight">
              ✓ تم ربط الحساب بهوية الكابتن المكفول، وتمت تعبئة كود الحساب ورقم الجوال تلقائياً.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Account Code */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{tx('كود الحساب الداخلي *', 'Account Internal Code *')}</label>
            <input
              type="text"
              required
              value={accountCode}
              onChange={(e) => setAccountCode(e.target.value)}
              placeholder="e.g. JH-9921"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:bg-white outline-hidden"
            />
          </div>

          {/* App Username */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{tx('اسم مستخدم التطبيق *', 'App Courier Username *')}</label>
            <input
              type="text"
              required
              value={appUsername}
              onChange={(e) => setAppUsername(e.target.value)}
              placeholder="e.g. courier_jh_9921"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white outline-hidden"
            />
          </div>

          {/* Registered Phone */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{tx('رقم الشريحة / الجوال المسجل *', 'Linked Phone / SIM *')}</label>
            <input
              type="text"
              required
              value={registeredPhone}
              onChange={(e) => setRegisteredPhone(e.target.value)}
              placeholder="+966 5x xxx xxxx"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white outline-hidden"
            />
          </div>
        </div>

        {/* Pricing & Rental Rates */}
        <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span>{tx('تسعيرة إيجار الحساب ومبلغ التأمين (SAR)', 'Rental Rates & Security Deposit (SAR)')}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">{tx('الإيجار اليومي', 'Daily Rate')}</label>
              <div className="relative">
                <input
                  type="number"
                  required
                  min={1}
                  value={dailyRate}
                  onChange={(e) => setDailyRate(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold outline-hidden"
                />
                <span className="absolute end-2.5 top-1.5 text-[10px] text-slate-400 font-bold">ر.س</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">{tx('الإيجار الأسبوعي', 'Weekly Rate')}</label>
              <div className="relative">
                <input
                  type="number"
                  required
                  min={1}
                  value={weeklyRate}
                  onChange={(e) => setWeeklyRate(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold outline-hidden"
                />
                <span className="absolute end-2.5 top-1.5 text-[10px] text-slate-400 font-bold">ر.س</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">{tx('الإيجار الشهري', 'Monthly Rate')}</label>
              <div className="relative">
                <input
                  type="number"
                  required
                  min={1}
                  value={monthlyRate}
                  onChange={(e) => setMonthlyRate(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-black text-emerald-700 outline-hidden"
                />
                <span className="absolute end-2.5 top-1.5 text-[10px] text-slate-400 font-bold">ر.س</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">{tx('مبلغ التأمين المسترد', 'Deposit (Refundable)')}</label>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* City */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{tx('نطاق العمل / المدينة *', 'Operating City *')}</label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white outline-hidden"
            >
              <option value="الرياض">الرياض (Riyadh)</option>
              <option value="جدة">جدة (Jeddah)</option>
              <option value="الدمام">الدمام والخبر (Dammam & Khobar)</option>
              <option value="مكة المكرمة">مكة المكرمة (Makkah)</option>
              <option value="المدينة المنورة">المدينة المنورة (Madinah)</option>
              <option value="القصيم">القصيم وبريدة (Qassim)</option>
              <option value="أبها وخميس مشيط">أبها والجنوب (Abha)</option>
              <option value="كافة المناطق">كافة المناطق (All KSA)</option>
            </select>
          </div>

          {/* Account Status */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{tx('حالة الحساب الأولية *', 'Initial Status *')}</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as RentedAccountStatus)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white outline-hidden"
            >
              <option value="available">🟢 متاح للتأجير المباشر أو لحزمة مشرف</option>
              <option value="rented">⚡ مؤجر لفريلانسر</option>
              <option value="under_review">🟡 قيد الفحص والتجهيز</option>
              <option value="suspended">🔴 موقوف مؤقتاً</option>
              <option value="banned_by_platform">⛔ محظور من منصة التطبيق</option>
            </select>
          </div>
          {status === 'rented' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {tx('الفريلانسر المستلم للحساب *', 'Freelancer assigned to account *')}
              </label>
              <select
                required
                value={currentFreelancerId}
                onChange={(e) => setCurrentFreelancerId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white outline-hidden"
              >
                <option value="">{tx('اختر الفريلانسر', 'Select a freelancer')}</option>
                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.fullName} {driver.iqamaNumber ? `(${driver.iqamaNumber})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">{tx('ملاحظات وسجل الحساب', 'Notes & Details')}</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={tx('بيانات إضافية عن شريحة الاتصال، الحساب البنكي المربوط، أو اشتراطات خاصة...', 'Additional details...')}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden resize-none"
          />
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
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
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            {loading ? tx('جارٍ الحفظ...', 'Saving...') : initialData ? tx('تحديث بيانات الحساب', 'Update Account') : tx('إضافة الحساب للمخزون', 'Add Account to Pool')}
          </button>
        </div>
      </form>
    </Modal>
  );
};
