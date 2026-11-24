import React, { useState, useEffect } from 'react';
import {
  Wrench,
  PlusCircle,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Edit2,
  Trash2,
  Check,
} from 'lucide-react';
import { Table, Column } from '../../components/common/Table';
import { StatCard } from '../../components/common/StatCard';
import { MaintenanceFormModal } from './MaintenanceFormModal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { DeleteWithPasswordModal } from '../../components/common/DeleteWithPasswordModal';
import { FinancialOperatorBadge } from '../../components/common/FinancialOperatorBadge';
import { MaintenanceRecord, MaintenanceStatus, Vehicle } from '../../types';
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

export const MaintenanceManagement: React.FC = () => {
  const { currentUser, canAccess } = useAuth();
  const { t } = useLanguage();

  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<MaintenanceRecord | null>(null);

  useEffect(() => {
    const unsub = subscribeToCollection<MaintenanceRecord>('maintenance_records', setRecords);
    async function loadVehicles() {
      const v = await fetchCollection<Vehicle>('vehicles');
      setVehicles(v);
    }
    loadVehicles();
    return () => unsub();
  }, []);

  const handleCreateOrUpdate = async (data: Partial<MaintenanceRecord>) => {
    if (editingRecord) {
      await updateDocument<MaintenanceRecord>('maintenance_records', editingRecord.id, data);
      await logAuditAction(
        currentUser,
        'UPDATE_MAINTENANCE',
        'maintenance_records',
        editingRecord.id,
        `تحديث أمر الصيانة: ${data.description} بواسطة ${currentUser?.fullName}`
      );
    } else {
      const fraudCode = `SEC-MNT-${Math.floor(100000 + Math.random() * 900000)}`;
      const id = await createDocument<Omit<MaintenanceRecord, 'id'>>('maintenance_records', {
        ...data,
        createdById: currentUser?.id || 'sys',
        createdByName: currentUser?.fullName || 'مسؤول الصيانة',
        createdByRole: currentUser?.role || 'supervisor',
        fraudVerificationCode: fraudCode,
      } as any);

      // If in progress, set vehicle status to maintenance
      if (data.vehicleId && (data.status === 'in_progress' || data.status === 'requested')) {
        await updateDocument<Vehicle>('vehicles', data.vehicleId, { status: 'maintenance' });
      }

      await logAuditAction(
        currentUser,
        'CREATE_MAINTENANCE',
        'maintenance_records',
        id,
        `إنشاء أمر صيانة جديد في ورشة ${data.workshopName} بتكلفة ${data.estimatedCost || 0} ر.س بواسطة ${currentUser?.fullName}`
      );
    }
  };

  const handleQuickStatusChange = async (record: MaintenanceRecord, newStatus: MaintenanceStatus) => {
    await updateDocument<MaintenanceRecord>('maintenance_records', record.id, {
      status: newStatus,
      actualCost: newStatus === 'completed' && !record.actualCost ? record.estimatedCost : record.actualCost,
      approvedById: currentUser?.id,
      approvedByName: currentUser?.fullName,
      approvedByRole: currentUser?.role,
    });

    if (newStatus === 'completed') {
      await updateDocument<Vehicle>('vehicles', record.vehicleId, { status: 'in_operation' });
    }

    await logAuditAction(
      currentUser,
      'UPDATE_MAINTENANCE_STATUS',
      'maintenance_records',
      record.id,
      `تغيير حالة أمر الصيانة إلى ${newStatus} واعتماد التكلفة بواسطة ${currentUser?.fullName}`
    );
  };

  const handleDeleteConfirm = async (reason: string) => {
    if (!recordToDelete || !currentUser) return;
    const vehicleText = getVehiclePlate(recordToDelete.vehicleId);
    await softDeleteDocumentWithPassword(
      'maintenance_records',
      recordToDelete.id,
      `أمر صيانة: ${recordToDelete.description || recordToDelete.maintenanceType || 'صيانة'} (${vehicleText})`,
      recordToDelete,
      currentUser,
      reason,
      `النوع: ${recordToDelete.maintenanceType} • التكلفة: ${recordToDelete.actualCost || recordToDelete.estimatedCost || 0} ر.س • الحالة: ${recordToDelete.status}`
    );
    await logAuditAction(
      currentUser,
      'SOFT_DELETE_MAINTENANCE',
      'maintenance_records',
      recordToDelete.id,
      `حذف ونقل أمر الصيانة ${recordToDelete.id} لسلة المحذوفات (${reason})`
    );
    setRecordToDelete(null);
  };

  const inProgressCount = records.filter((r) => r.status === 'in_progress').length;
  const requestedCount = records.filter((r) => r.status === 'requested').length;
  const completedCount = records.filter((r) => r.status === 'completed').length;
  const totalSpend = records.reduce((acc, r) => acc + (r.actualCost || r.estimatedCost || 0), 0);

  const getVehiclePlate = (vId: string) => {
    const v = vehicles.find((item) => item.id === vId);
    return v ? `${v.make} (${v.plateNumber})` : vId;
  };

  const statusBadges: Record<MaintenanceStatus, { label: string; color: string }> = {
    requested: { label: 'طلب جديد', color: 'bg-blue-100 text-blue-800' },
    approved: { label: 'معتمد', color: 'bg-indigo-100 text-indigo-800' },
    in_progress: { label: 'قيد التنفيذ', color: 'bg-amber-100 text-amber-800' },
    completed: { label: 'مكتمل', color: 'bg-emerald-100 text-emerald-800' },
    cancelled: { label: 'ملغي', color: 'bg-slate-100 text-slate-700' },
  };

  const columns: Column<MaintenanceRecord>[] = [
    {
      header: 'المركبة',
      accessor: 'vehicleId',
      sortable: true,
      render: (m) => <span className="font-bold text-slate-900">{getVehiclePlate(m.vehicleId)}</span>,
    },
    {
      header: 'نوع الصيانة والورشة',
      accessor: 'workshopName',
      render: (m) => (
        <div>
          <span className="font-semibold text-slate-800 block">{m.workshopName}</span>
          <span className="text-[10px] text-slate-400 capitalize">{m.maintenanceType.replace('_', ' ')}</span>
        </div>
      ),
    },
    {
      header: 'التاريخ',
      accessor: 'date',
      sortable: true,
      render: (m) => <span className="font-mono text-slate-700">{m.date}</span>,
    },
    {
      header: 'التكلفة',
      accessor: 'estimatedCost',
      render: (m) => (
        <div>
          <span className="font-bold text-slate-900 block font-mono">
            {(m.actualCost || m.estimatedCost).toLocaleString()} ر.س
          </span>
          <span className="text-[9px] text-slate-400">
            {m.actualCost ? 'تكلفة فعلية' : 'تقديرية'}
          </span>
        </div>
      ),
    },
    {
      header: 'المسؤول المالي / المعتمد',
      accessor: 'createdByName',
      render: (m) => (
        <FinancialOperatorBadge
          name={m.approvedByName || m.createdByName}
          role={m.approvedByRole || m.createdByRole}
          actionTitle={m.approvedByName ? 'معتمد الصيانة' : 'مسجل الطلب'}
          verificationCode={m.fraudVerificationCode}
          variant="inline"
        />
      ),
    },
    {
      header: 'الحالة',
      accessor: 'status',
      render: (m) => {
        const badge = statusBadges[m.status] || { label: m.status, color: 'bg-slate-100' };
        return (
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${badge.color}`}>
            {badge.label}
          </span>
        );
      },
    },
    {
      header: 'الإجراءات',
      className: 'text-end',
      render: (m) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {m.status === 'requested' && canAccess(['general_manager', 'operations_manager']) && (
            <button
              onClick={() => handleQuickStatusChange(m, 'approved')}
              title="اعتماد الأمر"
              className="px-2 py-1 text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg cursor-pointer"
            >
              اعتماد
            </button>
          )}
          {m.status === 'approved' && (
            <button
              onClick={() => handleQuickStatusChange(m, 'in_progress')}
              title="بدء الإصلاح"
              className="px-2 py-1 text-[10px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg cursor-pointer"
            >
              بدء التنفيذ
            </button>
          )}
          {m.status === 'in_progress' && (
            <button
              onClick={() => handleQuickStatusChange(m, 'completed')}
              title="إنهاء الصيانة"
              className="px-2 py-1 text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg cursor-pointer"
            >
              إكمال
            </button>
          )}
          <button
            onClick={() => {
              setEditingRecord(m);
              setIsModalOpen(true);
            }}
            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          {canAccess(['general_manager']) && (
            <button
              onClick={() => setRecordToDelete(m)}
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
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">إدارة الصيانة والورش</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            أوامر الشغل، مواعيد الصيانة الدورية، الفواتير وتتبع جاهزية المركبات.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingRecord(null);
            setIsModalOpen(true);
          }}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>إنشاء أمر صيانة</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="قيد التنفيذ في الورش"
          value={inProgressCount}
          subtitle="سيارات قيد الإصلاح"
          icon={Wrench}
          colorScheme="amber"
        />
        <StatCard
          title="طلبات بانتظار الاعتماد"
          value={requestedCount}
          subtitle="تحتاج موافقة التشغيل"
          icon={Clock}
          colorScheme="blue"
        />
        <StatCard
          title="أوامر صيانة مكتملة"
          value={completedCount}
          subtitle="عادت للخدمة"
          icon={CheckCircle2}
          colorScheme="emerald"
        />
        <StatCard
          title="إجمالي تكاليف الصيانة"
          value={`${totalSpend.toLocaleString()} ر.س`}
          subtitle="فواتير قطع الغيار واليد"
          icon={Wrench}
          colorScheme="rose"
        />
      </div>

      {/* Table */}
      <Table
        data={records}
        columns={columns}
        keyExtractor={(item) => item.id}
        searchPlaceholder="بحث بالورشة أو المركبة أو نوع الصيانة..."
        searchFilter={(item, query) =>
          item.workshopName.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          getVehiclePlate(item.vehicleId).toLowerCase().includes(query)
        }
        filterOptions={[
          { label: 'قيد التنفيذ (In Progress)', filterFn: (r) => r.status === 'in_progress' },
          { label: 'بانتظار الاعتماد (Requested)', filterFn: (r) => r.status === 'requested' },
          { label: 'مكتملة (Completed)', filterFn: (r) => r.status === 'completed' },
        ]}
        exportFileName="fleetops_maintenance"
      />

      <MaintenanceFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingRecord(null);
        }}
        onSubmit={handleCreateOrUpdate}
        initialData={editingRecord}
      />

      <DeleteWithPasswordModal
        isOpen={!!recordToDelete}
        onClose={() => setRecordToDelete(null)}
        onConfirm={handleDeleteConfirm}
        itemTitle={`أمر صيانة: ${recordToDelete?.description || recordToDelete?.maintenanceType || 'أمر صيانة'}`}
        itemType="أمر صيانة"
        warningNote="سيتم حفظ هذا السجل في إدارة المحذوفات للمدير العام مع إمكانية استعادته لاحقاً."
      />
    </div>
  );
};
