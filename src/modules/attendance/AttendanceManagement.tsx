import React, { useState, useEffect } from 'react';
import {
  Clock,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  PlusCircle,
  Truck,
  Sparkles,
  Sun,
  Moon,
} from 'lucide-react';
import { Table, Column } from '../../components/common/Table';
import { StatCard } from '../../components/common/StatCard';
import {
  AttendanceRecord,
  AttendanceStatus,
  Driver,
  DriverLeaveRecord,
  VehicleShift,
  Vehicle,
} from '../../types';
import {
  subscribeToCollection,
  createDocument,
  updateDocument,
  fetchCollection,
} from '../../services/dataService';
import { logAuditAction } from '../../services/auditService';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Modal } from '../../components/common/Modal';

export const AttendanceManagement: React.FC = () => {
  const { currentUser, canAccess } = useAuth();
  const { t } = useLanguage();

  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New attendance modal state
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus>('present');
  const [checkInTime, setCheckInTime] = useState('08:00');
  const [checkOutTime, setCheckOutTime] = useState('17:00');
  const [delayMinutes, setDelayMinutes] = useState(0);
  const [notes, setNotes] = useState('');

  const [leaves, setLeaves] = useState<DriverLeaveRecord[]>([]);
  const [shifts, setShifts] = useState<VehicleShift[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  useEffect(() => {
    const unsub = subscribeToCollection<AttendanceRecord>('attendance', setAttendance);
    const unsubLeaves = subscribeToCollection<DriverLeaveRecord>('leaves', setLeaves);
    const unsubShifts = subscribeToCollection<VehicleShift>('vehicle_shifts', setShifts);

    async function loadMeta() {
      const [d, v] = await Promise.all([
        fetchCollection<Driver>('drivers'),
        fetchCollection<Vehicle>('vehicles'),
      ]);
      setDrivers(d);
      setVehicles(v);
      if (d.length > 0 && !selectedDriverId) {
        setSelectedDriverId(d[0].id);
      }
    }
    loadMeta();

    return () => {
      unsub();
      unsubLeaves();
      unsubShifts();
    };
  }, []);

  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if driver has an existing vehicle shift on this date
    const matchedShift = shifts.find(
      (s) => s.driverId === selectedDriverId && s.shiftDate === selectedDate && s.status !== 'cancelled'
    );

    // Check if driver has an active approved leave on this date
    const matchedLeave = leaves.find(
      (l) =>
        l.driverId === selectedDriverId &&
        l.status !== 'rejected' &&
        l.status !== 'cancelled' &&
        selectedDate >= l.startDate &&
        selectedDate <= l.endDate
    );

    const shiftTypeDesc = matchedShift
      ? matchedShift.shiftType === 'day_shift'
        ? 'وردية صباحية'
        : matchedShift.shiftType === 'night_shift'
        ? 'وردية مسائية'
        : 'وردية مخصصة'
      : undefined;

    const computedNotes = notes
      ? notes
      : matchedShift
      ? `حضور مرتبط بـ [${shiftTypeDesc}] للمركبة`
      : matchedLeave
      ? `حالة مرتبطة بإجازة رسمية: [${matchedLeave.leaveType === 'weekly_rest' ? 'عطلة أسبوعية' : 'إجازة'}]`
      : '';

    const id = await createDocument<Omit<AttendanceRecord, 'id'>>('attendance', {
      userId: selectedDriverId,
      date: selectedDate,
      status: selectedStatus,
      checkInTime: selectedStatus === 'present' || selectedStatus === 'late' ? checkInTime : undefined,
      checkOutTime: selectedStatus === 'present' || selectedStatus === 'late' ? checkOutTime : undefined,
      delayMinutes: Number(delayMinutes),
      workingHours: selectedStatus === 'present' ? 8 : selectedStatus === 'late' ? 7.5 : 0,
      supervisorId: currentUser?.id,
      shiftId: matchedShift?.id,
      shiftType: matchedShift?.shiftType,
      vehicleId: matchedShift?.vehicleId,
      leaveId: matchedLeave?.id,
      notes: computedNotes,
    });

    await logAuditAction(
      currentUser,
      'MANUAL_ATTENDANCE',
      'attendance',
      id,
      `تسجيل حضور يدوي للسائق بتاريخ ${selectedDate} بحالة ${selectedStatus}`
    );

    setIsModalOpen(false);
  };

  const getDriverName = (uId: string) => {
    const d = drivers.find((item) => item.id === uId || item.iqamaNumber === uId);
    return d ? d.fullName : uId;
  };

  const presentCount = attendance.filter((a) => a.status === 'present').length;
  const lateCount = attendance.filter((a) => a.status === 'late').length;
  const absentCount = attendance.filter((a) => a.status === 'absent').length;
  const totalDaysLogged = attendance.length || 1;
  const attendanceRate = Math.round(((presentCount + lateCount) / totalDaysLogged) * 100);

  const statusBadges: Record<AttendanceStatus, { label: string; color: string }> = {
    present: { label: 'حاضر', color: 'bg-emerald-100 text-emerald-800' },
    absent: { label: 'غائب', color: 'bg-rose-100 text-rose-800' },
    late: { label: 'متأخر', color: 'bg-amber-100 text-amber-800' },
    vacation: { label: 'إجازة سنوية', color: 'bg-blue-100 text-blue-800' },
    sick: { label: 'إجازة مرضية', color: 'bg-purple-100 text-purple-800' },
    emergency_leave: { label: 'إجازة طارئة', color: 'bg-slate-200 text-slate-700' },
  };

  const columns: Column<AttendanceRecord>[] = [
    {
      header: 'التاريخ',
      accessor: 'date',
      sortable: true,
      render: (a) => <span className="font-mono text-slate-800 font-bold">{a.date}</span>,
    },
    {
      header: 'اسم الكابتن',
      accessor: 'userId',
      sortable: true,
      render: (a) => <span className="font-bold text-slate-900">{getDriverName(a.userId)}</span>,
    },
    {
      header: 'بداية الدوام',
      accessor: 'checkInTime',
      render: (a) => <span className="font-mono text-slate-600">{a.checkInTime || '—'}</span>,
    },
    {
      header: 'نهاية الدوام',
      accessor: 'checkOutTime',
      render: (a) => <span className="font-mono text-slate-600">{a.checkOutTime || '—'}</span>,
    },
    {
      header: 'التأخير (دقيقة)',
      accessor: 'delayMinutes',
      render: (a) => (
        <span className={a.delayMinutes ? 'font-bold text-amber-600' : 'text-slate-400'}>
          {a.delayMinutes ? `${a.delayMinutes} دقيقة` : 'لا يوجد'}
        </span>
      ),
    },
    {
      header: 'الحالة',
      accessor: 'status',
      render: (a) => {
        const badge = statusBadges[a.status] || { label: a.status, color: 'bg-slate-100' };
        return (
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${badge.color}`}>
            {badge.label}
          </span>
        );
      },
    },
    {
      header: 'الارتباط التشغيلي',
      accessor: 'shiftId',
      render: (a) => {
        if (a.shiftId) {
          const matchedV = vehicles.find((v) => v.id === a.vehicleId);
          return (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1 w-fit">
              <Truck className="w-3 h-3 text-purple-600" />
              <span>
                وردية مركبة ({a.shiftType === 'day_shift' ? 'صباحية' : a.shiftType === 'night_shift' ? 'مسائية' : 'مخصصة'})
                {matchedV ? ` - ${matchedV.plateNumber}` : ''}
              </span>
            </span>
          );
        }
        if (a.leaveId || a.status === 'vacation' || a.status === 'emergency_leave') {
          return (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1 w-fit">
              <Calendar className="w-3 h-3 text-amber-600" />
              <span>إجازة / عطلة معتمدة</span>
            </span>
          );
        }
        return (
          <span className="text-[10px] text-slate-400 font-mono">
            حضور اعتيادي
          </span>
        );
      },
    },
    {
      header: 'ملاحظات',
      accessor: 'notes',
      render: (a) => <span className="text-slate-500 text-xs truncate max-w-xs block">{a.notes || '—'}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">الحضور والانصراف والورديات</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            متابعة دوام الكباتن الميدانيين، التأخير، ساعات العمل ومعدلات الالتزام.
          </p>
        </div>

        {canAccess(['general_manager', 'operations_manager', 'supervisor']) && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>تسجيل حضور يدوي</span>
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="معدل الحضور العام"
          value={`${attendanceRate}%`}
          subtitle="نسبة الالتزام بالدوام"
          icon={CheckCircle2}
          colorScheme="emerald"
        />
        <StatCard
          title="سجلات الحضور"
          value={presentCount}
          subtitle="في الوقت المحدد"
          icon={UserCheck}
          colorScheme="blue"
        />
        <StatCard
          title="حالات التأخير"
          value={lateCount}
          subtitle="تم رصدها بالدقائق"
          icon={Clock}
          colorScheme="amber"
        />
        <StatCard
          title="حالات الغياب"
          value={absentCount}
          subtitle="غير مبرر أو مرضي"
          icon={AlertTriangle}
          colorScheme="rose"
        />
      </div>

      {/* Table */}
      <Table
        data={attendance}
        columns={columns}
        keyExtractor={(item) => item.id}
        searchPlaceholder="بحث بالتاريخ أو اسم الكابتن..."
        searchFilter={(item, query) =>
          item.date.includes(query) || getDriverName(item.userId).toLowerCase().includes(query)
        }
        filterOptions={[
          { label: 'حاضر (Present)', filterFn: (a) => a.status === 'present' },
          { label: 'متأخر (Late)', filterFn: (a) => a.status === 'late' },
          { label: 'غائب (Absent)', filterFn: (a) => a.status === 'absent' },
        ]}
        exportFileName="fleetops_attendance"
      />

      {/* Manual Attendance Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="تسجيل حضور وانصراف يدوي"
        subtitle="إدخال أو تصحيح دوام كابتن بواسطة المشرف"
        maxWidth="md"
      >
        <form onSubmit={handleSaveAttendance} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">الكابتن *</label>
            <select
              value={selectedDriverId}
              onChange={(e) => setSelectedDriverId(e.target.value)}
              required
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
            >
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>{d.fullName} ({d.phone})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">التاريخ *</label>
            <input
              type="date"
              required
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white outline-hidden"
            />
            {(() => {
              const activeLeave = leaves.find(
                (l) =>
                  l.driverId === selectedDriverId &&
                  l.status !== 'rejected' &&
                  l.status !== 'cancelled' &&
                  selectedDate >= l.startDate &&
                  selectedDate <= l.endDate
              );
              const activeShift = shifts.find(
                (s) =>
                  s.driverId === selectedDriverId &&
                  s.shiftDate === selectedDate &&
                  s.status !== 'cancelled'
              );

              return (
                <div className="space-y-1 mt-1.5">
                  {activeLeave && (
                    <div className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded-lg flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>
                        تنبيه إجازة: هذا المندوب مسجل في ({activeLeave.leaveType === 'weekly_rest' ? 'عطلة أسبوعية' : 'إجازة معتمدة'}) من {activeLeave.startDate} إلى {activeLeave.endDate}.
                      </span>
                    </div>
                  )}
                  {activeShift && (
                    <div className="text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-200 p-2 rounded-lg flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                      <span>
                        وردية مسندة: المندوب لديه وردية ({activeShift.shiftType === 'day_shift' ? 'صباحية' : activeShift.shiftType === 'night_shift' ? 'مسائية' : 'مخصصة'}) مجدولة في هذا التاريخ.
                      </span>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">الحالة *</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as AttendanceStatus)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
            >
              <option value="present">حاضر (Present)</option>
              <option value="late">متأخر (Late)</option>
              <option value="absent">غائب (Absent)</option>
              <option value="vacation">إجازة سنوية (Vacation)</option>
              <option value="sick">إجازة مرضية (Sick)</option>
              <option value="emergency_leave">إجازة طارئة (Emergency)</option>
            </select>
          </div>

          {(selectedStatus === 'present' || selectedStatus === 'late') && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">وقت الحضور</label>
                <input
                  type="time"
                  value={checkInTime}
                  onChange={(e) => setCheckInTime(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">وقت الانصراف</label>
                <input
                  type="time"
                  value={checkOutTime}
                  onChange={(e) => setCheckOutTime(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white outline-hidden"
                />
              </div>
            </div>
          )}

          {selectedStatus === 'late' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">دقائق التأخير</label>
              <input
                type="number"
                min={1}
                value={delayMinutes}
                onChange={(e) => setDelayMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white outline-hidden"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">ملاحظات المشرف</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="سبب التأخير أو ملاحظات الوردية..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              حفظ السجل
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
