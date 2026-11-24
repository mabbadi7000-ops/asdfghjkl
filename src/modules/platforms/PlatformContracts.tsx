import React, { useState, useEffect } from 'react';
import {
  Layers,
  PlusCircle,
  FileText,
  Calendar,
  Users,
  Truck,
  Edit2,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { Table, Column } from '../../components/common/Table';
import { StatCard } from '../../components/common/StatCard';
import { Modal } from '../../components/common/Modal';
import { DeleteWithPasswordModal } from '../../components/common/DeleteWithPasswordModal';
import { PlatformContract, ContractStatus } from '../../types';
import {
  subscribeToCollection,
  createDocument,
  updateDocument,
  deleteDocument,
  softDeleteDocumentWithPassword,
} from '../../services/dataService';
import { logAuditAction } from '../../services/auditService';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export const PlatformContracts: React.FC = () => {
  const { currentUser, canAccess } = useAuth();
  const { t } = useLanguage();

  const [platforms, setPlatforms] = useState<PlatformContract[]>([]);
  const [registeredPlatforms, setRegisteredPlatforms] = useState<Array<{ id: string; name: string }>>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<PlatformContract | null>(null);
  const [platformToDelete, setPlatformToDelete] = useState<PlatformContract | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [contractNumber, setContractNumber] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contractType, setContractType] = useState('تشغيل أسطول لوجستي');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<ContractStatus>('active');
  const [activeDriversCount, setActiveDriversCount] = useState<number>(0);
  const [activeVehiclesCount, setActiveVehiclesCount] = useState<number>(0);
  const [commissionRate, setCommissionRate] = useState<number>(0);
  const [targetOrders, setTargetOrders] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [contractError, setContractError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const unsubContracts = subscribeToCollection<PlatformContract>('platform_contracts', setPlatforms);
    const unsubPlatforms = subscribeToCollection<{ id: string; name: string }>('delivery_platforms', setRegisteredPlatforms);
    return () => {
      unsubContracts();
      unsubPlatforms();
    };
  }, []);

  useEffect(() => {
    if (editingPlatform) {
      setName(editingPlatform.name || '');
      setContractNumber(editingPlatform.contractNumber || '');
      setContactPerson(editingPlatform.contactPerson || '');
      setContactPhone(editingPlatform.contactPhone || '');
      setContactEmail(editingPlatform.contactEmail || '');
      setContractType(editingPlatform.contractType || '');
      setStartDate(editingPlatform.startDate || '');
      setEndDate(editingPlatform.endDate || '');
      setStatus(editingPlatform.status || 'active');
      setActiveDriversCount(editingPlatform.activeDriversCount || 0);
      setActiveVehiclesCount(editingPlatform.activeVehiclesCount || 0);
      setCommissionRate(editingPlatform.commissionRate || 0);
      setTargetOrders(editingPlatform.targetOrders || 0);
      setNotes(editingPlatform.notes || '');
    } else {
      setName('');
      setContractNumber('');
      setContactPerson('');
      setContactPhone('');
      setContactEmail('');
      setContractType('تشغيل أسطول لوجستي');
      setStartDate(new Date().toISOString().slice(0, 10));
      setEndDate('');
      setStatus('active');
      setActiveDriversCount(0);
      setActiveVehiclesCount(0);
      setCommissionRate(0);
      setTargetOrders(0);
      setNotes('');
    }
    setContractError('');
  }, [editingPlatform, isModalOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedName = name.trim();
    const normalizedContractNumber = contractNumber.trim();
    if (!normalizedName || !normalizedContractNumber) {
      setContractError('يرجى اختيار اسم المنصة وإدخال رقم العقد.');
      return;
    }

    setIsSaving(true);
    setContractError('');
    try {
      const existingPlatform = registeredPlatforms.find(
        (platform) => platform.name.trim().toLowerCase() === normalizedName.toLowerCase()
      );
      const platformId = editingPlatform?.platformId || existingPlatform?.id || await createDocument('delivery_platforms', {
        name: normalizedName,
        status: 'active',
      });
      if (!platformId) throw new Error('تعذر تحديد المنصة المرتبطة بالعقد.');

      const now = new Date().toISOString();
      const contractData = {
        platformId,
        platformName: normalizedName,
        contractNumber: normalizedContractNumber,
        name: normalizedName,
        contactPerson,
        contactPhone,
        contactEmail,
        contractType,
        startDate,
        endDate,
        commissionRate: Number(commissionRate) || 0,
        targetOrders: Number(targetOrders) || 0,
        status: status || 'active',
        terms: notes || '',
        activeDriversCount: Number(activeDriversCount),
        activeVehiclesCount: Number(activeVehiclesCount),
        notes,
        updatedAt: now,
      };

      if (editingPlatform) {
        await updateDocument<PlatformContract>('platform_contracts', editingPlatform.id, contractData);
        setPlatforms((current) => current.map((contract) =>
          contract.id === editingPlatform.id
            ? { ...contract, ...contractData }
            : contract
        ));
        if (editingPlatform.platformId) {
          await updateDocument('delivery_platforms', editingPlatform.platformId, { name: normalizedName });
        }
        await logAuditAction(currentUser, 'UPDATE_PLATFORM', 'platforms', editingPlatform.id, `تحديث عقد منصة ${normalizedName}`);
      } else {
        const id = `contract-${Date.now()}-${crypto.randomUUID()}`;
        const contractPayload: PlatformContract = {
          ...contractData,
          id,
          createdAt: now,
        };
        await createDocument<Omit<PlatformContract, 'id'>>('platform_contracts', {
          ...contractPayload,
        });
        setPlatforms((current) => [contractPayload, ...current]);
        await logAuditAction(currentUser, 'CREATE_PLATFORM', 'platforms', id, `إضافة عقد منصة جديدة: ${normalizedName}`);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving platform contract:', error);
      setContractError(error instanceof Error ? `تعذر حفظ العقد: ${error.message}` : 'تعذر حفظ العقد. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async (reason: string) => {
    if (!platformToDelete || !currentUser) return;
    await softDeleteDocumentWithPassword(
      'platform_contracts',
      platformToDelete.id,
      `عقد منصة: ${platformToDelete.name}`,
      platformToDelete,
      currentUser,
      reason,
      `نوع العقد: ${platformToDelete.contractType} • عدد الكباتن: ${platformToDelete.activeDriversCount}`
    );
    await logAuditAction(
      currentUser,
      'SOFT_DELETE_PLATFORM',
      'platform_contracts',
      platformToDelete.id,
      `حذف ونقل عقد منصة ${platformToDelete.name} إلى سلة المحذوفات (${reason})`
    );
    setPlatformToDelete(null);
  };

  const totalDriversOnPlatforms = platforms.reduce((acc, p) => acc + (p.activeDriversCount || 0), 0);
  const totalVehiclesOnPlatforms = platforms.reduce((acc, p) => acc + (p.activeVehiclesCount || 0), 0);
  const activeContracts = platforms.filter((p) => p.status === 'active').length;

  const statusBadges: Record<ContractStatus, { label: string; color: string }> = {
    active: { label: 'عقد سارٍ', color: 'bg-emerald-100 text-emerald-800' },
    expired: { label: 'منتهي', color: 'bg-rose-100 text-rose-800' },
    pending_renewal: { label: 'قيد التجديد', color: 'bg-amber-100 text-amber-800' },
    suspended: { label: 'موقوف', color: 'bg-slate-200 text-slate-700' },
  };

  const columns: Column<PlatformContract>[] = [
    {
      header: 'اسم المنصة / الشركة',
      accessor: 'name',
      sortable: true,
      render: (p) => (
        <div>
          <span className="font-bold text-slate-900 block">{p.name}</span>
          <span className="text-[10px] text-slate-400">{p.contractType}</span>
        </div>
      ),
    },
    {
      header: 'مسؤول التواصل',
      accessor: 'contactPerson',
      render: (p) => (
        <div>
          <span className="text-slate-800 font-semibold block">{p.contactPerson}</span>
          <span className="text-[10px] text-slate-400 font-mono">{p.contactPhone}</span>
        </div>
      ),
    },
    {
      header: 'الكباتن المسندين',
      accessor: 'activeDriversCount',
      sortable: true,
      render: (p) => <span className="font-bold text-slate-800 font-mono">{p.activeDriversCount} كابتن</span>,
    },
    {
      header: 'المركبات',
      accessor: 'activeVehiclesCount',
      sortable: true,
      render: (p) => <span className="font-bold text-slate-800 font-mono">{p.activeVehiclesCount} مركبة</span>,
    },
    {
      header: 'فترة سريان العقد',
      accessor: 'endDate',
      render: (p) => (
        <span className="font-mono text-slate-600 text-[11px]">
          {p.startDate} إلى {p.endDate}
        </span>
      ),
    },
    {
      header: 'الحالة',
      accessor: 'status',
      render: (p) => {
        const badge = statusBadges[p.status] || { label: p.status, color: 'bg-slate-100' };
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
      render: (p) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => {
              setEditingPlatform(p);
              setIsModalOpen(true);
            }}
            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          {canAccess(['general_manager']) && (
            <button
              onClick={() => setPlatformToDelete(p)}
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
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">إدارة المنصات وعقود التشغيل</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            الشركات المتعاقد معها (HungerStation, Jahez, Keeta, Dall)، سريان العقود وتوزيع الأسطول.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingPlatform(null);
            setIsModalOpen(true);
          }}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>إضافة عقد منصة</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="المنصات الشريكة"
          value={platforms.length}
          subtitle={`${activeContracts} عقود نشطة`}
          icon={Layers}
          colorScheme="blue"
        />
        <StatCard
          title="الكباتن بالمنصات"
          value={totalDriversOnPlatforms}
          subtitle="طاقة التشغيل الفعالة"
          icon={Users}
          colorScheme="emerald"
        />
        <StatCard
          title="المركبات المخصصة"
          value={totalVehiclesOnPlatforms}
          subtitle="سيارات مسندة للعقود"
          icon={Truck}
          colorScheme="purple"
        />
      </div>

      {/* Table */}
      <Table
        data={platforms}
        columns={columns}
        keyExtractor={(item) => item.id}
        searchPlaceholder="بحث باسم المنصة أو مسؤول التواصل..."
        searchFilter={(item, query) =>
          item.name.toLowerCase().includes(query) ||
          item.contactPerson.toLowerCase().includes(query) ||
          item.contractType.toLowerCase().includes(query)
        }
        exportFileName="fleetops_platforms"
      />

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPlatform ? 'تعديل عقد المنصة' : 'إضافة عقد منصة توصيل'}
        subtitle="بيانات الشركة، ممثل الاتصال، فترة السريان وحصة الأسطول"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">اسم المنصة / الشركة *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="هنقرستيشن، جاهز، كيتا، دال..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">رقم العقد *</label>
              <input
                type="text"
                required
                value={contractNumber}
                onChange={(e) => setContractNumber(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">نوع العقد</label>
              <input
                type="text"
                value={contractType}
                onChange={(e) => setContractType(e.target.value)}
                placeholder="تشغيل أسطول لوجستي (B2B)"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">جهة / مسؤول التواصل</label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">رقم الاتصال</label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">تاريخ بداية العقد *</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">تاريخ نهاية العقد *</label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">عدد الكباتن المخصصين</label>
              <input
                type="number"
                min={0}
                value={activeDriversCount}
                onChange={(e) => setActiveDriversCount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">عدد المركبات المخصصة</label>
              <input
                type="number"
                min={0}
                value={activeVehiclesCount}
                onChange={(e) => setActiveVehiclesCount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">نسبة العمولة (%)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={commissionRate}
                onChange={(e) => setCommissionRate(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">الطلبات المستهدفة</label>
              <input
                type="number"
                min={0}
                value={targetOrders}
                onChange={(e) => setTargetOrders(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">حالة العقد</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ContractStatus)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
              >
                <option value="active">عقد سارٍ (Active)</option>
                <option value="pending_renewal">قيد دراسة التجديد (Pending Renewal)</option>
                <option value="expired">منتهي (Expired)</option>
                <option value="suspended">موقوف مؤقتاً (Suspended)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">ملاحظات وشروط العقد</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
            />
          </div>

          {contractError && <p role="alert" className="text-xs font-semibold text-rose-700">{contractError}</p>}

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
              disabled={isSaving}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-60"
            >
              {isSaving ? 'جارٍ الحفظ...' : 'حفظ العقد'}
            </button>
          </div>
        </form>
      </Modal>

      <DeleteWithPasswordModal
        isOpen={!!platformToDelete}
        onClose={() => setPlatformToDelete(null)}
        onConfirm={handleDeleteConfirm}
        itemTitle={`عقد منصة: ${platformToDelete?.name || ''}`}
        itemType="عقد منصة"
        warningNote="سيتم حفظ هذا العقد بجميع بياناته في إدارة المحذوفات للمدير العام مع إمكانية استعادته لاحقاً."
      />
    </div>
  );
};
