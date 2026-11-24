import React, { useState, useEffect } from 'react';
import {
  Bell,
  Globe,
  LogOut,
  User,
  ShieldCheck,
  ChevronDown,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Menu,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useNotifications } from '../../context/NotificationContext';
import { UserRole } from '../../types';
import { BrandLogo } from './BrandLogo';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { currentUser, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    };
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [language]);

  const roleLabels: Record<UserRole, { ar: string; en: string; badgeStyle: string }> = {
    admin: { ar: 'مدير النظام والأمان', en: 'System Administrator', badgeStyle: 'bg-amber-500/15 text-amber-700 border-amber-300' },
    executive: { ar: 'الإدارة التنفيذية', en: 'Executive', badgeStyle: 'bg-indigo-500/10 text-indigo-700 border-indigo-200' },
    general_manager: { ar: 'المدير العام', en: 'General Manager', badgeStyle: 'bg-purple-500/10 text-purple-700 border-purple-200' },
    operations_manager: { ar: 'مدير التشغيل', en: 'Operations Manager', badgeStyle: 'bg-blue-500/10 text-blue-700 border-blue-200' },
    supervisor: { ar: 'مشرف تشغيل', en: 'Supervisor', badgeStyle: 'bg-emerald-500/10 text-emerald-700 border-emerald-200' },
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 sticky top-0 z-30 px-4 md:px-6 flex items-center justify-between no-print">
      {/* Left: Mobile Toggle & Live Clock */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl lg:hidden cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Mobile Mini Logo */}
        <div className="lg:hidden flex items-center">
          <BrandLogo size="sm" variant="badge" isDark={false} />
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-xl font-medium">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{currentTime}</span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* User Role Badge (Locked strictly to the authenticated account) */}
        {currentUser && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
            <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border ${roleLabels[currentUser.role]?.badgeStyle || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
              {roleLabels[currentUser.role]?.[language] || currentUser.role}
            </span>
          </div>
        )}

        {/* Language Switcher */}
        <button
          onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
          title="Switch Language"
        >
          <Globe className="w-3.5 h-3.5 text-slate-500" />
          <span>{language === 'ar' ? 'English' : 'العربية'}</span>
        </button>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
            className="relative p-2 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -end-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {notifDropdownOpen && (
            <div className="absolute end-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95">
              <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-800">{t('notifications')}</h4>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-700 rounded-md">
                      {unreadCount} {language === 'ar' ? 'جديد' : 'new'}
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                  >
                    {language === 'ar' ? 'تحديد الكل كمقروء' : 'Mark all as read'}
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    {language === 'ar' ? 'لا توجد إشعارات حالياً' : 'No notifications available'}
                  </div>
                ) : (
                  notifications.slice(0, 10).map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markAsRead(n.id)}
                      className={`p-3 text-start hover:bg-slate-50 transition-colors cursor-pointer ${
                        !n.isRead ? 'bg-indigo-50/30' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          {n.priority === 'urgent' && (
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          )}
                          <p className="text-xs font-bold text-slate-800 line-clamp-1">{n.title}</p>
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                        {n.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Card & Logout */}
        <div className="flex items-center gap-2.5 ps-2 border-s border-slate-200">
          <div className="hidden lg:block text-end">
            <p className="text-xs font-bold text-slate-900 leading-tight">
              {currentUser?.fullName || t('currentUserLabel')}
            </p>
            <p className="text-[10px] text-slate-400 font-medium font-mono">
              {currentUser?.iqamaNumber || ''}
            </p>
          </div>
          <button
            onClick={logout}
            title={t('logout')}
            className="p-2 text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
