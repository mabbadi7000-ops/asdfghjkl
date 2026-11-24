import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  User,
  ArrowRight,
  Trash2,
  Calendar,
} from 'lucide-react';
import { Table, Column } from '../../components/common/Table';
import { StatCard } from '../../components/common/StatCard';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { DeleteWithPasswordModal } from '../../components/common/DeleteWithPasswordModal';
import { TaskRecord, TaskStatus, PriorityLevel, UserProfile } from '../../types';
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
import { useNotifications } from '../../context/NotificationContext';

export const TaskManagement: React.FC = () => {
  const { currentUser, canAccess } = useAuth();
  const { t } = useLanguage();
  const { sendNotification } = useNotifications();

  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<TaskRecord | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('medium');
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const unsub = subscribeToCollection<TaskRecord>('tasks', setTasks);
    async function loadUsers() {
      const u = await fetchCollection<UserProfile>('users');
      setUsers(u);
      if (u.length > 0 && !assignedToId) {
        setAssignedToId(u[0].id);
      }
    }
    loadUsers();
    return () => unsub();
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = await createDocument<Omit<TaskRecord, 'id'>>('tasks', {
      title,
      description,
      creatorId: currentUser?.id || 'sys',
      assignedToId,
      priority,
      dueDate,
      status: 'assigned',
      notes,
    });

    await logAuditAction(
      currentUser,
      'CREATE_TASK',
      'tasks',
      id,
      `إسناد مهمة تشغيلية: "${title}"`
    );

    // Send in-app notification to the assignee
    await sendNotification({
      recipientId: assignedToId,
      title: 'مهمة تشغيلية جديدة',
      message: `تم إسناد مهمة جديدة لك: "${title}" بواسطة ${currentUser?.fullName}`,
      type: 'task',
      priority: priority === 'urgent' ? 'urgent' : priority === 'high' ? 'high' : 'normal',
      link: 'tasks',
    });

    setTitle('');
    setDescription('');
    setNotes('');
    setIsModalOpen(false);
  };

  const handleStatusChange = async (task: TaskRecord, newStatus: TaskStatus) => {
    await updateDocument<TaskRecord>('tasks', task.id, {
      status: newStatus,
      completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined,
    });

    await logAuditAction(
      currentUser,
      'UPDATE_TASK_STATUS',
      'tasks',
      task.id,
      `تحديث حالة المهمة "${task.title}" إلى ${newStatus}`
    );
  };

  const handleDeleteConfirm = async (reason: string) => {
    if (!taskToDelete || !currentUser) return;
    await softDeleteDocumentWithPassword(
      'tasks',
      taskToDelete.id,
      `مهمة: ${taskToDelete.title}`,
      taskToDelete,
      currentUser,
      reason,
      `الأولوية: ${taskToDelete.priority} • الحالة: ${taskToDelete.status}`
    );
    await logAuditAction(
      currentUser,
      'SOFT_DELETE_TASK',
      'tasks',
      taskToDelete.id,
      `حذف ونقل المهمة "${taskToDelete.title}" لسلة المحذوفات (${reason})`
    );
    setTaskToDelete(null);
  };

  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress' || t.status === 'assigned').length;
  const urgentCount = tasks.filter((t) => t.priority === 'urgent' && t.status !== 'completed').length;

  const getUserName = (uId: string) => {
    const u = users.find((item) => item.id === uId || item.iqamaNumber === uId);
    return u ? `${u.fullName} (${u.jobTitle || u.role})` : uId;
  };

  const priorityBadges: Record<PriorityLevel, { label: string; color: string }> = {
    low: { label: 'منخفضة', color: 'bg-slate-100 text-slate-700' },
    medium: { label: 'متوسطة', color: 'bg-blue-100 text-blue-800' },
    high: { label: 'مرتفعة', color: 'bg-amber-100 text-amber-800' },
    urgent: { label: 'عاجل جداً', color: 'bg-rose-100 text-rose-800' },
  };

  const statusBadges: Record<TaskStatus, { label: string; color: string }> = {
    new: { label: 'جديدة', color: 'bg-blue-100 text-blue-800' },
    assigned: { label: 'مسندة', color: 'bg-indigo-100 text-indigo-800' },
    in_progress: { label: 'قيد التنفيذ', color: 'bg-amber-100 text-amber-800' },
    pending: { label: 'معلقة', color: 'bg-purple-100 text-purple-800' },
    completed: { label: 'مكتملة', color: 'bg-emerald-100 text-emerald-800' },
    rejected: { label: 'مرفوضة', color: 'bg-rose-100 text-rose-800' },
    overdue: { label: 'متأخرة', color: 'bg-red-200 text-red-900' },
  };

  const columns: Column<TaskRecord>[] = [
    {
      header: 'عنوان المهمة',
      accessor: 'title',
      sortable: true,
      render: (t) => (
        <div>
          <span className="font-bold text-slate-900 block text-xs">{t.title}</span>
          <span className="text-[10px] text-slate-400 line-clamp-1">{t.description}</span>
        </div>
      ),
    },
    {
      header: 'الشخص المكلف',
      accessor: 'assignedToId',
      render: (t) => <span className="font-semibold text-slate-800">{getUserName(t.assignedToId)}</span>,
    },
    {
      header: 'الأولوية',
      accessor: 'priority',
      render: (t) => {
        const badge = priorityBadges[t.priority];
        return <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${badge.color}`}>{badge.label}</span>;
      },
    },
    {
      header: 'تاريخ الاستحقاق',
      accessor: 'dueDate',
      sortable: true,
      render: (t) => <span className="font-mono text-slate-600 text-xs">{t.dueDate}</span>,
    },
    {
      header: 'الحالة',
      accessor: 'status',
      render: (t) => {
        const badge = statusBadges[t.status];
        return <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${badge.color}`}>{badge.label}</span>;
      },
    },
    {
      header: 'الإجراءات',
      className: 'text-end',
      render: (t) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          {t.status !== 'completed' && (
            <button
              onClick={() => handleStatusChange(t, 'completed')}
              title="تحديد كمكتملة"
              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-lg cursor-pointer flex items-center gap-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>إكمال</span>
            </button>
          )}
          {t.status === 'assigned' && (
            <button
              onClick={() => handleStatusChange(t, 'in_progress')}
              title="بدء التنفيذ"
              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 text-[10px] font-bold rounded-lg cursor-pointer"
            >
              بدء
            </button>
          )}
          {canAccess(['general_manager', 'operations_manager']) && (
            <button
              onClick={() => setTaskToDelete(t)}
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
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">المهام التشغيلية</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            إسناد المهام الهرمية من الإدارة العامة إلى العمليات والمشرفين ومتابعة سرعة الإنجاز.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>إسناد مهمة جديدة</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="إجمالي المهام"
          value={tasks.length}
          subtitle="مسجلة في النظام"
          icon={CheckSquare}
          colorScheme="blue"
        />
        <StatCard
          title="قيد التنفيذ والمتابعة"
          value={inProgressCount}
          subtitle="مفتوحة للعمل"
          icon={Clock}
          colorScheme="amber"
        />
        <StatCard
          title="المهام المكتملة"
          value={completedCount}
          subtitle="تم إنجازها بنجاح"
          icon={CheckCircle2}
          colorScheme="emerald"
        />
        <StatCard
          title="مهام عاجلة"
          value={urgentCount}
          subtitle="أولوية قصوى"
          icon={AlertTriangle}
          colorScheme="rose"
        />
      </div>

      {/* Table */}
      <Table
        data={tasks}
        columns={columns}
        keyExtractor={(item) => item.id}
        searchPlaceholder="بحث في عنوان المهمة أو المكلف..."
        searchFilter={(item, query) =>
          item.title.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          getUserName(item.assignedToId).toLowerCase().includes(query)
        }
        filterOptions={[
          { label: 'قيد التنفيذ (In Progress)', filterFn: (t) => t.status === 'in_progress' || t.status === 'assigned' },
          { label: 'مكتملة (Completed)', filterFn: (t) => t.status === 'completed' },
          { label: 'عاجل جداً (Urgent)', filterFn: (t) => t.priority === 'urgent' },
        ]}
        exportFileName="fleetops_tasks"
      />

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="إسناد مهمة تشغيلية جديدة"
        subtitle="تحديد الشخص المكلف، مستوى الأولوية وتاريخ الاستحقاق"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">عنوان المهمة *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: فحص دوري لحقائب التوصيل العازلة..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">الوصف التفصيلي للمهمة *</label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="خطوات التنفيذ، المطلوب بدقة، والشروط الواجب مراعاتها..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">الشخص المكلف *</label>
              <select
                value={assignedToId}
                onChange={(e) => setAssignedToId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} - {u.jobTitle || u.role}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">الأولوية</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
              >
                <option value="low">منخفضة (Low)</option>
                <option value="medium">متوسطة (Medium)</option>
                <option value="high">مرتفعة (High)</option>
                <option value="urgent">عاجل جداً (Urgent)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">تاريخ الاستحقاق *</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ملاحظات إضافية</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
              />
            </div>
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
              إسناد المهمة
            </button>
          </div>
        </form>
      </Modal>

      <DeleteWithPasswordModal
        isOpen={!!taskToDelete}
        onClose={() => setTaskToDelete(null)}
        onConfirm={handleDeleteConfirm}
        itemTitle={`مهمة: ${taskToDelete?.title || ''}`}
        itemType="مهمة عمليات"
        warningNote="سيتم حفظ هذه المهمة في إدارة المحذوفات للمدير العام مع إمكانية استعادتها لاحقاً."
      />
    </div>
  );
};
