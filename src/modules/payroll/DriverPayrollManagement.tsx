import React, { useState, useEffect } from 'react';
import {
  Wallet,
  PlusCircle,
  Calendar,
  CreditCard,
  Banknote,
  ShieldAlert,
  Fuel,
  Users,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Printer,
  Download,
  Filter,
  Eye,
  Trash2,
  Check,
  RefreshCw,
  FileSpreadsheet,
  TrendingDown,
  Layers,
} from 'lucide-react';
import { Table, Column } from '../../components/common/Table';
import { StatCard } from '../../components/common/StatCard';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { DeleteWithPasswordModal } from '../../components/common/DeleteWithPasswordModal';
import { PayslipModal } from './PayslipModal';
import { DriverAdvanceModal } from './DriverAdvanceModal';
import { PayrollCalculationModal } from './PayrollCalculationModal';
import { FinancialOperatorBadge } from '../../components/common/FinancialOperatorBadge';
import {
  DriverPayrollRecord,
  DriverAdvanceRecord,
  PayrollStatus,
  Driver,
  PlatformContract,
  CashSettlementRecord,
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
import { printPayslipDocument, printFullMonthlyPayrollReport } from '../../utils/printPayslip';
import { syncDocument } from '../../services/documentSyncService';

export const DriverPayrollManagement: React.FC = () => {
  const { currentUser, canAccess } = useAuth();
  const { t, tx, language } = useLanguage();

  const [payrolls, setPayrolls] = useState<DriverPayrollRecord[]>([]);
  const [advances, setAdvances] = useState<DriverAdvanceRecord[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [platforms, setPlatforms] = useState<PlatformContract[]>([]);

  // Sub-tabs (Clean Payroll Management without invoice filtering clutter)
  const [activeSubTab, setActiveSubTab] = useState<'payroll' | 'advances' | 'deductions_audit'>('payroll');

  // Month selection
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals
  const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);
  const [editingPayroll, setEditingPayroll] = useState<DriverPayrollRecord | null>(null);
  const [viewingPayslip, setViewingPayslip] = useState<DriverPayrollRecord | null>(null);
  const [payrollToDelete, setPayrollToDelete] = useState<DriverPayrollRecord | null>(null);

  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [editingAdvance, setEditingAdvance] = useState<DriverAdvanceRecord | null>(null);
  const [advanceToDelete, setAdvanceToDelete] = useState<DriverAdvanceRecord | null>(null);

  useEffect(() => {
    const unsubPayrolls = subscribeToCollection<DriverPayrollRecord>('driver_payrolls', setPayrolls);
    const unsubAdvances = subscribeToCollection<DriverAdvanceRecord>('driver_advances', setAdvances);
    const unsubDrivers = subscribeToCollection<Driver>('drivers', setDrivers);
    const unsubPlatforms = subscribeToCollection<PlatformContract>('platforms', setPlatforms);

    return () => {
      unsubPayrolls();
      unsubAdvances();
      unsubDrivers();
      unsubPlatforms();
    };
  }, []);

  // Filtered Payrolls by Month & Status
  const monthPayrolls = payrolls.filter((p) => p.month === selectedMonth);
  const filteredPayrolls = monthPayrolls.filter((p) => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    return true;
  });

  // KPI Calculations
  const totalNetSalary = monthPayrolls.reduce((acc, p) => acc + (p.netSalary || 0), 0);
  const totalDeductionsAll = monthPayrolls.reduce((acc, p) => acc + (p.totalDeductions || 0), 0);
  const totalGrossAll = monthPayrolls.reduce((acc, p) => acc + (p.grossEarnings || 0), 0);
  const paidCount = monthPayrolls.filter((p) => p.status === 'paid').length;
  const approvedCount = monthPayrolls.filter((p) => p.status === 'approved').length;

  // Total active advances balance
  const activeAdvancesBalance = advances
    .filter((a) => a.status === 'active' || a.status === 'partially_paid')
    .reduce((acc, a) => acc + (a.remainingAmount || a.amount || 0), 0);

  // Itemized Deductions Totals for Audit
  const totalCashShortagesDeducted = monthPayrolls.reduce((acc, p) => acc + (p.cashShortageDeduction || 0), 0);
  const totalViolationsDeducted = monthPayrolls.reduce((acc, p) => acc + (p.violationDeduction || 0), 0);
  const totalAdvancesDeducted = monthPayrolls.reduce((acc, p) => acc + (p.advanceDeduction || 0), 0);
  const totalFuelDeducted = monthPayrolls.reduce((acc, p) => acc + (p.fuelExcessDeduction || 0), 0);

  // Handle Payroll Create / Edit
  const handleSavePayroll = async (data: Partial<DriverPayrollRecord>) => {
    if (editingPayroll) {
      await updateDocument<DriverPayrollRecord>('driver_payrolls', editingPayroll.id, data);
      const paymentReceiptUrl = data.paymentReceiptUrl || editingPayroll.paymentReceiptUrl;
      if (paymentReceiptUrl) {
        await syncDocument({
          entityType: 'payroll',
          entityId: editingPayroll.id,
          title: `إشعار تحويل بنكي / صرف راتب - ${data.driverName || editingPayroll.driverName || ''} - ${data.month || editingPayroll.month || ''}`,
          fileUrl: paymentReceiptUrl,
          category: 'financial',
        }, currentUser?.id);
      }
      await logAuditAction(
        currentUser,
        'UPDATE_PAYROLL',
        'driver_payrolls',
        editingPayroll.id,
        `تعديل مسير راتب الكابتن ${data.driverName || editingPayroll.driverName} لشهر ${data.month}`
      );
      if (data.status === 'paid') {
        await logAuditAction(
          currentUser,
          'PAY_PAYROLL',
          'driver_payrolls',
          editingPayroll.id,
          `صرف وتحويل راتب الكابتن ${data.driverName || editingPayroll.driverName} لشهر ${data.month || editingPayroll.month} (${data.netSalary || editingPayroll.netSalary} ر.س)`
        );
      }
      setEditingPayroll(null);
    } else {
      const id = await createDocument<Omit<DriverPayrollRecord, 'id'>>('driver_payrolls', data as any);
      if (data.paymentReceiptUrl) {
        await syncDocument({
          entityType: 'payroll',
          entityId: id,
          title: `إشعار تحويل بنكي / صرف راتب - ${data.driverName || ''} - ${data.month || ''}`,
          fileUrl: data.paymentReceiptUrl,
          category: 'financial',
        }, currentUser?.id);
      }
      await logAuditAction(
        currentUser,
        'CREATE_PAYROLL',
        'driver_payrolls',
        id,
        `إعداد مسير راتب الكابتن ${data.driverName} لشهر ${data.month} (صافي: ${data.netSalary} ر.س)`
      );
    }
    setIsPayrollModalOpen(false);
  };

  // Handle Quick Pay
  const handleMarkAsPaid = (payroll: DriverPayrollRecord) => {
    setEditingPayroll({ ...payroll, status: 'paid' });
    setIsPayrollModalOpen(true);
  };

  // Handle Delete Payroll with Password
  const handleDeletePayrollConfirm = async (reason: string) => {
    if (!payrollToDelete || !currentUser) return;
    await softDeleteDocumentWithPassword(
      'driver_payrolls',
      payrollToDelete.id,
      `مسير راتب: ${payrollToDelete.driverName} (#${payrollToDelete.payrollNumber})`,
      payrollToDelete,
      currentUser,
      reason,
      `شهر: ${payrollToDelete.month} • صافي الراتب: ${Number(payrollToDelete.netSalary || 0).toLocaleString()} ر.س`
    );
    await logAuditAction(
      currentUser,
      'SOFT_DELETE_PAYROLL',
      'driver_payrolls',
      payrollToDelete.id,
      `حذف ونقل مسير راتب الكابتن ${payrollToDelete.driverName} لشهر ${payrollToDelete.month} لسلة المحذوفات (${reason})`
    );
    setPayrollToDelete(null);
  };

  // Handle Save Advance
  const handleSaveAdvance = async (data: Partial<DriverAdvanceRecord>) => {
    if (editingAdvance) {
      await updateDocument<DriverAdvanceRecord>('driver_advances', editingAdvance.id, data);
      const receiptUrl = data.receiptDocUrl || editingAdvance.receiptDocUrl;
      if (receiptUrl) {
        await syncDocument({
          entityType: 'advance',
          entityId: editingAdvance.id,
          title: `إيصال تحويل سلفة مالية - ${data.driverName || editingAdvance.driverName || ''}`,
          fileUrl: receiptUrl,
          category: 'financial',
        }, currentUser?.id);
      }
      await logAuditAction(
        currentUser,
        'UPDATE_ADVANCE',
        'driver_advances',
        editingAdvance.id,
        `تعديل سلفة الكابتن ${data.driverName || editingAdvance.driverName}`
      );
      setEditingAdvance(null);
    } else {
      const id = await createDocument<Omit<DriverAdvanceRecord, 'id'>>('driver_advances', data as any);
      if (data.receiptDocUrl) {
        await syncDocument({
          entityType: 'advance',
          entityId: id,
          title: `إيصال تحويل سلفة مالية - ${data.driverName || ''}`,
          fileUrl: data.receiptDocUrl,
          category: 'financial',
        }, currentUser?.id);
      }
      await logAuditAction(
        currentUser,
        'CREATE_ADVANCE',
        'driver_advances',
        id,
        `صرف سلفة مالية للكابتن ${data.driverName} بقيمة ${data.amount} ر.س`
      );
    }
    setIsAdvanceModalOpen(false);
  };

  // Handle Delete Advance with Password
  const handleDeleteAdvanceConfirm = async (reason: string) => {
    if (!advanceToDelete || !currentUser) return;
    await softDeleteDocumentWithPassword(
      'driver_advances',
      advanceToDelete.id,
      `سلفة مالية: ${advanceToDelete.driverName} (#${advanceToDelete.advanceNumber})`,
      advanceToDelete,
      currentUser,
      reason,
      `المبلغ الأصلي: ${advanceToDelete.amount} ر.س • المتبقي: ${advanceToDelete.remainingAmount} ر.س`
    );
    await logAuditAction(
      currentUser,
      'SOFT_DELETE_ADVANCE',
      'driver_advances',
      advanceToDelete.id,
      `حذف ونقل سلفة الكابتن ${advanceToDelete.driverName} لسلة المحذوفات (${reason})`
    );
    setAdvanceToDelete(null);
  };

  const statusBadges: Record<PayrollStatus, { label: string; color: string }> = {
    paid: { label: language === 'ar' ? 'تم الصرف والتحويل' : 'Paid & Transferred', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    approved: { label: language === 'ar' ? 'معتمد للصرف' : 'Approved for Pay', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    reviewed: { label: language === 'ar' ? 'تم التدقيق' : 'Audited & Reviewed', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
    draft: { label: language === 'ar' ? 'مسودة' : 'Draft', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  };

  const payrollColumns: Column<DriverPayrollRecord>[] = [
    {
      header: language === 'ar' ? 'الكابتن' : 'Driver',
      accessor: 'driverName',
      sortable: true,
      render: (p) => {
        const d = drivers.find((item) => item.id === p.driverId);
        return (
          <div className="flex items-center gap-2.5">
            {d?.photoUrl ? (
              <img src={appendSessionToken(d.photoUrl)} alt={p.driverName} className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0">
                {(p.driverName || 'س').slice(0, 1)}
              </div>
            )}
            <div>
              <p className="font-bold text-slate-900 text-xs leading-tight">{p.driverName}</p>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                {p.driverIqama} • {p.platformName}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      header: language === 'ar' ? 'الراتب الأساسي' : 'Basic Salary',
      accessor: 'basicSalary',
      render: (p) => (
        <span className="font-mono text-slate-900 font-bold text-xs">
          {p.basicSalary.toLocaleString()} {t('sar')}
        </span>
      ),
    },
    {
      header: language === 'ar' ? 'عمولة وعدد الطلبات' : 'Orders & Commission',
      accessor: 'deliveryCommissions',
      render: (p) => (
        <div>
          <span className="font-mono font-bold text-emerald-700 text-xs block">
            +{p.deliveryCommissions.toLocaleString()} {t('sar')}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            ({p.deliveriesCount} {language === 'ar' ? 'طلب' : 'orders'} {p.commissionRatePerOrder ? `@ ${p.commissionRatePerOrder}` : ''})
          </span>
        </div>
      ),
    },
    {
      header: language === 'ar' ? 'إجمالي الاستحقاق' : 'Gross Earnings',
      accessor: 'grossEarnings',
      sortable: true,
      render: (p) => (
        <span className="font-mono font-black text-slate-900 text-xs">
          {p.grossEarnings.toLocaleString()} {t('sar')}
        </span>
      ),
    },
    {
      header: language === 'ar' ? 'الاستقطاعات المترابطة' : 'Connected Deductions',
      accessor: 'totalDeductions',
      sortable: true,
      render: (p) => (
        <div>
          <span className={`font-mono font-bold text-xs block ${p.totalDeductions > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
            {p.totalDeductions > 0 ? `-${p.totalDeductions.toLocaleString()} ${t('sar')}` : `0.00 ${t('sar')}`}
          </span>
          {p.totalDeductions > 0 && (
            <span className="text-[9px] text-slate-500 font-medium">
              {[
                p.advanceDeduction > 0 ? (language === 'ar' ? `سلفة: ${p.advanceDeduction}` : `Loan: ${p.advanceDeduction}`) : null,
                p.cashShortageDeduction > 0 ? (language === 'ar' ? `عجز: ${p.cashShortageDeduction}` : `Shortage: ${p.cashShortageDeduction}`) : null,
                p.violationDeduction > 0 ? (language === 'ar' ? `مخالفة: ${p.violationDeduction}` : `Fine: ${p.violationDeduction}`) : null,
              ]
                .filter(Boolean)
                .join(' | ')}
            </span>
          )}
        </div>
      ),
    },
    {
      header: language === 'ar' ? 'صافي الراتب المستحق' : 'Net Salary Due',
      accessor: 'netSalary',
      sortable: true,
      render: (p) => (
        <span className="font-mono font-black text-emerald-700 text-sm">
          {p.netSalary.toLocaleString()} {t('sar')}
        </span>
      ),
    },
    {
      header: language === 'ar' ? 'المسؤول المالي / المسير' : 'Finance Operator',
      accessor: 'preparedByName',
      render: (p) => (
        <FinancialOperatorBadge
          name={p.status === 'paid' && p.disbursedByName ? p.disbursedByName : p.preparedByName}
          role={p.status === 'paid' && p.disbursedByRole ? p.disbursedByRole : p.preparedByRole}
          actionTitle={p.status === 'paid' ? (language === 'ar' ? 'صرف بنكي' : 'Disbursed') : (language === 'ar' ? 'إعداد المسير' : 'Prepared')}
          verificationCode={p.fraudVerificationCode}
          variant="inline"
        />
      ),
    },
    {
      header: language === 'ar' ? 'الحالة' : 'Status',
      accessor: 'status',
      render: (p) => (
        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${statusBadges[p.status]?.color}`}>
          {statusBadges[p.status]?.label || p.status}
        </span>
      ),
    },
    {
      header: language === 'ar' ? 'الإجراءات' : 'Actions',
      className: 'text-end',
      render: (p) => (
        <div className="flex items-center justify-end gap-1">
          {/* View Payslip */}
          <button
            type="button"
            onClick={() => setViewingPayslip(p)}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
            title={language === 'ar' ? 'معاينة مسير الراتب' : 'View Payslip'}
          >
            <Eye className="w-4 h-4" />
          </button>

          {/* Direct Print Payslip */}
          <button
            type="button"
            onClick={() => printPayslipDocument(p)}
            className="p-1.5 text-slate-800 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg cursor-pointer transition-colors"
            title={language === 'ar' ? 'طباعة مسير الراتب فوراً' : 'Print Payslip Instantly'}
          >
            <Printer className="w-4 h-4 text-emerald-600" />
          </button>

          {/* Quick Mark as Paid */}
          {p.status !== 'paid' && canAccess(['general_manager', 'operations_manager']) && (
            <button
              type="button"
              onClick={() => handleMarkAsPaid(p)}
              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer"
              title={language === 'ar' ? 'تأكيد الصرف والتحويل البنكي' : 'Confirm Payment & Transfer'}
            >
              <Check className="w-4 h-4" />
            </button>
          )}

          {/* Edit */}
          {p.status !== 'paid' && (
            <button
              type="button"
              onClick={() => {
                setEditingPayroll(p);
                setIsPayrollModalOpen(true);
              }}
              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
              title={language === 'ar' ? 'تعديل المسير' : 'Edit Payroll'}
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Delete */}
          {canAccess(['general_manager', 'operations_manager']) && (
            <button
              type="button"
              onClick={() => setPayrollToDelete(p)}
              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
              title={language === 'ar' ? 'حذف المسير' : 'Delete Payroll'}
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
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {language === 'ar' ? 'إدارة رواتب ومستحقات المناديب' : 'Driver Payroll & Earnings Management'}
            </h2>
            <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
              WPS & {language === 'ar' ? 'حماية الأجور' : 'Wage Protection'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {language === 'ar'
              ? 'نظام مسيرات الرواتب المترابط آلياً مع عجز تصفية الكاش، المخالفات المرورية، السلف المالية، وتجاوز استهلاك الوقود.'
              : 'Payroll ledger interconnected with cash clearance deficits, fines, advances, and fuel overages.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => printFullMonthlyPayrollReport(selectedMonth, monthPayrolls)}
            disabled={monthPayrolls.length === 0}
            className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title={language === 'ar' ? 'طباعة كشف مسير رواتب الشهر بالكامل' : 'Print Full Month Payroll'}
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>{language === 'ar' ? 'طباعة كشف المسير المجمع (WPS)' : 'Print Month Payroll (WPS)'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingPayroll(null);
              setIsPayrollModalOpen(true);
            }}
            className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{language === 'ar' ? 'إعداد مسير فردي للكابتن' : 'Calculate Driver Payroll'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title={language === 'ar' ? 'صافي رواتب الشهر' : 'Total Net Month Payroll'}
          value={`${totalNetSalary.toLocaleString()} ${t('sar')}`}
          subtitle={language === 'ar' ? `إجمالي المستحق لـ ${monthPayrolls.length} كابتن` : `Total due for ${monthPayrolls.length} drivers`}
          icon={Wallet}
          colorScheme="emerald"
        />
        <StatCard
          title={language === 'ar' ? 'الاستقطاعات المنفذة' : 'Total Deductions Executed'}
          value={`${totalDeductionsAll.toLocaleString()} ${t('sar')}`}
          subtitle={language === 'ar' ? 'سلف وعجز كاش ومخالفات مستردة' : 'Loans, cash shortages & fines recovered'}
          icon={TrendingDown}
          colorScheme={totalDeductionsAll > 0 ? 'rose' : 'slate'}
        />
        <StatCard
          title={language === 'ar' ? 'مسيرات جاهزة للصرف' : 'Approved for Payment'}
          value={approvedCount}
          subtitle={language === 'ar' ? `تم صرف ${paidCount} من إجمالي ${monthPayrolls.length}` : `Paid ${paidCount} of ${monthPayrolls.length} total`}
          icon={CheckCircle2}
          colorScheme="blue"
        />
        <StatCard
          title={language === 'ar' ? 'رصيد السلف المالية القائمة' : 'Active Advances Balance'}
          value={`${activeAdvancesBalance.toLocaleString()} ${t('sar')}`}
          subtitle={language === 'ar' ? 'عهد وسلف جاري استقطاعها' : 'Loans currently being amortized'}
          icon={CreditCard}
          colorScheme="purple"
        />
      </div>

      {/* Sub-tabs Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        {[
          { id: 'payroll', label: language === 'ar' ? `مسير الرواتب الشهري (${monthPayrolls.length})` : `Monthly Payroll (${monthPayrolls.length})`, icon: Receipt },
          { id: 'advances', label: language === 'ar' ? `إدارة السلف المالية (${advances.length})` : `Financial Advances (${advances.length})`, icon: CreditCard },
          { id: 'deductions_audit', label: language === 'ar' ? 'تقرير الربط المالي والاستقطاعات' : 'Interconnection & Audit', icon: Layers },
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

      {/* SUB-TAB 1: MONTHLY PAYROLL SHEET */}
      {activeSubTab === 'payroll' && (
        <div className="space-y-4">
          {/* Controls Bar: Month Selector & Status filter */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white border border-slate-200 rounded-2xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{tx('شهر المسير:', 'Payroll Month:')}</span>
              </span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold outline-hidden"
              />
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-bold">{tx('الحالة:', 'Status:')}</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-hidden"
              >
                <option value="all">{tx(`جميع الحالات (${monthPayrolls.length})`, `All Statuses (${monthPayrolls.length})`)}</option>
                <option value="approved">{tx(`معتمد للصرف (${approvedCount})`, `Approved for Pay (${approvedCount})`)}</option>
                <option value="paid">{tx(`تم الصرف والتحويل (${paidCount})`, `Paid & Transferred (${paidCount})`)}</option>
                <option value="draft">{tx('مسودة', 'Draft')}</option>
              </select>
            </div>
          </div>

          {/* Payroll Table */}
          <Table<DriverPayrollRecord>
            data={filteredPayrolls}
            columns={payrollColumns}
            keyExtractor={(item) => item.id}
            searchPlaceholder={tx('بحث باسم الكابتن، رقم الإقامة، المنصة...', 'Search by driver name, iqama, platform...')}
            searchFilter={(item, query) =>
              item.driverName.toLowerCase().includes(query) ||
              item.driverIqama.includes(query) ||
              Boolean(item.platformName?.toLowerCase().includes(query)) ||
              item.payrollNumber.toLowerCase().includes(query)
            }
            exportFileName={`fleetops-payroll-${selectedMonth}`}
          />
        </div>
      )}

      {/* SUB-TAB 2: DRIVER ADVANCES MANAGEMENT */}
      {activeSubTab === 'advances' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-purple-50/60 border border-purple-200 rounded-2xl text-xs">
            <div>
              <h4 className="font-bold text-purple-950">{tx('سجل السلف والقروض المالية للمناديب', 'Driver Financial Advances & Loans Ledger')}</h4>
              <p className="text-purple-800 mt-0.5">
                {tx(
                  'جدولة السلف والأقساط الشهرية المستقطعة آلياً عند إعداد مسير الرواتب الشهري لكل كابتن.',
                  'Schedule loans and monthly installments deducted automatically when generating payroll.'
                )}
              </p>
            </div>

            <button
              onClick={() => {
                setEditingAdvance(null);
                setIsAdvanceModalOpen(true);
              }}
              className="px-3.5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{tx('صرف سلفة مالية جديدة', 'Issue New Financial Advance')}</span>
            </button>
          </div>

          {/* Advances Table */}
          {advances.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
              <CreditCard className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-1" />
              <p className="text-xs font-bold text-slate-700">{tx('لا توجد سلف مالية مسجلة حالياً', 'No financial advances recorded')}</p>
              <p className="text-[11px] text-slate-400 mt-1">
                {tx('انقر على "صرف سلفة مالية جديدة" لجدولة سلفة لأي كابتن', 'Click "Issue New Financial Advance" to register an advance')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {advances.map((adv) => {
                const isPaid = adv.status === 'paid' || (adv.remainingAmount <= 0 && adv.amount > 0);

                return (
                  <div
                    key={adv.id}
                    className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-slate-300 shadow-xs space-y-3 transition-all"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <div>
                        <span className="font-mono font-bold text-[11px] text-slate-400 block">{adv.advanceNumber}</span>
                        <h4 className="font-bold text-slate-900 text-xs">{adv.driverName}</h4>
                      </div>

                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {isPaid ? tx('مسددة بالكامل', 'Fully Repaid') : tx('قيد الاستقطاع', 'Active Deduction')}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs p-2.5 bg-slate-50 rounded-xl">
                      <div>
                        <span className="text-[10px] text-slate-400 block">{tx('مبلغ السلفة', 'Loan Amount')}</span>
                        <strong className="text-slate-900 font-mono font-bold">{adv.amount.toLocaleString()} {t('sar')}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">{tx('القسط الشهري', 'Monthly Installment')}</span>
                        <strong className="text-purple-700 font-mono font-bold">{adv.monthlyInstallment.toLocaleString()} {t('sar')}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">{tx('المسدد حتى الآن', 'Repaid So Far')}</span>
                        <strong className="text-emerald-700 font-mono font-bold">{(adv.repaidAmount || 0).toLocaleString()} {t('sar')}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">{tx('المتبقي', 'Remaining')}</span>
                        <strong className="text-rose-600 font-mono font-black">{(adv.remainingAmount ?? adv.amount).toLocaleString()} {t('sar')}</strong>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-600">
                      <span className="text-slate-400">{tx('السبب:', 'Reason:')}</span> <strong>{adv.reason}</strong>
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                      <FinancialOperatorBadge
                        name={adv.approvedByName || 'المسؤول المالي'}
                        role={adv.approvedByRole || 'operations_manager'}
                        actionTitle={tx('اعتماد وصرف السلفة', 'Advance Approver')}
                        verificationCode={adv.fraudVerificationCode}
                        variant="inline"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      <span className="text-[10px] text-slate-400 font-mono">{tx('تاريخ الصرف:', 'Date:')} {adv.requestDate}</span>
                      {canAccess(['general_manager', 'operations_manager']) && (
                        <button
                          type="button"
                          onClick={() => setAdvanceToDelete(adv)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-md cursor-pointer"
                          title={tx('حذف السلفة', 'Delete Advance')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: DEDUCTIONS RECONCILIATION AUDIT */}
      {activeSubTab === 'deductions_audit' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-100/70 border border-slate-200 rounded-2xl text-xs text-slate-700">
            <h4 className="font-bold text-slate-900">
              {tx(`تقرير ترابط الاستقطاعات والرقابة المالية لشهر (${selectedMonth})`, `Financial Deductions Audit & Linkage (${selectedMonth})`)}
            </h4>
            <p className="text-slate-500 mt-0.5">
              {tx(
                'يوثق هذا التقرير كيفية استرداد عجز الكاش والمخالفات وأقساط السلف من مسيرات الرواتب لحماية الأصول المالية للشركة.',
                'Documents recovery of cash shortage deficits, traffic fines, and advance installments from driver payrolls.'
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <Banknote className="w-5 h-5" />
              </div>
              <span className="text-xs text-slate-500 font-bold block">{tx('عجز تصفية الكاش المسترد', 'Recovered Cash Deficit')}</span>
              <p className="text-xl font-black font-mono text-slate-900">{totalCashShortagesDeducted.toLocaleString()} {t('sar')}</p>
              <p className="text-[10px] text-slate-400">{tx('من قسم تصفية عهد تطبيقات التوصيل (COD)', 'From courier cash settlements (COD)')}</p>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <span className="text-xs text-slate-500 font-bold block">{tx('مخالفات مرورية مستقطعة', 'Deducted Traffic Fines')}</span>
              <p className="text-xl font-black font-mono text-slate-900">{totalViolationsDeducted.toLocaleString()} {t('sar')}</p>
              <p className="text-[10px] text-slate-400">{tx('من سجل المخالفات غير المسددة للأسطول', 'From fleet unpaid violation ledger')}</p>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
              <span className="text-xs text-slate-500 font-bold block">{tx('أقساط سلف مالية مستردة', 'Recovered Advance Installments')}</span>
              <p className="text-xl font-black font-mono text-slate-900">{totalAdvancesDeducted.toLocaleString()} {t('sar')}</p>
              <p className="text-[10px] text-slate-400">{tx('من جدول سلف المناديب المعتمدة', 'From approved courier advance schedule')}</p>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                <Fuel className="w-5 h-5" />
              </div>
              <span className="text-xs text-slate-500 font-bold block">{tx('خصومات تجاوز الوقود', 'Recovered Fuel Overages')}</span>
              <p className="text-xl font-black font-mono text-slate-900">{totalFuelDeducted.toLocaleString()} {t('sar')}</p>
              <p className="text-[10px] text-slate-400">{tx('من منظومة شرائح الوقود (واعي، ساسكو...)', 'From fuel chip caps (Waee, Sasco...)')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <PayrollCalculationModal
        isOpen={isPayrollModalOpen}
        onClose={() => setIsPayrollModalOpen(false)}
        onSubmit={handleSavePayroll}
        initialData={editingPayroll}
        selectedMonth={selectedMonth}
      />

      <PayslipModal
        payroll={viewingPayslip}
        isOpen={!!viewingPayslip}
        onClose={() => setViewingPayslip(null)}
      />

      <DriverAdvanceModal
        isOpen={isAdvanceModalOpen}
        onClose={() => setIsAdvanceModalOpen(false)}
        onSubmit={handleSaveAdvance}
        initialData={editingAdvance}
      />

      <DeleteWithPasswordModal
        isOpen={!!payrollToDelete}
        onClose={() => setPayrollToDelete(null)}
        onConfirm={handleDeletePayrollConfirm}
        itemTitle={`مسير راتب: ${payrollToDelete?.driverName || ''} (${payrollToDelete?.payrollNumber || ''})`}
        itemType={language === 'ar' ? 'مسير راتب' : 'Payroll Record'}
        warningNote={language === 'ar' ? 'سيتم نقل المسير إلى إدارة المحذوفات ويمكن استعادته من لوحة تحكم المدير العام' : 'Record will be moved to Recycle Bin and can be restored'}
      />

      <DeleteWithPasswordModal
        isOpen={!!advanceToDelete}
        onClose={() => setAdvanceToDelete(null)}
        onConfirm={handleDeleteAdvanceConfirm}
        itemTitle={`سلفة: ${advanceToDelete?.driverName || ''} (${advanceToDelete?.advanceNumber || ''})`}
        itemType={language === 'ar' ? 'سلفة مالية' : 'Financial Advance'}
        warningNote={language === 'ar' ? 'سيتم نقل السلفة إلى إدارة المحذوفات ويمكن استعادتها من لوحة تحكم المدير العام' : 'Record will be moved to Recycle Bin and can be restored'}
      />
    </div>
  );
};
