import React, { useState, useEffect } from 'react';
import {
  Banknote,
  PlusCircle,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Users,
  Layers,
  ArrowUpDown,
  Download,
  Eye,
  Trash2,
  Clock,
  ShieldCheck,
  TrendingUp,
  FileSpreadsheet,
  Check,
  Printer,
} from 'lucide-react';
import { Table, Column } from '../../components/common/Table';
import { StatCard } from '../../components/common/StatCard';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { DeleteWithPasswordModal } from '../../components/common/DeleteWithPasswordModal';
import { CashSettlementFormModal } from './CashSettlementFormModal';
import { SettlementVoucherModal } from './SettlementVoucherModal';
import { FinancialOperatorBadge } from '../../components/common/FinancialOperatorBadge';
import { printCashSettlementVoucher } from '../../utils/printDocumentHelpers';
import {
  CashSettlementRecord,
  SettlementStatus,
  SettlementPaymentMethod,
  Driver,
  PlatformContract,
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
import { syncDocument } from '../../services/documentSyncService';

export const CashSettlementManagement: React.FC = () => {
  const { currentUser, canAccess } = useAuth();
  const { t, language } = useLanguage();

  const [settlements, setSettlements] = useState<CashSettlementRecord[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [platforms, setPlatforms] = useState<PlatformContract[]>([]);

  // Sub-tabs
  const [activeSubTab, setActiveSubTab] = useState<'records' | 'balances' | 'platforms'>('records');

  // Filters
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSettlement, setEditingSettlement] = useState<CashSettlementRecord | null>(null);
  const [voucherSettlement, setVoucherSettlement] = useState<CashSettlementRecord | null>(null);
  const [settlementToDelete, setSettlementToDelete] = useState<CashSettlementRecord | null>(null);
  const [preselectedDriverId, setPreselectedDriverId] = useState<string>('');

  useEffect(() => {
    const unsub = subscribeToCollection<CashSettlementRecord>('cash_settlements', setSettlements);
    async function loadMeta() {
      const d = await fetchCollection<Driver>('drivers');
      setDrivers(d);
      const p = await fetchCollection<PlatformContract>('platforms');
      setPlatforms(p);
    }
    loadMeta();
    return () => unsub();
  }, []);

  const handleCreateOrUpdate = async (data: Partial<CashSettlementRecord>) => {
    if (editingSettlement) {
      await updateDocument<CashSettlementRecord>('cash_settlements', editingSettlement.id, data);
      await syncDocument({
        entityType: 'settlement',
        entityId: editingSettlement.id,
        title: `إيصال تسوية كاش - ${data.driverName || editingSettlement.driverName || ''}`,
        fileUrl: data.receiptUrl || data.receiptDocUrl || editingSettlement.receiptUrl || editingSettlement.receiptDocUrl,
        category: 'financial',
      }, currentUser?.id);
      await logAuditAction(
        currentUser,
        'UPDATE_SETTLEMENT',
        'cash_settlements',
        editingSettlement.id,
        `تعديل سند تصفية الكاش رقم ${editingSettlement.settlementNumber}`
      );
      setEditingSettlement(null);
    } else {
      const id = await createDocument<Omit<CashSettlementRecord, 'id'>>('cash_settlements', data as any);
      await syncDocument({
        entityType: 'settlement',
        entityId: id,
        title: `إيصال تسوية كاش - ${data.driverName || ''}`,
        fileUrl: data.receiptUrl || data.receiptDocUrl,
        category: 'financial',
      }, currentUser?.id);
      await logAuditAction(
        currentUser,
        'CREATE_SETTLEMENT',
        'cash_settlements',
        id,
        `تسجيل سند تصفية كاش جديد رقم ${data.settlementNumber} للكابتن ${data.driverName} (${data.collectedAmount} ر.س)`
      );
    }
    setIsFormOpen(false);
  };

  const handleQuickApprove = async (stl: CashSettlementRecord) => {
    await updateDocument<CashSettlementRecord>('cash_settlements', stl.id, {
      status: 'approved',
      reviewedById: currentUser?.id,
      reviewedByName: currentUser?.fullName,
      reviewedByRole: currentUser?.role,
      updatedAt: new Date().toISOString(),
    });
    await logAuditAction(
      currentUser,
      'APPROVE_SETTLEMENT',
      'cash_settlements',
      stl.id,
      `اعتماد سند تصفية الكاش رقم ${stl.settlementNumber} للكابتن ${stl.driverName} بواسطة ${currentUser?.fullName || 'المعتمد'}`
    );
  };

  const handleDeleteConfirm = async (reason: string) => {
    if (!settlementToDelete || !currentUser) return;
    await softDeleteDocumentWithPassword(
      'cash_settlements',
      settlementToDelete.id,
      `سند تصفية كاش: #${settlementToDelete.settlementNumber} (${settlementToDelete.driverName})`,
      settlementToDelete,
      currentUser,
      reason,
      `المبلغ المستلم: ${settlementToDelete.collectedAmount} ر.س • الفارق: ${settlementToDelete.difference} ر.س`
    );
    await logAuditAction(
      currentUser,
      'SOFT_DELETE_SETTLEMENT',
      'cash_settlements',
      settlementToDelete.id,
      `حذف ونقل سند تصفية الكاش رقم ${settlementToDelete.settlementNumber} لسلة المحذوفات (${reason})`
    );
    setSettlementToDelete(null);
  };

  // KPI Calculations
  const approvedSettlements = settlements.filter((s) => s.status === 'approved');
  const pendingSettlements = settlements.filter((s) => s.status === 'pending');
  const totalSettledCash = approvedSettlements.reduce((acc, s) => acc + (s.collectedAmount || 0), 0);
  const totalPendingCash = pendingSettlements.reduce((acc, s) => acc + (s.expectedAmount || s.collectedAmount || 0), 0);

  // Total deficit (where difference < 0)
  const totalDeficit = settlements
    .filter((s) => s.difference < 0)
    .reduce((acc, s) => acc + Math.abs(s.difference), 0);

  // Reconciliation Accuracy
  const totalExpectedAll = settlements.reduce((acc, s) => acc + (s.expectedAmount || 0), 0);
  const totalCollectedAll = settlements.reduce((acc, s) => acc + (s.collectedAmount || 0), 0);
  const matchRate = totalExpectedAll > 0
    ? Math.min(100, (totalCollectedAll / totalExpectedAll) * 100).toFixed(1)
    : '100.0';

  // Filtered settlements for Table
  const filteredSettlements = settlements.filter((s) => {
    if (platformFilter !== 'all') {
      const matchPlat = s.platformId === platformFilter || s.platformName?.includes(platformFilter);
      if (!matchPlat) return false;
    }
    if (statusFilter !== 'all' && s.status !== statusFilter) {
      return false;
    }
    return true;
  });

  const paymentMethodLabels: Record<string, string> = {
    cash_handover: language === 'ar' ? 'كاش مباشر' : 'Cash Handover',
    bank_transfer: language === 'ar' ? 'تحويل بنكي' : 'Bank Transfer',
    pos_network: language === 'ar' ? 'شبكة مدى' : 'Mada POS',
    stc_pay: language === 'ar' ? 'محفظة STC Pay' : 'STC Pay',
    deduction_from_salary: language === 'ar' ? 'خصم راتب' : 'Salary Deduction',
  };

  const statusBadges: Record<SettlementStatus, { label: string; color: string }> = {
    approved: { label: language === 'ar' ? 'معتمد ومصفى' : 'Approved', color: 'bg-emerald-100 text-emerald-800 border border-emerald-200' },
    pending: { label: language === 'ar' ? 'بانتظار الاعتماد' : 'Pending', color: 'bg-amber-100 text-amber-800 border border-amber-200' },
    disputed: { label: language === 'ar' ? 'عجز قيد النزاع' : 'Disputed', color: 'bg-rose-100 text-rose-800 border border-rose-200' },
    rejected: { label: language === 'ar' ? 'مرفوض' : 'Rejected', color: 'bg-slate-200 text-slate-700 border border-slate-300' },
  };

  const columns: Column<CashSettlementRecord>[] = [
    {
      header: language === 'ar' ? 'رقم السند والتاريخ' : 'Voucher # & Date',
      accessor: 'settlementNumber',
      sortable: true,
      render: (s) => (
        <div>
          <span className="font-mono font-bold text-slate-900 block text-xs">{s.settlementNumber}</span>
          <span className="text-[10px] text-slate-400 font-mono">{s.date}</span>
        </div>
      ),
    },
    {
      header: language === 'ar' ? 'الكابتن المسلّم' : 'Delivering Driver',
      accessor: 'driverName',
      sortable: true,
      render: (s) => {
        const d = drivers.find((item) => item.id === s.driverId);
        return (
          <div className="flex items-center gap-2">
            {d?.photoUrl ? (
              <img src={appendSessionToken(d.photoUrl)} alt={s.driverName} className="w-7 h-7 rounded-full object-cover border border-slate-200" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-700">
                {(s.driverName || 'س').slice(0, 1)}
              </div>
            )}
            <div>
              <p className="font-bold text-slate-800 text-xs">{s.driverName}</p>
              <p className="text-[10px] text-slate-400 font-mono">{s.driverIqama || d?.phone}</p>
            </div>
          </div>
        );
      },
    },
    {
      header: language === 'ar' ? 'المنصة والوردية' : 'Platform & Shift',
      accessor: 'platformName',
      render: (s) => (
        <div>
          <span className="font-bold text-slate-800 block text-xs">{s.platformName || s.platformId}</span>
          <span className="text-[10px] text-slate-500">
            {s.shiftPeriod || (language === 'ar' ? 'الوردية' : 'Shift')} • {s.ordersCount} {language === 'ar' ? 'طلب كاش' : 'COD orders'}
          </span>
        </div>
      ),
    },
    {
      header: language === 'ar' ? 'مبلغ المنصة (المطلوب)' : 'Expected Amount',
      accessor: 'expectedAmount',
      sortable: true,
      render: (s) => (
        <span className="font-mono font-bold text-slate-700 text-xs">
          {s.expectedAmount.toLocaleString()} {t('sar')}
        </span>
      ),
    },
    {
      header: language === 'ar' ? 'المبلغ المستلم فعلياً' : 'Collected Amount',
      accessor: 'collectedAmount',
      sortable: true,
      render: (s) => (
        <span className="font-mono font-black text-emerald-700 text-xs">
          {s.collectedAmount.toLocaleString()} {t('sar')}
        </span>
      ),
    },
    {
      header: language === 'ar' ? 'المطابقة / الفارق' : 'Reconciliation / Diff',
      accessor: 'difference',
      sortable: true,
      render: (s) => {
        if (s.difference === 0) {
          return (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-800 inline-flex items-center gap-1">
              <Check className="w-3 h-3" />
              <span>{language === 'ar' ? 'مطابق 0.00' : 'Matched 0.00'}</span>
            </span>
          );
        }
        if (s.difference < 0) {
          return (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-100 text-rose-800 inline-flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              <span>{language === 'ar' ? `عجز: ${Math.abs(s.difference)} ر.س` : `Deficit: ${Math.abs(s.difference)} SAR`}</span>
            </span>
          );
        }
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-100 text-blue-800">
            {language === 'ar' ? `فائض: +${s.difference} ر.س` : `Surplus: +${s.difference} SAR`}
          </span>
        );
      },
    },
    {
      header: language === 'ar' ? 'المسؤول المالي / المستلم' : 'Financial Receiver',
      accessor: 'receivedByName',
      render: (s) => (
        <FinancialOperatorBadge
          name={s.receivedByName || s.recordedByName}
          role={s.receivedByRole || s.recordedByRole}
          actionTitle={s.status === 'approved' && s.reviewedByName ? (language === 'ar' ? `اعتمد: ${s.reviewedByName}` : `Approved: ${s.reviewedByName}`) : undefined}
          verificationCode={s.fraudVerificationCode}
          variant="inline"
        />
      ),
    },
    {
      header: language === 'ar' ? 'طريقة التوريد' : 'Payment Method',
      accessor: 'paymentMethod',
      render: (s) => (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700">
          {paymentMethodLabels[s.paymentMethod] || s.paymentMethod}
        </span>
      ),
    },
    {
      header: language === 'ar' ? 'حالة التصفية' : 'Status',
      accessor: 'status',
      render: (s) => (
        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${statusBadges[s.status]?.color}`}>
          {statusBadges[s.status]?.label || s.status}
        </span>
      ),
    },
    {
      header: language === 'ar' ? 'الإجراءات' : 'Actions',
      className: 'text-end',
      render: (s) => (
        <div className="flex items-center justify-end gap-1">
          {/* View Voucher */}
          <button
            type="button"
            onClick={() => setVoucherSettlement(s)}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
            title={language === 'ar' ? 'معاينة سند التصفية' : 'View Voucher'}
          >
            <Eye className="w-4 h-4" />
          </button>

          {/* Instant Brand Print Voucher */}
          <button
            type="button"
            onClick={() => printCashSettlementVoucher(s)}
            className="p-1.5 text-slate-800 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg cursor-pointer transition-colors"
            title={language === 'ar' ? 'طباعة سند التصفية فوراً (وفق الهوية الرسمية)' : 'Print Settlement Voucher'}
          >
            <Printer className="w-4 h-4 text-emerald-600" />
          </button>

          {/* Quick Approve for pending */}
          {s.status === 'pending' && canAccess(['general_manager', 'operations_manager', 'supervisor']) && (
            <button
              type="button"
              onClick={() => handleQuickApprove(s)}
              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer"
              title={language === 'ar' ? 'اعتماد التصفية' : 'Approve Settlement'}
            >
              <Check className="w-4 h-4" />
            </button>
          )}

          {/* Delete */}
          {canAccess(['general_manager', 'operations_manager']) && (
            <button
              type="button"
              onClick={() => setSettlementToDelete(s)}
              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
              title={language === 'ar' ? 'حذف السند' : 'Delete Voucher'}
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
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {language === 'ar' ? 'إدارة تصفية وتحصيل كاش المناديب' : 'Couriers Cash Clearance & Settlements'}
            </h2>
            <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded-full">
              {language === 'ar' ? 'مشتركة لكافة الأدوار' : 'Shared Across All Roles'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {language === 'ar'
              ? 'إدارة وتسوية كاش طلبات الدفع عند الاستلام (COD) لتطبيقات جاهز، هنقرستيشن، كيتا، وتوريدها للشركة.'
              : 'Reconcile and clear cash on delivery (COD) collected for Jahez, Hungerstation, etc.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEditingSettlement(null);
              setPreselectedDriverId('');
              setIsFormOpen(true);
            }}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{language === 'ar' ? 'تسجيل تصفية كاش جديدة' : 'Record Cash Settlement'}</span>
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title={language === 'ar' ? 'الكاش المصفى والمودع' : 'Cleared & Deposited Cash'}
          value={`${totalSettledCash.toLocaleString()} ${t('sar')}`}
          subtitle={language === 'ar' ? `${approvedSettlements.length} تسوية معتمدة` : `${approvedSettlements.length} approved settlements`}
          icon={Banknote}
          colorScheme="emerald"
          collectionName="cash_settlements"
          allowedRoles={['admin', 'general_manager', 'operations_manager', 'supervisor']}
        />
        <StatCard
          title={language === 'ar' ? 'عُهد الكاش المعلقة' : 'Pending Cash Settlements'}
          value={`${totalPendingCash.toLocaleString()} ${t('sar')}`}
          subtitle={language === 'ar' ? `${pendingSettlements.length} تصفية بانتظار الاعتماد` : `${pendingSettlements.length} pending review`}
          icon={Clock}
          colorScheme={pendingSettlements.length > 0 ? 'amber' : 'slate'}
          collectionName="cash_settlements"
          allowedRoles={['admin', 'general_manager', 'operations_manager', 'supervisor']}
        />
        <StatCard
          title={language === 'ar' ? 'إجمالي عجز الكاش غير المسدد' : 'Total Cash Deficit / Shortage'}
          value={`${totalDeficit.toLocaleString()} ${t('sar')}`}
          subtitle={language === 'ar' ? 'فروقات تتطلب تحصيل أو خصم' : 'Variance requiring collection/deduction'}
          icon={AlertTriangle}
          colorScheme={totalDeficit > 0 ? 'rose' : 'slate'}
          collectionName="cash_settlements"
          allowedRoles={['admin', 'general_manager', 'operations_manager']}
        />
        <StatCard
          title={language === 'ar' ? 'نسبة مطابقة كاش المنصات' : 'Cash Reconciliation Rate'}
          value={`${matchRate}%`}
          subtitle={language === 'ar' ? 'معدل الالتزام والتوريد الفعلي' : 'Actual collection vs target'}
          icon={TrendingUp}
          colorScheme="gold"
          collectionName="cash_settlements"
          allowedRoles={['admin', 'general_manager', 'operations_manager']}
        />
      </div>

      {/* Sub-tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        {[
          { id: 'records', label: language === 'ar' ? `سجل تسويات الكاش (${settlements.length})` : `Settlements Ledger (${settlements.length})`, icon: Receipt },
          { id: 'balances', label: language === 'ar' ? `أرصدة عُهد الكباتن (${drivers.length})` : `Courier Balances (${drivers.length})`, icon: Users },
          { id: 'platforms', label: language === 'ar' ? 'مطابقة منصات التوصيل' : 'Platform Reconciliation', icon: Layers },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
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

      {/* SUB-TAB 1: SETTLEMENTS LEDGER */}
      {activeSubTab === 'records' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white border border-slate-200 rounded-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1 me-1">
                <Filter className="w-3.5 h-3.5" />
                <span>{language === 'ar' ? 'المنصة:' : 'Platform:'}</span>
              </span>
              <button
                onClick={() => setPlatformFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                  platformFilter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {t('all')}
              </button>
              {platforms.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPlatformFilter(p.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                    platformFilter === p.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-bold">{language === 'ar' ? 'حالة الاعتماد:' : 'Approval Status:'}</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-hidden"
              >
                <option value="all">{language === 'ar' ? 'جميع الحالات' : 'All Statuses'}</option>
                <option value="approved">{language === 'ar' ? 'المعتمدة فقط' : 'Approved Only'}</option>
                <option value="pending">{language === 'ar' ? `المعلقة فقط (${pendingSettlements.length})` : `Pending Only (${pendingSettlements.length})`}</option>
                <option value="disputed">{language === 'ar' ? 'التي بها عجز ونزاع' : 'Disputed Deficits'}</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <Table<CashSettlementRecord>
            data={filteredSettlements}
            columns={columns}
            keyExtractor={(item) => item.id}
            searchPlaceholder="بحث برقم السند، اسم الكابتن، المنصة..."
            searchFilter={(item, query) =>
              item.settlementNumber.toLowerCase().includes(query) ||
              Boolean(item.driverName?.toLowerCase().includes(query)) ||
              Boolean(item.platformName?.toLowerCase().includes(query)) ||
              Boolean(item.driverIqama?.includes(query))
            }
            exportFileName="fleetops-cash-settlements"
          />
        </div>
      )}

      {/* SUB-TAB 2: DRIVER CUSTODY BALANCES */}
      {activeSubTab === 'balances' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-100/70 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-700">
            <div>
              <h4 className="font-bold text-slate-900">متابعة العُهد النقدية الفورية للكباتن</h4>
              <p className="text-slate-500 mt-0.5">
                تتبع كاش الطلبات المستلمة من العملاء، المبالغ الموردة فعلياً، والعجز المتراكم لكل كابتن مع إمكانية التصفية المباشرة.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {drivers.map((drv) => {
              const drvSettlements = settlements.filter((s) => s.driverId === drv.id);
              const drvCollected = drvSettlements.reduce((acc, s) => acc + (s.collectedAmount || 0), 0);
              const drvExpected = drvSettlements.reduce((acc, s) => acc + (s.expectedAmount || 0), 0);
              const drvDeficit = drvSettlements
                .filter((s) => s.difference < 0)
                .reduce((acc, s) => acc + Math.abs(s.difference), 0);
              const drvPending = drvSettlements
                .filter((s) => s.status === 'pending')
                .reduce((acc, s) => acc + (s.expectedAmount || s.collectedAmount || 0), 0);

              const plat = platforms.find((p) => p.id === drv.platformId);

              return (
                <div
                  key={drv.id}
                  className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-slate-300 shadow-xs flex flex-col justify-between gap-3 transition-all"
                >
                  <div className="flex items-center gap-3">
                    {drv.photoUrl ? (
                      <img src={appendSessionToken(drv.photoUrl)} alt={drv.fullName} className="w-11 h-11 rounded-2xl object-cover border border-slate-200 shrink-0" />
                    ) : (
                      <div className="w-11 h-11 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-sm text-slate-700 shrink-0">
                        {drv.fullName.slice(0, 1)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-900 text-xs truncate">{drv.fullName}</h4>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">{drv.phone}</p>
                      <span className="inline-block px-2 py-0.2 rounded-md bg-slate-100 text-[9px] font-bold text-slate-700 mt-1">
                        {plat ? plat.name : 'تطبيقات التوصيل'}
                      </span>
                    </div>
                  </div>

                  {/* Driver Cash Breakdown */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 rounded-xl text-xs border border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 block">إجمالي المورد</span>
                      <strong className="text-emerald-700 font-bold font-mono">{drvCollected.toLocaleString()} ر.س</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">كاش بانتظار الاعتماد</span>
                      <strong className="text-amber-700 font-bold font-mono">{drvPending.toLocaleString()} ر.س</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">العجز التراكمي</span>
                      <strong className={`font-bold font-mono ${drvDeficit > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                        {drvDeficit > 0 ? `${drvDeficit.toLocaleString()} ر.س` : '0 ر.س'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">عدد التسويات</span>
                      <strong className="text-slate-800 font-bold font-mono">{drvSettlements.length} سند</strong>
                    </div>
                  </div>

                  {/* Action button */}
                  <button
                    type="button"
                    onClick={() => {
                      setPreselectedDriverId(drv.id);
                      setIsFormOpen(true);
                    }}
                    className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>تصفية كاش جديدة للكابتن</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: PLATFORM RECONCILIATION */}
      {activeSubTab === 'platforms' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {platforms.map((plat) => {
              const platSettlements = settlements.filter(
                (s) => s.platformId === plat.id || s.platformName?.includes(plat.name)
              );
              const platExpected = platSettlements.reduce((acc, s) => acc + (s.expectedAmount || 0), 0);
              const platCollected = platSettlements.reduce((acc, s) => acc + (s.collectedAmount || 0), 0);
              const platDeficit = platSettlements
                .filter((s) => s.difference < 0)
                .reduce((acc, s) => acc + Math.abs(s.difference), 0);
              const platOrders = platSettlements.reduce((acc, s) => acc + (s.ordersCount || 0), 0);
              const platRate = platExpected > 0 ? ((platCollected / platExpected) * 100).toFixed(1) : '100.0';

              return (
                <div key={plat.id} className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black text-sm">
                        {plat.name.slice(0, 1)}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{plat.name}</h4>
                        <p className="text-[10px] text-slate-400">
                          {plat.activeDriversCount} مندوب نشط • {plat.contractType}
                        </p>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                      مطابقة {platRate}%
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-[10px] text-slate-400 block">إجمالي كاش المنصة</span>
                      <strong className="text-slate-800 font-mono font-bold">{platExpected.toLocaleString()} ر.س</strong>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-[10px] text-slate-400 block">الكاش المحصل فعلياً</span>
                      <strong className="text-emerald-700 font-mono font-black">{platCollected.toLocaleString()} ر.س</strong>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-[10px] text-slate-400 block">إجمالي العجز</span>
                      <strong className={`font-mono font-bold ${platDeficit > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                        {platDeficit.toLocaleString()} ر.س
                      </strong>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-[10px] text-slate-400 block">طلبات الكاش المنجزة</span>
                      <strong className="text-slate-800 font-mono font-bold">{platOrders} طلب</strong>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPlatformFilter(plat.id);
                        setActiveSubTab('records');
                      }}
                      className="text-xs font-bold text-slate-700 hover:text-slate-900 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>عرض تفاصيل تسويات {plat.name}</span>
                      <span>←</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* New/Edit Settlement Modal */}
      <CashSettlementFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleCreateOrUpdate}
        initialData={editingSettlement}
        defaultDriverId={preselectedDriverId}
      />

      {/* Printable Voucher Modal */}
      <SettlementVoucherModal
        settlement={voucherSettlement ? {
          ...voucherSettlement,
          receiptUrl: voucherSettlement.receiptUrl ? appendSessionToken(voucherSettlement.receiptUrl) : undefined,
          receiptDocUrl: voucherSettlement.receiptDocUrl ? appendSessionToken(voucherSettlement.receiptDocUrl) : undefined,
        } : null}
        isOpen={!!voucherSettlement}
        onClose={() => setVoucherSettlement(null)}
      />

      {/* Delete Confirmation with Password */}
      <DeleteWithPasswordModal
        isOpen={!!settlementToDelete}
        onClose={() => setSettlementToDelete(null)}
        onConfirm={handleDeleteConfirm}
        itemTitle={`سند تصفية: ${settlementToDelete?.settlementNumber || ''} (${settlementToDelete?.driverName || ''})`}
        itemType="سند تصفية كاش"
        warningNote="سيتم حفظ هذا السند المالي في إدارة المحذوفات للمدير العام مع إمكانية استعادته لاحقاً."
      />
    </div>
  );
};
