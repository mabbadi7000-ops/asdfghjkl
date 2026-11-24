import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Users,
  Settings,
  History,
  Database,
  CheckCircle2,
  ArrowRight,
  Activity,
  UserPlus,
  RefreshCw,
  Trash2,
  FolderArchive,
} from 'lucide-react';
import { UserProfile, AuditLog } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { ActiveTab } from '../../components/common/Sidebar';
import { CommercialRegistrationCard } from '../../components/common/CommercialRegistrationCard';
import { fetchCollection } from '../../services/dataService';

interface AdminDashboardProps {
  onNavigate: (tab: ActiveTab) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const { tx } = useLanguage();
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [trashedCount, setTrashedCount] = useState<number>(0);
  const [backupsCount, setBackupsCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [usersList, logsList, trashList, backupsList] = await Promise.all([
        fetchCollection<UserProfile>('users'),
        fetchCollection<AuditLog>('audit_logs'),
        fetchCollection<any>('recycle_bin'),
        fetchCollection<any>('system_backups'),
      ]);
      setUsers(usersList);
      setRecentLogs(logsList.slice(0, 8));
      setTrashedCount(trashList.length);
      setBackupsCount(backupsList.length);
    } catch (err) {
      console.error('Error fetching admin dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const adminCount = users.filter((u) => u.role === 'admin').length;
  const gmCount = users.filter((u) => u.role === 'general_manager').length;
  const opsCount = users.filter((u) => u.role === 'operations_manager').length;
  const supCount = users.filter((u) => u.role === 'supervisor').length;
  const activeUsers = users.filter((u) => u.status === 'active').length;
  const suspendedUsers = users.filter((u) => u.status === 'suspended').length;

  return (
    <div className="space-y-6">
      <div className="p-6 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white rounded-3xl border border-amber-500/30 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[10px] font-black bg-amber-500 text-slate-950 uppercase tracking-wider">
              ADMIN CONTROL CENTER
            </span>
            <span className="text-xs text-amber-300 font-medium">
              {tx('إدارة النظام والأمان', 'System Administration & Security')}
            </span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            {tx(`مرحباً، ${currentUser?.fullName || 'مسؤول النظام'}`, `Welcome, ${currentUser?.fullName || 'System Admin'}`)}
          </h2>
          <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
            {tx(
              'أنت في لوحة التحكم الإدارية لنظام مارشال لوجستك - إدارة حسابات المستخدمين، مراقبة سجلات الأمان، وتهيئة السجلات.',
              'You are in the exclusive System Admin console - manage users & RBAC, configure enterprise settings, and monitor security audit trails.'
            )}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={() => onNavigate('users')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 text-xs font-black rounded-2xl shadow-md transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>{tx('إضافة مستخدم جديد', 'Add New User')}</span>
          </button>
          <button
            onClick={fetchAdminData}
            className="p-3 bg-slate-800/80 hover:bg-slate-800 text-slate-300 rounded-2xl border border-slate-700 transition-colors cursor-pointer"
            title="تحديث"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => onNavigate('users')}
          className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-amber-400 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 group-hover:text-amber-600 flex items-center gap-0.5">
              <span>{tx('إدارة', 'Manage')}</span>
              <ArrowRight className="w-3 h-3 rtl:rotate-180" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">{users.length}</div>
          <div className="text-xs text-slate-500 font-medium mt-0.5">
            {tx('إجمالي المستخدمين', 'Total System Users')}
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>{activeUsers} {tx('نشط', 'active')}</span>
            {suspendedUsers > 0 && <span className="text-rose-600 font-bold">{suspendedUsers} {tx('موقوف', 'suspended')}</span>}
          </div>
        </div>

        <div
          onClick={() => onNavigate('users')}
          className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-amber-400 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 group-hover:text-purple-600 flex items-center gap-0.5">
              <span>{tx('الصلاحيات', 'RBAC')}</span>
              <ArrowRight className="w-3 h-3 rtl:rotate-180" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">4 {tx('أدوار', 'Roles')}</div>
          <div className="text-xs text-slate-500 font-medium mt-0.5">
            {tx('توزيع الصلاحيات', 'Role Hierarchy')}
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-2 text-[10px] text-slate-600">
            <span>{adminCount} Admin</span> • <span>{gmCount} GM</span> • <span>{opsCount} Ops</span> • <span>{supCount} Sup</span>
          </div>
        </div>

        <div
          onClick={() => onNavigate('auditLogs')}
          className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-amber-400 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-600 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 group-hover:text-blue-600 flex items-center gap-0.5">
              <span>{tx('السجل', 'Audit Log')}</span>
              <ArrowRight className="w-3 h-3 rtl:rotate-180" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">{recentLogs.length}+</div>
          <div className="text-xs text-slate-500 font-medium mt-0.5">
            {tx('سجلات التدقيق الأمني', 'Security Audit Trail')}
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-emerald-600 font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{tx('تسجيل D1 الفوري', 'Immutable tracking')}</span>
          </div>
        </div>

        <div
          onClick={() => onNavigate('settings')}
          className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-amber-400 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 group-hover:text-emerald-600 flex items-center gap-0.5">
              <span>{tx('الإعدادات', 'Settings')}</span>
              <ArrowRight className="w-3 h-3 rtl:rotate-180" />
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-700 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-base font-bold">Cloudflare D1</span>
          </div>
          <div className="text-xs text-slate-500 font-medium mt-0.5">
            {tx('قاعدة البيانات النشطة', 'Active Database')}
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>26 جدولاً نشطاً</span>
            <span className="text-emerald-700 font-bold">Online</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <CommercialRegistrationCard />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div
              onClick={() => onNavigate('users')}
              className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-amber-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
                  <Users className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-slate-900 mb-1">
                  {tx('المستخدمين والصلاحيات', 'Users & Permissions')}
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {tx('إدارة الحسابات، المشرفين وكلمات المرور في D1.', 'Provision user accounts and manage access permissions.')}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-amber-600">
                <span>{tx('إدارة المستخدمين', 'Manage Users')}</span>
                <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
              </div>
            </div>

            <div
              onClick={() => onNavigate('settings')}
              className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-amber-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                  <Settings className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-slate-900 mb-1">
                  {tx('إعدادات الشركة والسجل', 'System & CR Settings')}
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {tx('بيانات السجل التجاري، الشعار، والحدود التشغيلية.', 'Commercial Registration, tax number, and alert limits.')}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600">
                <span>{tx('فتح الإعدادات', 'Open Settings')}</span>
                <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
              </div>
            </div>

            <div
              onClick={() => onNavigate('auditLogs')}
              className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-amber-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
                  <History className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-slate-900 mb-1">
                  {tx('سجل التدقيق الأمني', 'Activity & Security Logs')}
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {tx('تتبع عمليات تسجيل الدخول والتعديلات المالية في D1.', 'Immutable audit trail tracking logins and sensitive modifications.')}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-purple-600">
                <span>{tx('عرض السجلات', 'View Audit Logs')}</span>
                <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
              </div>
            </div>

            <div
              onClick={() => onNavigate('recycle_bin')}
              className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-amber-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900 mb-1">
                    {tx('سلة المهملات', 'Recycle Bin')}
                  </h4>
                  {trashedCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                      {trashedCount}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {tx('استعادة السجلات المحذوفة بكلمة مرور الأدمن.', 'Restore or permanently purge trashed system records with exclusive admin security.')}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-rose-600">
                <span>{tx('فتح سلة المهملات', 'Open Recycle Bin')}</span>
                <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-500" />
              <span>{tx('آخر أحداث الأمان في D1', 'Latest Security Events')}</span>
            </h3>
            <button
              onClick={() => onNavigate('auditLogs')}
              className="text-xs font-bold text-amber-600 hover:text-amber-700 cursor-pointer"
            >
              {tx('عرض الكل', 'View All')}
            </button>
          </div>
          <div className="space-y-3 flex-1 overflow-y-auto max-h-[480px]">
            {recentLogs.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-400">
                {tx('لا توجد سجلات بعد', 'No security logs recorded yet')}
              </div>
            ) : (
              recentLogs.map((log) => (
                <div key={log.id} className="p-3 bg-slate-50 hover:bg-amber-50/50 rounded-xl border border-slate-200/80 transition-colors text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <span>{log.userName}</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 line-clamp-2">
                    {log.details}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                    <span className="font-mono uppercase bg-white px-1.5 py-0.2 rounded border border-slate-200 text-slate-600">
                      {log.action}
                    </span>
                    <span className="capitalize">{log.entityType}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
