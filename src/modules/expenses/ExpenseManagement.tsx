import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  PlusCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  DollarSign,
  TrendingDown,
} from 'lucide-react';
import { Table, Column } from '../../components/common/Table';
import { StatCard } from '../../components/common/StatCard';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { DeleteWithPasswordModal } from '../../components/common/DeleteWithPasswordModal';
import { FinancialOperatorBadge, FinancialAuditBanner } from '../../components/common/FinancialOperatorBadge';
import { ExpenseRecord, ExpenseCategory, ExpenseApprovalStatus } from '../../types';
import {
  subscribeToCollection,
  createDocument,
  updateDocument,
  deleteDocument,
  softDeleteDocumentWithPassword,
} from '../../services/dataService';
import { logAuditAction } from '../../services/auditService';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export const ExpenseManagement: React.FC = () => {
  const { currentUser, canAccess } = useAuth();
  const { t } = useLanguage();

  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<ExpenseRecord | null>(null);

  // Form State
  const [amount, setAmount] = useState<number>(500);
  const [category, setCategory] = useState<ExpenseCategory>('operations');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    const unsub = subscribeToCollection<ExpenseRecord>('expenses', setExpenses);
    return () => unsub();
  }, []);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const fraudCode = `SEC-EXP-${Math.floor(100000 + Math.random() * 900000)}`;
    const id = await createDocument<Omit<ExpenseRecord, 'id'>>('expenses', {
      amount: Number(amount),
      category,
      description,
      date,
      createdById: currentUser?.id || 'sys',
      createdByName: currentUser?.fullName || 'مسؤول المصروفات',
      createdByRole: currentUser?.role || 'supervisor',
      fraudVerificationCode: fraudCode,
      approvalStatus: 'pending',
    });

    await logAuditAction(
      currentUser,
      'CREATE_EXPENSE',
      'expenses',
      id,
      `تسجيل مصروف تشغيلي جديد بقيمة ${amount} ر.س فئة ${category} بواسطة ${currentUser?.fullName}`
    );

    setDescription('');
    setIsModalOpen(false);
  };

  const handleApproval = async (exp: ExpenseRecord, newStatus: 'approved' | 'rejected') => {
    await updateDocument<ExpenseRecord>('expenses', exp.id, {
      approvalStatus: newStatus,
      approvedById: currentUser?.id,
      approvedByName: currentUser?.fullName,
      approvedByRole: currentUser?.role,
    });

    await logAuditAction(
      currentUser,
      'APPROVE_EXPENSE',
      'expenses',
      exp.id,
      `${newStatus === 'approved' ? 'اعتماد' : 'رفض'} مصروف بقيمة ${exp.amount} ر.س بواسطة ${currentUser?.fullName}`
    );
  };

  const handleDeleteConfirm = async (reason: string) => {
    if (!expenseToDelete || !currentUser) return;
    await softDeleteDocumentWithPassword(
      'expenses',
      expenseToDelete.id,
      `مصروف: ${expenseToDelete.description || 'مصروف تشغيلي'} (${expenseToDelete.amount} ر.س)`,
      expenseToDelete,
      currentUser,
      reason,
      `التصنيف: ${categoryLabels[expenseToDelete.category] || expenseToDelete.category} • المبلغ: ${expenseToDelete.amount} ر.س • التاريخ: ${expenseToDelete.date}`
    );
    await logAuditAction(
      currentUser,
      'SOFT_DELETE_EXPENSE',
      'expenses',
      expenseToDelete.id,
      `حذف ونقل المصروف بقيمة ${expenseToDelete.amount} ر.س لسلة المحذوفات (${reason})`
    );
    setExpenseToDelete(null);
  };

  const totalAmount = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);
  const approvedAmount = expenses
    .filter((e) => e.approvalStatus === 'approved')
    .reduce((acc, e) => acc + (e.amount || 0), 0);
  const pendingCount = expenses.filter((e) => e.approvalStatus === 'pending').length;

  const categoryLabels: Record<ExpenseCategory, string> = {
    fuel: 'وقود وبنزين',
    maintenance: 'صيانة وقطع غيار',
    insurance: 'تأمين ورخص',
    fines: 'غرامات ومخالفات',
    salaries: 'رواتب وبدلات',
    operations: 'مصروفات تشغيلية',
    other: 'أخرى ونثريات',
  };

  const statusBadges: Record<ExpenseApprovalStatus, { label: string; color: string }> = {
    pending: { label: 'بانتظار الاعتماد', color: 'bg-amber-100 text-amber-800' },
    approved: { label: 'معتمد', color: 'bg-emerald-100 text-emerald-800' },
    rejected: { label: 'مرفوض', color: 'bg-rose-100 text-rose-800' },
  };

  const columns: Column<ExpenseRecord>[] = [
    {
      header: 'التاريخ',
      accessor: 'date',
      sortable: true,
      render: (e) => <span className="font-mono text-xs text-slate-800">{e.date}</span>,
    },
    {
      header: 'فئة المصروف',
      accessor: 'category',
      sortable: true,
      render: (e) => (
        <span className="font-semibold text-xs text-slate-800">
          {categoryLabels[e.category] || e.category}
        </span>
      ),
    },
    {
      header: 'الوصف والبيان',
      accessor: 'description',
      render: (e) => <span className="text-slate-600 text-xs">{e.description}</span>,
    },
    {
      header: 'المبلغ',
      accessor: 'amount',
      sortable: true,
      render: (e) => <span className="font-black text-slate-900 font-mono text-xs">{e.amount.toLocaleString()} ر.س</span>,
    },
    {
      header: 'المسؤول المالي / المعتمد',
      accessor: 'createdByName',
      render: (e) => (
        <FinancialOperatorBadge
          name={e.createdByName}
          role={e.createdByRole}
          actionTitle={e.approvalStatus === 'approved' && e.approvedByName ? `معتمد من: ${e.approvedByName}` : 'مسجل المصروف'}
          verificationCode={e.fraudVerificationCode}
          variant="inline"
        />
      ),
    },
    {
      header: 'حالة الاعتماد',
      accessor: 'approvalStatus',
      render: (e) => {
        const badge = statusBadges[e.approvalStatus];
        return <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${badge.color}`}>{badge.label}</span>;
      },
    },
    {
      header: 'الإجراءات',
      className: 'text-end',
      render: (e) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(ev) => ev.stopPropagation()}>
          {e.approvalStatus === 'pending' && canAccess(['general_manager']) && (
            <>
              <button
                onClick={() => handleApproval(e, 'approved')}
                title="اعتماد"
                className="p-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleApproval(e, 'rejected')}
                title="رفض"
                className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </>
          )}
          {canAccess(['general_manager']) && (
            <button
              onClick={() => setExpenseToDelete(e)}
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
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">إدارة المصروفات التشغيلية</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            تسجيل واعتماد نفقات الوقود، الصيانة، الفواتير والنثريات التشغيلية.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>إضافة مصروف جديد</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="إجمالي المصروفات"
          value={`${totalAmount.toLocaleString()} ر.س`}
          subtitle="كافة الفئات المسجلة"
          icon={CreditCard}
          colorScheme="blue"
        />
        <StatCard
          title="المصروفات المعتمدة"
          value={`${approvedAmount.toLocaleString()} ر.س`}
          subtitle="معتمدة من المدير العام"
          icon={CheckCircle2}
          colorScheme="emerald"
        />
        <StatCard
          title="بانتظار الاعتماد"
          value={pendingCount}
          subtitle="فواتير معلقة"
          icon={Clock}
          colorScheme={pendingCount > 0 ? 'amber' : 'slate'}
        />
        <StatCard
          title="متوسط الصرف الشهري"
          value={`${Math.round(totalAmount / 3).toLocaleString()} ر.س`}
          subtitle="كفاءة الإنفاق"
          icon={TrendingDown}
          colorScheme="slate"
        />
      </div>

      {/* Table */}
      <Table
        data={expenses}
        columns={columns}
        keyExtractor={(item) => item.id}
        searchPlaceholder="بحث في بيان المصروف أو الفئة..."
        searchFilter={(item, query) =>
          item.description.toLowerCase().includes(query) ||
          categoryLabels[item.category]?.toLowerCase().includes(query)
        }
        filterOptions={[
          { label: 'بانتظار الاعتماد (Pending)', filterFn: (e) => e.approvalStatus === 'pending' },
          { label: 'معتمد (Approved)', filterFn: (e) => e.approvalStatus === 'approved' },
        ]}
        exportFileName="fleetops_expenses"
      />

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="تسجيل مصروف تشغيلي جديد"
        subtitle="إدخال بيانات الفاتورة والفئة للمراجعة والاعتماد"
        maxWidth="md"
      >
        <form onSubmit={handleCreateExpense} className="space-y-4">
          <FinancialAuditBanner
            currentUserFullName={currentUser?.fullName}
            currentUserRole={currentUser?.role}
            actionDescription="يتم توثيق اسم مدخل المصروف التشغيلي ومطابقته لمنع الفواتير الوهمية أو الازدواج المالي."
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">المبلغ (ر.س) *</label>
            <input
              type="number"
              required
              min={1}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:bg-white outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">فئة المصروف *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
            >
              <option value="operations">مصروفات تشغيلية عامة</option>
              <option value="fuel">وقود ومحطات</option>
              <option value="maintenance">ورش وصيانة</option>
              <option value="insurance">تأمين ورخص واستمارات</option>
              <option value="fines">غرامات ومخالفات</option>
              <option value="salaries">بدلات وسلف كباتن</option>
              <option value="other">أخرى ونثريات</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">التاريخ *</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">البيان والوصف *</label>
            <textarea
              rows={2}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="شراء أدوات نظافة، رسوم فحص فني، الخ..."
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
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              حفظ المصروف
            </button>
          </div>
        </form>
      </Modal>

      <DeleteWithPasswordModal
        isOpen={!!expenseToDelete}
        onClose={() => setExpenseToDelete(null)}
        onConfirm={handleDeleteConfirm}
        itemTitle={`مصروف: ${expenseToDelete?.description || 'مصروف'} (${expenseToDelete?.amount || 0} ر.س)`}
        itemType="مصروف تشغيلي"
        warningNote="سيتم حفظ هذا السجل المالي في إدارة المحذوفات للمدير العام مع إمكانية استعادته لاحقاً."
      />
    </div>
  );
};
