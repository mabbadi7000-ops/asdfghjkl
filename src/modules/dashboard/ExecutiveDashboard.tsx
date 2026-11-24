import React, { useState, useEffect } from 'react';
import {
  Users,
  Truck,
  Fuel,
  Wrench,
  CheckSquare,
  FileText,
  AlertTriangle,
  FolderArchive,
  TrendingUp,
  CreditCard,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Clock,
  Sparkles,
} from 'lucide-react';
import { StatCard } from '../../components/common/StatCard';
import { useLanguage } from '../../context/LanguageContext';
import {
  Driver,
  Vehicle,
  FuelRecord,
  MaintenanceRecord,
  TaskRecord,
  ReportRecord,
  DocumentRecord,
  AccidentRecord,
  ViolationRecord,
  ExpenseRecord,
  PlatformContract,
} from '../../types';
import { subscribeToCollection } from '../../services/dataService';
import { ActiveTab } from '../../components/common/Sidebar';

interface ExecutiveDashboardProps {
  onNavigate: (tab: ActiveTab) => void;
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({ onNavigate }) => {
  const { t, tx, language } = useLanguage();
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'last_month' | 'all'>('month');

  // Real-time collections state
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [fuelRecords, setFuelRecords] = useState<FuelRecord[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [accidents, setAccidents] = useState<AccidentRecord[]>([]);
  const [violations, setViolations] = useState<ViolationRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [platforms, setPlatforms] = useState<PlatformContract[]>([]);

  useEffect(() => {
    const unsubDrivers = subscribeToCollection<Driver>('drivers', setDrivers);
    const unsubVehicles = subscribeToCollection<Vehicle>('vehicles', setVehicles);
    const unsubFuel = subscribeToCollection<FuelRecord>('fuel_records', setFuelRecords);
    const unsubMaint = subscribeToCollection<MaintenanceRecord>('maintenance_records', setMaintenance);
    const unsubTasks = subscribeToCollection<TaskRecord>('tasks', setTasks);
    const unsubReports = subscribeToCollection<ReportRecord>('reports', setReports);
    const unsubDocs = subscribeToCollection<DocumentRecord>('documents', setDocuments);
    const unsubAcc = subscribeToCollection<AccidentRecord>('accidents', setAccidents);
    const unsubVio = subscribeToCollection<ViolationRecord>('violations', setViolations);
    const unsubExp = subscribeToCollection<ExpenseRecord>('expenses', setExpenses);
    const unsubPlat = subscribeToCollection<PlatformContract>('platforms', setPlatforms);

    return () => {
      unsubDrivers();
      unsubVehicles();
      unsubFuel();
      unsubMaint();
      unsubTasks();
      unsubReports();
      unsubDocs();
      unsubAcc();
      unsubVio();
      unsubExp();
      unsubPlat();
    };
  }, []);

  // Metrics Calculations
  const activeDrivers = drivers.filter((d) => d.status === 'active').length;
  const inOperationVehicles = vehicles.filter((v) => v.status === 'in_operation').length;
  const maintenanceVehicles = vehicles.filter((v) => v.status === 'maintenance').length;
  const availableVehicles = vehicles.filter((v) => v.status === 'available').length;

  const totalFuelCost = fuelRecords.reduce((acc, f) => acc + (f.totalCost || 0), 0);
  const totalFuelLiters = fuelRecords.reduce((acc, f) => acc + (f.liters || 0), 0);
  const totalMaintCost = maintenance.reduce((acc, m) => acc + (m.actualCost || m.estimatedCost || 0), 0);
  const totalExpensesAmount = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);

  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const pendingTasks = tasks.filter((t) => t.status !== 'completed' && t.status !== 'rejected').length;
  const pendingReports = reports.filter((r) => r.status === 'submitted' || r.status === 'under_review').length;

  // Expiring documents check (< 30 days)
  const nowTime = new Date().getTime();
  const expiringDocs = documents.filter((doc) => {
    if (!doc.expiryDate) return false;
    const expTime = new Date(doc.expiryDate).getTime();
    const diffDays = Math.ceil((expTime - nowTime) / (1000 * 60 * 60 * 24));
    return diffDays <= 30;
  });

  return (
    <div className="space-y-6">
      {/* Top Welcome & Date Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 rounded-3xl shadow-lg">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Executive View
            </span>
            <span className="text-xs text-slate-400">{tx('لوحة القيادة التنفيذية', 'Executive Dashboard')}</span>
          </div>
          <h2 className="text-xl font-black tracking-tight">
            {tx('مرحباً بك في منظومة FleetOps لإدارة الأسطول', 'Welcome to FleetOps Fleet Management')}
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            {tx(
              'متابعة شاملة وحية لكافة العمليات التشغيلية، الكباتن، أداء المركبات، تكاليف الوقود ومؤشرات الالتزام عبر المنصات.',
              'Live operations tracking for couriers, vehicle performance, fuel costs, and platform SLAs.'
            )}
          </p>
        </div>

        {/* Date Filters */}
        <div className="flex items-center gap-1.5 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700 self-start sm:self-center shrink-0">
          {(
            [
              { id: 'today', label: tx('اليوم', 'Today') },
              { id: 'week', label: tx('هذا الأسبوع', 'This Week') },
              { id: 'month', label: tx('هذا الشهر', 'This Month') },
              { id: 'all', label: tx('الكل', 'All') },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => setDateFilter(item.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                dateFilter === item.id
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title={tx('إجمالي الكباتن', 'Total Drivers')}
          value={drivers.length}
          subtitle={tx(`${activeDrivers} كابتن نشط الآن`, `${activeDrivers} active drivers now`)}
          icon={Users}
          colorScheme="emerald"
          collectionName="drivers"
          onClick={() => onNavigate('drivers')}
          trend={{ value: '+8.4%', isPositive: true }}
        />
        <StatCard
          title={tx('إجمالي المركبات', 'Total Vehicles')}
          value={vehicles.length}
          subtitle={tx(
            `${inOperationVehicles} بالخدمة • ${maintenanceVehicles} بالصيانة`,
            `${inOperationVehicles} in operation • ${maintenanceVehicles} maintenance`
          )}
          icon={Truck}
          colorScheme="blue"
          collectionName="vehicles"
          onClick={() => onNavigate('vehicles')}
          trend={{ value: tx('جاهزية 94%', '94% Readiness'), isPositive: true }}
        />
        <StatCard
          title={tx('تكلفة الوقود', 'Fuel Cost')}
          value={`${totalFuelCost.toLocaleString()} ${t('sar')}`}
          subtitle={tx(
            `${Math.round(totalFuelLiters).toLocaleString()} لتر وقود مسجل`,
            `${Math.round(totalFuelLiters).toLocaleString()} L fuel logged`
          )}
          icon={Fuel}
          colorScheme="amber"
          collectionName="fuel_records"
          onClick={() => onNavigate('fuel')}
        />
        <StatCard
          title={tx('إجمالي المصروفات', 'Total Expenses')}
          value={`${(totalExpensesAmount + totalFuelCost + totalMaintCost).toLocaleString()} ${t('sar')}`}
          subtitle={tx(`صيانة: ${totalMaintCost.toLocaleString()} ${t('sar')}`, `Maint: ${totalMaintCost.toLocaleString()} ${t('sar')}`)}
          icon={CreditCard}
          colorScheme="gold"
          collectionName="expenses"
          allowedRoles={['admin', 'general_manager', 'operations_manager']}
          onClick={() => onNavigate('expenses')}
        />
      </div>

      {/* Secondary Operational Status Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          onClick={() => onNavigate('tasks')}
          className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between cursor-pointer hover:border-slate-300 transition-colors"
        >
          <div>
            <p className="text-xs font-semibold text-slate-500">{tx('إجمالي المهام', 'Total Tasks')}</p>
            <h4 className="text-xl font-extrabold text-slate-800 mt-0.5">{tasks.length}</h4>
            <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
              {completedTasks} {tx('مكتملة', 'completed')}
            </p>
          </div>
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <CheckSquare className="w-5 h-5" />
          </div>
        </div>

        <div
          onClick={() => onNavigate('documents')}
          className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between cursor-pointer hover:border-slate-300 transition-colors"
        >
          <div>
            <p className="text-xs font-semibold text-slate-500">{tx('وثائق تنتهي قريباً', 'Expiring Documents')}</p>
            <h4 className="text-xl font-extrabold text-rose-600 mt-0.5">{expiringDocs.length}</h4>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">{tx('خلال 30 يوم', 'Within 30 days')}</p>
          </div>
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
            <FolderArchive className="w-5 h-5" />
          </div>
        </div>

        <div
          onClick={() => onNavigate('reports')}
          className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between cursor-pointer hover:border-slate-300 transition-colors"
        >
          <div>
            <p className="text-xs font-semibold text-slate-500">{tx('تقارير بانتظار الاعتماد', 'Pending Reports')}</p>
            <h4 className="text-xl font-extrabold text-amber-600 mt-0.5">{pendingReports}</h4>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">{tx('تتطلب اعتمادك', 'Action required')}</p>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div
          onClick={() => onNavigate('accidents')}
          className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between cursor-pointer hover:border-slate-300 transition-colors"
        >
          <div>
            <p className="text-xs font-semibold text-slate-500">{tx('حوادث ومخالفات', 'Accidents & Fines')}</p>
            <h4 className="text-xl font-extrabold text-slate-800 mt-0.5">
              {accidents.length + violations.length}
            </h4>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              {accidents.length} {tx('حادث', 'accidents')} • {violations.length} {tx('مخالفة', 'violations')}
            </p>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Middle Interactive Grid: Fleet Status & Platform Contracts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vehicles State Distribution */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-800">{tx('توزيع حالة الأسطول', 'Fleet Status Distribution')}</h3>
              <button
                onClick={() => onNavigate('vehicles')}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
              >
                <span>{tx('إدارة المركبات', 'Vehicles Management')}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-emerald-700">{tx('قيد التشغيل والتوصيل', 'In Operation')}</span>
                  <span className="text-slate-700">
                    {inOperationVehicles} {tx('مركبة', 'vehicles')} ({vehicles.length ? Math.round((inOperationVehicles / vehicles.length) * 100) : 0}%)
                  </span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${vehicles.length ? (inOperationVehicles / vehicles.length) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-blue-700">{tx('متاحة وجاهزة للإسناد', 'Available')}</span>
                  <span className="text-slate-700">{availableVehicles} {tx('مركبة', 'vehicles')}</span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${vehicles.length ? (availableVehicles / vehicles.length) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-amber-700">{tx('في الورش والصيانة', 'In Maintenance')}</span>
                  <span className="text-slate-700">{maintenanceVehicles} {tx('مركبة', 'vehicles')}</span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{ width: `${vehicles.length ? (maintenanceVehicles / vehicles.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>{tx('معدل استخدام الأسطول (Fleet Utilization)', 'Fleet Utilization Rate')}</span>
            <span className="font-bold text-slate-900 text-sm">
              {vehicles.length ? Math.round((inOperationVehicles / vehicles.length) * 100) : 0}%
            </span>
          </div>
        </div>

        {/* Platform Contracts Live Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  {tx('المنصات وعقود التشغيل (Delivery Platforms)', 'Delivery Platform Contracts')}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {tx('توزيع الأسطول والكباتن على منصات التوصيل الشريكة', 'Fleet distribution across partner delivery apps')}
                </p>
              </div>
              <button
                onClick={() => onNavigate('platforms')}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
              >
                <span>{tx('كافة العقود', 'All Contracts')}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {platforms.map((plt) => (
                <div
                  key={plt.id}
                  className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800">{plt.name}</h4>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        plt.status === 'active'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {plt.status === 'active' ? tx('عقد سارٍ', 'Active') : tx('قيد التجديد', 'Renewing')}
                    </span>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500">
                    <span>{tx('الكباتن المسندين:', 'Drivers:')} <strong className="text-slate-800">{plt.activeDriversCount}</strong></span>
                    <span>{tx('المركبات:', 'Vehicles:')} <strong className="text-slate-800">{plt.activeVehiclesCount}</strong></span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2 truncate">
                    {tx('ينتهي في:', 'Expires:')} {plt.endDate}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>{tx('إجمالي طاقة التشغيل بالمنصات:', 'Total Platform Active Capacity:')}</span>
            <span className="font-bold text-slate-800">
              {platforms.reduce((acc, p) => acc + (p.activeDriversCount || 0), 0)} {tx('كابتن نشط', 'active drivers')}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Urgent Alerts: Documents & Maintenance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expiring Docs Alert Panel */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">{tx('مستندات حرجة تنتهي قريباً', 'Urgent Expiring Documents')}</h3>
            </div>
            <button
              onClick={() => onNavigate('documents')}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
            >
              {tx('عرض الأرشيف', 'View Archive')}
            </button>
          </div>

          <div className="space-y-2.5">
            {expiringDocs.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                {tx('جميع المستندات سارية ولا توجد رخص أو استمارات منتهية حالياً.', 'All documents are valid with no upcoming expiries.')}
              </p>
            ) : (
              expiringDocs.slice(0, 4).map((doc) => {
                const diff = Math.ceil(
                  (new Date(doc.expiryDate!).getTime() - nowTime) / (1000 * 60 * 60 * 24)
                );
                return (
                  <div
                    key={doc.id}
                    className="p-3 rounded-2xl border border-rose-100 bg-rose-50/40 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-800">{doc.title}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {tx('القسم:', 'Dept:')} {doc.department || tx('إدارة الحركة', 'Fleet Ops')} • {tx('ينتهي بتاريخ', 'Expires')} {doc.expiryDate}
                      </p>
                    </div>
                    <span className="px-2 py-1 text-[10px] font-extrabold rounded-lg bg-rose-500 text-white shrink-0">
                      {diff <= 0 ? tx('منتهي', 'Expired') : tx(`متبقي ${diff} يوم`, `${diff}d left`)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Pending Operational Reports for GM Approval */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <FileText className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">{tx('تقارير تشغيلية بانتظار الاعتماد', 'Operational Reports Pending Approval')}</h3>
            </div>
            <button
              onClick={() => onNavigate('reports')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
            >
              {tx('بوابة التقارير', 'Reports Portal')}
            </button>
          </div>

          <div className="space-y-2.5">
            {reports.filter((r) => r.status === 'submitted').length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                {tx('لا توجد تقارير معلقة بانتظار المراجعة أو الاعتماد.', 'No reports currently pending review or approval.')}
              </p>
            ) : (
              reports
                .filter((r) => r.status === 'submitted')
                .slice(0, 3)
                .map((rep) => (
                  <div
                    key={rep.id}
                    onClick={() => onNavigate('reports')}
                    className="p-3 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-800">{rep.title}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{rep.summary}</p>
                    </div>
                    <span className="px-2 py-1 text-[10px] font-bold rounded-lg bg-amber-100 text-amber-800 shrink-0">
                      {tx('بانتظار اعتمادك', 'Needs Approval')}
                    </span>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
