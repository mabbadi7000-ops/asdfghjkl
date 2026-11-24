import React, { useState, useEffect } from 'react';
import {
  Users,
  PlusCircle,
  Eye,
  Edit2,
  Trash2,
  AlertTriangle,
  UserCheck,
  ShieldCheck,
  Phone,
} from 'lucide-react';
import { Table, Column } from '../../components/common/Table';
import { StatCard } from '../../components/common/StatCard';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { DeleteWithPasswordModal } from '../../components/common/DeleteWithPasswordModal';
import { DriverDetailModal } from './DriverDetailModal';
import { DriverFormModal } from './DriverFormModal';
import { DriverAvatar } from './DriverAvatar';
import { Driver, DriverStatus } from '../../types';
import {
  subscribeToCollection,
  createDocument,
  updateDocument,
  deleteDocument,
  softDeleteDocumentWithPassword,
} from '../../services/dataService';
import { syncDriverDocuments } from '../../services/documentSyncService';
import { syncDriverIdlePlatformsToFreelancerPool } from '../../services/freelancerSyncService';
import { logAuditAction } from '../../services/auditService';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export const DriverList: React.FC = () => {
  const { currentUser, canAccess } = useAuth();
  const { t, language } = useLanguage();

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [driverToDelete, setDriverToDelete] = useState<Driver | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    const unsub = subscribeToCollection<Driver>('drivers', setDrivers);
    return () => unsub();
  }, []);

  const handleCreateOrUpdate = async (data: Partial<Driver>) => {
    if (editingDriver) {
      await updateDocument<Driver>('drivers', editingDriver.id, data);
      await syncDriverDocuments(editingDriver.id, data, currentUser?.id);
      
      const mergedDriver: Driver = { ...editingDriver, ...data } as Driver;
      await syncDriverIdlePlatformsToFreelancerPool(mergedDriver);

      await logAuditAction(
        currentUser,
        'UPDATE_DRIVER',
        'drivers',
        editingDriver.id,
        `تعديل بيانات ومستندات السائق ${data.fullName || editingDriver.fullName}`
      );
    } else {
      const id = await createDocument<Omit<Driver, 'id'>>('drivers', data as any);
      await syncDriverDocuments(id, data, currentUser?.id);

      const newDriver: Driver = { id, ...data } as Driver;
      await syncDriverIdlePlatformsToFreelancerPool(newDriver);

      await logAuditAction(
        currentUser,
        'CREATE_DRIVER',
        'drivers',
        id,
        `إضافة سائق جديد ومستنداته: ${data.fullName}`
      );
    }
  };

  const handleDeleteConfirm = async (reason: string) => {
    if (!driverToDelete || !currentUser) return;
    setDeleteLoading(true);
    await softDeleteDocumentWithPassword(
      'drivers',
      driverToDelete.id,
      `الكابتن: ${driverToDelete.fullName} (${driverToDelete.iqamaNumber})`,
      driverToDelete,
      currentUser,
      reason,
      `المنصة: ${driverToDelete.primaryPlatform || '-'} • الحالة: ${driverToDelete.status}`
    );
    await logAuditAction(
      currentUser,
      'SOFT_DELETE_DRIVER',
      'drivers',
      driverToDelete.id,
      `حذف ونقل الكابتن ${driverToDelete.fullName} لسلة المحذوفات (${reason})`
    );
    setDeleteLoading(false);
    setDriverToDelete(null);
  };

  const activeDrivers = drivers.filter((d) => d.status === 'active').length;
  const vacationDrivers = drivers.filter((d) => d.status === 'vacation').length;
  const nowTime = new Date().getTime();
  const expiringLicenses = drivers.filter((d) => {
    if (!d.licenseExpiryDate) return false;
    const diff = Math.ceil((new Date(d.licenseExpiryDate).getTime() - nowTime) / (1000 * 60 * 60 * 24));
    return diff <= 30;
  }).length;

  const statusBadges: Record<DriverStatus, { label: string; color: string }> = {
    active: { label: language === 'ar' ? 'نشط' : 'Active', color: 'bg-emerald-100 text-emerald-800' },
    inactive: { label: language === 'ar' ? 'غير نشط' : 'Inactive', color: 'bg-slate-100 text-slate-700' },
    suspended: { label: language === 'ar' ? 'موقوف' : 'Suspended', color: 'bg-rose-100 text-rose-800' },
    vacation: { label: language === 'ar' ? 'إجازة' : 'Vacation', color: 'bg-blue-100 text-blue-800' },
    sick_leave: { label: language === 'ar' ? 'مرضي' : 'Sick Leave', color: 'bg-amber-100 text-amber-800' },
    terminated: { label: language === 'ar' ? 'منتهي' : 'Terminated', color: 'bg-slate-200 text-slate-600' },
  };

  const columns: Column<Driver>[] = [
    {
      header: language === 'ar' ? 'اسم الكابتن' : 'Driver Name',
      accessor: 'fullName',
      sortable: true,
      render: (drv) => (
        <div className="flex items-center gap-2.5">
          <DriverAvatar driver={drv} />
          <div>
            <p className="font-bold text-slate-900 leading-tight">{drv.fullName}</p>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{drv.phone}</p>
          </div>
        </div>
      ),
    },
    {
      header: language === 'ar' ? 'رقم الإقامة' : 'Iqama Number',
      accessor: 'iqamaNumber',
      sortable: true,
      render: (drv) => <span className="font-mono text-slate-700">{drv.iqamaNumber}</span>,
    },
    {
      header: language === 'ar' ? 'الجنسية' : 'Nationality',
      accessor: 'nationality',
      render: (drv) => <span className="text-slate-600">{drv.nationality}</span>,
    },
    {
      header: language === 'ar' ? 'انتهاء الرخصة' : 'License Expiry',
      accessor: 'licenseExpiryDate',
      sortable: true,
      render: (drv) => {
        const diff = Math.ceil((new Date(drv.licenseExpiryDate).getTime() - nowTime) / (1000 * 60 * 60 * 24));
        const isUrgent = diff <= 15;
        const isWarning = diff <= 30;
        return (
          <div className="flex items-center gap-1.5">
            <span className="font-mono">{drv.licenseExpiryDate}</span>
            {isUrgent ? (
              <span className="px-1.5 py-0.5 text-[9px] font-bold bg-rose-100 text-rose-700 rounded-md">
                {language === 'ar' ? `ينتهي قريباً (${diff} يوم)` : `Expiring soon (${diff}d)`}
              </span>
            ) : isWarning ? (
              <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-100 text-amber-700 rounded-md">
                {language === 'ar' ? `متبقي ${diff} يوم` : `${diff} days left`}
              </span>
            ) : null}
          </div>
        );
      },
    },
    {
      header: language === 'ar' ? 'الحالة' : 'Status',
      accessor: 'status',
      render: (drv) => {
        const badge = statusBadges[drv.status] || { label: drv.status, color: 'bg-slate-100' };
        return (
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${badge.color}`}>
            {badge.label}
          </span>
        );
      },
    },
    {
      header: language === 'ar' ? 'الإجراءات' : 'Actions',
      className: 'text-end',
      render: (drv) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => {
              setSelectedDriver(drv);
              setIsDetailOpen(true);
            }}
            title={language === 'ar' ? 'الملف الشامل' : 'Full Profile'}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
          >
            <Eye className="w-4 h-4" />
          </button>
          {canAccess(['general_manager', 'operations_manager', 'supervisor']) && (
            <button
              onClick={() => {
                setEditingDriver(drv);
                setIsFormOpen(true);
              }}
              title={language === 'ar' ? 'تعديل البيانات' : 'Edit Details'}
              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
          {canAccess(['general_manager']) && (
            <button
              onClick={() => setDriverToDelete(drv)}
              title={language === 'ar' ? 'حذف' : 'Delete'}
              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
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
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {language === 'ar' ? 'إدارة السائقين والكباتن' : 'Drivers & Couriers Management'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {language === 'ar'
              ? 'متابعة السجلات الرسمية، الرخص والإقامات، إسناد المركبات والمنصات وتتبع الأداء.'
              : 'Track official records, licenses and iqamas, vehicle & platform assignments, and performance.'}
          </p>
        </div>

        {canAccess(['general_manager', 'operations_manager', 'supervisor']) && (
          <button
            onClick={() => {
              setEditingDriver(null);
              setIsFormOpen(true);
            }}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{language === 'ar' ? 'إضافة كابتن جديد' : 'Add New Driver'}</span>
          </button>
        )}
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title={language === 'ar' ? 'إجمالي الكباتن' : 'Total Drivers'}
          value={drivers.length}
          subtitle={language === 'ar' ? 'مسجلون في النظام' : 'Registered in system'}
          icon={Users}
          colorScheme="gold"
          collectionName="drivers"
        />
        <StatCard
          title={language === 'ar' ? 'الكباتن النشطون' : 'Active Drivers'}
          value={activeDrivers}
          subtitle={language === 'ar' ? 'على رأس العمل الميداني' : 'On duty'}
          icon={UserCheck}
          colorScheme="emerald"
          collectionName="drivers"
        />
        <StatCard
          title={language === 'ar' ? 'في إجازة وعطلات' : 'On Leave'}
          value={vacationDrivers}
          subtitle={language === 'ar' ? 'معتمدة بدون تعارض' : 'Approved leave'}
          icon={Users}
          colorScheme="blue"
          collectionName="leaves"
        />
        <StatCard
          title={language === 'ar' ? 'رخص تنتهي قريباً' : 'Expiring Licenses'}
          value={expiringLicenses}
          subtitle={language === 'ar' ? 'أقل من 30 يوم للتجديد' : 'Under 30 days'}
          icon={AlertTriangle}
          colorScheme="rose"
          collectionName="documents"
        />
      </div>

      {/* Main Table */}
      <Table
        data={drivers}
        columns={columns}
        keyExtractor={(item) => item.id}
        searchPlaceholder={
          language === 'ar'
            ? 'بحث باسم الكابتن أو رقم الإقامة أو الجوال...'
            : 'Search by driver name, iqama or phone...'
        }
        searchFilter={(item, query) =>
          item.fullName.toLowerCase().includes(query) ||
          item.iqamaNumber.includes(query) ||
          item.phone.includes(query)
        }
        filterOptions={[
          { label: language === 'ar' ? 'نشط (Active)' : 'Active', filterFn: (d) => d.status === 'active' },
          { label: language === 'ar' ? 'غير نشط (Inactive)' : 'Inactive', filterFn: (d) => d.status === 'inactive' },
          { label: language === 'ar' ? 'إجازة (Vacation)' : 'Vacation', filterFn: (d) => d.status === 'vacation' },
          { label: language === 'ar' ? 'موقوف (Suspended)' : 'Suspended', filterFn: (d) => d.status === 'suspended' },
        ]}
        onRowClick={(item) => {
          setSelectedDriver(item);
          setIsDetailOpen(true);
        }}
        exportFileName="fleetops_drivers"
      />

      {/* Modals */}
      <DriverDetailModal
        driver={selectedDriver}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedDriver(null);
        }}
      />

      <DriverFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingDriver(null);
        }}
        onSubmit={handleCreateOrUpdate}
        initialData={editingDriver}
      />

      <DeleteWithPasswordModal
        isOpen={!!driverToDelete}
        onClose={() => setDriverToDelete(null)}
        onConfirm={handleDeleteConfirm}
        itemTitle={`الكابتن: ${driverToDelete?.fullName || ''} (${driverToDelete?.iqamaNumber || ''})`}
        itemType={language === 'ar' ? 'سجل كابتن' : 'Driver Record'}
        warningNote={
          language === 'ar'
            ? 'سيتم نقل بيانات السائق إلى إدارة المحذوفات للمدير العام مع إمكانية استعادته لاحقاً.'
            : 'Driver will be moved to the Recycle Bin and can be restored by the General Manager.'
        }
        loading={deleteLoading}
      />
    </div>
  );
};
