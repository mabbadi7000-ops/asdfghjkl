import React, { useState, useEffect } from 'react';
import {
  AlertOctagon,
  PlusCircle,
  FileText,
  DollarSign,
  ShieldCheck,
  Trash2,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { Table, Column } from '../../components/common/Table';
import { StatCard } from '../../components/common/StatCard';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { DeleteWithPasswordModal } from '../../components/common/DeleteWithPasswordModal';
import { AccidentRecord, AccidentSeverity, ClaimStatus, Driver, Vehicle } from '../../types';
import {
  subscribeToCollection,
  createDocument,
  updateDocument,
  deleteDocument,
  softDeleteDocumentWithPassword,
  fetchCollection,
} from '../../services/dataService';
import { logAuditAction } from '../../services/auditService';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useNotifications } from '../../context/NotificationContext';

export const AccidentManagement: React.FC = () => {
  const { currentUser, canAccess } = useAuth();
  const { t } = useLanguage();
  const { sendNotification } = useNotifications();

  const [accidents, setAccidents] = useState<AccidentRecord[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [accidentToDelete, setAccidentToDelete] = useState<AccidentRecord | null>(null);

  // Form State
  const [driverId, setDriverId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState('14:30');
  const [location, setLocation] = useState('طريق الملك فهد، الرياض');
  const [severity, setSeverity] = useState<AccidentSeverity>('minor');
  const [description, setDescription] = useState('');
  const [thirdPartyDetails, setThirdPartyDetails] = useState('');
  const [estimatedCost, setEstimatedCost] = useState<number>(1000);
  const [insuranceClaimStatus, setInsuranceClaimStatus] = useState<ClaimStatus>('pending');
  const [actionsTaken, setActionsTaken] = useState('تم استدعاء نجم وإصدار تقرير الحادث');

  useEffect(() => {
    const unsub = subscribeToCollection<AccidentRecord>('accidents', setAccidents);
    async function loadMeta() {
      const d = await fetchCollection<Driver>('drivers');
      setDrivers(d);
      if (d.length > 0 && !driverId) setDriverId(d[0].id);
      const v = await fetchCollection<Vehicle>('vehicles');
      setVehicles(v);
      if (v.length > 0 && !vehicleId) setVehicleId(v[0].id);
    }
    loadMeta();
    return () => unsub();
  }, []);

  const handleCreateAccident = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = await createDocument<Omit<AccidentRecord, 'id'>>('accidents', {
      driverId,
      vehicleId,
      date,
      time,
      location,
      severity,
      description,
      thirdPartyDetails,
      estimatedCost: Number(estimatedCost),
      insuranceClaimStatus,
      actionsTaken,
    });

    // Update vehicle status to accident if severe
    if (vehicleId && (severity === 'severe' || severity === 'total_loss')) {
      await updateDocument<Vehicle>('vehicles', vehicleId, { status: 'accident' });
    }

    await logAuditAction(
      currentUser,
      'REPORT_ACCIDENT',
      'accidents',
      id,
      `تسجيل بلاغ حادث درجة ${severity} في موقع ${location}`
    );

    // Notify operations
    await sendNotification({
      targetRole: 'operations_manager',
      title: '🚨 بلاغ حادث مروري جديد',
      message: `تم تسجيل حادث جديد لمركبة في ${location}. درجة الحادث: ${severity}`,
      type: 'accident',
      priority: 'urgent',
      link: 'accidents',
    });

    setDescription('');
    setThirdPartyDetails('');
    setIsModalOpen(false);
  };

  const handleDeleteConfirm = async (reason: string) => {
    if (!accidentToDelete || !currentUser) return;
    const driverName = getDriverName(accidentToDelete.driverId);
    const vehiclePlate = getVehiclePlate(accidentToDelete.vehicleId);
    await softDeleteDocumentWithPassword(
      'accidents',
      accidentToDelete.id,
      `سجل حادث مروري: (${vehiclePlate} - ${driverName})`,
      accidentToDelete,
      currentUser,
      reason,
      `الموقع: ${accidentToDelete.location} • التكلفة التقديرية: ${accidentToDelete.estimatedCost} ر.س`
    );
    await logAuditAction(
      currentUser,
      'SOFT_DELETE_ACCIDENT',
      'accidents',
      accidentToDelete.id,
      `حذف ونقل بلاغ الحادث لسلة المحذوفات (${reason})`
    );
    setAccidentToDelete(null);
  };

  const totalCost = accidents.reduce((acc, a) => acc + (a.estimatedCost || 0), 0);
  const pendingClaims = accidents.filter((a) => a.insuranceClaimStatus === 'pending' || a.insuranceClaimStatus === 'in_review').length;

  const getDriverName = (dId: string) => {
    const d = drivers.find((item) => item.id === dId);
    return d ? d.fullName : dId;
  };

  const getVehiclePlate = (vId: string) => {
    const v = vehicles.find((item) => item.id === vId);
    return v ? `${v.make} (${v.plateNumber})` : vId;
  };

  const severityBadges: Record<AccidentSeverity, { label: string; color: string }> = {
    minor: { label: 'بسيط', color: 'bg-blue-100 text-blue-800' },
    moderate: { label: 'متوسط', color: 'bg-amber-100 text-amber-800' },
    severe: { label: 'جسيم', color: 'bg-rose-100 text-rose-800' },
    total_loss: { label: 'خسارة كلية', color: 'bg-red-200 text-red-900' },
  };

  const claimBadges: Record<ClaimStatus, { label: string; color: string }> = {
    pending: { label: 'معلقة', color: 'bg-amber-100 text-amber-800' },
    in_review: { label: 'قيد المراجعة', color: 'bg-blue-100 text-blue-800' },
    approved: { label: 'معتمدة / تعويض', color: 'bg-emerald-100 text-emerald-800' },
    rejected: { label: 'مرفوضة', color: 'bg-rose-100 text-rose-800' },
    closed: { label: 'مغلقة', color: 'bg-slate-100 text-slate-700' },
  };

  const columns: Column<AccidentRecord>[] = [
    {
      header: 'التاريخ والموقع',
      accessor: 'date',
      sortable: true,
      render: (a) => (
        <div>
          <span className="font-bold text-slate-900 block text-xs">{a.location}</span>
          <span className="text-[10px] text-slate-400 font-mono">{a.date} ({a.time})</span>
        </div>
      ),
    },
    {
      header: 'الكابتن والمركبة',
      accessor: 'driverId',
      render: (a) => (
        <div>
          <span className="font-semibold text-slate-800 block text-xs">{getDriverName(a.driverId)}</span>
          <span className="text-[10px] text-slate-500">{getVehiclePlate(a.vehicleId)}</span>
        </div>
      ),
    },
    {
      header: 'درجة الحادث',
      accessor: 'severity',
      render: (a) => {
        const badge = severityBadges[a.severity];
        return <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${badge.color}`}>{badge.label}</span>;
      },
    },
    {
      header: 'التكلفة التقديرية',
      accessor: 'estimatedCost',
      render: (a) => <span className="font-bold text-slate-900 font-mono text-xs">{a.estimatedCost.toLocaleString()} ر.س</span>,
    },
    {
      header: 'مطالبة التأمين',
      accessor: 'insuranceClaimStatus',
      render: (a) => {
        const badge = claimBadges[a.insuranceClaimStatus];
        return <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${badge.color}`}>{badge.label}</span>;
      },
    },
    {
      header: 'الإجراءات',
      className: 'text-end',
      render: (a) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          {canAccess(['general_manager']) && (
            <button
              onClick={() => setAccidentToDelete(a)}
              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">إدارة الحوادث والمطالبات</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            توثيق الحوادث المرورية، تقارير نجم، المطالبات التأمينية وتكاليف الإصلاح.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>تسجيل بلاغ حادث</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="إجمالي الحوادث المسجلة"
          value={accidents.length}
          subtitle="سجل السلامة المرورية"
          icon={AlertOctagon}
          colorScheme="rose"
        />
        <StatCard
          title="مطالبات تأمينية معلقة"
          value={pendingClaims}
          subtitle="لدى شركات التأمين"
          icon={ShieldCheck}
          colorScheme="amber"
        />
        <StatCard
          title="التكاليف المقدرة"
          value={`${totalCost.toLocaleString()} ر.س`}
          subtitle="إجمالي تقدير أضرار الحوادث"
          icon={DollarSign}
          colorScheme="slate"
        />
        <StatCard
          title="معدل الحوادث للأسطول"
          value="منخفض جداً"
          subtitle="أقل من 2% شهرياً"
          icon={AlertTriangle}
          colorScheme="emerald"
        />
      </div>

      {/* Table */}
      <Table
        data={accidents}
        columns={columns}
        keyExtractor={(item) => item.id}
        searchPlaceholder="بحث بالموقع أو الكابتن أو وصف الحادث..."
        searchFilter={(item, query) =>
          item.location.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          getDriverName(item.driverId).toLowerCase().includes(query)
        }
        exportFileName="fleetops_accidents"
      />

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="تسجيل بلاغ حادث مروري"
        subtitle="توثيق بيانات الطرف الآخر وتقرير نجم وتقدير الأضرار"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateAccident} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">الكابتن المتورط *</label>
              <select
                value={driverId}
                onChange={(e) => setDriverId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
              >
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>{d.fullName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">المركبة *</label>
              <select
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>{v.make} ({v.plateNumber})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">تاريخ الحادث *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">وقت الحادث</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white outline-hidden"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">موقع الحادث *</label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="الشارع أو الحي أو الإحداثيات..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">درجة الحادث</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as AccidentSeverity)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
              >
                <option value="minor">بسيط (Minor)</option>
                <option value="moderate">متوسط (Moderate)</option>
                <option value="severe">جسيم (Severe)</option>
                <option value="total_loss">خسارة كلية (Total Loss)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">التكلفة التقديرية (ر.س)</label>
              <input
                type="number"
                min={0}
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white outline-hidden"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">بيانات الطرف الآخر وتأمينهم</label>
              <input
                type="text"
                value={thirdPartyDetails}
                onChange={(e) => setThirdPartyDetails(e.target.value)}
                placeholder="نوع سيارة الطرف الآخر، رقم اللوحة، شركة التأمين..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">وصف الحادث والأضرار *</label>
            <textarea
              rows={2}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="كيف وقع الحادث، الأجزاء المتضررة من السيارة..."
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
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              حفظ البلاغ
            </button>
          </div>
        </form>
      </Modal>

      <DeleteWithPasswordModal
        isOpen={!!accidentToDelete}
        onClose={() => setAccidentToDelete(null)}
        onConfirm={handleDeleteConfirm}
        itemTitle={accidentToDelete ? `حادث مركبة (${getVehiclePlate(accidentToDelete.vehicleId)}) - الكابتن: ${getDriverName(accidentToDelete.driverId)}` : ''}
        itemType="سجل حادث"
        warningNote="سيتم نقل ملف الحادث والمطالبة التأمينية إلى سلة المحذوفات للمدير العام."
      />
    </div>
  );
};
