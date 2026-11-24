import React, { useState } from 'react';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Clock,
  Trash2,
  Calendar,
  AlertOctagon,
  ShieldAlert,
} from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { useLanguage } from '../../context/LanguageContext';
import { NotificationRecord, NotificationType } from '../../types';

interface NotificationCenterProps {
  onNavigate?: (tab: any) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ onNavigate }) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { t } = useLanguage();

  const [filterType, setFilterType] = useState<string>('all');
  const [filterRead, setFilterRead] = useState<string>('all');

  const filtered = notifications.filter((n) => {
    if (filterRead === 'unread' && n.isRead) return false;
    if (filterRead === 'read' && !n.isRead) return false;
    if (filterType !== 'all' && n.type !== filterType) return false;
    return true;
  });

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'expiry':
        return <Calendar className="w-4 h-4 text-rose-500" />;
      case 'maintenance':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'task':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'report':
        return <FileText className="w-4 h-4 text-indigo-500" />;
      case 'accident':
        return <AlertOctagon className="w-4 h-4 text-rose-600" />;
      case 'violation':
        return <ShieldAlert className="w-4 h-4 text-amber-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">مركز التنبيهات والإشعارات</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            إشعارات انتهاء المستندات، مهام العمليات، البلاغات والتقارير المرفوعة.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto"
          >
            تحديد الكل كمقروء ({unreadCount})
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: 'all', label: 'كافة الإشعارات' },
            { id: 'expiry', label: 'انتهاء المستندات' },
            { id: 'task', label: 'المهام' },
            { id: 'report', label: 'التقارير' },
            { id: 'accident', label: 'الحوادث' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                filterType === f.id
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <select
          value={filterRead}
          onChange={(e) => setFilterRead(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-hidden"
        >
          <option value="all">الكل (مقروء وغير مقروء)</option>
          <option value="unread">غير المقروءة فقط</option>
          <option value="read">المقروءة فقط</option>
        </select>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
            <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-700">لا توجد تنبيهات</h4>
            <p className="text-xs text-slate-400 mt-1">كافة الإشعارات تمت مراجعتها بنجاح.</p>
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                markAsRead(item.id);
                if (item.link && onNavigate) onNavigate(item.link);
              }}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-4 ${
                !item.isRead
                  ? 'bg-white border-indigo-200 shadow-xs hover:border-indigo-300'
                  : 'bg-slate-50/70 border-slate-200/80 hover:bg-white'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-slate-100 rounded-xl shrink-0 mt-0.5">
                  {getIcon(item.type)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                    {!item.isRead && (
                      <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                    )}
                    {item.priority === 'urgent' && (
                      <span className="px-1.5 py-0.5 text-[9px] font-bold bg-rose-100 text-rose-700 rounded-md">
                        عاجل
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.message}</p>
                  <span className="text-[10px] text-slate-400 mt-2 block font-mono">
                    {new Date(item.createdAt).toLocaleString('ar-SA')}
                  </span>
                </div>
              </div>

              {!item.isRead && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    markAsRead(item.id);
                  }}
                  className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 shrink-0 cursor-pointer"
                >
                  تحديد كمقروء
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
