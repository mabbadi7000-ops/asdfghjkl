import React from 'react';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Truck,
  Fuel,
  Wrench,
  Clock,
  Layers,
  CheckSquare,
  FileText,
  FolderArchive,
  AlertOctagon,
  ShieldAlert,
  CreditCard,
  Bell,
  BarChart3,
  History,
  Settings,
  Car,
  X,
  ChevronLeft,
  ChevronRight,
  Banknote,
  Wallet,
  KeyRound,
  Smartphone,
  FileSpreadsheet,
  Trash2,
  Database,
  CalendarOff,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { UserRole } from '../../types';

import { BrandLogo } from './BrandLogo';

export type ActiveTab =
  | 'dashboard'
  | 'users'
  | 'drivers'
  | 'freelancers'
  | 'vehicles'
  | 'fuel'
  | 'maintenance'
  | 'attendance'
  | 'leaves'
  | 'platforms'
  | 'cash_settlement'
  | 'payroll'
  | 'platform_invoices'
  | 'tasks'
  | 'reports'
  | 'documents'
  | 'accidents'
  | 'violations'
  | 'expenses'
  | 'notifications'
  | 'analytics'
  | 'recycle_bin'
  | 'backups'
  | 'auditLogs'
  | 'settings'
  | 'letters';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  id: ActiveTab;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
  badge?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpen,
  onClose,
}) => {
  const { currentUser } = useAuth();
  const { t, direction } = useLanguage();

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      labelKey: 'dashboard',
      icon: LayoutDashboard,
      roles: ['admin', 'general_manager', 'operations_manager', 'supervisor'],
    },
    // Admin Exclusive Modules (System, Users, RBAC, Settings, Security Audit, Recycle Bin & Backups)
    {
      id: 'users',
      labelKey: 'users',
      icon: Users,
      roles: ['admin'],
    },
    {
      id: 'settings',
      labelKey: 'settings',
      icon: Settings,
      roles: ['admin'],
    },
    {
      id: 'auditLogs',
      labelKey: 'auditLogs',
      icon: History,
      roles: ['admin'],
    },
    {
      id: 'backups',
      labelKey: 'systemBackups',
      icon: Database,
      roles: ['admin'],
    },
    {
      id: 'recycle_bin',
      labelKey: 'recycleBin',
      icon: Trash2,
      roles: ['admin'],
    },
    // Executive & Operations Modules (General Manager, Ops, Supervisor)
    {
      id: 'drivers',
      labelKey: 'drivers',
      icon: UserCheck,
      roles: ['general_manager', 'operations_manager', 'supervisor'],
    },
    {
      id: 'freelancers',
      labelKey: 'freelancers',
      icon: KeyRound,
      roles: ['general_manager', 'operations_manager', 'supervisor'],
    },
    {
      id: 'vehicles',
      labelKey: 'vehicles',
      icon: Truck,
      roles: ['general_manager', 'operations_manager', 'supervisor'],
    },
    {
      id: 'fuel',
      labelKey: 'fuel',
      icon: Fuel,
      roles: ['general_manager', 'operations_manager', 'supervisor'],
    },
    {
      id: 'maintenance',
      labelKey: 'maintenance',
      icon: Wrench,
      roles: ['general_manager', 'operations_manager', 'supervisor'],
    },
    {
      id: 'attendance',
      labelKey: 'attendance',
      icon: Clock,
      roles: ['general_manager', 'operations_manager', 'supervisor'],
    },
    {
      id: 'leaves',
      labelKey: 'leaves',
      icon: CalendarOff,
      roles: ['general_manager', 'operations_manager', 'supervisor'],
    },
    {
      id: 'tasks',
      labelKey: 'tasks',
      icon: CheckSquare,
      roles: ['general_manager', 'operations_manager', 'supervisor'],
    },
    {
      id: 'platforms',
      labelKey: 'platforms',
      icon: Layers,
      roles: ['general_manager', 'operations_manager'],
    },
    {
      id: 'cash_settlement',
      labelKey: 'cashSettlement',
      icon: Banknote,
      roles: ['general_manager', 'operations_manager', 'supervisor'],
    },
    {
      id: 'payroll',
      labelKey: 'driverPayroll',
      icon: Wallet,
      roles: ['general_manager', 'operations_manager', 'supervisor'],
    },
    {
      id: 'platform_invoices',
      labelKey: 'platformInvoices',
      icon: FileSpreadsheet,
      roles: ['general_manager', 'operations_manager', 'supervisor'],
    },
    {
      id: 'reports',
      labelKey: 'reports',
      icon: FileText,
      roles: ['general_manager', 'operations_manager', 'supervisor'],
    },
    {
      id: 'documents',
      labelKey: 'documents',
      icon: FolderArchive,
      roles: ['admin', 'general_manager', 'operations_manager', 'supervisor'],
    },
    {
      id: 'letters',
      labelKey: 'officialLetters',
      icon: FileText,
      roles: ['admin', 'executive', 'general_manager', 'operations_manager', 'supervisor'],
    },
    {
      id: 'accidents',
      labelKey: 'accidents',
      icon: AlertOctagon,
      roles: ['general_manager', 'operations_manager', 'supervisor'],
    },
    {
      id: 'violations',
      labelKey: 'violations',
      icon: ShieldAlert,
      roles: ['general_manager', 'operations_manager', 'supervisor'],
    },
    {
      id: 'expenses',
      labelKey: 'expenses',
      icon: CreditCard,
      roles: ['general_manager', 'operations_manager'],
    },
    {
      id: 'analytics',
      labelKey: 'analytics',
      icon: BarChart3,
      roles: ['general_manager', 'operations_manager'],
    },
    {
      id: 'notifications',
      labelKey: 'notifications',
      icon: Bell,
      roles: ['admin', 'general_manager', 'operations_manager', 'supervisor'],
    },
  ];

  const visibleItems = navItems.filter((item) => {
    if (!currentUser) return false;
    return item.roles.includes(currentUser.role) ||
      (currentUser.role === 'executive' && item.roles.includes('general_manager'));
  });

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 start-0 z-40 w-64 bg-slate-900 text-slate-300 flex flex-col border-e border-slate-800 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen
            ? 'translate-x-0'
            : direction === 'rtl'
            ? 'translate-x-full'
            : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <BrandLogo size="sm" variant="full" isDark={true} />
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg lg:hidden cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  onClose();
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-white' : 'text-slate-400'
                  }`}
                />
                <span className="truncate">{t(item.labelKey)}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/20 text-center">
          <p className="text-[10px] text-slate-500 font-medium font-sans">MARSHAL LOGISTIC v2.4 • KSA</p>
        </div>
      </aside>
    </>
  );
};
