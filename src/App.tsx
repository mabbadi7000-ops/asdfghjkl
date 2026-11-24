/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { Header } from './components/common/Header';
import { Sidebar, ActiveTab } from './components/common/Sidebar';
import { LoginPage } from './modules/auth/LoginPage';
import { ForcePasswordChangeModal } from './modules/auth/ForcePasswordChangeModal';
import { getSettings, CompanyProfileSettings } from './services/settingsService';
import { ErrorBoundary } from './components/common/ErrorBoundary';

const AdminDashboard = React.lazy(() =>
  import('./modules/dashboard/AdminDashboard').then((module) => ({ default: module.AdminDashboard }))
);
const ExecutiveDashboard = React.lazy(() =>
  import('./modules/dashboard/ExecutiveDashboard').then((module) => ({ default: module.ExecutiveDashboard }))
);
const OperationsDashboard = React.lazy(() =>
  import('./modules/dashboard/OperationsDashboard').then((module) => ({ default: module.OperationsDashboard }))
);
const SupervisorDashboard = React.lazy(() =>
  import('./modules/dashboard/SupervisorDashboard').then((module) => ({ default: module.SupervisorDashboard }))
);
const DriverList = React.lazy(() =>
  import('./modules/drivers/DriverList').then((module) => ({ default: module.DriverList }))
);
const VehicleList = React.lazy(() =>
  import('./modules/vehicles/VehicleList').then((module) => ({ default: module.VehicleList }))
);
const FuelManagement = React.lazy(() =>
  import('./modules/fuel/FuelManagement').then((module) => ({ default: module.FuelManagement }))
);
const MaintenanceManagement = React.lazy(() =>
  import('./modules/maintenance/MaintenanceManagement').then((module) => ({ default: module.MaintenanceManagement }))
);
const AttendanceManagement = React.lazy(() =>
  import('./modules/attendance/AttendanceManagement').then((module) => ({ default: module.AttendanceManagement }))
);
const LeaveManagement = React.lazy(() =>
  import('./modules/leaves/LeaveManagement').then((module) => ({ default: module.LeaveManagement }))
);
const PlatformContracts = React.lazy(() =>
  import('./modules/platforms/PlatformContracts').then((module) => ({ default: module.PlatformContracts }))
);
const CashSettlementManagement = React.lazy(() =>
  import('./modules/settlements/CashSettlementManagement').then((module) => ({ default: module.CashSettlementManagement }))
);
const DriverPayrollManagement = React.lazy(() =>
  import('./modules/payroll/DriverPayrollManagement').then((module) => ({ default: module.DriverPayrollManagement }))
);
const PlatformInvoiceFilterStudio = React.lazy(() =>
  import('./modules/payroll/PlatformInvoiceFilterStudio').then((module) => ({ default: module.PlatformInvoiceFilterStudio }))
);
const FreelancerManagement = React.lazy(() =>
  import('./modules/freelancers/FreelancerManagement').then((module) => ({ default: module.FreelancerManagement }))
);
const TaskManagement = React.lazy(() =>
  import('./modules/tasks/TaskManagement').then((module) => ({ default: module.TaskManagement }))
);
const ReportingPortal = React.lazy(() =>
  import('./modules/reports/ReportingPortal').then((module) => ({ default: module.ReportingPortal }))
);
const DocumentArchive = React.lazy(() =>
  import('./modules/documents/DocumentArchive').then((module) => ({ default: module.DocumentArchive }))
);
const AccidentManagement = React.lazy(() =>
  import('./modules/accidents/AccidentManagement').then((module) => ({ default: module.AccidentManagement }))
);
const ViolationManagement = React.lazy(() =>
  import('./modules/violations/ViolationManagement').then((module) => ({ default: module.ViolationManagement }))
);
const ExpenseManagement = React.lazy(() =>
  import('./modules/expenses/ExpenseManagement').then((module) => ({ default: module.ExpenseManagement }))
);
const NotificationCenter = React.lazy(() =>
  import('./modules/notifications/NotificationCenter').then((module) => ({ default: module.NotificationCenter }))
);
const UserManagement = React.lazy(() =>
  import('./modules/users/UserManagement').then((module) => ({ default: module.UserManagement }))
);
const AnalyticsDashboard = React.lazy(() =>
  import('./modules/analytics/AnalyticsDashboard').then((module) => ({ default: module.AnalyticsDashboard }))
);
const AuditLogViewer = React.lazy(() =>
  import('./modules/audit/AuditLogViewer').then((module) => ({ default: module.AuditLogViewer }))
);
const SettingsManagement = React.lazy(() =>
  import('./modules/settings/SettingsManagement').then((module) => ({ default: module.SettingsManagement }))
);
const RecycleBinManagement = React.lazy(() =>
  import('./modules/recycleBin/RecycleBinManagement').then((module) => ({ default: module.RecycleBinManagement }))
);
const BackupManagement = React.lazy(() =>
  import('./modules/backup/BackupManagement').then((module) => ({ default: module.BackupManagement }))
);
const OfficialLetterStudio = React.lazy(() =>
  import('./modules/letters/OfficialLetterStudio').then((module) => ({ default: module.OfficialLetterStudio }))
);

const MainLayout: React.FC = () => {
  const { currentUser, loading, forcePasswordModalOpen } = useAuth();
  const { direction } = useLanguage();

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (currentUser) setActiveTab('dashboard');
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser) return;
    let active = true;
    void getSettings().then((settings) => {
      if (!active) return;
      const companyName = settings.companyName || settings.companyNameAr || 'مارشال لوجستيكس';
      document.title = `${companyName} | لإدارة الأساطيل والتشغيل`;
      const favicon = document.getElementById('app-favicon') as HTMLLinkElement | null;
      if (favicon) favicon.href = settings.faviconUrl || settings.logoUrl || favicon.dataset.defaultHref || favicon.href;
    });
    return () => { active = false; };
  }, [currentUser?.id]);

  // If loading session/auth state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        <div className="text-sm font-semibold tracking-wide text-slate-300">
          جارٍ تشغيل منظومة FleetOps السحابية...
        </div>
      </div>
    );
  }

  // If unauthenticated, show Enterprise Login Page
  if (!currentUser) {
    return <LoginPage />;
  }

  // Render module based on activeTab and user role
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        if (currentUser.role === 'admin') {
          return <AdminDashboard onNavigate={setActiveTab} />;
        }
        if (currentUser.role === 'general_manager' || currentUser.role === 'executive') {
          return <ExecutiveDashboard onNavigate={setActiveTab} />;
        }
        if (currentUser.role === 'operations_manager') {
          return (
            <OperationsDashboard
              onNavigate={setActiveTab}
              onCreateTask={() => setActiveTab('tasks')}
            />
          );
        }
        // Supervisor role (or default)
        return (
          <SupervisorDashboard
            onNavigate={setActiveTab}
            onOpenReportModal={() => setActiveTab('reports')}
          />
        );

      case 'drivers':
        return <DriverList />;

      case 'freelancers':
        if (currentUser.role === 'admin') {
          return <AdminDashboard onNavigate={setActiveTab} />;
        }
        return <FreelancerManagement />;

      case 'vehicles':
        return <VehicleList />;

      case 'fuel':
        return <FuelManagement />;

      case 'maintenance':
        return <MaintenanceManagement />;

      case 'attendance':
        return <AttendanceManagement />;

      case 'leaves':
        return <LeaveManagement />;

      case 'platforms':
        return <PlatformContracts />;

      case 'cash_settlement':
        if (currentUser.role === 'admin') {
          return <AdminDashboard onNavigate={setActiveTab} />;
        }
        return <CashSettlementManagement />;

      case 'payroll':
        if (currentUser.role === 'admin') {
          return <AdminDashboard onNavigate={setActiveTab} />;
        }
        return <DriverPayrollManagement />;

      case 'platform_invoices':
        if (currentUser.role === 'admin') {
          return <AdminDashboard onNavigate={setActiveTab} />;
        }
        return <PlatformInvoiceFilterStudio />;

      case 'tasks':
        return <TaskManagement />;

      case 'reports':
        return <ReportingPortal />;

      case 'documents':
        return <DocumentArchive />;

      case 'letters':
        return <OfficialLetterStudio />;

      case 'accidents':
        return <AccidentManagement />;

      case 'violations':
        return <ViolationManagement />;

      case 'expenses':
        return <ExpenseManagement />;

      case 'notifications':
        return <NotificationCenter onNavigate={setActiveTab} />;

      case 'analytics':
        return <AnalyticsDashboard />;

      case 'recycle_bin':
        if (currentUser.role !== 'admin') {
          return <ExecutiveDashboard onNavigate={setActiveTab} />;
        }
        return <RecycleBinManagement />;

      case 'backups':
        if (currentUser.role !== 'admin') {
          return <ExecutiveDashboard onNavigate={setActiveTab} />;
        }
        return <BackupManagement />;

      case 'users':
        if (currentUser.role !== 'admin') {
          return <ExecutiveDashboard onNavigate={setActiveTab} />;
        }
        return <UserManagement />;

      case 'auditLogs':
        if (currentUser.role !== 'admin') {
          return <ExecutiveDashboard onNavigate={setActiveTab} />;
        }
        return <AuditLogViewer />;

      case 'settings':
        if (currentUser.role !== 'admin') {
          return <ExecutiveDashboard onNavigate={setActiveTab} />;
        }
        return <SettingsManagement />;

      default:
        return <ExecutiveDashboard onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className={`min-h-screen bg-slate-50 flex flex-col text-slate-900 ${direction === 'rtl' ? 'font-sans' : 'font-sans'}`} dir={direction}>
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:ps-64 transition-all duration-200">
        {/* Top Header */}
        <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <ErrorBoundary key={activeTab}>
            <React.Suspense fallback={<div className="p-8 text-center text-slate-400">جاري التحميل...</div>}>
              {renderContent()}
            </React.Suspense>
          </ErrorBoundary>
        </main>
      </div>

      {/* Force Password Change Modal (for temporary passwords) */}
      {forcePasswordModalOpen && <ForcePasswordChangeModal />}
    </div>
  );
};

export default function App() {
  useEffect(() => {
    let currentSettings: Partial<CompanyProfileSettings> = {};
    let receivedUpdate = false;

    const applySettings = (updates: Partial<CompanyProfileSettings>) => {
      currentSettings = { ...currentSettings, ...updates };
      const companyName = currentSettings.companyName || currentSettings.companyNameAr || 'مارشال لوجستيكس';
      document.title = `${companyName} | لإدارة الأساطيل والتشغيل`;

      const favicon = document.getElementById('app-favicon') as HTMLLinkElement | null;
      const faviconUrl = currentSettings.faviconUrl || currentSettings.logoUrl;
      if (favicon) favicon.href = faviconUrl || favicon.dataset.defaultHref || favicon.href;
    };
    const handleSettingsUpdate = (event: Event) => {
      receivedUpdate = true;
      applySettings((event as CustomEvent<Partial<CompanyProfileSettings>>).detail || {});
    };

    window.addEventListener('company-settings-updated', handleSettingsUpdate);
    void getSettings().then((settings) => {
      if (!receivedUpdate) applySettings(settings);
    });
    return () => window.removeEventListener('company-settings-updated', handleSettingsUpdate);
  }, []);

  return (
    <LanguageProvider>
      <AuthProvider>
        <NotificationProvider>
          <MainLayout />
        </NotificationProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
