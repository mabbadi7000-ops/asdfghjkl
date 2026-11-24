import React, { useState, useEffect } from 'react';
import {
  Truck,
  Users,
  CheckSquare,
  Wrench,
  Fuel,
  Clock,
  AlertOctagon,
  ArrowUpRight,
  PlusCircle,
} from 'lucide-react';
import { StatCard } from '../../components/common/StatCard';
import { useLanguage } from '../../context/LanguageContext';
import {
  Driver,
  Vehicle,
  MaintenanceRecord,
  TaskRecord,
  FuelRecord,
  AttendanceRecord,
} from '../../types';
import { subscribeToCollection } from '../../services/dataService';
import { ActiveTab } from '../../components/common/Sidebar';

interface OperationsDashboardProps {
  onNavigate: (tab: ActiveTab) => void;
  onCreateTask: () => void;
}

export const OperationsDashboard: React.FC<OperationsDashboardProps> = ({
  onNavigate,
  onCreateTask,
}) => {
  const { t, tx, language } = useLanguage();

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [fuelRecords, setFuelRecords] = useState<FuelRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    const unsubD = subscribeToCollection<Driver>('drivers', setDrivers);
    const unsubV = subscribeToCollection<Vehicle>('vehicles', setVehicles);
    const unsubT = subscribeToCollection<TaskRecord>('tasks', setTasks);
    const unsubM = subscribeToCollection<MaintenanceRecord>('maintenance_records', setMaintenance);
    const unsubF = subscribeToCollection<FuelRecord>('fuel_records', setFuelRecords);
    const unsubA = subscribeToCollection<AttendanceRecord>('attendance', setAttendance);

    return () => {
      unsubD();
      unsubV();
      unsubT();
      unsubM();
      unsubF();
      unsubA();
    };
  }, []);

  const inOperationVehicles = vehicles.filter((v) => v.status === 'in_operation').length;
  const maintenanceOrders = maintenance.filter((m) => m.status === 'in_progress' || m.status === 'requested').length;
  const ongoingTasks = tasks.filter((t) => t.status !== 'completed' && t.status !== 'rejected').length;
  const abnormalFuel = fuelRecords.filter((f) => f.isAbnormal).length;
  const presentDrivers = attendance.filter((a) => a.status === 'present').length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-6 rounded-3xl shadow-lg">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/30 text-blue-300 border border-blue-400/30">
              Operations Control Center
            </span>
            <span className="text-xs text-blue-200">{tx('مركز التحكم والتشغيل الميداني', 'Operations Control Center')}</span>
          </div>
          <h2 className="text-xl font-black">{tx('غرفة عمليات تشغيل الأسطول', 'Fleet Operations Control Room')}</h2>
          <p className="text-xs text-blue-200 mt-1 max-w-xl">
            {tx(
              'متابعة فورية لتوزيع السائقين على المنصات، أوامر الصيانة النشطة، الحضور اليومي، واستهلاك الوقود.',
              'Real-time tracking of driver assignments, active work orders, daily attendance, and fuel logs.'
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onCreateTask}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{tx('إسناد مهمة تشغيلية', 'Assign Operations Task')}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title={tx('مركبات في الخدمة', 'Vehicles in Service')}
          value={`${inOperationVehicles} / ${vehicles.length}`}
          subtitle={tx('جاهزية الأسطول النشط', 'Active Fleet Readiness')}
          icon={Truck}
          colorScheme="blue"
          onClick={() => onNavigate('vehicles')}
        />
        <StatCard
          title={tx('حضور الكباتن اليوم', 'Drivers Present Today')}
          value={`${presentDrivers} ${tx('كابتن', 'drivers')}`}
          subtitle={tx('نسبة الحضور 95%', 'Attendance Rate 95%')}
          icon={Clock}
          colorScheme="emerald"
          onClick={() => onNavigate('attendance')}
        />
        <StatCard
          title={tx('مهام جارية ومفتوحة', 'Ongoing Tasks')}
          value={ongoingTasks}
          subtitle={tx('بانتظار الإنجاز', 'Pending Completion')}
          icon={CheckSquare}
          colorScheme="purple"
          onClick={() => onNavigate('tasks')}
        />
        <StatCard
          title={tx('أوامر صيانة نشطة', 'Active Work Orders')}
          value={maintenanceOrders}
          subtitle={tx('في الورش قيد الإصلاح', 'Currently in Workshops')}
          icon={Wrench}
          colorScheme="amber"
          onClick={() => onNavigate('maintenance')}
        />
      </div>

      {/* Real-time Alerts */}
      {abnormalFuel > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Fuel className="w-5 h-5 text-amber-600" />
            <div>
              <p className="text-xs font-bold text-amber-900">
                {tx(
                  `تنبيه: تم رصد ${abnormalFuel} عملية تعبئة وقود بكميات غير معتادة أو تتجاوز سعة الخزان`,
                  `Alert: Detected ${abnormalFuel} fuel transaction(s) with abnormal volume or exceeding tank capacity`
                )}
              </p>
              <p className="text-[11px] text-amber-700">
                {tx('يرجى تدقيق قراءة العداد وصور الفواتير في سجلات الوقود.', 'Please review odometer readings and receipts in fuel logs.')}
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('fuel')}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl cursor-pointer"
          >
            {tx('فحص السجلات', 'Review Logs')}
          </button>
        </div>
      )}

      {/* Active Tasks & Ongoing Maintenance Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Tasks List */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800">{tx('المهام التشغيلية ذات الأولوية', 'Priority Operations Tasks')}</h3>
            <button
              onClick={() => onNavigate('tasks')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
            >
              <span>{tx('عرض الكل', 'View All')}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {tasks.slice(0, 4).map((task) => (
              <div
                key={task.id}
                className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{task.title}</h4>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
                      task.priority === 'urgent'
                        ? 'bg-rose-100 text-rose-700'
                        : task.priority === 'high'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {task.priority === 'urgent' ? tx('عاجل جداً', 'Urgent') : task.priority === 'high' ? tx('أولوية مرتفعة', 'High Priority') : tx('عادي', 'Normal')}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {task.description}
                </p>
                <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400">
                  <span>{tx('تاريخ الاستحقاق:', 'Due:')} {task.dueDate}</span>
                  <span className="font-semibold text-slate-600">{tx('الحالة:', 'Status:')} {task.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Maintenance in Progress */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800">{tx('أوامر الصيانة الحالية في الورش', 'Current Workshop Work Orders')}</h3>
            <button
              onClick={() => onNavigate('maintenance')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
            >
              <span>{tx('سجل الصيانة', 'Maintenance Log')}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {maintenance.slice(0, 4).map((m) => (
              <div
                key={m.id}
                className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800">{m.workshopName}</h4>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      m.status === 'in_progress'
                        ? 'bg-amber-100 text-amber-700'
                        : m.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {m.status === 'in_progress' ? tx('قيد التنفيذ', 'In Progress') : m.status === 'completed' ? tx('مكتملة', 'Completed') : tx('بانتظار الاعتماد', 'Pending Approval')}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">{m.description}</p>
                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                  <span>{tx('التكلفة المقدرة:', 'Est Cost:')} {m.estimatedCost} {t('sar')}</span>
                  <span>{tx('تاريخ الدخول:', 'Entry:')} {m.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
