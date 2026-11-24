import React, { useState, useEffect } from 'react';
import {
  History,
  ShieldCheck,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { AuditLog } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { Table, Column } from '../../components/common/Table';
import { fetchCollection } from '../../services/dataService';

export const AuditLogViewer: React.FC = () => {
  const { t, language } = useLanguage();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'financial' | 'auth' | 'users' | 'settings' | 'fleet'>('all');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const list = await fetchCollection<AuditLog>('audit_logs');
      setLogs(list);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (categoryFilter === 'all') return true;
    if (categoryFilter === 'financial') {
      return (
        log.entityType === 'cash_settlements' ||
        log.entityType === 'driver_payrolls' ||
        log.entityType === 'driver_advances' ||
        log.entityType === 'expenses' ||
        log.entityType === 'fuel_records' ||
        log.action.includes('SETTLEMENT') ||
        log.action.includes('PAYROLL') ||
        log.action.includes('EXPENSE') ||
        log.action.includes('ADVANCE') ||
        log.action.includes('PAY_VIOLATION') ||
        log.action.includes('FUEL')
      );
    }
    if (categoryFilter === 'auth') {
      return log.action.includes('LOGIN') || log.action.includes('PASSWORD') || log.action.includes('LOGOUT') || log.entityType === 'auth';
    }
    if (categoryFilter === 'users') {
      return log.entityType === 'users' || log.action.includes('USER');
    }
    if (categoryFilter === 'settings') {
      return log.entityType === 'settings' || log.action.includes('CONFIG') || log.action.includes('SETTINGS');
    }
    if (categoryFilter === 'fleet') {
      return ['vehicles', 'drivers', 'fuel', 'maintenance', 'accidents', 'violations'].includes(log.entityType);
    }
    return true;
  });

  const getActionBadge = (action: string) => {
    const isFinancial =
      action.includes('SETTLEMENT') ||
      action.includes('PAYROLL') ||
      action.includes('EXPENSE') ||
      action.includes('ADVANCE') ||
      action.includes('FUEL') ||
      action.includes('PAY_VIOLATION');
    if (isFinancial) {
      return (
        <span className="px-2 py-0.5 rounded-lg text-[11px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-emerald-700" />
          <span>{action} (مالي)</span>
        </span>
      );
    }
    if (action.includes('CREATE') || action.includes('ADD')) {
      return <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">{action}</span>;
    }
    if (action.includes('DELETE')) {
      return <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">{action}</span>;
    }
    if (action.includes('UPDATE') || action.includes('EDIT')) {
      return <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">{action}</span>;
    }
    if (action.includes('LOGIN') || action.includes('AUTH')) {
      return <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">{action}</span>;
    }
    return <span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">{action}</span>;
  };

  const columns: Column<AuditLog>[] = [
    {
      header: language === 'ar' ? 'الوقت والتاريخ' : 'Timestamp',
      accessor: 'timestamp',
      sortable: true,
      render: (log) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-600 font-mono">
          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>{new Date(log.timestamp).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US')}</span>
        </div>
      ),
    },
    {
      header: language === 'ar' ? 'المستخدم' : 'Actor',
      accessor: 'userName',
      sortable: true,
      render: (log) => (
        <div>
          <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
            <span>{log.userName}</span>
            {log.userRole === 'admin' && (
              <span className="px-1.5 py-0.2 bg-amber-500 text-slate-950 font-black text-[9px] rounded-sm">
                ADMIN
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 capitalize">{log.userRole?.replace('_', ' ')}</div>
        </div>
      ),
    },
    {
      header: language === 'ar' ? 'العملية' : 'Action',
      accessor: 'action',
      sortable: true,
      render: (log) => getActionBadge(log.action),
    },
    {
      header: language === 'ar' ? 'الجدول' : 'Entity',
      accessor: 'entityType',
      sortable: true,
      render: (log) => (
        <span className="font-mono text-xs text-slate-700 uppercase bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
          {log.entityType}
        </span>
      ),
    },
    {
      header: language === 'ar' ? 'التفاصيل' : 'Details',
      accessor: 'details',
      render: (log) => <span className="text-xs text-slate-700">{log.details}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <History className="w-6 h-6 text-amber-500" />
            {t('auditLogs')}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'ar'
              ? 'سجل التدقيق الأمني الشامل - تتبع دقيق لكافة العمليات الإدارية والمالية'
              : 'Enterprise Security Audit Trail for System Admins - Full tracking of administrative, authentication, and fleet actions'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchLogs}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>{language === 'ar' ? 'تحديث' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'all', label: language === 'ar' ? 'الكل' : 'All Logs' },
          { id: 'financial', label: language === 'ar' ? 'العمليات المالية' : 'Financial' },
          { id: 'auth', label: language === 'ar' ? 'الأمان والدخول' : 'Auth & Security' },
          { id: 'users', label: language === 'ar' ? 'المستخدمين' : 'User Management' },
          { id: 'settings', label: language === 'ar' ? 'الإعدادات' : 'System Settings' },
          { id: 'fleet', label: language === 'ar' ? 'الأسطول والعمليات' : 'Fleet & Operations' },
        ].map((btn) => (
          <button
            key={btn.id}
            onClick={() => setCategoryFilter(btn.id as any)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              categoryFilter === btn.id
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      <Table
        data={filteredLogs}
        columns={columns}
        keyExtractor={(item) => item.id}
        searchPlaceholder={language === 'ar' ? 'بحث في السجلات...' : 'Search audit records...'}
        exportFileName="fleetops-audit-log"
      />
    </div>
  );
};
