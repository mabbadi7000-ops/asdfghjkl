import React, { useState, useEffect } from 'react';
import {
  Trash2,
  RotateCcw,
  ShieldAlert,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  AlertTriangle,
  User,
  Calendar,
  Layers,
  FileText,
  Clock,
  Archive,
  RefreshCw,
  Building,
} from 'lucide-react';
import { Table, Column } from '../../components/common/Table';
import { StatCard } from '../../components/common/StatCard';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { DeletedRecord, UserRole } from '../../types';
import {
  subscribeToCollection,
  restoreDeletedRecord,
  permanentlyDeleteRecord,
} from '../../services/dataService';
import { logAuditAction } from '../../services/auditService';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export const RecycleBinManagement: React.FC = () => {
  const { currentUser, canAccess } = useAuth();
  const { t, language } = useLanguage();

  const [records, setRecords] = useState<DeletedRecord[]>([]);
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'trashed' | 'restored'>('trashed');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [previewRecord, setPreviewRecord] = useState<DeletedRecord | null>(null);
  const [recordToRestore, setRecordToRestore] = useState<DeletedRecord | null>(null);
  const [recordToPurge, setRecordToPurge] = useState<DeletedRecord | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const unsub = subscribeToCollection<DeletedRecord>('deleted_records', (data) => {
      // Sort newest deletion first
      setRecords(data.sort((a, b) => (b.deletedAt || '').localeCompare(a.deletedAt || '')));
    });
    return () => unsub();
  }, []);

  const collectionLabels: Record<string, { label: string; color: string; icon: string }> = {
    platforms: { label: 'عقود المنصات (Platforms)', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: 'Layers' },
    driver_payrolls: { label: 'مسيرات الرواتب (Payrolls)', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: 'Wallet' },
    driver_advances: { label: 'السلف المالية (Advances)', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: 'CreditCard' },
    platform_revenues: { label: 'إيرادات المنصات (Revenues)', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: 'FileSpreadsheet' },
    cash_settlements: { label: 'تصفية الكاش والسندات (Settlements)', color: 'bg-teal-100 text-teal-800 border-teal-200', icon: 'DollarSign' },
    drivers: { label: 'سجلات المناديب (Drivers)', color: 'bg-indigo-100 text-indigo-800 border-indigo-200', icon: 'Users' },
    vehicles: { label: 'أسطول المركبات (Vehicles)', color: 'bg-slate-100 text-slate-800 border-slate-200', icon: 'Truck' },
    tasks: { label: 'مهام العمليات (Tasks)', color: 'bg-cyan-100 text-cyan-800 border-cyan-200', icon: 'CheckSquare' },
    expenses: { label: 'المصروفات والعهد (Expenses)', color: 'bg-rose-100 text-rose-800 border-rose-200', icon: 'Banknote' },
    violations: { label: 'المخالفات المرورية (Violations)', color: 'bg-red-100 text-red-800 border-red-200', icon: 'AlertTriangle' },
    accidents: { label: 'الحوادث والتأمين (Accidents)', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: 'AlertOctagon' },
    documents: { label: 'أرشيف الوثائق الرسمية (Documents)', color: 'bg-violet-100 text-violet-800 border-violet-200', icon: 'FileText' },
    rented_accounts: { label: 'حسابات وتأجير الفريلانسرز (Freelancers)', color: 'bg-sky-100 text-sky-800 border-sky-200', icon: 'Smartphone' },
    driver_leaves: { label: 'إجازات المناديب (Leaves)', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: 'Calendar' },
    leaves: { label: 'إجازات المناديب (Leaves)', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: 'Calendar' },
    users: { label: 'المستخدمين والصلاحيات (Users)', color: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200', icon: 'User' },
  };

  const roleLabels: Record<string, string> = {
    admin: 'مدير النظام (Admin)',
    general_manager: 'المدير العام (General Manager)',
    operations_manager: 'مدير العمليات (Operations Manager)',
    supervisor: 'مشرف تشغيل (Supervisor)',
  };

  const getRecordPayload = (record: DeletedRecord): unknown => {
    const payload = record.payload ?? record.itemData;
    if (typeof payload !== 'string') return payload ?? {};
    try {
      return JSON.parse(payload);
    } catch {
      return payload;
    }
  };

  // Restore action
  const handleRestoreConfirm = async () => {
    if (!recordToRestore || !currentUser) return;
    try {
      setIsProcessing(true);
      await restoreDeletedRecord(recordToRestore, currentUser);
      await logAuditAction(
        currentUser,
        'RESTORE_DOCUMENT',
        recordToRestore.originalCollection,
        recordToRestore.originalId,
        `استعادة السجل "${recordToRestore.itemTitle}" من سلة المحذوفات إلى قاعدة البيانات النشطة`
      );
      setNotification({
        type: 'success',
        message: `تمت استعادة "${recordToRestore.itemTitle}" بنجاح إلى جدول البيانات الأصلي (${collectionLabels[recordToRestore.originalCollection]?.label || recordToRestore.originalCollection}).`,
      });
      setRecordToRestore(null);
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: `فشل استعادة السجل: ${err?.message || 'خطأ غير معروف'}`,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Purge permanent action
  const handlePurgeConfirm = async () => {
    if (!recordToPurge || !currentUser) return;
    try {
      setIsProcessing(true);
      await permanentlyDeleteRecord(recordToPurge.id);
      await logAuditAction(
        currentUser,
        'PERMANENT_PURGE_DOCUMENT',
        recordToPurge.originalCollection,
        recordToPurge.originalId,
        `الحذف النهائي الذي لا رجعة فيه للسجل "${recordToPurge.itemTitle}" من سلة المحذوفات`
      );
      setNotification({
        type: 'success',
        message: `تم حذف السجل "${recordToPurge.itemTitle}" نهائياً من سلة المحذوفات.`,
      });
      setRecordToPurge(null);
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: `فشل الحذف النهائي: ${err?.message || 'خطأ غير معروف'}`,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Filtered data
  const filteredRecords = records.filter((r) => {
    if (statusFilter !== 'all' && (r.status || 'trashed') !== statusFilter) return false;
    if (selectedModule !== 'all' && r.originalCollection !== selectedModule) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (r.itemTitle || '').toLowerCase().includes(q);
      const matchDeleter = (r.deletedByUserName || '').toLowerCase().includes(q);
      const matchReason = (r.deletionReason || '').toLowerCase().includes(q);
      const matchId = (r.originalId || '').toLowerCase().includes(q);
      if (!matchTitle && !matchDeleter && !matchReason && !matchId) return false;
    }
    return true;
  });

  const trashedCount = records.filter((r) => (r.status || 'trashed') === 'trashed').length;
  const restoredCount = records.filter((r) => r.status === 'restored').length;
  const uniqueDeleters = new Set(records.map((r) => r.deletedByUserId)).size;

  const columns: Column<DeletedRecord>[] = [
    {
      header: 'السجل المحذوف وبياناته',
      accessor: 'itemTitle',
      sortable: true,
      render: (r) => (
        <div className="space-y-0.5">
          <span className="font-bold text-slate-900 block text-xs">{r.itemTitle}</span>
          {(r.deletionMetadata || r.itemSummary) && (
            <span className="text-[11px] text-slate-500 block">{r.deletionMetadata || r.itemSummary}</span>
          )}
          <span className="text-[10px] text-slate-400 font-mono block">
            المعرف الأصلي: #{r.originalId}
          </span>
        </div>
      ),
    },
    {
      header: 'المصدر الأصلي',
      accessor: 'originalCollection',
      sortable: true,
      render: (r) => {
        const conf = collectionLabels[r.originalCollection] || {
          label: r.originalCollection,
          color: 'bg-slate-100 text-slate-700 border-slate-200',
        };
        return (
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${conf.color}`}>
            {conf.label}
          </span>
        );
      },
    },
    {
      header: 'الشخص الذي قام بالحذف',
      accessor: 'deletedByUserName',
      sortable: true,
      render: (r) => (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span>{r.deletedByUserName || 'مستخدم غير محدد'}</span>
          </div>
          <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 inline-block">
            {roleLabels[r.deletedByUserRole || ''] || r.deletedByUserRole || 'الدور غير محدد'}
          </span>
          {r.deletedByUserEmail && (
            <span className="text-[10px] text-slate-400 font-mono block">
              {r.deletedByUserEmail}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'تاريخ ووقت الحذف',
      accessor: 'deletedAt',
      sortable: true,
      render: (r) => {
        const d = r.deletedAt ? new Date(r.deletedAt) : null;
        return (
          <div className="text-[11px] text-slate-600 font-mono">
            {d ? (
              <>
                <span className="block font-bold">{d.toLocaleDateString('ar-SA')}</span>
                <span className="text-[10px] text-slate-400">{d.toLocaleTimeString('ar-SA')}</span>
              </>
            ) : (
              r.deletedAt || '-'
            )}
          </div>
        );
      },
    },
    {
      header: 'سبب الحذف المدون',
      accessor: 'deletionReason',
      render: (r) => (
        <div className="max-w-xs text-xs text-slate-700 bg-slate-50 border border-slate-100 rounded-lg p-2">
          {r.deletionReason || 'تم الحذف وتأكيد كلمة المرور'}
        </div>
      ),
    },
    {
      header: 'الحالة',
      accessor: 'status',
      render: (r) => {
        const isRestored = r.status === 'restored';
        return (
          <div>
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                isRestored
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {isRestored ? '✓ تمت الاستعادة' : '🗑️ في سلة المحذوفات'}
            </span>
            {isRestored && r.restoredByUserName && (
              <span className="block text-[9px] text-emerald-700 mt-0.5">
                بواسطة: {r.restoredByUserName}
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: 'الإجراءات',
      className: 'text-end',
      render: (r) => (
        <div className="flex items-center justify-end gap-1">
          {/* Preview payload */}
          <button
            type="button"
            onClick={() => setPreviewRecord(r)}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
            title="معاينة بيانات السجل الأصلية"
          >
            <Eye className="w-4 h-4" />
          </button>

          {/* Restore Button */}
          {r.status !== 'restored' && canAccess(['admin']) && (
            <button
              type="button"
              onClick={() => setRecordToRestore(r)}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs transition-colors"
              title="استعادة هذا السجل إلى قاعدة البيانات النشطة"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>استعادة</span>
            </button>
          )}

          {/* Purge button */}
          {canAccess(['admin']) && (
            <button
              type="button"
              onClick={() => setRecordToPurge(r)}
              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
              title="حذف نهائي لا رجعة فيه"
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
          <div className="flex items-center gap-2">
            <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                إدارة المحذوفات وسلة المهملات (Recycle Bin)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                خاص وحصري بمدير النظام والأمان: تتبع الشخص الذي قام بالحذف، وقت الحذف، والسبب مع إمكانية الاستعادة الفورية أو الحذف النهائي لقواعد البيانات.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-emerald-400" />
            <span>نظام الحماية ضد الحذف العشوائي</span>
          </span>
        </div>
      </div>

      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl text-xs font-bold flex items-center justify-between border ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="عناصر بسلة المحذوفات"
          value={trashedCount}
          subtitle="قابلة للاستعادة الفورية بكبسة زر"
          icon={Trash2}
          colorScheme="rose"
        />
        <StatCard
          title="سجلات تمت استعادتها"
          value={restoredCount}
          subtitle="عادت لقواعد البيانات الأصلية"
          icon={RotateCcw}
          colorScheme="emerald"
        />
        <StatCard
          title="المستخدمين الذين قاموا بالحذف"
          value={uniqueDeleters}
          subtitle="جميع العمليات موثقة بالاسم والصفة"
          icon={User}
          colorScheme="purple"
        />
        <StatCard
          title="إجمالي الأرشفة الموثقة"
          value={records.length}
          subtitle="حماية شاملة ضد فقدان البيانات"
          icon={ShieldAlert}
          colorScheme="slate"
        />
      </div>

      {/* Filters Bar */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Module Filter */}
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-500">القسم / الوحدة:</span>
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-hidden"
            >
              <option value="all">جميع الأقسام ({records.length})</option>
              <option value="platforms">عقود المنصات</option>
              <option value="driver_payrolls">مسيرات الرواتب</option>
              <option value="driver_advances">السلف المالية</option>
              <option value="platform_revenues">إيرادات وفواتير المنصات</option>
              <option value="cash_settlements">تصفية الكاش وسندات القبض</option>
              <option value="drivers">سجلات المناديب</option>
              <option value="vehicles">المركبات</option>
              <option value="violations">المخالفات المرورية</option>
              <option value="accidents">الحوادث المرورية</option>
              <option value="rented_accounts">حسابات الفريلانسرز المؤجرة</option>
              <option value="documents">الوثائق والأرشيف</option>
              <option value="tasks">مهام العمليات</option>
              <option value="expenses">المصروفات والعهد</option>
              <option value="driver_leaves">إجازات وجداول المناديب</option>
              <option value="users">المستخدمين والصلاحيات</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-500">الحالة:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-hidden"
            >
              <option value="trashed">في سلة المحذوفات فقط ({trashedCount})</option>
              <option value="restored">تمت استعادتها سابقاً ({restoredCount})</option>
              <option value="all">الكل ({records.length})</option>
            </select>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[260px]">
          <Search className="w-3.5 h-3.5 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث باسم السجل، اسم الشخص الحاذف، السبب..."
            className="w-full ps-8 pe-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:bg-white focus:border-slate-400 transition-all text-xs"
          />
        </div>
      </div>

      {/* Trashed Records Table */}
      <Table<DeletedRecord>
        data={filteredRecords}
        columns={columns}
        keyExtractor={(item) => item.id}
        searchPlaceholder="بحث في المحذوفات..."
        exportFileName={`fleetops-recycle-bin-${new Date().toISOString().slice(0, 10)}`}
      />

      {/* Restore Confirmation Modal */}
      <ConfirmDialog
        isOpen={!!recordToRestore}
        onClose={() => setRecordToRestore(null)}
        onConfirm={handleRestoreConfirm}
        title="تأكيد استعادة السجل"
        message={`هل أنت متأكد من استعادة "${recordToRestore?.itemTitle}" إلى قاعدة البيانات النشطة في قسم (${collectionLabels[recordToRestore?.originalCollection || '']?.label || recordToRestore?.originalCollection})؟`}
        confirmLabel="نعم، استعادة السجل الآن"
        variant="primary"
        loading={isProcessing}
      />

      {/* Purge Permanent Confirmation Modal */}
      <ConfirmDialog
        isOpen={!!recordToPurge}
        onClose={() => setRecordToPurge(null)}
        onConfirm={handlePurgeConfirm}
        title="تأكيد الحذف النهائي الذي لا رجعة فيه"
        message={`تحذير أمني: أنت على وشك حذف "${recordToPurge?.itemTitle}" نهائياً من سلة المحذوفات. لن يكون من الممكن استعادته بعد هذه الخطوة.`}
        confirmLabel="حذف نهائي دائم"
        variant="danger"
        loading={isProcessing}
      />

      {/* Payload Preview Modal */}
      {previewRecord && (
        <Modal
          isOpen={!!previewRecord}
          onClose={() => setPreviewRecord(null)}
          title={`معاينة تفاصيل السجل: ${previewRecord.itemTitle}`}
          subtitle={`المعرف: #${previewRecord.originalId} • المصدر: ${previewRecord.originalCollection}`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">الشخص الذي قام بالحذف</span>
                <strong className="text-slate-900">{previewRecord.deletedByUserName}</strong>
                {previewRecord.deletedByUserRole && (
                  <span className="text-slate-500 block text-[10px]">({previewRecord.deletedByUserRole})</span>
                )}
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">تاريخ ووقت الحذف</span>
                <strong className="font-mono text-slate-900">{previewRecord.deletedAt}</strong>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 block text-[10px]">سبب الحذف</span>
                <p className="text-slate-800 font-semibold">{previewRecord.deletionReason || '-'}</p>
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-700 block mb-1">
                بيانات السجل الأصلية المخزنة (Payload JSON):
              </span>
              <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl text-[11px] font-mono overflow-x-auto max-h-72">
                {JSON.stringify(getRecordPayload(previewRecord), null, 2)}
              </pre>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              {previewRecord.status !== 'restored' && canAccess(['admin']) && (
                <button
                  type="button"
                  onClick={() => {
                    const rec = previewRecord;
                    setPreviewRecord(null);
                    setRecordToRestore(rec);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>استعادة هذا السجل الآن</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setPreviewRecord(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer ms-auto"
              >
                إغلاق
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
