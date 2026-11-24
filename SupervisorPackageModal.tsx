import React, { useState, useEffect } from 'react';
import {
  Users,
  Layers,
  Calendar,
  CreditCard,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Package,
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { FinancialAuditBanner } from '../../components/common/FinancialOperatorBadge';
import {
  SupervisorAccountPackage,
  RentedAccountPlatform,
  UserProfile,
  AccountBillingCycle,
  RentedAccount,
} from '../../types';
import { fetchCollection } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

interface SupervisorPackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (packageData: Partial<SupervisorAccountPackage>, allocatedAccountIds: string[]) => Promise<void>;
  initialData?: SupervisorAccountPackage | null;
}

export const SupervisorPackageModal: React.FC<SupervisorPackageModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const { tx } = useLanguage();
  const { currentUser } = useAuth();

  const [supervisors, setSupervisors] = useState<UserProfile[]>([]);
  const [availableAccounts, setAvailableAccounts] = useState<RentedAccount[]>([]);

  const [packageName, setPackageName] = useState('حزمة يوزرات شمال الرياض - 15 حساب');
  const [supervisorId, setSupervisorId] = useState('');
  const [platform, setPlatform] = useState<RentedAccountPlatform>('other');
  const [accountsCount, setAccountsCount] = useState<number>(10);
  const [wholesaleRatePerAccount, setWholesaleRatePerAccount] = useState<number>(600);
  const [suggestedRetailRate, setSuggestedRetailRate] = useState<number>(850);
  const [initialPaymentFromSupervisor, setInitialPaymentFromSupervisor] = useState<number>(3000);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [billingCycle, setBillingCycle] = useState<AccountBillingCycle>('monthly');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadMeta() {
      const [users, accs] = await Promise.all([
        fetchCollection<UserProfile>('users'),
        fetchCollection<RentedAccount>('rented_accounts'),
      ]);
      const sups = users.filter((u) => u.role === 'supervisor' || u.role === 'operations_manager');
      setSupervisors(sups.length > 0 ? sups : users);
      setAvailableAccounts(accs);

      if (!supervisorId && sups.length > 0) {
        setSupervisorId(sups[0].id);
      }
    }
    loadMeta();
  }, [isOpen]);

  useEffect(() => {
    if (initialData) {
      setPackageName(initialData.packageName || '');
      setSupervisorId(initialData.supervisorId || '');
      setPlatform(initialData.platform || 'other');
      setAccountsCount(initialData.accountsCount || 10);
      setWholesaleRatePerAccount(initialData.wholesaleRatePerAccount || 600);
      setSuggestedRetailRate(initialData.suggestedRetailRate || 850);
      setStartDate(initialData.startDate || new Date().toISOString().slice(0, 10));
      setEndDate(initialData.endDate || new Date().toISOString().slice(0, 10));
      setBillingCycle(initialData.billingCycle || 'monthly');
      setNotes(initialData.notes || '');
    }
  }, [initialData, isOpen]);

  const totalWholesaleDue = accountsCount * wholesaleRatePerAccount;
  const estimatedSupervisorProfit = accountsCount * (suggestedRetailRate - wholesaleRatePerAccount);
  const supervisorBalanceDue = Math.max(0, totalWholesaleDue - initialPaymentFromSupervisor);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const selSup = supervisors.find((s) => s.id === supervisorId);
    const selPlat = availableAccounts.find((account) => account.platform === platform);

    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const packageNum = initialData?.packageNumber || `PKG-SUP-${new Date().getFullYear()}-${randomSuffix}`;
    const fraudCode = `SEC-PKG-${Math.floor(100000 + Math.random() * 900000)}`;

    // Pick available accounts matching the platform or newly allocated
    const matchingAccounts = availableAccounts
      .filter((a) => a.platform === platform && a.status === 'available')
      .slice(0, accountsCount)
      .map((a) => a.id);

    await onSubmit(
      {
        packageNumber: packageNum,
        packageName,
        supervisorId,
        supervisorName: selSup ? selSup.fullName : 'مشرف ميداني',
        supervisorPhone: selSup?.phone || '+966 50 000 0000',
        platform,
        platformName: selPlat?.platformName || platform,
        accountsCount: Number(accountsCount),
        accountIds: matchingAccounts,
        activeRentedCount: 0,
        availableInPackageCount: Number(accountsCount),
        wholesaleRatePerAccount: Number(wholesaleRatePerAccount),
        suggestedRetailRate: Number(suggestedRetailRate),
        totalWholesaleDue,
        totalCollectedFromSupervisor: Number(initialPaymentFromSupervisor),
        supervisorBalanceDue,
        supervisorMarginEstimate: estimatedSupervisorProfit,
        startDate,
        endDate,
        billingCycle,
        status: 'active',
        managedById: currentUser?.id || 'sys',
        managedByName: currentUser?.fullName || 'إدارة العمليات',
        managedByRole: currentUser?.role || 'operations_manager',
        fraudVerificationCode: fraudCode,
        notes,
      },
      matchingAccounts
    );

    setLoading(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? tx('تعديل حزمة يوزرات المشرف', 'Edit Supervisor Package') : tx('تسليم حزمة يوزرات بالجملة لمشرف ميداني', 'Hand Over Wholesale Account Package to Field Supervisor')}
      subtitle={tx('تخصيص كوتة حسابات للمشرف الميداني بسعر الجملة ليتولى إدارتها وتأجيرها للكباتن', 'Allocate account quota to supervisor at wholesale rate for field distribution and profit sharing')}
      maxWidth="4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Anti-Fraud Banner */}
        <FinancialAuditBanner
          currentUserFullName={currentUser?.fullName}
          currentUserRole={currentUser?.role}
          actionDescription={tx('يتم توثيق اتفاقية توريد الحزم للمشرف الميداني بسعر الجملة وتتبع تحصيلات الشركة دورياً.', 'Wholesale supervisor package terms are officially bound to the operator.')}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Package Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{tx('مسمى الحزمة التشغيلية *', 'Package Name *')}</label>
            <input
              type="text"
              required
              value={packageName}
              onChange={(e) => setPackageName(e.target.value)}
              placeholder="e.g. حزمة شمال الرياض - 15 حساب"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white outline-hidden"
            />
          </div>

          {/* Supervisor selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{tx('المشرف الميداني المستلم *', 'Target Field Supervisor *')}</label>
            <select
              required
              value={supervisorId}
              onChange={(e) => setSupervisorId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white outline-hidden"
            >
              {supervisors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName} ({s.phone}) - {s.jobTitle || 'مشرف ميداني'}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Platform */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{tx('منصة الحسابات *', 'Platform *')}</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as RentedAccountPlatform)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white outline-hidden"
            >
              {[...new Map(availableAccounts.filter((account) => account.status === 'available').map((account) => [account.platform, account])).values()].map((account) => (
                <option key={account.platform} value={account.platform}>{account.platformName}</option>
              ))}
            </select>
          </div>

          {/* Accounts Quota */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{tx('عدد الحسابات في الحزمة (كوتة اليوزرات) *', 'Accounts Quota Count *')}</label>
            <input
              type="number"
              required
              min={1}
              max={100}
              value={accountsCount}
              onChange={(e) => setAccountsCount(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-black text-slate-900 focus:bg-white outline-hidden"
            />
          </div>
        </div>

        {/* Wholesale Business Model Calculator Card */}
        <div className="p-4 bg-linear-to-br from-slate-900 to-slate-800 text-white rounded-2xl shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-700 pb-2.5">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-slate-100">{tx('نموذج تسعير الجملة وهوامش ربح المشرف', 'Wholesale Pricing & Supervisor Profit Margin')}</span>
            </div>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold">
              {accountsCount} {tx('حساب مؤجر', 'Accounts')}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block">{tx('سعر الجملة للشركة (للحساب)', 'Wholesale Cost/Account')}</span>
              <input
                type="number"
                value={wholesaleRatePerAccount}
                onChange={(e) => setWholesaleRatePerAccount(Number(e.target.value))}
                className="w-full mt-1 px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono font-bold text-amber-400 outline-hidden"
              />
            </div>

            <div>
              <span className="text-[10px] text-slate-400 block">{tx('سعر التأجير المقترح للكابتن', 'Suggested Retail/Courier')}</span>
              <input
                type="number"
                value={suggestedRetailRate}
                onChange={(e) => setSuggestedRetailRate(Number(e.target.value))}
                className="w-full mt-1 px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-200 outline-hidden"
              />
            </div>

            <div>
              <span className="text-[10px] text-slate-400 block">{tx('مستحقات الشركة الإجمالية', 'Total Company Due')}</span>
              <p className="text-base font-mono font-black text-emerald-400 mt-1">
                {totalWholesaleDue.toLocaleString()} <span className="text-[10px] font-sans">ر.س</span>
              </p>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 block">{tx('ربح المشرف التقديري', 'Supervisor Profit Margin')}</span>
              <p className="text-base font-mono font-black text-indigo-400 mt-1">
                +{estimatedSupervisorProfit.toLocaleString()} <span className="text-[10px] font-sans">ر.س</span>
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-700/80 flex flex-wrap items-center justify-between text-xs text-slate-300">
            <span>{tx('المبلغ المسدد مقدماً من المشرف:', 'Supervisor Advance Handover:')}</span>
            <input
              type="number"
              value={initialPaymentFromSupervisor}
              onChange={(e) => setInitialPaymentFromSupervisor(Number(e.target.value))}
              placeholder="0.00"
              className="w-32 px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono font-bold text-emerald-400 outline-hidden"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Start Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{tx('تاريخ بدء تسليم الحزمة *', 'Handover Start Date *')}</label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:bg-white outline-hidden"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{tx('تاريخ نهاية الدورة والتسوية *', 'Settlement End Date *')}</label>
            <input
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:bg-white outline-hidden"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">{tx('ملاحظات واتفاقية الحزمة', 'Package Agreement Notes')}</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={tx('يلتزم المشرف الميداني بتسوية مستحقات الشركة نهاية كل شهر ومتابعة نشاط الحسابات...', 'Notes...')}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden resize-none"
          />
        </div>

        {/* Actions */}
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
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            {loading ? tx('جارٍ الإصدار...', 'Creating...') : tx('اعتماد تسليم الحزمة للمشرف', 'Issue Package to Supervisor')}
          </button>
        </div>
      </form>
    </Modal>
  );
};
