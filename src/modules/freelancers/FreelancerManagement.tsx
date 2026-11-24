import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Users,
  PlusCircle,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Layers,
  DollarSign,
  TrendingUp,
  CreditCard,
  Building,
  UserCheck,
  Eye,
  Trash2,
  Check,
  Ban,
  Package,
  Clock,
  Sparkles,
  BarChart3,
  ArrowUpDown,
  Smartphone,
  ShieldCheck,
  Printer,
  Download,
} from 'lucide-react';
import { Table, Column } from '../../components/common/Table';
import { StatCard } from '../../components/common/StatCard';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { DeleteWithPasswordModal } from '../../components/common/DeleteWithPasswordModal';
import { FinancialOperatorBadge } from '../../components/common/FinancialOperatorBadge';
import { RentedAccountModal } from './RentedAccountModal';
import { FreelancerRentalModal } from './FreelancerRentalModal';
import { SupervisorPackageModal } from './SupervisorPackageModal';
import { FreelancerPaymentModal } from './FreelancerPaymentModal';
import { RentalVoucherModal } from './RentalVoucherModal';
import { printFreelancerRentalVoucher } from '../../utils/printDocumentHelpers';
import {
  RentedAccount,
  FreelancerRental,
  SupervisorAccountPackage,
  FreelancerPayment,
  Driver,
  RentedAccountPlatform,
  RentedAccountStatus,
} from '../../types';
import {
  subscribeToCollection,
  createDocument,
  updateDocument,
  deleteDocument,
  softDeleteDocumentWithPassword,
  fetchCollection,
} from '../../services/dataService';
import { syncRegisteredRentedAccountsToActiveContracts } from '../../services/freelancerSyncService';
import { logAuditAction } from '../../services/auditService';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export const FreelancerManagement: React.FC = () => {
  const { currentUser, canAccess } = useAuth();
  const { t, tx, language } = useLanguage();

  // Collections State
  const [accounts, setAccounts] = useState<RentedAccount[]>([]);
  const [rentals, setRentals] = useState<FreelancerRental[]>([]);
  const [packages, setPackages] = useState<SupervisorAccountPackage[]>([]);
  const [payments, setPayments] = useState<FreelancerPayment[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);

  // Sub-tabs navigation
  const [activeSubTab, setActiveSubTab] = useState<'accounts' | 'direct_rentals' | 'supervisor_packages' | 'payments' | 'analytics'>('accounts');

  // Filters
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [originFilter, setOriginFilter] = useState<string>('all');
  const [isBatchSyncing, setIsBatchSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Modals state
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<RentedAccount | null>(null);

  const [isRentalModalOpen, setIsRentalModalOpen] = useState(false);
  const [editingRental, setEditingRental] = useState<FreelancerRental | null>(null);
  const [preselectedAccountId, setPreselectedAccountId] = useState<string>('');
  const [preselectedDriverId, setPreselectedDriverId] = useState<string>('');

  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<SupervisorAccountPackage | null>(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [preselectedRentalIdForPay, setPreselectedRentalIdForPay] = useState<string>('');
  const [preselectedPackageIdForPay, setPreselectedPackageIdForPay] = useState<string>('');

  const [voucherRental, setVoucherRental] = useState<FreelancerRental | null>(null);
  const [voucherPackage, setVoucherPackage] = useState<SupervisorAccountPackage | null>(null);

  // Deletion state
  const [accountToDelete, setAccountToDelete] = useState<RentedAccount | null>(null);
  const [rentalToDelete, setRentalToDelete] = useState<FreelancerRental | null>(null);
  const [packageToDelete, setPackageToDelete] = useState<SupervisorAccountPackage | null>(null);

  useEffect(() => {
    const unsubAccs = subscribeToCollection<RentedAccount>('rented_accounts', setAccounts);
    const unsubRentals = subscribeToCollection<FreelancerRental>('freelancer_rentals', setRentals);
    const unsubPkgs = subscribeToCollection<SupervisorAccountPackage>('supervisor_account_packages', setPackages);
    const unsubPays = subscribeToCollection<FreelancerPayment>('freelancer_payments', setPayments);

    async function loadMeta() {
      const d = await fetchCollection<Driver>('drivers');
      setDrivers(d);
    }
    loadMeta();

    return () => {
      unsubAccs();
      unsubRentals();
      unsubPkgs();
      unsubPays();
    };
  }, []);

  // --- Handlers: Rented Account Pool ---
  const handleSaveAccount = async (data: Partial<RentedAccount>) => {
    if (editingAccount) {
      await updateDocument<RentedAccount>('rented_accounts', editingAccount.id, {
        ...data,
        updatedAt: new Date().toISOString(),
      });
      await logAuditAction(
        currentUser,
        'UPDATE_RENTED_ACCOUNT',
        'rented_accounts',
        editingAccount.id,
        `تعديل حساب مؤجر: ${data.platformName} (${data.accountCode})`
      );
      setEditingAccount(null);
    } else {
      const id = await createDocument<Omit<RentedAccount, 'id'>>('rented_accounts', {
        ...data,
        createdAt: new Date().toISOString(),
      } as any);
      await logAuditAction(
        currentUser,
        'CREATE_RENTED_ACCOUNT',
        'rented_accounts',
        id,
        `إضافة حساب جديد لمخزون التأجير: ${data.platformName} (${data.accountCode}) بسعر ${data.monthlyRate} ر.س شهرياً`
      );
    }
    setIsAccountModalOpen(false);
  };

  const handleDeleteAccount = async (reason: string) => {
    if (!accountToDelete || !currentUser) return;
    await softDeleteDocumentWithPassword(
      'rented_accounts',
      accountToDelete.id,
      `حساب فريلانسر مؤجر: ${accountToDelete.platformName} (${accountToDelete.accountCode})`,
      accountToDelete,
      currentUser,
      reason,
      `السعر الشهري: ${accountToDelete.monthlyRate} ر.س • الحالة: ${accountToDelete.status}`
    );
    await logAuditAction(
      currentUser,
      'SOFT_DELETE_RENTED_ACCOUNT',
      'rented_accounts',
      accountToDelete.id,
      `حذف ونقل حساب التأجير رقم ${accountToDelete.accountCode} لسلة المحذوفات (${reason})`
    );
    setAccountToDelete(null);
  };

  const handleDeleteRental = async (reason: string) => {
    if (!rentalToDelete || !currentUser) return;
    await softDeleteDocumentWithPassword(
      'freelancer_rentals',
      rentalToDelete.id,
      `عقد تأجير فريلانسر: #${rentalToDelete.rentalNumber} (${rentalToDelete.driverName})`,
      rentalToDelete,
      currentUser,
      reason,
      `المنصة: ${rentalToDelete.platformName} • الإيجار: ${rentalToDelete.rentAmount} ر.س/شهر`
    );
    await logAuditAction(
      currentUser,
      'SOFT_DELETE_RENTAL',
      'freelancer_rentals',
      rentalToDelete.id,
      `حذف ونقل عقد تأجير الفريلانسر رقم ${rentalToDelete.rentalNumber} لسلة المحذوفات (${reason})`
    );
    setRentalToDelete(null);
  };

  // --- Handlers: Direct Freelancer Rentals ---
  const handleSaveRental = async (
    data: Partial<FreelancerRental>,
    accountObj?: RentedAccount,
    customDriverData?: { isNew: boolean; fullName: string; iqamaNumber: string; phone: string }
  ) => {
    let finalDriverId = data.driverId;
    if (!currentUser) throw new Error('يجب تسجيل الدخول قبل إنشاء عقد تأجير.');

    // If new freelancer driver was entered manually, register him in drivers collection as freelancer
    if (customDriverData && customDriverData.fullName) {
      const existing = drivers.find(
        (d) =>
          (customDriverData.iqamaNumber && d.iqamaNumber === customDriverData.iqamaNumber) ||
          d.fullName.trim() === customDriverData.fullName.trim()
      );
      if (!existing && !customDriverData.iqamaNumber.trim()) {
        throw new Error('رقم الهوية مطلوب لإنشاء سجل سائق حقيقي.');
      }
      if (!existing && customDriverData.iqamaNumber) {
        const createdDriverId = await createDocument<Omit<Driver, 'id'>>('drivers', {
          fullName: customDriverData.fullName,
          iqamaNumber: customDriverData.iqamaNumber,
          phone: customDriverData.phone,
          employmentType: 'freelancer_rented',
          status: 'active',
          rentedAccountId: data.accountId,
          rentedAccountCode: data.accountCode,
          nationality: '',
          startDate: data.startDate || new Date().toISOString().slice(0, 10),
          iqamaExpiryDate: '',
          licenseNumber: '',
          licenseType: '',
          licenseExpiryDate: '',
          createdAt: new Date().toISOString(),
        } as any);
        finalDriverId = createdDriverId;
      } else if (existing) {
        finalDriverId = existing.id;
        await updateDocument<Driver>('drivers', existing.id, {
          employmentType: 'freelancer_rented',
          rentedAccountId: data.accountId,
          rentedAccountCode: data.accountCode,
          phone: customDriverData.phone || existing.phone,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    if (!finalDriverId) throw new Error('تعذر إسناد عقد التأجير إلى سجل سائق موجود.');

    const id = await createDocument<Omit<FreelancerRental, 'id'>>('freelancer_rentals', {
      ...data,
      driverId: finalDriverId,
      createdAt: new Date().toISOString(),
    } as any);

    // Keep the rented account linked to its active freelancer contract.
    if (data.accountId) {
      await updateDocument<RentedAccount>('rented_accounts', data.accountId, {
        status: 'rented',
        assignedType: 'direct_driver',
        currentDriverId: finalDriverId,
        currentFreelancerId: finalDriverId,
        currentDriverName: data.driverName,
        currentDriverPhone: data.driverPhone,
        currentDriverIqama: data.driverIqama,
        currentRentalId: id,
        rentedAt: data.startDate,
        totalRentalRevenue: (accountObj?.totalRentalRevenue || 0) + (data.totalPaid || 0),
        updatedAt: new Date().toISOString(),
      });
    }

    // Update driver record to reflect freelancer employment status
    if (finalDriverId) {
      await updateDocument<Driver>('drivers', finalDriverId, {
        employmentType: 'freelancer_rented',
        rentedAccountId: data.accountId,
        rentedAccountCode: data.accountCode,
        updatedAt: new Date().toISOString(),
      });
    }

    // If initial payment was made, log automatic payment receipt with payment method
    if (data.totalPaid && data.totalPaid > 0) {
      await createDocument<Omit<FreelancerPayment, 'id'>>('freelancer_payments', {
        paymentNumber: `RCP-RNT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        rentalId: id,
        rentalNumber: data.rentalNumber,
        payerType: 'freelancer_driver',
          payerId: finalDriverId,
          payerName: data.driverName || '',
        payerPhone: data.driverPhone,
        payerIqama: data.driverIqama,
        amount: data.totalPaid,
        paymentDate: data.startDate || new Date().toISOString().slice(0, 10),
        paymentMethod: data.paymentMethod || 'cash',
        referenceNumber: data.paymentReference,
          receivedById: currentUser.id,
        receivedByName: currentUser?.fullName || 'المسؤول المالي',
        receivedByRole: currentUser?.role || 'operations_manager',
        fraudVerificationCode: data.fraudVerificationCode,
        notes: `دفعة عقد تأجير الحساب #${data.rentalNumber} (${data.paymentStatus === 'paid_full' ? 'مسدد بالكامل' : 'دفعة مقدمة'})`,
        createdAt: new Date().toISOString(),
      } as any);
    }

    await logAuditAction(
      currentUser,
      'CREATE_FREELANCER_RENTAL',
      'freelancer_rentals',
      id,
      `إصدار عقد تأجير حساب ${data.accountCode} (${data.platformName}) للكابتن ${data.driverName} (إقامة: ${data.driverIqama}) - حالة السداد: ${data.paymentStatus === 'paid_full' ? 'مسدد بالكامل' : data.paymentStatus === 'unpaid' ? 'آجل' : 'مسدد جزئياً'}`
    );

    setIsRentalModalOpen(false);
  };

  // --- Handlers: Supervisor Wholesale Packages ---
  const handleSavePackage = async (data: Partial<SupervisorAccountPackage>, allocatedAccountIds: string[]) => {
    const id = await createDocument<Omit<SupervisorAccountPackage, 'id'>>('supervisor_account_packages', {
      ...data,
      createdAt: new Date().toISOString(),
    } as any);

    // Update allocated accounts to assigned_to_supervisor
    for (const accId of allocatedAccountIds) {
      await updateDocument<RentedAccount>('rented_accounts', accId, {
        status: 'assigned_to_supervisor',
        assignedType: 'supervisor_package',
        currentSupervisorId: data.supervisorId,
        currentSupervisorName: data.supervisorName,
        currentPackageId: id,
        updatedAt: new Date().toISOString(),
      });
    }

    // If supervisor paid initial advance, record payment
    if (data.totalCollectedFromSupervisor && data.totalCollectedFromSupervisor > 0) {
      await createDocument<Omit<FreelancerPayment, 'id'>>('freelancer_payments', {
        paymentNumber: `RCP-PKG-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        packageId: id,
        packageNumber: data.packageNumber,
        payerType: 'field_supervisor',
        payerId: data.supervisorId || 'sup',
        payerName: data.supervisorName || 'مشرف ميداني',
        payerPhone: data.supervisorPhone,
        amount: data.totalCollectedFromSupervisor,
        paymentDate: data.startDate || new Date().toISOString().slice(0, 10),
        paymentMethod: 'bank_transfer',
        receivedById: currentUser?.id || 'sys',
        receivedByName: currentUser?.fullName || 'المسؤول المالي',
        receivedByRole: currentUser?.role || 'operations_manager',
        fraudVerificationCode: data.fraudVerificationCode,
        notes: `دفعة مقدمة من المشرف الميداني لحزمة ${data.packageName}`,
        createdAt: new Date().toISOString(),
      } as any);
    }

    await logAuditAction(
      currentUser,
      'CREATE_SUPERVISOR_PACKAGE',
      'supervisor_account_packages',
      id,
      `تسليم حزمة ${data.packageName} (${data.accountsCount} حساب ${data.platformName}) للمشرف ${data.supervisorName} بالجملة (${data.wholesaleRatePerAccount} ر.س/حساب)`
    );

    setIsPackageModalOpen(false);
  };

  // --- Handlers: Rent Payments ---
  const handleSavePayment = async (data: Partial<FreelancerPayment>) => {
    const id = await createDocument<Omit<FreelancerPayment, 'id'>>('freelancer_payments', {
      ...data,
      createdAt: new Date().toISOString(),
    } as any);

    // If payment belongs to direct rental, update rental balance
    if (data.rentalId) {
      const r = rentals.find((item) => item.id === data.rentalId);
      if (r) {
        const newPaid = (r.totalPaid || 0) + (data.amount || 0);
        const newBalance = Math.max(0, (r.totalBilled || 0) - newPaid);
        await updateDocument<FreelancerRental>('freelancer_rentals', r.id, {
          totalPaid: newPaid,
          paidAmount: newPaid,
          balanceDue: newBalance,
          lastPaymentDate: data.paymentDate,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    // If payment belongs to supervisor package, update package balance
    if (data.packageId) {
      const p = packages.find((item) => item.id === data.packageId);
      if (p) {
        const newPaid = (p.totalCollectedFromSupervisor || 0) + (data.amount || 0);
        const newBalance = Math.max(0, (p.totalWholesaleDue || 0) - newPaid);
        await updateDocument<SupervisorAccountPackage>('supervisor_account_packages', p.id, {
          totalCollectedFromSupervisor: newPaid,
          supervisorBalanceDue: newBalance,
          status: newBalance <= 0 ? 'settled' : p.status,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    await logAuditAction(
      currentUser,
      'COLLECT_RENT_PAYMENT',
      'freelancer_payments',
      id,
      `تحصيل إيجار حساب بقيمة ${data.amount} ر.س من ${data.payerName} (${data.paymentMethod})`
    );

    setIsPaymentModalOpen(false);
  };

  // --- Batch Auto-Generate from All Sponsored Drivers ---
  const handleBatchSyncAllDrivers = async () => {
    setIsBatchSyncing(true);
    setSyncFeedback(null);
    try {
      const result = await syncRegisteredRentedAccountsToActiveContracts();
      setSyncFeedback(`تم ربط ${result.linkedCount} حساب بعقود نشطة. لم يمكن ربط ${result.skippedCount} حساب لعدم وجود عقد منصة مطابق.`);
      setTimeout(() => setSyncFeedback(null), 5000);
    } catch (err) {
      console.error('Error syncing driver freelance accounts:', err);
      setSyncFeedback('حدث خطأ أثناء مزامنة حسابات المناديب.');
    } finally {
      setIsBatchSyncing(false);
    }
  };

  // --- KPI Calculations ---
  const totalAccountsCount = accounts.length;
  const availableAccountsCount = accounts.filter((a) => a.status === 'available').length;
  const directRentedAccountsCount = accounts.filter((a) => a.status === 'rented_direct' || a.status === 'rented').length;
  const supervisorAssignedAccountsCount = accounts.filter((a) => a.status === 'assigned_to_supervisor').length;
  const sponsoredOriginAccountsCount = accounts.filter((a) => a.isOriginSponsoredDriver || !!a.originDriverId).length;
  const activeOccupancyRate = totalAccountsCount > 0
    ? Math.round(((directRentedAccountsCount + supervisorAssignedAccountsCount) / totalAccountsCount) * 100)
    : 0;

  const totalCollectedRevenue = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
  const totalOutstandingRentalsDue = rentals.reduce((acc, r) => acc + (r.balanceDue || 0), 0);
  const totalOutstandingSupervisorDue = packages.reduce((acc, p) => acc + (p.supervisorBalanceDue || 0), 0);
  const totalReceivables = totalOutstandingRentalsDue + totalOutstandingSupervisorDue;

  const totalDepositsHeld = rentals
    .filter((r) => r.depositStatus === 'held')
    .reduce((acc, r) => acc + (r.securityDeposit || 0), 0);

  // Filtered Accounts
  const filteredAccounts = accounts.filter((acc) => {
    if (platformFilter !== 'all' && acc.platform !== platformFilter) return false;
    if (statusFilter !== 'all' && acc.status !== statusFilter) return false;
    if (originFilter === 'sponsored' && !acc.isOriginSponsoredDriver && !acc.originDriverId) return false;
    if (originFilter === 'standalone' && (acc.isOriginSponsoredDriver || !!acc.originDriverId)) return false;
    return true;
  });

  const platformBadgeColor: Record<string, string> = {
    jahez: 'bg-red-100 text-red-800 border-red-200',
    hungerstation: 'bg-amber-100 text-amber-800 border-amber-200',
    keeta: 'bg-yellow-100 text-yellow-900 border-yellow-300',
    toyou: 'bg-blue-100 text-blue-800 border-blue-200',
    ninja: 'bg-purple-100 text-purple-800 border-purple-200',
    mrsool: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    barq: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    careem_box: 'bg-teal-100 text-teal-800 border-teal-200',
    other: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const statusBadgeInfo: Record<RentedAccountStatus, { label: string; color: string }> = {
    available: { label: tx('🟢 متاح للتأجير', 'Available'), color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    rented_direct: { label: tx('⚡ مؤجر لكابتن فريلانسر', 'Rented to Courier'), color: 'bg-blue-100 text-blue-800 border-blue-300' },
    rented: { label: tx('⚡ مؤجر لكابتن فريلانسر', 'Rented to Freelancer'), color: 'bg-blue-100 text-blue-800 border-blue-300' },
    assigned_to_supervisor: { label: tx('📦 مسلّم لحزمة مشرف', 'Supervisor Quota'), color: 'bg-purple-100 text-purple-800 border-purple-300' },
    suspended: { label: tx('🔴 موقوف مؤقتاً', 'Suspended'), color: 'bg-rose-100 text-rose-800 border-rose-300' },
    under_review: { label: tx('🟡 قيد التجهيز', 'Under Review'), color: 'bg-amber-100 text-amber-800 border-amber-300' },
    banned_by_platform: { label: tx('⛔ محظور بالمنصة', 'Platform Banned'), color: 'bg-slate-200 text-slate-800 border-slate-300' },
  };

  // Columns: Rented Accounts Pool
  const accountColumns: Column<RentedAccount>[] = [
    {
      header: tx('كود الحساب والمنصة', 'Account & Platform'),
      accessor: 'accountCode',
      sortable: true,
      render: (a) => (
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-mono font-black text-xs text-slate-900">{a.accountCode}</span>
            <span className={`px-2 py-0.2 rounded-md text-[10px] font-bold border ${platformBadgeColor[a.platform] || 'bg-slate-100 text-slate-700'}`}>
              {a.platformName}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
            {a.appUsername} • {a.registeredPhone}
          </span>
          {a.originDriverName ? (
            <div className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-md bg-amber-50/80 text-amber-900 text-[10px] font-bold border border-amber-200">
              <Sparkles className="w-2.5 h-2.5 text-amber-600 shrink-0" />
              <span>
                مستخرج من الكابتن: {a.originDriverName} (إقامة: {a.originDriverIqama})
              </span>
            </div>
          ) : (
            <span className="inline-block mt-0.5 text-[9px] text-slate-400 font-semibold">حساب مستقل</span>
          )}
        </div>
      ),
    },
    {
      header: tx('حالة الحساب والمستأجر', 'Status & Current Tenant'),
      accessor: 'status',
      sortable: true,
      render: (a) => (
        <div>
          <span className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-bold border ${statusBadgeInfo[a.status]?.color}`}>
            {statusBadgeInfo[a.status]?.label || a.status}
          </span>
          {(a.status === 'rented_direct' || a.status === 'rented') && a.currentDriverName && (
            <p className="text-xs font-bold text-slate-800 mt-1 flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>{a.currentDriverName}</span>
            </p>
          )}
          {a.status === 'assigned_to_supervisor' && a.currentSupervisorName && (
            <p className="text-xs font-bold text-purple-900 mt-1 flex items-center gap-1">
              <Package className="w-3.5 h-3.5 text-purple-600" />
              <span>{a.currentSupervisorName}</span>
            </p>
          )}
        </div>
      ),
    },
    {
      header: tx('تسعيرة الإيجار (شهري / يومي)', 'Rates (Monthly / Daily)'),
      accessor: 'monthlyRate',
      sortable: true,
      render: (a) => (
        <div>
          <span className="font-mono font-black text-emerald-700 text-xs block">
            {a.monthlyRate.toLocaleString()} {t('sar')}<span className="text-[10px] font-normal text-slate-400">/شهر</span>
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {a.dailyRate} {t('sar')}/يوم • تأمين: {a.securityDeposit} {t('sar')}
          </span>
        </div>
      ),
    },
    {
      header: tx('المدينة والنطاق', 'City / Scope'),
      accessor: 'city',
      render: (a) => (
        <span className="text-xs font-semibold text-slate-700">{a.city}</span>
      ),
    },
    {
      header: tx('إجمالي الإيراد المحقق', 'Total Revenue'),
      accessor: 'totalRentalRevenue',
      sortable: true,
      render: (a) => (
        <span className="font-mono font-bold text-slate-900 text-xs">
          {(a.totalRentalRevenue || 0).toLocaleString()} {t('sar')}
        </span>
      ),
    },
    {
      header: tx('الإجراءات', 'Actions'),
      className: 'text-end',
      render: (a) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {a.status === 'available' && (
            <button
              type="button"
              onClick={() => {
                setPreselectedAccountId(a.id);
                setIsRentalModalOpen(true);
              }}
              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-lg cursor-pointer flex items-center gap-1"
              title={tx('تأجير لكابتن فريلانسر', 'Rent to courier')}
            >
              <UserCheck className="w-3 h-3" />
              <span>{tx('تأجير', 'Rent')}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setEditingAccount(a);
              setIsAccountModalOpen(true);
            }}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
            title={tx('تعديل الحساب', 'Edit Account')}
          >
            <KeyRound className="w-3.5 h-3.5" />
          </button>

          {canAccess(['general_manager', 'operations_manager']) && (
            <button
              type="button"
              onClick={() => setAccountToDelete(a)}
              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
              title={tx('حذف الحساب', 'Delete')}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  // Columns: Direct Freelancer Rentals
  const rentalColumns: Column<FreelancerRental>[] = [
    {
      header: tx('رقم العقد والتاريخ', 'Rental # & Date'),
      accessor: 'rentalNumber',
      sortable: true,
      render: (r) => (
        <div>
          <span className="font-mono font-bold text-slate-900 text-xs block">{r.rentalNumber}</span>
          <span className="text-[10px] text-slate-400 font-mono">{r.startDate}</span>
        </div>
      ),
    },
    {
      header: tx('الكابتن المستأجر', 'Courier Driver'),
      accessor: 'driverName',
      sortable: true,
      render: (r) => (
        <div>
          <p className="font-bold text-slate-900 text-xs">{r.driverName}</p>
          <p className="text-[10px] text-slate-400 font-mono">
            {r.driverIqama} • {r.driverPhone}
          </p>
        </div>
      ),
    },
    {
      header: tx('الحساب المؤجر', 'Rented Account'),
      accessor: 'accountCode',
      render: (r) => (
        <div>
          <span className="font-bold text-slate-800 text-xs block">{r.platformName}</span>
          <span className="text-[10px] font-mono text-indigo-600 font-bold">كود: {r.accountCode}</span>
        </div>
      ),
    },
    {
      header: tx('قيمة الإيجار والدورة', 'Rent & Cycle'),
      accessor: 'rentAmount',
      sortable: true,
      render: (r) => (
        <div>
          <span className="font-mono font-bold text-emerald-700 text-xs block">
            {r.rentAmount.toLocaleString()} {t('sar')}
          </span>
          <span className="text-[10px] text-slate-400 capitalize">
            {r.billingCycle === 'monthly' ? 'شهري' : r.billingCycle === 'weekly' ? 'أسبوعي' : 'يومي'}
          </span>
        </div>
      ),
    },
    {
      header: tx('حالة السداد والتحصيل', 'Payment Status & Paid'),
      accessor: 'balanceDue',
      sortable: true,
      render: (r) => {
        const isPaidFull = r.balanceDue === 0 || r.paymentStatus === 'paid_full';
        const isUnpaid = r.totalPaid === 0 || r.paymentStatus === 'unpaid';
        const statusBadge = isPaidFull ? (
          <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            🟢 مسدد بالكامل
          </span>
        ) : isUnpaid ? (
          <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
            🔴 غير مسدد (آجل)
          </span>
        ) : (
          <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
            🟡 مسدد جزئياً
          </span>
        );

        return (
          <div className="space-y-1">
            {statusBadge}
            <div className="text-[10px] font-mono font-bold text-slate-700">
              <span>{r.totalPaid.toLocaleString()} ر.س</span>
              {r.balanceDue > 0 && (
                <span className="text-rose-600 ms-1">({tx('متبقي:', 'Due:')} {r.balanceDue.toLocaleString()} ر.س)</span>
              )}
            </div>
            {r.paymentMethod && r.totalPaid > 0 && (
              <span className="text-[9px] text-slate-400 block">
                {r.paymentMethod === 'cash' ? '💵 كاش نقدي' : r.paymentMethod === 'bank_transfer' ? '🏦 تحويل بنكي' : r.paymentMethod === 'pos_network' ? '💳 شبكة / مدى' : '📱 STC Pay'}
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: tx('المسؤول المالي / المعتمد', 'Finance Operator'),
      accessor: 'assignedByName',
      render: (r) => (
        <FinancialOperatorBadge
          name={r.assignedByName}
          role={r.assignedByRole}
          actionTitle={tx('معتمد العقد', 'Contract Issuer')}
          verificationCode={r.fraudVerificationCode}
          variant="inline"
        />
      ),
    },
    {
      header: tx('الإجراءات', 'Actions'),
      className: 'text-end',
      render: (r) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {/* View Voucher */}
          <button
            type="button"
            onClick={() => setVoucherRental(r)}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
            title={tx('معاينة العقد والسند', 'View Contract')}
          >
            <Eye className="w-4 h-4" />
          </button>

          {/* Instant Brand Print Contract */}
          <button
            type="button"
            onClick={() => printFreelancerRentalVoucher(r)}
            className="p-1.5 text-slate-800 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg cursor-pointer transition-colors"
            title={tx('طباعة العقد والسند فوراً (بالهوية الرسمية)', 'Print Contract with Brand')}
          >
            <Printer className="w-4 h-4 text-emerald-600" />
          </button>

          {/* Quick Pay Receipt */}
          <button
            type="button"
            onClick={() => {
              setPreselectedRentalIdForPay(r.id);
              setIsPaymentModalOpen(true);
            }}
            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-lg cursor-pointer flex items-center gap-1"
            title={tx('تحصيل دفعة إيجار', 'Collect Rent')}
          >
            <DollarSign className="w-3 h-3" />
            <span>{tx('سداد', 'Pay')}</span>
          </button>

          {canAccess(['general_manager', 'operations_manager']) && (
            <button
              type="button"
              onClick={() => setRentalToDelete(r)}
              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
              title={tx('حذف العقد', 'Delete')}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  // Columns: Payments Ledger
  const paymentColumns: Column<FreelancerPayment>[] = [
    {
      header: tx('رقم السند والتاريخ', 'Receipt # & Date'),
      accessor: 'paymentNumber',
      sortable: true,
      render: (p) => (
        <div>
          <span className="font-mono font-bold text-slate-900 text-xs block">{p.paymentNumber}</span>
          <span className="text-[10px] text-slate-400 font-mono">{p.paymentDate}</span>
        </div>
      ),
    },
    {
      header: tx('المسدد / الطرف الدافع', 'Payer / Party'),
      accessor: 'payerName',
      sortable: true,
      render: (p) => (
        <div>
          <span className="font-bold text-slate-900 text-xs block">{p.payerName}</span>
          <span className="text-[10px] text-slate-500 font-semibold">
            {p.payerType === 'freelancer_driver' ? '⚡ كابتن فريلانسر' : '📦 مشرف ميداني (حزمة)'}
          </span>
        </div>
      ),
    },
    {
      header: tx('المبلغ المحصل', 'Collected Amount'),
      accessor: 'amount',
      sortable: true,
      render: (p) => (
        <span className="font-mono font-black text-emerald-700 text-sm">
          {p.amount.toLocaleString()} {t('sar')}
        </span>
      ),
    },
    {
      header: tx('طريقة السداد والمرجع', 'Method & Reference'),
      accessor: 'paymentMethod',
      render: (p) => (
        <div>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700">
            {p.paymentMethod === 'bank_transfer' ? 'تحويل بنكي' : p.paymentMethod === 'pos_network' ? 'شبكة مدى' : p.paymentMethod === 'stc_pay' ? 'STC Pay' : 'كاش'}
          </span>
          {p.referenceNumber && (
            <span className="block text-[10px] text-slate-400 font-mono mt-0.5">{p.referenceNumber}</span>
          )}
        </div>
      ),
    },
    {
      header: tx('المسؤول المالي المستلم', 'Received By Officer'),
      accessor: 'receivedByName',
      render: (p) => (
        <FinancialOperatorBadge
          name={p.receivedByName}
          role={p.receivedByRole}
          actionTitle={tx('المستلم المالي', 'Receiver')}
          verificationCode={p.fraudVerificationCode}
          variant="inline"
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Hero Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-linear-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-6 rounded-3xl shadow-sm border border-slate-800">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">
                {tx('إدارة الفريلانسر والحسابات المؤجرة', 'Freelancers & Rented Accounts Management')}
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                {tx(
                  'منظومة تأجير حسابات تطبيقات التوصيل للكباتن المستقلين (بدون كفالة) وإدارة حزم اليوزرات بالجملة للمشرفين الميدانيين.',
                  'Delivery platform rented accounts pool for non-sponsored couriers and wholesale quotas for field supervisors.'
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleBatchSyncAllDrivers}
            disabled={isBatchSyncing}
            className="px-3.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="ربط الحسابات المسجلة بعقود المنصات النشطة"
          >
            <Sparkles className="w-4 h-4 text-slate-950" />
            <span>{isBatchSyncing ? 'جارٍ الربط...' : tx('ربط الحسابات بعقود نشطة', 'Link Accounts to Active Contracts')}</span>
          </button>

          <button
            onClick={() => {
              setEditingAccount(null);
              setIsAccountModalOpen(true);
            }}
            className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{tx('إضافة حساب للمخزون', 'Add Account to Pool')}</span>
          </button>

          <button
            onClick={() => {
              setPreselectedAccountId('');
              setIsRentalModalOpen(true);
            }}
            className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <UserCheck className="w-4 h-4" />
            <span>{tx('تأجير لكابتن فريلانسر', 'Rent to Courier')}</span>
          </button>

          <button
            onClick={() => {
              setEditingPackage(null);
              setIsPackageModalOpen(true);
            }}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Package className="w-4 h-4 text-purple-400" />
            <span>{tx('تسليم حزمة لمشرف', 'Wholesale Quota to Supervisor')}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title={tx('إجمالي مخزون الحسابات', 'Total Account Pool')}
          value={`${totalAccountsCount} ${tx('حساب', 'Accounts')}`}
          subtitle={`${availableAccountsCount} ${tx('متاح للتأجير الفوري', 'Available Now')} • ${activeOccupancyRate}% ${tx('نسبة الإشغال', 'Occupancy')}`}
          icon={KeyRound}
          colorScheme="blue"
        />
        <StatCard
          title={tx('إيرادات التأجير المحصلة', 'Collected Rental Revenue')}
          value={`${totalCollectedRevenue.toLocaleString()} ${t('sar')}`}
          subtitle={`${payments.length} ${tx('سند قبض موثق ومؤمن', 'Certified Receipts')}`}
          icon={TrendingUp}
          colorScheme="emerald"
        />
        <StatCard
          title={tx('مستحقات ومتأخرات الإيجار', 'Rent Receivables Due')}
          value={`${totalReceivables.toLocaleString()} ${t('sar')}`}
          subtitle={`${tx('كباتن:', 'Couriers:')} ${totalOutstandingRentalsDue.toLocaleString()} • ${tx('مشرفين:', 'Sups:')} ${totalOutstandingSupervisorDue.toLocaleString()} ر.س`}
          icon={AlertTriangle}
          colorScheme={totalReceivables > 0 ? 'amber' : 'slate'}
        />
        <StatCard
          title={tx('حزم المشرفين الميدانيين', 'Supervisor Wholesale Quotas')}
          value={`${packages.length} ${tx('حزم نشطة', 'Active Packages')}`}
          subtitle={`${supervisorAssignedAccountsCount} ${tx('حساب مسلم للمشرفين بالجملة', 'Accounts Under Wholesale')}`}
          icon={Package}
          colorScheme="purple"
        />
      </div>

      {/* Sub-tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {[
          { id: 'accounts', label: tx(`مخزون الحسابات واليوزرات (${accounts.length})`, `Account Pool & Inventory (${accounts.length})`), icon: KeyRound },
          { id: 'direct_rentals', label: tx(`عقود الفريلانسر المباشرة (${rentals.length})`, `Direct Courier Rentals (${rentals.length})`), icon: UserCheck },
          { id: 'supervisor_packages', label: tx(`حزم ويوزرات المشرفين الميدانيين (${packages.length})`, `Supervisor Wholesale Quotas (${packages.length})`), icon: Package },
          { id: 'payments', label: tx(`سندات القبض والتحصيل المالي (${payments.length})`, `Rent Payments Ledger (${payments.length})`), icon: Receipt },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
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

      {/* SUB-TAB 1: ACCOUNT POOL */}
      {activeSubTab === 'accounts' && (
        <div className="space-y-4">
          {/* Sync Feedback Toast Banner */}
          {syncFeedback && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-xs font-bold text-emerald-800 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{syncFeedback}</span>
            </div>
          )}

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white border border-slate-200 rounded-2xl">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-500 font-bold flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" />
                <span>{tx('تصفية المنصة:', 'Filter Platform:')}</span>
              </span>
              <select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-hidden"
              >
                <option value="all">{tx('كافة المنصات', 'All Platforms')}</option>
                {[...new Map(accounts.map((account) => [account.platform, account])).values()].map((account) => (
                  <option key={account.platform} value={account.platform}>{account.platformName}</option>
                ))}
                <option value="careem_box">كريم بوكس (Careem Box)</option>
              </select>

              <span className="text-slate-500 font-bold ms-2">{tx('مصدر الحساب:', 'Origin:')}</span>
              <select
                value={originFilter}
                onChange={(e) => setOriginFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-hidden"
              >
                <option value="all">{tx('جميع المصادر', 'All Origins')}</option>
                <option value="sponsored">⭐ مستخرج من مناديب مكفولين ({sponsoredOriginAccountsCount})</option>
                <option value="standalone">🔹 حسابات مستقلة مباشرة</option>
              </select>

              <span className="text-slate-500 font-bold ms-2">{tx('الحالة:', 'Status:')}</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-hidden"
              >
                <option value="all">{tx('جميع الحالات', 'All Statuses')}</option>
                <option value="available">🟢 متاح للتأجير</option>
                <option value="rented">⚡ مؤجر لكابتن فريلانسر</option>
                <option value="assigned_to_supervisor">📦 مسلّم لحزمة مشرف</option>
                <option value="suspended">🔴 موقوف مؤقتاً</option>
                <option value="banned_by_platform">⛔ محظور بالمنصة</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBatchSyncAllDrivers}
                disabled={isBatchSyncing}
                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3 h-3 text-amber-600" />
                <span>{isBatchSyncing ? 'جارٍ الفحص...' : 'ربط العقود النشطة'}</span>
              </button>

              <div className="text-xs text-slate-500 font-mono font-bold">
                {filteredAccounts.length} {tx('حساب مسجل', 'accounts')}
              </div>
            </div>
          </div>

          {/* Accounts Table */}
          <Table<RentedAccount>
            data={filteredAccounts}
            columns={accountColumns}
            keyExtractor={(item) => item.id}
            searchPlaceholder={tx('بحث بكود الحساب، اسم المستخدم، رقم الشريحة...', 'Search account code, user, phone...')}
            exportFileName="fleetops_rented_accounts_pool"
          />
        </div>
      )}

      {/* SUB-TAB 2: DIRECT FREELANCER RENTALS */}
      {activeSubTab === 'direct_rentals' && (
        <div className="space-y-4">
          <Table<FreelancerRental>
            data={rentals}
            columns={rentalColumns}
            keyExtractor={(item) => item.id}
            searchPlaceholder={tx('بحث باسم الكابتن، رقم الإقامة، كود الحساب...', 'Search driver, iqama, account...')}
            exportFileName="fleetops_freelancer_rentals"
          />
        </div>
      )}

      {/* SUB-TAB 3: SUPERVISOR WHOLESALE PACKAGES */}
      {activeSubTab === 'supervisor_packages' && (
        <div className="space-y-4">
          <div className="p-4 bg-purple-50/70 border border-purple-200/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div>
              <h4 className="font-bold text-purple-950">
                {tx('نظام توريد حزم اليوزرات للمشرفين الميدانيين (Wholesale Field Quotas)', 'Field Supervisor Wholesale Quotas & Profit Sharing')}
              </h4>
              <p className="text-purple-800 mt-0.5 leading-relaxed">
                {tx(
                  'يتيح هذا النظام للشركة تسليم المشرف حزمة حسابات (10، 20، 50 حساب) بسعر الجملة الثابت، ويتولى المشرف تأجيرها بالقطاعي للكباتن مع تحصيل أرباحه وتسوية مستحقات الشركة.',
                  'Enables wholesale package delivery to supervisors with profit margin distribution and company revenue protection.'
                )}
              </p>
            </div>

            <button
              onClick={() => {
                setEditingPackage(null);
                setIsPackageModalOpen(true);
              }}
              className="px-4 py-2 bg-purple-800 hover:bg-purple-900 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{tx('تسليم حزمة جديدة لمشرف', 'Issue Package')}</span>
            </button>
          </div>

          {/* Packages Grid Cards */}
          {packages.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
              <Package className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-1" />
              <p className="text-xs font-bold text-slate-700">{tx('لا توجد حزم حسابات مسلمة للمشرفين حالياً', 'No supervisor packages recorded')}</p>
              <p className="text-[11px] text-slate-400 mt-1">
                {tx('انقر على "تسليم حزمة لمشرف" لتخصيص كوتة حسابات بالجملة', 'Click button above to allocate account quota')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {packages.map((pkg) => {
                const isSettled = pkg.supervisorBalanceDue <= 0 && pkg.totalWholesaleDue > 0;

                return (
                  <div
                    key={pkg.id}
                    className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-slate-300 shadow-xs space-y-3.5 transition-all"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <span className="font-mono font-bold text-[11px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md block w-max">
                          {pkg.packageNumber}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm mt-1">{pkg.packageName}</h4>
                      </div>

                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        isSettled ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {isSettled ? tx('مسددة للشركة', 'Settled') : tx('قيد التحصيل', 'Active Balance')}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs">
                      <p className="text-slate-700">
                        {tx('المشرف المستلم:', 'Supervisor:')} <strong className="text-slate-900 font-bold">{pkg.supervisorName}</strong>
                      </p>
                      <p className="text-slate-500 font-mono text-[11px]">{pkg.supervisorPhone}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">{tx('كوتة الحزمة', 'Quota Count')}</span>
                        <strong className="text-slate-900 font-mono font-bold">{pkg.accountsCount} {tx('حساب', 'accs')}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">{tx('سعر الجملة للحساب', 'Wholesale/Acc')}</span>
                        <strong className="text-purple-700 font-mono font-bold">{pkg.wholesaleRatePerAccount} {t('sar')}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">{tx('إجمالي مستحق الشركة', 'Total Wholesale')}</span>
                        <strong className="text-slate-900 font-mono font-bold">{pkg.totalWholesaleDue.toLocaleString()} {t('sar')}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">{tx('متبقي على المشرف', 'Supervisor Due')}</span>
                        <strong className="text-rose-600 font-mono font-black">{pkg.supervisorBalanceDue.toLocaleString()} {t('sar')}</strong>
                      </div>
                    </div>

                    <div className="p-2.5 bg-indigo-50/60 rounded-xl border border-indigo-100 text-[11px] flex items-center justify-between text-indigo-950">
                      <span>{tx('ربح المشرف التقديري:', 'Est. Supervisor Margin:')}</span>
                      <strong className="font-mono font-black text-indigo-700">+{pkg.supervisorMarginEstimate.toLocaleString()} {t('sar')}</strong>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <button
                        type="button"
                        onClick={() => setVoucherPackage(pkg)}
                        className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>{tx('طباعة الاتفاقية', 'Print Contract')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPreselectedPackageIdForPay(pkg.id);
                          setIsPaymentModalOpen(true);
                        }}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold cursor-pointer flex items-center gap-1"
                      >
                        <DollarSign className="w-3 h-3" />
                        <span>{tx('تحصيل من المشرف', 'Collect Due')}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 4: PAYMENTS LEDGER */}
      {activeSubTab === 'payments' && (
        <div className="space-y-4">
          <Table<FreelancerPayment>
            data={payments}
            columns={paymentColumns}
            keyExtractor={(item) => item.id}
            searchPlaceholder={tx('بحث برقم السند، اسم المسدد...', 'Search receipt #, payer name...')}
            exportFileName="fleetops_freelancer_rent_payments"
          />
        </div>
      )}

      {/* MODALS */}
      <RentedAccountModal
        isOpen={isAccountModalOpen}
        onClose={() => {
          setIsAccountModalOpen(false);
          setEditingAccount(null);
        }}
        onSubmit={handleSaveAccount}
        initialData={editingAccount}
      />

      <FreelancerRentalModal
        isOpen={isRentalModalOpen}
        onClose={() => {
          setIsRentalModalOpen(false);
          setEditingRental(null);
          setPreselectedAccountId('');
          setPreselectedDriverId('');
        }}
        onSubmit={handleSaveRental}
        preselectedAccountId={preselectedAccountId}
        preselectedDriverId={preselectedDriverId}
        initialData={editingRental}
      />

      <SupervisorPackageModal
        isOpen={isPackageModalOpen}
        onClose={() => {
          setIsPackageModalOpen(false);
          setEditingPackage(null);
        }}
        onSubmit={handleSavePackage}
        initialData={editingPackage}
      />

      <FreelancerPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setPreselectedRentalIdForPay('');
          setPreselectedPackageIdForPay('');
        }}
        onSubmit={handleSavePayment}
        preselectedRentalId={preselectedRentalIdForPay}
        preselectedPackageId={preselectedPackageIdForPay}
      />

      {/* Printable Vouchers */}
      <RentalVoucherModal
        rental={voucherRental}
        isOpen={!!voucherRental}
        onClose={() => setVoucherRental(null)}
      />

      <RentalVoucherModal
        pkg={voucherPackage}
        isOpen={!!voucherPackage}
        onClose={() => setVoucherPackage(null)}
      />

      {/* Delete With Password Modals */}
      <DeleteWithPasswordModal
        isOpen={!!accountToDelete}
        itemTitle={accountToDelete ? `${accountToDelete.platformName} (${accountToDelete.accountCode})` : ''}
        itemType="حساب مؤجر"
        warningNote="سيتم حفظ بيانات الحساب المؤجر وتاريخه في سلة المحذوفات للمدير العام."
        onConfirm={handleDeleteAccount}
        onClose={() => setAccountToDelete(null)}
      />

      <DeleteWithPasswordModal
        isOpen={!!rentalToDelete}
        itemTitle={rentalToDelete ? `عقد تأجير #${rentalToDelete.rentalNumber} للكابتن ${rentalToDelete.driverName}` : ''}
        itemType="عقد تأجير فريلانسر"
        warningNote="سيتم حفظ تفاصيل العقد والأقساط المستحقة في سلة المحذوفات للمدير العام."
        onConfirm={handleDeleteRental}
        onClose={() => setRentalToDelete(null)}
      />
    </div>
  );
};
