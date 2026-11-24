import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { UserProfile, UserRole } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Modal } from '../../components/common/Modal';
import { DeleteWithPasswordModal } from '../../components/common/DeleteWithPasswordModal';
import { Table, Column } from '../../components/common/Table';
import { logAuditAction } from '../../services/auditService';
import {
  fetchCollection,
  createDocument,
  updateDocument,
  softDeleteDocumentWithPassword,
} from '../../services/dataService';

export const UserManagement: React.FC = () => {
  const { currentUser } = useAuth();
  const { t, language } = useLanguage();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);

  const [formData, setFormData] = useState({
    iqamaNumber: '',
    fullName: '',
    email: '',
    phone: '',
    role: 'supervisor' as UserRole,
    jobTitle: '',
    branchId: 'br-01',
    password: 'Password@123',
    status: 'active' as 'active' | 'inactive' | 'suspended',
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const list = await fetchCollection<UserProfile>('users');
      setUsers(list);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({
      iqamaNumber: '',
      fullName: '',
      email: '',
      phone: '',
      role: 'supervisor',
      jobTitle: '',
      branchId: 'br-01',
      password: 'Password@123',
      status: 'active',
    });
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (user: UserProfile) => {
    setEditingUser(user);
    setFormData({
      iqamaNumber: user.iqamaNumber,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      jobTitle: user.jobTitle || '',
      branchId: user.branchId || 'br-01',
      password: '',
      status: user.status || 'active',
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!formData.iqamaNumber.trim() || !formData.fullName.trim()) {
      setFormError(language === 'ar' ? 'يرجى تعبئة الحقول الإلزامية' : 'Please fill all required fields');
      return;
    }

    try {
      setSaving(true);
      if (editingUser) {
        const updatePayload: any = {
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
          jobTitle: formData.jobTitle,
          status: formData.status,
          updatedAt: new Date().toISOString(),
        };
        if (formData.password) {
          updatePayload.password = formData.password;
          updatePayload.isTemporaryPassword = 1;
        }
        await updateDocument('users', editingUser.id, updatePayload);
        if (currentUser) {
          await logAuditAction(currentUser, 'UPDATE_USER', 'users', editingUser.id, `تحديث بيانات المستخدم: ${formData.fullName}`);
        }
      } else {
        const newId = `usr-${Date.now()}`;
        const newUserDoc = {
          id: newId,
          iqamaNumber: formData.iqamaNumber.trim(),
          fullName: formData.fullName.trim(),
          email: formData.email || `${formData.iqamaNumber}@marshal-logistic.sa`,
          phone: formData.phone,
          role: formData.role,
          jobTitle: formData.jobTitle || formData.role,
          branchId: formData.branchId,
          status: 'active',
          isTemporaryPassword: 1,
          password: formData.password || 'Password@123',
          createdAt: new Date().toISOString(),
        };
        await createDocument('users', newUserDoc);
        if (currentUser) {
          await logAuditAction(currentUser, 'CREATE_USER', 'users', newId, `إنشاء حساب مستخدم: ${newUserDoc.fullName} (${newUserDoc.role})`);
        }
      }
      setModalOpen(false);
      await fetchUsers();
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (reason: string) => {
    if (!userToDelete || !currentUser) return;
    try {
      await softDeleteDocumentWithPassword(
        'users',
        userToDelete.id,
        `مستخدم: ${userToDelete.fullName} (${userToDelete.email})`,
        userToDelete,
        currentUser,
        reason,
        `الدور: ${userToDelete.role} | الهوية: ${userToDelete.iqamaNumber}`
      );
      await logAuditAction(currentUser, 'SOFT_DELETE_USER', 'users', userToDelete.id, `حذف حساب المستخدم ${userToDelete.fullName}`);
      setDeleteConfirmOpen(false);
      setUserToDelete(null);
      await fetchUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 border border-amber-300 flex items-center gap-1 w-fit">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
            <span>مسؤول النظام / Admin</span>
          </span>
        );
      case 'general_manager':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200">المدير العام / GM</span>;
      case 'executive':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 border border-indigo-200">الإدارة التنفيذية / Executive</span>;
      case 'operations_manager':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">مدير العمليات / Ops</span>;
      case 'supervisor':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">مشرف ميداني / Supervisor</span>;
      default:
        return null;
    }
  };

  const columns: Column<UserProfile>[] = [
    {
      header: language === 'ar' ? 'المستخدم' : 'User',
      accessor: 'fullName',
      sortable: true,
      render: (user) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-sm">
            {user.fullName.slice(0, 1)}
          </div>
          <div>
            <div className="font-bold text-slate-900 text-sm">{user.fullName}</div>
            <div className="text-xs text-slate-500">{user.email}</div>
          </div>
        </div>
      ),
    },
    {
      header: language === 'ar' ? 'رقم الإقامة / الهوية' : 'Iqama / ID',
      accessor: 'iqamaNumber',
      sortable: true,
      render: (user) => <span className="font-mono font-semibold text-xs text-slate-700">{user.iqamaNumber}</span>,
    },
    {
      header: language === 'ar' ? 'الدور والمسمى' : 'Role & Job Title',
      accessor: 'role',
      sortable: true,
      render: (user) => (
        <div className="space-y-1">
          <div>{getRoleBadge(user.role)}</div>
          <div className="text-xs text-slate-500">{user.jobTitle}</div>
        </div>
      ),
    },
    {
      header: language === 'ar' ? 'رقم الهاتف' : 'Phone',
      accessor: 'phone',
      render: (user) => <span className="text-xs text-slate-600 font-mono">{user.phone || '-'}</span>,
    },
    {
      header: language === 'ar' ? 'الحالة' : 'Status',
      accessor: 'status',
      sortable: true,
      render: (user) => (
        <span
          className={`px-2 py-0.5 rounded-md text-xs font-medium ${
            user.status === 'active'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : user.status === 'suspended'
              ? 'bg-rose-50 text-rose-700 border border-rose-200'
              : 'bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          {user.status === 'active' ? 'نشط' : user.status === 'suspended' ? 'موقوف' : 'غير نشط'}
        </span>
      ),
    },
    {
      header: language === 'ar' ? 'الإجراءات' : 'Actions',
      accessor: 'id',
      render: (user) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openEditModal(user)}
            className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            {t('edit')}
          </button>
          {user.id !== currentUser?.id && (
            <button
              onClick={() => {
                setUserToDelete(user);
                setDeleteConfirmOpen(true);
              }}
              className="px-2.5 py-1 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
            >
              {t('delete')}
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <Users className="w-6 h-6 text-amber-500" />
            {t('users')}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'ar'
              ? 'إدارة حسابات مستخدمي النظام والصلاحيات في قاعدة D1'
              : 'Manage system user accounts, roles, and access privileges'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchUsers}
            className="p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="تحديث"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>{language === 'ar' ? 'مستخدم جديد' : 'New User'}</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'all', label: language === 'ar' ? 'كل المستخدمين' : 'All Users', count: users.length },
          { id: 'admin', label: language === 'ar' ? 'مسؤولي النظام' : 'Admins', count: users.filter((u) => u.role === 'admin').length },
          { id: 'general_manager', label: language === 'ar' ? 'المدير العام' : 'General Managers', count: users.filter((u) => u.role === 'general_manager').length },
          { id: 'executive', label: language === 'ar' ? 'الإدارة التنفيذية' : 'Executives', count: users.filter((u) => u.role === 'executive').length },
          { id: 'operations_manager', label: language === 'ar' ? 'مدراء العمليات' : 'Ops Managers', count: users.filter((u) => u.role === 'operations_manager').length },
          { id: 'supervisor', label: language === 'ar' ? 'المشرفين الميدانيين' : 'Supervisors', count: users.filter((u) => u.role === 'supervisor').length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedRoleFilter(tab.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
              selectedRoleFilter === tab.id
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                selectedRoleFilter === tab.id ? 'bg-amber-400 text-slate-950 font-bold' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      <Table
        data={selectedRoleFilter === 'all' ? users : users.filter((u) => u.role === selectedRoleFilter)}
        columns={columns}
        keyExtractor={(item) => item.id}
        searchPlaceholder={language === 'ar' ? 'بحث بالاسم، الهوية...' : 'Search by name, ID, role...'}
        exportFileName="system-users-fleetops"
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingUser ? (language === 'ar' ? 'تعديل بيانات المستخدم' : 'Edit User') : (language === 'ar' ? 'إضافة مستخدم جديد' : 'Add New User')}
        subtitle={language === 'ar' ? 'تأكد من صحة رقم الإقامة لتسجيل الدخول' : 'Ensure Iqama number is correct for login'}
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {language === 'ar' ? 'رقم الهوية / الإقامة *' : 'Iqama / National ID *'}
              </label>
              <input
                type="text"
                required
                disabled={!!editingUser}
                placeholder="10XXXXXXXX"
                value={formData.iqamaNumber}
                onChange={(e) => setFormData({ ...formData, iqamaNumber: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {language === 'ar' ? 'الاسم بالكامل *' : 'Full Name *'}
              </label>
              <input
                type="text"
                required
                placeholder={language === 'ar' ? 'مثال: محمد الشهري' : 'e.g. Mohammed Al-Shehri'}
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {language === 'ar' ? 'الصلاحية / الدور *' : 'Role *'}
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none bg-white cursor-pointer font-medium"
              >
                <option value="admin">مسؤول النظام (Admin)</option>
                <option value="general_manager">المدير العام (General Manager)</option>
                <option value="executive">الإدارة التنفيذية (Executive)</option>
                <option value="operations_manager">مدير العمليات (Operations Manager)</option>
                <option value="supervisor">مشرف ميداني (Supervisor)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {language === 'ar' ? 'المسمى الوظيفي' : 'Job Title'}
              </label>
              <input
                type="text"
                placeholder={language === 'ar' ? 'مشرف أسطول الرياض' : 'Riyadh Fleet Supervisor'}
                value={formData.jobTitle}
                onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {language === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
              </label>
              <input
                type="email"
                placeholder="user@marshal-logistic.sa"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {language === 'ar' ? 'رقم الجوال' : 'Phone Number'}
              </label>
              <input
                type="tel"
                placeholder="+966 5X XXX XXXX"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {editingUser
                  ? (language === 'ar' ? 'إعادة تعيين كلمة المرور (اختياري)' : 'Reset Password (Optional)')
                  : (language === 'ar' ? 'كلمة المرور المؤقتة *' : 'Temporary Password *')}
              </label>
              <input
                type="text"
                placeholder={language === 'ar' ? 'أدخل كلمة المرور...' : 'Enter password...'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {language === 'ar' ? 'حالة الحساب' : 'Account Status'}
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none bg-white cursor-pointer"
              >
                <option value="active">نشط (Active)</option>
                <option value="suspended">موقوف (Suspended)</option>
                <option value="inactive">غير نشط (Inactive)</option>
              </select>
            </div>
          </div>
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {saving ? t('loading') : t('save')}
            </button>
          </div>
        </form>
      </Modal>

      <DeleteWithPasswordModal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        itemTitle={userToDelete ? `${userToDelete.fullName} (${userToDelete.email})` : ''}
        itemType="مستخدم"
        warningNote="سيتم تعطيل الحساب ونقله إلى سلة المهملات."
      />
    </div>
  );
};
