import React, { useState, useEffect } from 'react';
import {
  FolderArchive,
  PlusCircle,
  AlertTriangle,
  Calendar,
  FileText,
  Trash2,
  ExternalLink,
  ShieldAlert,
  Clock,
  Eye,
  Download,
  Filter,
  CheckCircle2,
  Users,
  Truck,
  Building,
  DollarSign,
  FileSpreadsheet,
  Briefcase,
  Coins,
  FileCheck,
  Printer,
} from 'lucide-react';
import { Table, Column } from '../../components/common/Table';
import { StatCard } from '../../components/common/StatCard';
import { Modal } from '../../components/common/Modal';
import { FileUploadZone } from '../../components/common/FileUploadZone';
import { DocumentPreviewModal } from '../../components/common/DocumentPreviewModal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { DeleteWithPasswordModal } from '../../components/common/DeleteWithPasswordModal';
import {
  DocumentRecord,
  DocumentType,
  DocumentOwnerType,
  Driver,
  Vehicle,
  PlatformRevenueStatement,
  OfficialLetter,
} from '../../types';
import { LetterPreviewModal } from '../letters/OfficialLetterStudio';
import {
  subscribeToCollection,
  fetchDocument,
  createDocument,
  deleteDocument,
  softDeleteDocumentWithPassword,
  updateDocument,
  fetchCollection,
  appendSessionToken,
} from '../../services/dataService';
import { logAuditAction } from '../../services/auditService';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { downloadFile, isImageData } from '../../utils/fileUtils';

const isLetterDoc = (doc: DocumentRecord) => doc.category === 'letters';

export const DocumentArchive: React.FC = () => {
  const { currentUser, canAccess } = useAuth();
  const { t } = useLanguage();

  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [revenueStatements, setRevenueStatements] = useState<PlatformRevenueStatement[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<DocumentRecord | null>(null);
  const [previewDoc, setPreviewDoc] = useState<DocumentRecord | null>(null);
  const [previewLetter, setPreviewLetter] = useState<OfficialLetter | null>(null);

  // Filters - Section Tabs: all | driver | company | financial | vehicle
  const [ownerFilter, setOwnerFilter] = useState<'all' | 'driver' | 'company' | 'financial' | 'vehicle' | 'letters'>('all');
  const [expiryFilter, setExpiryFilter] = useState<'all' | 'expired' | 'critical' | 'warning'>('all');

  // Form State
  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState<DocumentType>('driver_license');
  const [ownerType, setOwnerType] = useState<DocumentOwnerType>('driver');
  const [ownerId, setOwnerId] = useState('');
  const [platformRevenueId, setPlatformRevenueId] = useState('');
  const [platformName, setPlatformName] = useState('جاهز (Jahez)');
  const [amount, setAmount] = useState<number | ''>('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [expiryDate, setExpiryDate] = useState('2027-12-31');
  const [department, setDepartment] = useState('إدارة الحركة');
  const [fileUrl, setFileUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsubDocs = subscribeToCollection<DocumentRecord>('documents', setDocuments);
    const unsubRevenues = subscribeToCollection<PlatformRevenueStatement>(
      'platform_revenues',
      setRevenueStatements
    );
    const refreshDocuments = () => {
      void fetchCollection<DocumentRecord>('documents').then(setDocuments);
    };
    window.addEventListener('documents-archive-updated', refreshDocuments);

    async function loadMeta() {
      const d = await fetchCollection<Driver>('drivers');
      setDrivers(d);
      const v = await fetchCollection<Vehicle>('vehicles');
      setVehicles(v);
      if (d.length > 0 && !ownerId) setOwnerId(d[0].id);
    }
    loadMeta();

    return () => {
      unsubDocs();
      unsubRevenues();
      window.removeEventListener('documents-archive-updated', refreshDocuments);
    };
  }, []);

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    try {
      setIsSubmitting(true);
      const id = await createDocument<Omit<DocumentRecord, 'id'>>('documents', {
        title,
        docType,
        ownerType,
        ownerId,
        platformRevenueId: ownerType === 'financial' && platformRevenueId ? platformRevenueId : undefined,
        platformName: ownerType === 'financial' ? platformName : undefined,
        amount: ownerType === 'financial' && amount !== '' ? Number(amount) : undefined,
        fileUrl,
        issueDate,
        expiryDate,
        uploadedById: currentUser?.id || 'sys',
        department,
        notes,
      });

      // Synchronize with driver or vehicle if it's a primary document
      if (ownerType === 'driver' && fileUrl) {
        const dUpdate: Partial<Driver> = {};
        if (docType === 'driver_license') {
          dUpdate.licenseDocUrl = fileUrl;
          if (expiryDate) dUpdate.licenseExpiryDate = expiryDate;
        } else if (docType === 'iqama') {
          dUpdate.iqamaDocUrl = fileUrl;
          if (expiryDate) dUpdate.iqamaExpiryDate = expiryDate;
        } else if (docType === 'medical_check') {
          dUpdate.medicalDocUrl = fileUrl;
        } else if (docType === 'contract') {
          dUpdate.contractDocUrl = fileUrl;
        } else if (docType === 'driver_card') {
          dUpdate.driverCardDocUrl = fileUrl;
        } else if (docType === 'operation_card') {
          dUpdate.operationCardDocUrl = fileUrl;
        } else if (docType === 'personal_photo') {
          dUpdate.photoUrl = fileUrl;
        }
        if (Object.keys(dUpdate).length > 0) {
          await updateDocument<Driver>('drivers', ownerId, dUpdate);
        }
      } else if (ownerType === 'vehicle' && fileUrl) {
        const vUpdate: Partial<Vehicle> = {};
        if (docType === 'istemara') {
          vUpdate.istemaraDocUrl = fileUrl;
          if (expiryDate) vUpdate.istemaraExpiryDate = expiryDate;
        } else if (docType === 'insurance') {
          vUpdate.insuranceDocUrl = fileUrl;
          if (expiryDate) vUpdate.insuranceExpiryDate = expiryDate;
        } else if (docType === 'vehicle_check') {
          vUpdate.mvpiDocUrl = fileUrl;
        } else if (docType === 'operation_card') {
          vUpdate.operationCardDocUrl = fileUrl;
        } else if (docType === 'vehicle_photo') {
          vUpdate.photoUrl = fileUrl;
        }
        if (Object.keys(vUpdate).length > 0) {
          await updateDocument<Vehicle>('vehicles', ownerId, vUpdate);
        }
      }

      await logAuditAction(
        currentUser,
        'UPLOAD_DOCUMENT',
        'documents',
        id,
        `أرشفة مستند جديد: "${title}" (${ownerType})`
      );

      setTitle('');
      setFileUrl('');
      setNotes('');
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error archiving document:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async (reason: string) => {
    if (!docToDelete || !currentUser) return;
    const ownerName = getOwnerLabel(docToDelete);
    await softDeleteDocumentWithPassword(
      'documents',
      docToDelete.id,
      `وثيقة رسمية: "${docToDelete.title}" (${ownerName})`,
      docToDelete,
      currentUser,
      reason,
      `نوع الوثيقة: ${docToDelete.docType} • تاريخ الانتهاء: ${docToDelete.expiryDate || 'غير محدد'}`
    );
    await logAuditAction(
      currentUser,
      'SOFT_DELETE_DOCUMENT',
      'documents',
      docToDelete.id,
      `حذف ونقل المستند "${docToDelete.title}" لسلة المحذوفات (${reason})`
    );
    setDocToDelete(null);
  };

  const openLetter = async (doc: DocumentRecord) => {
    const letterId = doc.entityId || doc.ownerId || doc.id.replace(/^doc_/, '');
    const letter = await fetchDocument<OfficialLetter>('official_letters', letterId);
    if (letter) setPreviewLetter(letter);
    else window.alert('تعذر العثور على الخطاب الأصلي.');
  };

  const nowTime = new Date().getTime();

  // Expiry Calculations
  const getDaysDiff = (dateStr?: string) => {
    if (!dateStr) return 999;
    return Math.ceil((new Date(dateStr).getTime() - nowTime) / (1000 * 60 * 60 * 24));
  };

  const expiredCount = documents.filter((d) => d.expiryDate && getDaysDiff(d.expiryDate) <= 0).length;
  const criticalCount = documents.filter((d) => {
    const diff = getDaysDiff(d.expiryDate);
    return diff > 0 && diff <= 7;
  }).length;
  const warning15Count = documents.filter((d) => {
    const diff = getDaysDiff(d.expiryDate);
    return diff > 7 && diff <= 15;
  }).length;
  const warning30Count = documents.filter((d) => {
    const diff = getDaysDiff(d.expiryDate);
    return diff > 15 && diff <= 30;
  }).length;

  const getOwnerLabel = (doc: DocumentRecord) => {
    if (isLetterDoc(doc)) return 'مكاتبات وخطابات رسمية';
    if (doc.ownerType === 'driver') {
      const d = drivers.find((item) => item.id === doc.ownerId);
      return d ? `الكابتن: ${d.fullName}` : doc.ownerId;
    }
    if (doc.ownerType === 'vehicle') {
      const v = vehicles.find((item) => item.id === doc.ownerId);
      return v ? `المركبة: ${v.plateNumber}` : doc.ownerId;
    }
    if (doc.ownerType === 'financial') {
      if (doc.platformName) {
        return `إيرادات منصة: ${doc.platformName}`;
      }
      return 'التفاصيل والعمليات المالية';
    }
    if (doc.ownerType === 'company') {
      return 'إدارة الشركة العامة (مارشال)';
    }
    if (doc.ownerType === 'contract') {
      return 'عقود التشغيل والمنصات';
    }
    return doc.ownerType;
  };

  // Filtered documents
  const filteredDocuments = documents.filter((doc) => {
    if (ownerFilter === 'letters') {
      if (!isLetterDoc(doc)) return false;
    } else if (ownerFilter === 'company') {
      if (doc.ownerType !== 'company' && doc.ownerType !== 'contract') return false;
    } else if (ownerFilter === 'financial') {
      if (doc.category !== 'financial' && doc.ownerType !== 'financial' && !doc.platformRevenueId && doc.docType !== 'platform_revenue_statement') return false;
    } else if (ownerFilter === 'vehicle') {
      if (doc.ownerType !== 'vehicle' && doc.category !== 'vehicles') return false;
    } else if (ownerFilter !== 'all' && doc.ownerType !== ownerFilter) {
      return false;
    }

    if (expiryFilter === 'expired') {
      return doc.expiryDate && getDaysDiff(doc.expiryDate) <= 0;
    }
    if (expiryFilter === 'critical') {
      const diff = getDaysDiff(doc.expiryDate);
      return diff > 0 && diff <= 7;
    }
    if (expiryFilter === 'warning') {
      const diff = getDaysDiff(doc.expiryDate);
      return diff > 7 && diff <= 30;
    }
    return true;
  });

  const columns: Column<DocumentRecord>[] = [
    {
      header: 'اسم المستند والملف',
      accessor: 'title',
      sortable: true,
      render: (d) => {
        const isImg = isImageData(d.fileUrl);
        return (
          <div className="flex items-center gap-2.5">
            <div
              onClick={() => d.fileUrl && setPreviewDoc(d)}
              className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 overflow-hidden ${
                d.fileUrl
                  ? 'bg-slate-100 border-slate-200 cursor-pointer hover:border-emerald-500'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}
              title={d.fileUrl ? 'انقر للمعاينة' : 'بدون ملف مرفق'}
            >
              {d.fileUrl && isImg ? (
                <img src={appendSessionToken(d.fileUrl)} alt={d.title} className="w-full h-full object-cover" />
              ) : (
                <FileText className={`w-4 h-4 ${d.fileUrl ? 'text-emerald-600' : 'text-slate-400'}`} />
              )}
            </div>

            <div>
              <span className="font-bold text-slate-900 block text-xs">{d.title}</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-slate-400 capitalize">{d.docType.replace('_', ' ')}</span>
                {d.fileUrl ? (
                  <span className="px-1.5 py-0.2 text-[9px] bg-emerald-50 text-emerald-700 font-bold rounded-md border border-emerald-200/60">
                    مرفق
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 text-[9px] bg-slate-100 text-slate-500 rounded-md">
                    بيانات فقط
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      header: 'القسم / التبعية',
      accessor: 'ownerId',
      render: (d) => {
        const isDrv = d.ownerType === 'driver';
        const isVeh = d.ownerType === 'vehicle';
        const isFin = d.ownerType === 'financial';
        return (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              {isDrv && <Users className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
              {isVeh && <Truck className="w-3.5 h-3.5 text-indigo-500 shrink-0" />}
              {isFin && <Coins className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
              {!isDrv && !isVeh && !isFin && <Building className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
              <span className="font-semibold text-slate-800 text-xs">{getOwnerLabel(d)}</span>
            </div>
            {d.amount !== undefined && d.amount > 0 && (
              <span className="text-[10px] font-mono text-emerald-700 font-bold ms-5">
                صافي الإيراد: {d.amount.toLocaleString()} ر.س
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: 'القسم',
      accessor: 'department',
      render: (d) => <span className="text-slate-600 text-xs">{d.department || 'عام'}</span>,
    },
    {
      header: 'تاريخ الانتهاء',
      accessor: 'expiryDate',
      sortable: true,
      render: (d) => {
        if (!d.expiryDate) return <span className="text-slate-400 text-xs">غير محدد</span>;
        const diff = getDaysDiff(d.expiryDate);
        return (
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-xs">{d.expiryDate}</span>
            {diff <= 0 ? (
              <span className="px-1.5 py-0.5 text-[9px] font-black bg-rose-600 text-white rounded-md">
                منتهي
              </span>
            ) : diff <= 7 ? (
              <span className="px-1.5 py-0.5 text-[9px] font-black bg-rose-100 text-rose-800 rounded-md">
                متبقي {diff} أيام!
              </span>
            ) : diff <= 15 ? (
              <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-100 text-amber-800 rounded-md">
                متبقي {diff} يوم
              </span>
            ) : diff <= 30 ? (
              <span className="px-1.5 py-0.5 text-[9px] font-bold bg-blue-100 text-blue-800 rounded-md">
                متبقي {diff} يوم
              </span>
            ) : null}
          </div>
        );
      },
    },
    {
      header: 'الإجراءات',
      className: 'text-end',
      render: (d) => (
        <div className="flex items-center justify-end gap-1.5">
          {isLetterDoc(d) && (
            <button
              type="button"
              onClick={() => void openLetter(d)}
              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-50 rounded-lg cursor-pointer"
              title="عرض / طباعة الخطاب"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>عرض / طباعة الخطاب</span>
            </button>
          )}
          {!isLetterDoc(d) && (<button
            type="button"
            onClick={() => setPreviewDoc(d)}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
            title="معاينة المستند"
          >
            <Eye className="w-4 h-4" />
          </button>)}
          {d.fileUrl && (
            <button
              type="button"
              onClick={() => downloadFile(d.fileUrl!, d.title)}
              className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg cursor-pointer"
              title="تحميل الملف"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
          {canAccess(['admin', 'general_manager', 'operations_manager']) && (
            <button
              type="button"
              onClick={() => setDocToDelete(d)}
              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
              title="حذف"
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
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">إدارة الأرشيف والمستندات</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            الأرشيف السحابي المركزي الشامل لوثائق السائقين، المركبات، التأمينات والتراخيص مع الربط المباشر.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>أرشفة وثيقة جديدة</span>
        </button>
      </div>

      {/* KPI Cards for Expiry Thresholds */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="مستندات منتهية"
          value={expiredCount}
          subtitle="تتطلب تجديد فوري"
          icon={ShieldAlert}
          colorScheme={expiredCount > 0 ? 'rose' : 'slate'}
        />
        <StatCard
          title="تنتهي خلال 7 أيام"
          value={criticalCount}
          subtitle="حالة طوارئ نظامية"
          icon={AlertTriangle}
          colorScheme={criticalCount > 0 ? 'rose' : 'slate'}
        />
        <StatCard
          title="تنتهي خلال 15 يوماً"
          value={warning15Count}
          subtitle="إجراءات التجديد مطلوبة"
          icon={Clock}
          colorScheme={warning15Count > 0 ? 'amber' : 'slate'}
        />
        <StatCard
          title="تنتهي خلال 30 يوماً"
          value={warning30Count}
          subtitle="تحت المتابعة الدورية"
          icon={Calendar}
          colorScheme={warning30Count > 0 ? 'blue' : 'slate'}
        />
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white border border-slate-200 rounded-2xl">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="text-xs font-bold text-slate-500 flex items-center gap-1 me-2 shrink-0">
            <Filter className="w-3.5 h-3.5" />
            <span>تصنيف التبعية:</span>
          </span>
          {[
            { id: 'all', label: `الكل (${documents.length})`, icon: FolderArchive },
            {
              id: 'driver',
              label: `قسم المناديب والكباتن (${documents.filter((d) => d.ownerType === 'driver').length})`,
              icon: Users,
            },
            {
              id: 'company',
              label: `قسم الشركة والعقود (${documents.filter((d) => d.ownerType === 'company' || d.ownerType === 'contract').length})`,
              icon: Building,
            },
            {
              id: 'financial',
              label: `الإيصالات والمستندات المالية (${documents.filter((d) => d.category === 'financial' || d.ownerType === 'financial' || d.platformRevenueId).length})`,
              icon: DollarSign,
            },
            {
              id: 'vehicle',
              label: `مستندات المركبات والأسطول (${documents.filter((d) => d.ownerType === 'vehicle' || d.category === 'vehicles').length})`,
              icon: Truck,
            },
            {
              id: 'letters',
              label: `مكاتبات وخطابات رسمية (${documents.filter(isLetterDoc).length})`,
              icon: FileText,
            },
          ].map((tab) => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setOwnerFilter(tab.id as any)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  ownerFilter === tab.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <TabIcon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Expiry status filter */}
        <div className="flex items-center gap-1 text-xs">
          <span className="text-slate-500 font-bold me-1">حالة الصلاحية:</span>
          <select
            value={expiryFilter}
            onChange={(e) => setExpiryFilter(e.target.value as any)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-hidden"
          >
            <option value="all">جميع الحالات</option>
            <option value="expired">المنتهية فقط ({expiredCount})</option>
            <option value="critical">خلال 7 أيام ({criticalCount})</option>
            <option value="warning">خلال 30 يوماً ({warning30Count + warning15Count})</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <Table<DocumentRecord>
        data={filteredDocuments}
        columns={columns}
        keyExtractor={(item) => item.id}
        searchPlaceholder="بحث في عنوان الوثيقة، المالك، القسم..."
        searchFilter={(item, query) =>
          item.title.toLowerCase().includes(query) ||
          getOwnerLabel(item).toLowerCase().includes(query) ||
          Boolean(item.department?.toLowerCase().includes(query))
        }
        exportFileName="fleetops-documents-archive"
      />

      {/* Modal: New Document Archive */}
      {previewLetter && <LetterPreviewModal letter={previewLetter} onClose={() => setPreviewLetter(null)} />}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="أرشفة وثيقة رسمية جديدة"
        subtitle="حفظ المستند، رفع الصورة الممسوحة، وتحديد موعد الانتهاء"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateDocument} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">عنوان الوثيقة *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: رخصة قيادة، استمارة سير، وثيقة تأمين، عقد..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">نوع الوثيقة</label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as DocumentType)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
              >
                {ownerType === 'financial' ? (
                  <>
                    <option value="platform_revenue_statement">كشف إيرادات منصة التوصيل (Platform Revenue Statement)</option>
                    <option value="tax_invoice">فاتورة ضريبية رسمية (Tax Invoice)</option>
                    <option value="settlement_receipt">سند تصفية مالية / إيداع كاش (Settlement Receipt)</option>
                    <option value="bank_statement">كشف حساب بنكي (Bank Statement)</option>
                    <option value="invoice">فاتورة تشغيلية (Operating Invoice)</option>
                    <option value="other">وثيقة مالية أخرى (Other)</option>
                  </>
                ) : ownerType === 'company' ? (
                  <>
                    <option value="commercial_register">السجل التجاري للشركة (CR)</option>
                    <option value="company_registration">شهادة ضريبة القيمة المضافة / الزكاة (VAT / Zakat)</option>
                    <option value="contract">عقد تشغيل منصة / اتفاقية رئيسية (Platform Agreement)</option>
                    <option value="operation_card">ترخيص هيئة النقل للمنشأة (TGA Facility License)</option>
                    <option value="other">وثيقة رسمية للشركة (Company Document)</option>
                  </>
                ) : ownerType === 'vehicle' ? (
                  <>
                    <option value="vehicle_photo">صورة المركبة (Vehicle Photo)</option>
                    <option value="istemara">استمارة مركبة (Istemara)</option>
                    <option value="insurance">وثيقة تأمين (Insurance)</option>
                    <option value="vehicle_check">فحص فني دوري (Inspection)</option>
                    <option value="operation_card">كرت تشغيل هيئة النقل</option>
                    <option value="other">أخرى (Other)</option>
                  </>
                ) : (
                  <>
                    <option value="driver_license">رخصة قيادة (Driver License)</option>
                    <option value="iqama">إقامة نظامية (Iqama)</option>
                    <option value="driver_card">كرت السائق (Driver Card - TGA)</option>
                    <option value="operation_card">كرت التشغيل للمندوب (Operation Card)</option>
                    <option value="medical_check">فحص طبي (Medical Check)</option>
                    <option value="contract">عقد عمل / اتفاقية تشغيل (Contract)</option>
                    <option value="personal_photo">صورة شخصية للكابتن</option>
                    <option value="other">أخرى (Other)</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">نوع القسم والتبعية</label>
              <select
                value={ownerType}
                onChange={(e) => {
                  const ot = e.target.value as DocumentOwnerType;
                  setOwnerType(ot);
                  if (ot === 'driver') {
                    setDepartment('إدارة السائقين');
                    setDocType('driver_license');
                    if (drivers.length > 0) setOwnerId(drivers[0].id);
                  } else if (ot === 'vehicle') {
                    setDepartment('إدارة الحركة والأسطول');
                    setDocType('istemara');
                    if (vehicles.length > 0) setOwnerId(vehicles[0].id);
                  } else if (ot === 'company') {
                    setDepartment('الإدارة العامة والشؤون القانونية');
                    setDocType('commercial_register');
                    setOwnerId('شركة مارشال لوجستيكس');
                  } else if (ot === 'financial') {
                    setDepartment('الإدارة المالية والمحاسبة');
                    setDocType('platform_revenue_statement');
                    setOwnerId('البيانات المالية');
                  }
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden font-bold"
              >
                <option value="driver">قسم المناديب (سائق / كابتن)</option>
                <option value="company">قسم الشركة (وثائق وسجلات المؤسسة)</option>
                <option value="financial">قسم التفاصيل المالية (إيرادات المنصات والفواتير)</option>
                <option value="vehicle">قسم أسطول المركبات</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">الجهة التابعة لها</label>
              {ownerType === 'driver' ? (
                <select
                  value={ownerId}
                  onChange={(e) => setOwnerId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
                >
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>{d.fullName} ({d.phone})</option>
                  ))}
                </select>
              ) : ownerType === 'vehicle' ? (
                <select
                  value={ownerId}
                  onChange={(e) => setOwnerId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>{v.make} ({v.plateNumber})</option>
                  ))}
                </select>
              ) : ownerType === 'financial' ? (
                <select
                  value={platformRevenueId}
                  onChange={(e) => {
                    const revId = e.target.value;
                    setPlatformRevenueId(revId);
                    const matchedRev = revenueStatements.find((r) => r.id === revId);
                    if (matchedRev) {
                      setPlatformName(matchedRev.platformName);
                      setAmount(matchedRev.totalNetRevenue || 0);
                      if (!title) {
                        setTitle(`كشف إيرادات منصة ${matchedRev.platformName} (${matchedRev.month})`);
                      }
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
                >
                  <option value="">-- ربط بكشف إيرادات محفوظ من المنصة --</option>
                  {revenueStatements.map((rev) => (
                    <option key={rev.id} value={rev.id}>
                      {rev.platformName} ({rev.month}) • {rev.statementNumber} • صافي: {rev.totalNetRevenue?.toLocaleString()} ر.س
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={ownerId}
                  onChange={(e) => setOwnerId(e.target.value)}
                  placeholder="الفرع أو الشركة..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
                />
              )}
            </div>

            {ownerType === 'financial' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">اسم المنصة الشريكة</label>
                  <select
                    value={platformName}
                    onChange={(e) => setPlatformName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
                  >
                    <option value="جاهز (Jahez)">جاهز (Jahez)</option>
                    <option value="هنقرستيشن (Hungerstation)">هنقرستيشن (Hungerstation)</option>
                    <option value="نينجا (Ninja)">نينجا (Ninja)</option>
                    <option value="تويو (Toyou)">تويو (Toyou)</option>
                    <option value="مرسول (Mrsool)">مرسول (Mrsool)</option>
                    <option value="كيان (Kayan)">كيان (Kayan)</option>
                    <option value="بارنيز (Barns)">بارنيز (Barns)</option>
                    <option value="شريكة أخرى">منصة أخرى</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">المبلغ المالي (صافي الإيراد ر.س)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0.00 ر.س"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white outline-hidden font-bold"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">القسم المسؤول</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">تاريخ الإصدار</label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">تاريخ الانتهاء (إن وجد)</label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white outline-hidden"
              />
            </div>
          </div>

          {/* File Upload Zone */}
          <FileUploadZone
            label="الملف أو الصورة الممسوحة ضوئياً"
            sublabel="اسحب صورة الوثيقة أو ملف الـ PDF هنا لرفعها للأرشيف السحابي"
            value={fileUrl}
            onChange={(url) => setFileUrl(url)}
            previewHeight="h-40"
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">ملاحظات الأرشيف</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="رقم المستند، جهة الإصدار، شروط خاصة..."
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
              disabled={isSubmitting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs"
            >
              {isSubmitting ? 'جاري الأرشفة...' : 'حفظ وأرشفة الوثيقة'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Document Full Preview Modal */}
      <DocumentPreviewModal
        document={previewDoc}
        ownerLabel={previewDoc ? getOwnerLabel(previewDoc) : ''}
        isOpen={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
      />

      {/* Delete Confirmation with Password */}
      <DeleteWithPasswordModal
        isOpen={!!docToDelete}
        onClose={() => setDocToDelete(null)}
        onConfirm={handleDeleteConfirm}
        itemTitle={docToDelete ? `المستند "${docToDelete.title}" (${getOwnerLabel(docToDelete)})` : ''}
        itemType="وثيقة ومستند"
        warningNote="سيتم حفظ بيانات المستند ورابطه في سلة المحذوفات المركزية للمدير العام."
      />
    </div>
  );
};
