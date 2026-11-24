import React, { useState, useEffect } from 'react';
import {
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  PlusCircle,
  Truck,
  CheckSquare,
  FileText,
  UserCheck,
} from 'lucide-react';
import { StatCard } from '../../components/common/StatCard';
import { useLanguage } from '../../context/LanguageContext';
import { Driver, AttendanceRecord, TaskRecord, Vehicle } from '../../types';
import { subscribeToCollection, createDocument } from '../../services/dataService';
import { ActiveTab } from '../../components/common/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { logAuditAction } from '../../services/auditService';

interface SupervisorDashboardProps {
  onNavigate: (tab: ActiveTab) => void;
  onOpenReportModal: () => void;
}

export const SupervisorDashboard: React.FC<SupervisorDashboardProps> = ({
  onNavigate,
  onOpenReportModal,
}) => {
  const { t, tx, language } = useLanguage();
  const { currentUser } = useAuth();

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);

  useEffect(() => {
    const unsubD = subscribeToCollection<Driver>('drivers', setDrivers);
    const unsubV = subscribeToCollection<Vehicle>('vehicles', setVehicles);
    const unsubA = subscribeToCollection<AttendanceRecord>('attendance', setAttendance);
    const unsubT = subscribeToCollection<TaskRecord>('tasks', setTasks);

    return () => {
      unsubD();
      unsubV();
      unsubA();
      unsubT();
    };
  }, []);

  const presentCount = attendance.filter((a) => a.status === 'present').length;
  const lateCount = attendance.filter((a) => a.status === 'late').length;
  const absentCount = attendance.filter((a) => a.status === 'absent').length;

  const handleQuickAttendance = async (driverId: string, status: 'present' | 'late' | 'absent') => {
    const today = new Date().toISOString().slice(0, 10);
    const existing = attendance.find((a) => a.userId === driverId && a.date === today);

    if (existing) {
      alert('تم تسجيل حضور هذا الكابتن مسبقاً لليوم.');
      return;
    }

    await createDocument<Omit<AttendanceRecord, 'id'>>('attendance', {
      userId: driverId,
      date: today,
      status,
      checkInTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      delayMinutes: status === 'late' ? 25 : 0,
      supervisorId: currentUser?.id,
      notes: `تسجيل فوري عبر لوحة المشرف ${currentUser?.fullName}`,
    });

    await logAuditAction(currentUser, 'RECORD_ATTENDANCE', 'attendance', driverId, `تسجيل حالة ${status} للكابتن`);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-amber-800 to-amber-950 text-white p-6 rounded-3xl shadow-lg">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/30 text-amber-300 border border-amber-400/30">
              Field Operations
            </span>
            <span className="text-xs text-amber-200">{tx('الإشراف الميداني اليومي', 'Daily Field Supervision')}</span>
          </div>
          <h2 className="text-xl font-black">{tx('لوحة المشرف الميداني', 'Field Supervisor Dashboard')}</h2>
          <p className="text-xs text-amber-200 mt-1 max-w-xl">
            {tx(
              'متابعة حضور وانصراف الكباتن الميدانيين، تسليم المركبات، ورفع الملاحظات والبلاغات التشغيلية لمدير العمليات.',
              'Monitor daily couriers attendance, vehicle handovers, and submit operational field reports to the operations manager.'
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenReportModal}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>{tx('رفع تقرير ميداني', 'Submit Field Report')}</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title={tx('كباتن حاضرون', 'Present Couriers')}
          value={presentCount}
          subtitle={tx('في الوردية الحالية', 'Current Shift')}
          icon={CheckCircle2}
          colorScheme="emerald"
          onClick={() => onNavigate('attendance')}
        />
        <StatCard
          title={tx('متأخرون عن الوردية', 'Late for Shift')}
          value={lateCount}
          subtitle={tx('تجاوز وقت البداية', 'Exceeded start time')}
          icon={Clock}
          colorScheme="amber"
          onClick={() => onNavigate('attendance')}
        />
        <StatCard
          title={tx('غياب غير مبرر', 'Unexcused Absence')}
          value={absentCount}
          subtitle={tx('يحتاج متابعة وتواصل', 'Follow-up required')}
          icon={AlertTriangle}
          colorScheme="rose"
          onClick={() => onNavigate('attendance')}
        />
        <StatCard
          title={tx('المهام المسندة', 'Assigned Tasks')}
          value={tasks.length}
          subtitle={tx('مهام جارية ومطلوبة', 'Pending & in-progress')}
          icon={CheckSquare}
          colorScheme="blue"
          onClick={() => onNavigate('tasks')}
        />
      </div>

      {/* Driver Quick Attendance Sheet */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              {tx('تسجيل الحضور السريع لكباتن الوردية (Quick Attendance Check)', 'Quick Shift Attendance Check')}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {tx('قم بتأكيد حضور أو تأخر السائقين عند نقطة التجمع وتسليم المفاتيح', 'Confirm presence or delay at muster point and key handover')}
            </p>
          </div>
          <button
            onClick={() => onNavigate('attendance')}
            className="text-xs font-semibold text-amber-700 hover:text-amber-800 cursor-pointer"
          >
            {tx('سجل الحضور الكامل', 'Full Attendance Ledger')}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {drivers.map((drv) => {
            const today = new Date().toISOString().slice(0, 10);
            const todayAtt = attendance.find((a) => a.userId === drv.id && a.date === today);
            return (
              <div
                key={drv.id}
                className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs text-slate-700">
                      {drv.fullName.slice(0, 1)}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{drv.fullName}</h4>
                      <p className="text-[10px] text-slate-400 font-mono">{drv.phone}</p>
                    </div>
                  </div>
                  {todayAtt ? (
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        todayAtt.status === 'present'
                          ? 'bg-emerald-100 text-emerald-700'
                          : todayAtt.status === 'late'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {todayAtt.status === 'present' ? tx('حاضر', 'Present') : todayAtt.status === 'late' ? tx('متأخر', 'Late') : tx('غائب', 'Absent')}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200 text-slate-600">
                      {tx('لم يسجل', 'Not Logged')}
                    </span>
                  )}
                </div>

                {!todayAtt && (
                  <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center gap-1.5">
                    <button
                      onClick={() => handleQuickAttendance(drv.id, 'present')}
                      className="flex-1 py-1 px-2 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer"
                    >
                      {tx('حاضر', 'Present')}
                    </button>
                    <button
                      onClick={() => handleQuickAttendance(drv.id, 'late')}
                      className="flex-1 py-1 px-2 text-[11px] font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors cursor-pointer"
                    >
                      {tx('متأخر', 'Late')}
                    </button>
                    <button
                      onClick={() => handleQuickAttendance(drv.id, 'absent')}
                      className="flex-1 py-1 px-2 text-[11px] font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors cursor-pointer"
                    >
                      {tx('غائب', 'Absent')}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
