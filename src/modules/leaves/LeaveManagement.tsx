import React, { useState, useEffect } from 'react';
import {
  CalendarOff,
  PlusCircle,
  Wand2,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  Trash2,
  Edit2,
  CalendarDays,
  Sparkles,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { Table, Column } from '../../components/common/Table';
import { StatCard } from '../../components/common/StatCard';
import { DeleteWithPasswordModal } from '../../components/common/DeleteWithPasswordModal';
import { LeaveFormModal } from './LeaveFormModal';
import { AutoLeaveDistributionModal } from './AutoLeaveDistributionModal';
import {
  Driver,
  DriverLeaveRecord,
  LeaveType,
  LeaveStatus,
  VehicleShift,
  Vehicle,
} from '../../types';
import {
  subscribeToCollection,
  fetchCollection,
  createDocument,
  updateDocument,
  softDeleteDocumentWithPassword,
} from '../../services/dataService';
import { logAuditAction } from '../../services/auditService';
import { syncLeaveWithAttendance } from '../../services/operationalSyncService';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { syncDocument } from '../../services/documentSyncService';

export const LeaveManagement: React.FC = () => {
  const { currentUser, canAccess } = useAuth();
  const { t, tx, language } = useLanguage();

  const [leaves, setLeaves] = useState<DriverLeaveRecord[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [shifts, setShifts] = useState<VehicleShift[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isAutoModalOpen, setIsAutoModalOpen] = useState(false);
  const [editingLeave, setEditingLeave] = useState<DriverLeaveRecord | null>(null);
  const [leaveToDelete, setLeaveToDelete] = useState<DriverLeaveRecord | null>(null);

  // Active view tab: list or schedule board
  const [activeTab, setActiveTab] = useState<'list' | 'calendar_view'>('list');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    const unsubLeaves = subscribeToCollection<DriverLeaveRecord>('leaves', setLeaves);
    const unsubShifts = subscribeToCollection<VehicleShift>('vehicle_shifts', setShifts);

    async function loadData() {
      const [d, v] = await Promise.all([
        fetchCollection<Driver>('drivers'),
        fetchCollection<Vehicle>('vehicles'),
      ]);
      setDrivers(d);
      setVehicles(v);
    }
    loadData();

    return () => {
      unsubLeaves();
      unsubShifts();
    };
  }, []);

  const getDriverName = (driverId: string) => {
    const d = drivers.find((item) => item.id === driverId);
    return d ? d.fullName : driverId;
  };

  const leaveTypeBadges: Record<LeaveType, { label: string; color: string }> = {
    annual: { label: 'إجازة سنوية', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    weekly_rest: { label: 'عطلة أسبوعية', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    emergency: { label: 'إجازة طارئة', color: 'bg-amber-100 text-amber-800 border-amber-200' },
    sick: { label: 'إجازة مرضية', color: 'bg-purple-100 text-purple-800 border-purple-200' },
    unpaid: { label: 'بدون راتب', color: 'bg-slate-100 text-slate-700 border-slate-200' },
    other: { label: 'أخرى', color: 'bg-slate-100 text-slate-600 border-slate-200' },
  };

  const leaveStatusBadges: Record<LeaveStatus, { label: string; color: string }> = {
    approved: { label: 'معتمدة', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    pending: { label: 'قيد الاعتماد', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    completed: { label: 'منتهية', color: 'bg-slate-100 text-slate-600 border-slate-200' },
    rejected: { label: 'مرفوضة', color: 'bg-rose-50 text-rose-700 border-rose-200' },
    cancelled: { label: 'ملغاة', color: 'bg-slate-100 text-slate-500 border-slate-200' },
  };

  // Sync driver status with active leave
  const syncDriverStatusWithLeaves = async (driverId: string, isCurrentlyOnLeave: boolean) => {
    try {
      const targetDriver = drivers.find((d) => d.id === driverId);
      if (!targetDriver) return;
      if (isCurrentlyOnLeave && targetDriver.status === 'active') {
        await updateDocument<Driver>('drivers', driverId, { status: 'vacation' });
      } else if (!isCurrentlyOnLeave && targetDriver.status === 'vacation') {
        await updateDocument<Driver>('drivers', driverId, { status: 'active' });
      }
    } catch (e) {
      console.warn('Could not sync driver status:', e);
    }
  };

  // Save or edit leave
  const handleSaveLeave = async (leaveData: Partial<DriverLeaveRecord>) => {
    if (!currentUser) return;
    const todayStr = new Date().toISOString().slice(0, 10);

    if (editingLeave) {
      await updateDocument<DriverLeaveRecord>('leaves', editingLeave.id, {
        ...leaveData,
        approvedBy: currentUser.id,
        approvedByName: currentUser.fullName,
        approvedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      await syncDocument({
        entityType: 'leave',
        entityId: editingLeave.id,
        title: `مرفق إجازة - ${leaveData.driverName || editingLeave.driverName || ''}`,
        fileUrl: leaveData.attachmentUrl || editingLeave.attachmentUrl,
        category: 'leave',
      }, currentUser.id);

      // Synchronize with attendance database
      await syncLeaveWithAttendance({ ...editingLeave, ...leaveData } as DriverLeaveRecord, currentUser.id);

      await logAuditAction(
        currentUser,
        'UPDATE_DRIVER_LEAVE',
        'leaves',
        editingLeave.id,
        `تعديل إجازة المندوب ${leaveData.driverName} من ${leaveData.startDate} إلى ${leaveData.endDate}`
      );
    } else {
      const fullLeaveRecord: Omit<DriverLeaveRecord, 'id'> = {
        driverId: leaveData.driverId!,
        driverName: leaveData.driverName,
        driverPhone: leaveData.driverPhone,
        driverIqama: leaveData.driverIqama,
        leaveType: leaveData.leaveType || 'annual',
        startDate: leaveData.startDate!,
        endDate: leaveData.endDate!,
        totalDays: leaveData.totalDays || 1,
        status: leaveData.status || 'approved',
        reason: leaveData.reason,
        notes: leaveData.notes,
        attachmentUrl: leaveData.attachmentUrl,
        approvedBy: currentUser.id,
        approvedByName: currentUser.fullName,
        approvedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      const docId = await createDocument<Omit<DriverLeaveRecord, 'id'>>('leaves', fullLeaveRecord);
      await syncDocument({
        entityType: 'leave',
        entityId: docId,
        title: `مرفق إجازة - ${leaveData.driverName || ''}`,
        fileUrl: leaveData.attachmentUrl,
        category: 'leave',
      }, currentUser.id);

      // Synchronize with attendance database
      await syncLeaveWithAttendance({ id: docId, ...fullLeaveRecord }, currentUser.id);

      // If leave is today, update driver status
      if (leaveData.startDate && leaveData.endDate && todayStr >= leaveData.startDate && todayStr <= leaveData.endDate) {
        await syncDriverStatusWithLeaves(leaveData.driverId!, true);
      }

      await logAuditAction(
        currentUser,
        'CREATE_DRIVER_LEAVE',
        'leaves',
        docId,
        `تسجيل إجازة للمندوب ${leaveData.driverName} (${leaveData.totalDays} أيام)`
      );
    }

    setEditingLeave(null);
  };

  // Batch apply from auto distribution tool
  const handleApplyBatchLeaves = async (newBatch: Omit<DriverLeaveRecord, 'id'>[]) => {
    if (!currentUser) return;
    const todayStr = new Date().toISOString().slice(0, 10);

    for (const item of newBatch) {
      const fullItem = {
        ...item,
        approvedBy: currentUser.id,
        approvedByName: currentUser.fullName,
        approvedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      const docId = await createDocument<Omit<DriverLeaveRecord, 'id'>>('leaves', fullItem);

      // Synchronize each batch leave with attendance records
      await syncLeaveWithAttendance({ id: docId, ...fullItem }, currentUser.id);

      if (todayStr >= item.startDate && todayStr <= item.endDate) {
        await syncDriverStatusWithLeaves(item.driverId, true);
      }
    }

    await logAuditAction(
      currentUser,
      'AUTO_DISTRIBUTE_LEAVES',
      'leaves',
      'batch-auto',
      `تم تشغيل أداة التوزيع الذكي واعتماد (${newBatch.length}) عطلة أسبوعية للمناديب بدون تعارض مع استثناء الخميس والجمعة والسبت`
    );
  };

  // Soft delete with password
  const handleDeleteLeave = async (reason: string) => {
    if (!leaveToDelete || !currentUser) return;

    await softDeleteDocumentWithPassword(
      'leaves',
      leaveToDelete.id,
      `إجازة المندوب: ${leaveToDelete.driverName} (${leaveToDelete.startDate})`,
      leaveToDelete,
      currentUser,
      reason,
      `نوع الإجازة: ${leaveToDelete.leaveType}، المدة: ${leaveToDelete.totalDays} يوم`
    );

    await logAuditAction(
      currentUser,
      'DELETE_DRIVER_LEAVE',
      'leaves',
      leaveToDelete.id,
      `حذف ونقل إجازة المندوب ${leaveToDelete.driverName} لسلة المحذوفات (${reason})`
    );

    setLeaveToDelete(null);
  };

  // Filtered leaves
  const filteredLeaves = leaves.filter((l) => {
    if (typeFilter !== 'all' && l.leaveType !== typeFilter) return false;
    if (statusFilter !== 'all' && l.status !== statusFilter) return false;
    return true;
  });

  // Today's active leaves count
  const todayStr = new Date().toISOString().slice(0, 10);
  const activeTodayLeaves = leaves.filter(
    (l) => l.status === 'approved' && todayStr >= l.startDate && todayStr <= l.endDate
  );
  const upcomingLeaves = leaves.filter(
    (l) => l.status === 'approved' && l.startDate > todayStr
  );
  const autoDistributedLeaves = leaves.filter((l) => l.isAutoDistributed);

  const columns: Column<DriverLeaveRecord>[] = [
    {
      header: 'اسم المندوب',
      accessor: 'driverName',
      sortable: true,
      render: (item) => (
        <div>
          <span className="font-bold text-slate-900 block">{item.driverName || getDriverName(item.driverId)}</span>
          <span className="text-[10px] text-slate-400 font-mono">{item.driverPhone || item.driverIqama || '—'}</span>
        </div>
      ),
    },
    {
      header: 'نوع الإجازة',
      accessor: 'leaveType',
      sortable: true,
      render: (item) => {
        const badge = leaveTypeBadges[item.leaveType] || { label: item.leaveType, color: 'bg-slate-100' };
        return (
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.color}`}>
            {badge.label}
          </span>
        );
      },
    },
    {
      header: 'الفترة الزمنية',
      accessor: 'startDate',
      sortable: true,
      render: (item) => (
        <div className="font-mono text-xs">
          <div className="font-bold text-slate-800">
            {item.startDate} {item.startDate !== item.endDate && `← ${item.endDate}`}
          </div>
          <span className="text-[10px] text-slate-400">
            {item.startDate === item.endDate ? 'يوم واحد' : `${item.totalDays} أيام`}
          </span>
        </div>
      ),
    },
    {
      header: 'طريقة التعيين',
      accessor: 'isAutoDistributed',
      render: (item) =>
        item.isAutoDistributed ? (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1 w-fit">
            <Sparkles className="w-3 h-3 text-amber-600" />
            <span>توزيع ذكي تلقائي</span>
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
            تعيين يدوي
          </span>
        ),
    },
    {
      header: 'الحالة',
      accessor: 'status',
      sortable: true,
      render: (item) => {
        const badge = leaveStatusBadges[item.status] || { label: item.status, color: 'bg-slate-100' };
        return (
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${badge.color}`}>
            {badge.label}
          </span>
        );
      },
    },
    {
      header: 'السبب / الملاحظات',
      accessor: 'reason',
      render: (item) => (
        <span className="text-slate-600 text-xs truncate max-w-xs block" title={item.reason || item.notes}>
          {item.reason || item.notes || '—'}
        </span>
      ),
    },
    {
      header: 'الإجراءات',
      accessor: 'id',
      render: (item) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setEditingLeave(item);
              setIsFormModalOpen(true);
            }}
            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
            title="تعديل"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setLeaveToDelete(item)}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
            title="حذف"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  // Helper to render Weekly Calendar view (Sun - Wed focus)
  const renderScheduleBoard = () => {
    // Generate dates for current week or next 7 days
    const next7Days: { dateStr: string; dayName: string; isExcluded: boolean }[] = [];
    const arabicDayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

    const curr = new Date();
    // Start from last Sunday
    const day = curr.getDay();
    curr.setDate(curr.getDate() - day);

    for (let i = 0; i < 7; i++) {
      const dStr = curr.toISOString().slice(0, 10);
      const dayIdx = curr.getDay();
      const isExcluded = dayIdx === 4 || dayIdx === 5 || dayIdx === 6; // Thu, Fri, Sat
      next7Days.push({
        dateStr: dStr,
        dayName: arabicDayNames[dayIdx],
        isExcluded,
      });
      curr.setDate(curr.getDate() + 1);
    }

    return (
      <div className="space-y-4">
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-bold text-slate-700">
            <CalendarDays className="w-4 h-4 text-emerald-600" />
            <span>لوحة التوزيع الأسبوعية (الأيام المعتمدة للتوزيع: الأحد إلى الأربعاء)</span>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1 text-slate-500">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>أيام الإجازات المتاحة</span>
            </span>
            <span className="flex items-center gap-1 text-rose-600 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
              <span>أيام الذروة المستثناة (خميس/جمعة/سبت)</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {next7Days.map((d) => {
            const dayLeaves = leaves.filter(
              (l) => l.status === 'approved' && d.dateStr >= l.startDate && d.dateStr <= l.endDate
            );

            return (
              <div
                key={d.dateStr}
                className={`p-3 rounded-2xl border min-h-64 flex flex-col justify-between ${
                  d.isExcluded
                    ? 'bg-rose-50/40 border-rose-200/80'
                    : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                <div className="space-y-1 pb-2 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-black ${d.isExcluded ? 'text-rose-700' : 'text-slate-900'}`}>
                      {d.dayName}
                    </span>
                    {d.isExcluded ? (
                      <span className="text-[9px] font-bold bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded">
                        ذروة
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400">
                        {dayLeaves.length} إجازة
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-[11px] text-slate-500 font-bold">{d.dateStr}</div>
                </div>

                {/* Couriers on leave this day */}
                <div className="py-2 space-y-1.5 flex-1 overflow-y-auto max-h-52">
                  {dayLeaves.length === 0 ? (
                    <div className="text-center py-6 text-[10px] text-slate-400">
                      {d.isExcluded ? 'ممنوع التوزيع (أيام ذروة)' : 'لا توجد إجازات'}
                    </div>
                  ) : (
                    dayLeaves.map((l) => (
                      <div
                        key={l.id}
                        className={`p-2 rounded-xl text-[11px] border ${
                          l.isAutoDistributed
                            ? 'bg-amber-50 border-amber-200 text-amber-900'
                            : 'bg-blue-50 border-blue-200 text-blue-900'
                        }`}
                      >
                        <div className="font-bold truncate">{l.driverName || getDriverName(l.driverId)}</div>
                        <div className="text-[9px] flex items-center justify-between mt-1">
                          <span className="text-slate-500">{l.leaveType === 'weekly_rest' ? 'عطلة أسبوعية' : 'إجازة'}</span>
                          {l.isAutoDistributed && <Sparkles className="w-2.5 h-2.5 text-amber-600" />}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {!d.isExcluded && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingLeave(null);
                      setIsFormModalOpen(true);
                    }}
                    className="w-full py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold border border-slate-200 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <PlusCircle className="w-3 h-3" />
                    <span>إضافة إجازة</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarOff className="w-6 h-6 text-amber-500" />
            <span>إدارة الإجازات وجدول عطلات المناديب</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            جدولة إجازات المناديب، ربطها بالورديات والتشغيل، واستخدام خوارزمية التوزيع الذكي الخالية من التعارض.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Smart Random Distribution Tool Button */}
          <button
            type="button"
            onClick={() => setIsAutoModalOpen(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 rounded-xl text-xs font-black flex items-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <Wand2 className="w-4 h-4 text-slate-950" />
            <span>أداة التوزيع الذكي للعطلات 🎲</span>
          </button>

          {/* Add Leave Button */}
          <button
            type="button"
            onClick={() => {
              setEditingLeave(null);
              setIsFormModalOpen(true);
            }}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-emerald-400" />
            <span>تسجيل إجازة مندوب</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          title="في إجازة اليوم"
          value={activeTodayLeaves.length}
          subtitle="مناديب في عطلة حالياً"
          icon={CalendarOff}
          colorScheme="amber"
        />
        <StatCard
          title="الإجازات القادمة"
          value={upcomingLeaves.length}
          subtitle="معتمدة للفترات المقبلة"
          icon={Clock}
          colorScheme="blue"
        />
        <StatCard
          title="توزيع ذكي معتمد"
          value={autoDistributedLeaves.length}
          subtitle="عطلات مبرمجة آلياً"
          icon={Sparkles}
          colorScheme="emerald"
        />
        <StatCard
          title="إجمالي المناديب"
          value={drivers.filter((d) => d.status !== 'terminated').length}
          subtitle={`${drivers.filter((d) => d.status === 'active').length} نشط ميدانياً`}
          icon={Users}
          colorScheme="purple"
        />
      </div>

      {/* View Tabs Toggle (Table List vs Weekly Schedule Board) */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'list'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            جدول سجلات الإجازات ({leaves.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('calendar_view')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'calendar_view'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5 text-amber-400" />
            <span>لوحة التوزيع الأسبوعية (أيام العمل عدا الذروة)</span>
          </button>
        </div>

        {activeTab === 'list' && (
          <div className="flex items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-hidden"
            >
              <option value="all">كافة أنواع الإجازات</option>
              <option value="annual">إجازة سنوية</option>
              <option value="weekly_rest">عطلة أسبوعية</option>
              <option value="emergency">إجازة طارئة</option>
              <option value="sick">إجازة مرضية</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-hidden"
            >
              <option value="all">كافة الحالات</option>
              <option value="approved">معتمدة</option>
              <option value="pending">قيد المراجعة</option>
              <option value="completed">منتهية</option>
            </select>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {activeTab === 'list' ? (
        <Table
          data={filteredLeaves}
          columns={columns}
          keyExtractor={(item) => item.id}
          searchPlaceholder="بحث باسم المندوب أو رقم الهوية أو الهاتف..."
          searchFilter={(item, query) =>
            (item.driverName || '').toLowerCase().includes(query) ||
            (item.driverPhone || '').includes(query) ||
            (item.driverIqama || '').includes(query) ||
            (item.reason || '').toLowerCase().includes(query)
          }
          exportFileName="fleetops_driver_leaves"
        />
      ) : (
        renderScheduleBoard()
      )}

      {/* Modals */}
      <LeaveFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingLeave(null);
        }}
        onSubmit={handleSaveLeave}
        editingLeave={editingLeave}
        drivers={drivers}
        existingLeaves={leaves}
        existingShifts={shifts}
      />

      <AutoLeaveDistributionModal
        isOpen={isAutoModalOpen}
        onClose={() => setIsAutoModalOpen(false)}
        drivers={drivers}
        existingLeaves={leaves}
        existingShifts={shifts}
        onApplyBatch={handleApplyBatchLeaves}
      />

      {/* Delete Confirmation Modal */}
      {leaveToDelete && (
        <DeleteWithPasswordModal
          isOpen={!!leaveToDelete}
          onClose={() => setLeaveToDelete(null)}
          onConfirm={handleDeleteLeave}
          itemTitle={`إجازة: ${leaveToDelete.driverName} (${leaveToDelete.startDate})`}
          itemType="إجازة مندوب"
        />
      )}
    </div>
  );
};
