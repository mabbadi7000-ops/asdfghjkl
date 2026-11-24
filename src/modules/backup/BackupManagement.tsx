import React, { useState, useEffect, useRef } from 'react';
import {
  Database,
  HardDrive,
  Download,
  Upload,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  RefreshCw,
  FileText,
  Layers,
  Lock,
  Clock,
  Calendar,
  Search,
  Sliders,
  Eye,
  Activity,
  Sparkles,
  AlertOctagon,
  ArrowRight,
  Copy,
  Check,
  Server,
  FolderArchive,
  CheckSquare,
  ShieldAlert,
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { Table, Column } from '../../components/common/Table';
import { StatCard } from '../../components/common/StatCard';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  SystemBackupRecord,
  BackupType,
  BackupPolicySettings,
} from '../../types';
import { subscribeToCollection } from '../../services/dataService';
import {
  createSystemBackup,
  downloadBackupFile,
  restoreSystemBackup,
  restoreFromExternalJson,
  deleteBackupRecord,
  runSystemIntegrityDiagnostics,
  getBackupPolicySettings,
  saveBackupPolicySettings,
  SYSTEM_COLLECTIONS_REGISTRY,
  CollectionDiagnosticResult,
} from '../../services/backupService';

export const BackupManagement: React.FC = () => {
  const { currentUser } = useAuth();
  const { tx, language } = useLanguage();

  const [backups, setBackups] = useState<SystemBackupRecord[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'archive' | 'create' | 'import' | 'policy' | 'diagnostics'>('archive');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Notifications
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Search & Filter in Archive
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Modals state
  const [inspectBackup, setInspectBackup] = useState<SystemBackupRecord | null>(null);
  const [backupToRestore, setBackupToRestore] = useState<SystemBackupRecord | null>(null);
  const [backupToDelete, setBackupToDelete] = useState<SystemBackupRecord | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);

  // Create Backup Form State
  const [newBackupName, setNewBackupName] = useState('');
  const [newBackupType, setNewBackupType] = useState<BackupType>('full');
  const [selectedCollections, setSelectedCollections] = useState<string[]>(
    SYSTEM_COLLECTIONS_REGISTRY.map((c) => c.key)
  );
  const [newBackupNotes, setNewBackupNotes] = useState('');

  // Import File State
  const [importFileContent, setImportFileContent] = useState<string | null>(null);
  const [importFileName, setImportFileName] = useState<string>('');
  const [importParsedInfo, setImportParsedInfo] = useState<{
    appName?: string;
    name?: string;
    recordsCount: number;
    collectionsCount: number;
    collectionsList: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Policy Settings State
  const [policySettings, setPolicySettings] = useState<BackupPolicySettings | null>(null);

  // Diagnostics State
  const [diagnosticResults, setDiagnosticResults] = useState<{
    results: CollectionDiagnosticResult[];
    totalCollections: number;
    totalDocuments: number;
    allHealthy: boolean;
    scannedAt: string;
  } | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Subscribe to real-time backups
  useEffect(() => {
    const unsub = subscribeToCollection<SystemBackupRecord>('system_backups', (data) => {
      // Sort newest first
      const sorted = [...data].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      setBackups(sorted);
    });
    return () => unsub();
  }, []);

  // Load Policy
  useEffect(() => {
    async function loadPolicy() {
      const p = await getBackupPolicySettings();
      setPolicySettings(p);
    }
    loadPolicy();
  }, []);

  // Quick initial diagnostics
  useEffect(() => {
    handleRunDiagnostics();
  }, []);

  const handleRunDiagnostics = async () => {
    try {
      setIsScanning(true);
      const res = await runSystemIntegrityDiagnostics();
      setDiagnosticResults(res);
    } catch (err: any) {
      console.error('Error running diagnostics:', err);
    } finally {
      setIsScanning(false);
    }
  };

  // Toast Helper
  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 6000);
  };

  // Handle Create Backup
  const handleCreateBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      setActionLoading(true);
      const created = await createSystemBackup(currentUser, {
        backupName: newBackupName.trim() || undefined,
        backupType: newBackupType,
        selectedCollections: newBackupType === 'full' ? SYSTEM_COLLECTIONS_REGISTRY.map((c) => c.key) : selectedCollections,
        notes: newBackupNotes.trim() || undefined,
      });

      showToast(
        'success',
        `تم إنشاء النسخة الاحتياطية (${created.backupName}) بنجاح! تم حفظ ${created.totalRecordsCount} سجل بحجم ${(created.totalSizeBytes / 1024).toFixed(1)} KB.`
      );
      setNewBackupName('');
      setNewBackupNotes('');
      setActiveSubTab('archive');
    } catch (err: any) {
      showToast('error', `فشل إنشاء النسخة الاحتياطية: ${err.message || 'خطأ غير معروف'}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Restore Backup
  const handleConfirmRestore = async () => {
    if (!currentUser || !backupToRestore) return;

    try {
      setActionLoading(true);
      const res = await restoreSystemBackup(currentUser, backupToRestore);
      showToast(
        'success',
        `تمت استعادة النسخة (${backupToRestore.backupName}). نجح ${res.restoredCount} سجل وتعذر ${res.failedCount} سجل. نسخة الأمان: ${res.safetyBackupId}`
      );
      setBackupToRestore(null);
    } catch (err: any) {
      showToast('error', `فشل استعادة النسخة الاحتياطية: ${err.message || 'خطأ غير معروف'}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Delete Backup
  const handleConfirmDelete = async () => {
    if (!currentUser || !backupToDelete) return;

    try {
      setActionLoading(true);
      await deleteBackupRecord(currentUser, backupToDelete.id);
      showToast('success', `تم حذف النسخة الاحتياطية #${backupToDelete.id} بنجاح.`);
      setBackupToDelete(null);
    } catch (err: any) {
      showToast('error', `فشل حذف النسخة الاحتياطية: ${err.message || 'خطأ غير معروف'}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle File Input for Import
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      showToast('error', 'حجم ملف النسخة يتجاوز الحد المسموح (25 ميجابايت).');
      e.target.value = '';
      return;
    }

    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        setImportFileContent(text);
        const parsed = JSON.parse(text);

        const dataObj = parsed.data || {};
        const colKeys = Object.keys(dataObj);
        let records = 0;
        colKeys.forEach((k) => {
          if (Array.isArray(dataObj[k])) {
            records += dataObj[k].length;
          }
        });

        setImportParsedInfo({
          appName: parsed.app || 'ملف بيانات خارجي',
          name: parsed.snapshot?.name || file.name,
          recordsCount: records,
          collectionsCount: colKeys.length,
          collectionsList: colKeys,
        });
      } catch (err: any) {
        showToast('error', 'صيغة الملف غير صحيحة. يجب اختيار ملف JSON صالح ومعتمد.');
        setImportFileContent(null);
        setImportParsedInfo(null);
      }
    };
    reader.readAsText(file);
  };

  // Handle Execute Import Restore
  const handleExecuteImport = async () => {
    if (!currentUser || !importFileContent) return;

    try {
      setActionLoading(true);
      const res = await restoreFromExternalJson(currentUser, importFileContent);
      showToast(
        'success',
        `تم استيراد النسخة. نجح ${res.restoredCount} سجل وتعذر ${res.failedCount} سجل. نسخة الأمان: ${res.safetyBackupId}`
      );
      setImportFileContent(null);
      setImportParsedInfo(null);
      setImportFileName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setActiveSubTab('archive');
    } catch (err: any) {
      showToast('error', `فشل استيراد النسخة: ${err.message || 'خطأ غير معروف'}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Save Policy Settings
  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !policySettings) return;

    try {
      setActionLoading(true);
      await saveBackupPolicySettings(currentUser, policySettings);
      showToast('success', 'تم حفظ وتفعيل سياسة النسخ الاحتياطي التلقائي بنجاح!');
    } catch (err: any) {
      showToast('error', `فشل حفظ السياسة: ${err.message || 'خطأ غير معروف'}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Filter Backups for Table
  const filteredBackups = backups.filter((b) => {
    if (typeFilter !== 'all' && b.backupType !== typeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (b.backupName || '').toLowerCase().includes(q);
      const matchId = (b.id || '').toLowerCase().includes(q);
      const matchCreator = (b.createdByUserName || '').toLowerCase().includes(q);
      const matchHash = (b.checksum || '').toLowerCase().includes(q);
      if (!matchName && !matchId && !matchCreator && !matchHash) return false;
    }
    return true;
  });

  // KPI Computations
  const totalSnapshotsCount = backups.length;
  const totalProtectedRecords = diagnosticResults?.totalDocuments || 0;
  const lastBackup = backups[0];

  const getBackupTypeBadge = (type: BackupType) => {
    switch (type) {
      case 'full':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            {tx('نسخة شاملة (Full)', 'Full System')}
          </span>
        );
      case 'selective':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            {tx('نسخة مخصصة (Selective)', 'Selective')}
          </span>
        );
      case 'scheduled':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
            {tx('جدولة دورية (Scheduled)', 'Scheduled')}
          </span>
        );
      case 'pre_restore_safety':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
            {tx('أمان طارئ (Safety Rollback)', 'Safety Snapshot')}
          </span>
        );
      default:
        return null;
    }
  };

  // Table Columns
  const columns: Column<SystemBackupRecord>[] = [
    {
      header: 'اسم وتفاصيل النسخة',
      accessor: 'backupName',
      sortable: true,
      render: (b) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 text-xs">{b.backupName}</span>
            {getBackupTypeBadge(b.backupType)}
          </div>
          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2">
            <span>ID: #{b.id}</span>
            {b.notes && <span className="text-slate-500 truncate max-w-xs">• {b.notes}</span>}
          </div>
        </div>
      ),
    },
    {
      header: 'التاريخ والتوقيت',
      accessor: 'createdAt',
      sortable: true,
      render: (b) => {
        const d = b.createdAt ? new Date(b.createdAt) : null;
        return (
          <div className="text-xs text-slate-700 font-mono">
            {d ? (
              <>
                <span className="font-bold block">{d.toLocaleDateString('ar-SA')}</span>
                <span className="text-[10px] text-slate-400 block">{d.toLocaleTimeString('ar-SA')}</span>
              </>
            ) : (
              b.createdAt || '-'
            )}
          </div>
        );
      },
    },
    {
      header: 'نطاق البيانات المحمية',
      accessor: 'totalRecordsCount',
      sortable: true,
      render: (b) => (
        <div className="space-y-0.5 text-xs">
          <span className="font-bold text-slate-900 block">
            {b.totalRecordsCount.toLocaleString()} {tx('سجل', 'records')}
          </span>
          <span className="text-[10px] text-slate-500 block">
            {b.collectionsIncluded?.length || 0} {tx('جدول بيانات', 'collections')}
          </span>
        </div>
      ),
    },
    {
      header: 'الحجم والتشفير',
      accessor: 'totalSizeBytes',
      sortable: true,
      render: (b) => (
        <div className="space-y-0.5 text-xs font-mono">
          <span className="font-bold text-slate-800 block">
            {(b.totalSizeBytes / 1024).toFixed(1)} KB
          </span>
          <span
            className="text-[9px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-mono inline-block truncate max-w-[120px]"
            title={`SHA-256: ${b.checksum}`}
          >
            ✓ {b.checksum.slice(0, 10)}...
          </span>
        </div>
      ),
    },
    {
      header: 'تم الإنشاء بواسطة',
      accessor: 'createdByUserName',
      render: (b) => (
        <div className="text-xs text-slate-700 space-y-0.5">
          <span className="font-semibold block">{b.createdByUserName || 'مدير النظام'}</span>
          <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 inline-block">
            {b.createdByUserRole === 'admin' ? 'مدير النظام والأمان' : b.createdByUserRole}
          </span>
        </div>
      ),
    },
    {
      header: 'الإجراءات',
      className: 'text-end',
      render: (b) => (
        <div className="flex items-center justify-end gap-1">
          {/* Download JSON */}
          <button
            type="button"
            onClick={() => downloadBackupFile(b)}
            className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg cursor-pointer transition-colors"
            title="تنزيل ملف النسخة الاحتياطية (JSON) للحفظ الخارجي"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Inspect Details */}
          <button
            type="button"
            onClick={() => setInspectBackup(b)}
            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
            title="معاينة تفاصيل النسخة وبصمة التشفير"
          >
            <Eye className="w-4 h-4" />
          </button>

          {/* Restore Button */}
          <button
            type="button"
            onClick={() => setBackupToRestore(b)}
            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
            title="استعادة هذه النسخة في قاعدة البيانات النشطة"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>استعادة</span>
          </button>

          {/* Delete Button */}
          <button
            type="button"
            onClick={() => setBackupToDelete(b)}
            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
            title="حذف النسخة من السحاب"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Security Hero Header */}
      <div className="p-6 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white rounded-3xl border border-amber-500/30 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[10px] font-black bg-amber-500 text-slate-950 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>DISASTER RECOVERY & SYSTEM BACKUP</span>
            </span>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              {tx('حماية نشطة 100% لكامل النظام', 'Active 100% Protection')}
            </span>
          </div>

          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Server className="w-6 h-6 text-amber-400" />
            <span>{tx('نظام النسخ الاحتياطي وحماية المنظومة الشاملة', 'Enterprise Backup & Disaster Recovery')}</span>
          </h2>

          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            {tx(
              'خاص وحصري بمدير النظام والأمان: إنشاء نسخ احتياطية مشفرة لجميع قواعد بيانات الأسطول والتشغيل والماليات (24 جدول بيانات نشط)، مع إمكانية التصدير، الاستيراد، والاستعادة الفورية المحمية بنسخ أمان تلقائية لمنع أي فقدان أو تلف للبيانات.',
              'Exclusive to System & Security Admin: Generate cryptographic backups across all 24 database collections with offline export, file import, and rollback safety guarantee.'
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setActiveSubTab('create')}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 text-xs font-black rounded-2xl shadow-md transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>{tx('إنشاء نسخة احتياطية فورية', 'Create Instant Backup')}</span>
          </button>
          <button
            onClick={() => setActiveSubTab('import')}
            className="flex items-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-2xl border border-slate-700 transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>{tx('استيراد ملف نسخة', 'Import Backup File')}</span>
          </button>
          <button
            onClick={handleRunDiagnostics}
            disabled={isScanning}
            className="p-3 bg-slate-800/80 hover:bg-slate-800 text-slate-300 rounded-2xl border border-slate-700 transition-colors cursor-pointer"
            title="إجراء فحص فوري لسلامة قواعد البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between border shadow-sm ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : toast.type === 'error'
              ? 'bg-rose-50 text-rose-900 border-rose-200'
              : 'bg-blue-50 text-blue-900 border-blue-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : toast.type === 'error' ? (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            ) : (
              <Activity className="w-5 h-5 text-blue-600 shrink-0" />
            )}
            <span className="leading-relaxed">{toast.message}</span>
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={tx('إجمالي النسخ السحابية', 'Total Cloud Backups')}
          value={totalSnapshotsCount}
          subtitle={tx('أرشيف موثق بالبصمة الرقمية', 'Immutable cryptographic snapshots')}
          icon={FolderArchive}
          colorScheme="amber"
          onClick={() => setActiveSubTab('archive')}
        />
        <StatCard
          title={tx('إجمالي السجلات المحمية', 'Total Protected Records')}
          value={totalProtectedRecords.toLocaleString()}
          subtitle={tx('عبر 24 جدول بيانات نشط', 'Across 24 active system collections')}
          icon={Database}
          colorScheme="emerald"
          onClick={() => setActiveSubTab('diagnostics')}
        />
        <StatCard
          title={tx('سلامة قواعد البيانات', 'Database Integrity')}
          value="100% سليم"
          subtitle={tx('فحص دوري ومزامنة سحابية مستمرة', 'Real-time multi-collection sync')}
          icon={ShieldCheck}
          colorScheme="purple"
          onClick={() => setActiveSubTab('diagnostics')}
        />
        <StatCard
          title={tx('آخر نسخة تم إنشاؤها', 'Latest Snapshot')}
          value={lastBackup ? `${(lastBackup.totalSizeBytes / 1024).toFixed(0)} KB` : 'لا يوجد بعد'}
          subtitle={lastBackup ? `${new Date(lastBackup.createdAt).toLocaleDateString('ar-SA')}` : tx('جاهز للنسخ الآن', 'Ready')}
          icon={HardDrive}
          colorScheme="blue"
        />
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
        {[
          { id: 'archive', label: tx('أرشيف النسخ الاحتياطية', 'Backups Archive'), icon: HardDrive, count: backups.length },
          { id: 'create', label: tx('إنشاء نسخة احتياطية جديدة', 'Create Snapshot'), icon: Sparkles },
          { id: 'import', label: tx('استيراد واستعادة ملف خارجي', 'Import From File'), icon: Upload },
          { id: 'policy', label: tx('سياسة الجدولة والأمان', 'Automated Policy'), icon: Sliders },
          { id: 'diagnostics', label: tx('فحص سلامة الجداول والنظام', 'System Diagnostics'), icon: Activity, count: diagnosticResults?.totalCollections },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    isActive ? 'bg-amber-400 text-slate-950 font-black' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: ARCHIVE */}
      {activeSubTab === 'archive' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-500">{tx('تصفية النوع:', 'Filter Type:')}</span>
              {[
                { id: 'all', label: tx('كافة النسخ', 'All') },
                { id: 'full', label: tx('نسخ كاملة', 'Full') },
                { id: 'selective', label: tx('نسخ مخصصة', 'Selective') },
                { id: 'scheduled', label: tx('مجدولة دورياً', 'Scheduled') },
                { id: 'pre_restore_safety', label: tx('نسخ أمان طارئة', 'Safety Snapshots') },
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => setTypeFilter(btn.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                    typeFilter === btn.id
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">
                {filteredBackups.length} {tx('نسخة مسجلة', 'backups')}
              </span>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <Table<SystemBackupRecord>
              columns={columns}
              data={filteredBackups}
              keyExtractor={(b) => b.id}
              searchPlaceholder={tx('البحث بالاسم، المعرف، بصمة التشفير...', 'Search by name, ID, hash...')}
              searchFilter={(b, q) => {
                const query = q.toLowerCase();
                return (
                  (b.backupName || '').toLowerCase().includes(query) ||
                  (b.id || '').toLowerCase().includes(query) ||
                  (b.createdByUserName || '').toLowerCase().includes(query) ||
                  (b.checksum || '').toLowerCase().includes(query)
                );
              }}
            />
          </div>
        </div>
      )}

      {/* TAB 2: CREATE NEW BACKUP */}
      {activeSubTab === 'create' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <span>{tx('إنشاء نسخة احتياطية فورية جديدة', 'Create New System Snapshot')}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {tx(
                'سيقوم النظام بسحب بيانات الجداول المحددة بالكامل وحساب بصمة التحقق (SHA-256) وتخزينها بأمان في أرشيف السحاب.',
                'The engine will capture selected collections, compute cryptographic checksum, and store snapshot.'
              )}
            </p>
          </div>

          <form onSubmit={handleCreateBackup} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {tx('اسم النسخة الاحتياطية *', 'Backup Snapshot Name *')}
                </label>
                <input
                  type="text"
                  required
                  placeholder={`نسخة احتياطية كاملة - ${new Date().toLocaleDateString('ar-SA')}`}
                  value={newBackupName}
                  onChange={(e) => setNewBackupName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {tx('نوع نطاق النسخ *', 'Scope & Type *')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewBackupType('full');
                      setSelectedCollections(SYSTEM_COLLECTIONS_REGISTRY.map((c) => c.key));
                    }}
                    className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                      newBackupType === 'full'
                        ? 'border-emerald-500 bg-emerald-50/50 text-emerald-900 shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{tx('شامل لكامل النظام (24 جدول)', 'Full System (All)')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewBackupType('selective')}
                    className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                      newBackupType === 'selective'
                        ? 'border-amber-500 bg-amber-50/50 text-amber-900 shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <CheckSquare className="w-4 h-4 text-amber-600" />
                    <span>{tx('مخصص (تحديد الجداول)', 'Selective Custom')}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* If selective, show collection picker */}
            {newBackupType === 'selective' && (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    {tx('اختر الجداول المراد تضمينها في النسخة الاحتياطية:', 'Select Collections to Include:')}
                  </label>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setSelectedCollections(SYSTEM_COLLECTIONS_REGISTRY.map((c) => c.key))}
                      className="text-amber-600 hover:underline font-bold cursor-pointer"
                    >
                      {tx('تحديد الكل (24)', 'Select All')}
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => setSelectedCollections([])}
                      className="text-slate-500 hover:underline cursor-pointer"
                    >
                      {tx('إلغاء التحديد', 'Deselect All')}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto p-1">
                  {SYSTEM_COLLECTIONS_REGISTRY.map((col) => {
                    const isChecked = selectedCollections.includes(col.key);
                    return (
                      <label
                        key={col.key}
                        className={`p-2.5 rounded-xl border flex items-center gap-2.5 text-xs font-semibold cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-slate-50 border-amber-400 text-slate-900'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCollections([...selectedCollections, col.key]);
                            } else {
                              setSelectedCollections(selectedCollections.filter((k) => k !== col.key));
                            }
                          }}
                          className="w-4 h-4 text-amber-600 rounded cursor-pointer"
                        />
                        <div className="truncate">
                          <span className="block truncate">{col.nameAr}</span>
                          <span className="text-[10px] text-slate-400 font-mono block">/{col.key}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {tx('ملاحظات إدارية / سبب النسخ الاحتياطي', 'Admin Notes / Reason')}
              </label>
              <textarea
                rows={2}
                placeholder={tx('مثال: نسخة دورية قبل إطلاق تحديث تشغيلي / تدقيق ربع سنوي...', 'e.g. Scheduled pre-update backup...')}
                value={newBackupNotes}
                onChange={(e) => setNewBackupNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <div className="text-xs text-slate-500 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-emerald-600" />
                <span>
                  {tx(
                    `سيتم فحص وتأمين ${newBackupType === 'full' ? 24 : selectedCollections.length} جدول بيانات وتوليد كود التشفير.`,
                    `Will snapshot ${newBackupType === 'full' ? 24 : selectedCollections.length} collections with hash validation.`
                  )}
                </span>
              </div>

              <button
                type="submit"
                disabled={actionLoading || (newBackupType === 'selective' && selectedCollections.length === 0)}
                className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {actionLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{tx('جارٍ سحب البيانات والتشفير...', 'Creating Snapshot...')}</span>
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4" />
                    <span>{tx('بدء إنشاء النسخة الاحتياطية الآن', 'Start Snapshot Now')}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: IMPORT FROM EXTERNAL FILE */}
      {activeSubTab === 'import' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Upload className="w-5 h-5 text-emerald-600" />
              <span>{tx('استيراد واستعادة من ملف نسخة احتياطية خارجي', 'Import & Restore from External Backup File')}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {tx(
                'يتيح لك رفع ملف نسخة احتياطية (.json) تم تصديره سابقاً واستعادته مباشرة في قواعد البيانات مع إنشاء نسخة أمان طارئة تلقائية.',
                'Upload an exported JSON backup file to validate and restore into active database with safety rollback.'
              )}
            </p>
          </div>

          {/* File Picker Box */}
          <div className="p-8 border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-3xl text-center space-y-3 bg-slate-50/50 transition-colors">
            <input
              type="file"
              ref={fileInputRef}
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
              id="backup-file-input"
            />
            <label
              htmlFor="backup-file-input"
              className="cursor-pointer inline-flex flex-col items-center gap-2"
            >
              <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-xs">
                <Upload className="w-7 h-7" />
              </div>
              <span className="text-sm font-bold text-slate-800">
                {importFileName ? importFileName : tx('انقر لاختيار ملف النسخة الاحتياطية (JSON)', 'Click to select JSON backup file')}
              </span>
              <span className="text-xs text-slate-400">
                {tx('يقبل ملفات FleetOps المعتمدة بصيغة .json المشفرة', 'Accepts certified .json backup snapshots')}
              </span>
            </label>
          </div>

          {/* Parsed File Preview */}
          {importParsedInfo && (
            <div className="p-5 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-emerald-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span className="text-xs font-black text-emerald-950">
                    {tx('تم فحص سلامة الملف بنجاح وهو صالح للاستعادة', 'File Validated Successfully')}
                  </span>
                </div>
                <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded text-[10px] font-bold">
                  Certified Format
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">{tx('اسم النسخة:', 'Snapshot Name:')}</span>
                  <strong className="text-slate-900 block truncate">{importParsedInfo.name}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">{tx('إجمالي السجلات:', 'Total Records:')}</span>
                  <strong className="text-slate-900 block font-mono">{importParsedInfo.recordsCount.toLocaleString()}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">{tx('عدد الجداول المتضمنة:', 'Collections Count:')}</span>
                  <strong className="text-slate-900 block font-mono">{importParsedInfo.collectionsCount}</strong>
                </div>
              </div>

              {/* Red-Alert Safety Rollback Note */}
              <div className="p-3 bg-amber-100/70 border border-amber-300 rounded-xl text-xs text-amber-950 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  {tx(
                    'ضمان الأمان: سيقوم النظام تلقائياً بإنشاء نسخة أمان طارئة للوضع الحالي قبل تطبيق أي تعديل، لتتمكن من التراجع في أي لحظة.',
                    'Safety Guarantee: An automatic safety rollback snapshot will be taken before applying changes.'
                  )}
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setImportFileContent(null);
                    setImportParsedInfo(null);
                    setImportFileName('');
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  {tx('إلغاء الملف', 'Cancel')}
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleExecuteImport}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  {actionLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{tx('جارٍ الاستيراد وإنشاء نسخة الأمان...', 'Restoring...')}</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4" />
                      <span>{tx('تأكيد الاستيراد والاستعادة في قاعدة البيانات', 'Confirm Import & Restore')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: AUTOMATED POLICY */}
      {activeSubTab === 'policy' && policySettings && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-purple-600" />
              <span>{tx('سياسة الجدولة الدورية والاحتفاظ بالنسخ الاحتياطية', 'Automated Backup & Retention Policy')}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {tx(
                'ضبط أوقات النسخ التلقائي للنظام، فترات الاحتفاظ بالأرشيف، والإشعارات التنبيهية الخاصة بمدير النظام.',
                'Configure automated snapshot intervals, retention window, and security alerts.'
              )}
            </p>
          </div>

          <form onSubmit={handleSavePolicy} className="space-y-6">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  {tx('تفعيل النسخ الاحتياطي التلقائي المجدول', 'Enable Automated Scheduled Backups')}
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {tx('يعمل النظام في الخلفية لإنشاء نسخة يومية شاملة لكامل المنظومة.', 'Automatically runs in background to capture daily system snapshots.')}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={policySettings.autoBackupEnabled}
                  onChange={(e) => setPolicySettings({ ...policySettings, autoBackupEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {tx('تكرار النسخ الاحتياطي', 'Backup Frequency')}
                </label>
                <select
                  value={policySettings.frequency}
                  onChange={(e) => setPolicySettings({ ...policySettings, frequency: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none bg-white cursor-pointer font-medium"
                >
                  <option value="daily">{tx('يومياً (موصى به - Daily)', 'Daily (Recommended)')}</option>
                  <option value="weekly">{tx('أسبوعياً (Weekly)', 'Weekly')}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {tx('وقت التشغيل اليومي (توقيت مكة المكرمة)', 'Scheduled Time (AST)')}
                </label>
                <input
                  type="time"
                  value={policySettings.scheduledTime}
                  onChange={(e) => setPolicySettings({ ...policySettings, scheduledTime: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {tx('فترة الاحتفاظ بالنسخ (Retention Period)', 'Retention Period')}
                </label>
                <select
                  value={policySettings.retentionDays}
                  onChange={(e) => setPolicySettings({ ...policySettings, retentionDays: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none bg-white cursor-pointer font-medium"
                >
                  <option value={30}>30 {tx('يوماً (شهر كامل)', 'Days')}</option>
                  <option value={60}>60 {tx('يوماً (شهران)', 'Days')}</option>
                  <option value={90}>90 {tx('يوماً (ربع سنوي)', 'Days')}</option>
                  <option value={365}>365 {tx('يوماً (سنة كاملة)', 'Days')}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {tx('تنبيهات وفشل العمليات', 'Failure Alert Notifications')}
                </label>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between">
                  <span className="text-slate-600">{tx('إرسال إشعار فوري عند تعثر النسخ', 'Alert on failure')}</span>
                  <input
                    type="checkbox"
                    checked={policySettings.notifyOnFailure}
                    onChange={(e) => setPolicySettings({ ...policySettings, notifyOnFailure: e.target.checked })}
                    className="w-4 h-4 text-rose-600 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={actionLoading}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-2"
              >
                <Check className="w-4 h-4 text-emerald-400" />
                <span>{tx('حفظ وتطبيق سياسة الجدولة', 'Save Policy Settings')}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 5: SYSTEM DIAGNOSTICS */}
      {activeSubTab === 'diagnostics' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-600" />
                <span>{tx('فحص وتشخيص سلامة جداول وقواعد البيانات (24 جدول)', 'System Database Diagnostics')}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {tx(
                  'فحص حي ومباشر لكافة جداول البيانات في Cloudflare D1 للتأكد من سلامة الربط، عدم وجود تلف، وعدد السجلات النشطة.',
                  'Live connectivity and health scanner for all Cloudflare D1 tables.'
                )}
              </p>
            </div>

            <button
              onClick={handleRunDiagnostics}
              disabled={isScanning}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs transition-colors self-start sm:self-center"
            >
              <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? tx('جارٍ الفحص...', 'Scanning...') : tx('إجراء فحص شامل الآن', 'Scan Now')}</span>
            </button>
          </div>

          {/* Diagnostic Grid */}
          {diagnosticResults && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {diagnosticResults.results.map((col) => (
                <div
                  key={col.key}
                  className="p-3.5 bg-slate-50/60 rounded-2xl border border-slate-200 flex flex-col justify-between hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="truncate">
                      <h4 className="text-xs font-bold text-slate-900 truncate">{col.nameAr}</h4>
                      <span className="text-[10px] text-slate-400 font-mono block">/{col.key}</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border shrink-0 ${
                        col.status === 'healthy'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : col.status === 'empty'
                          ? 'bg-slate-100 text-slate-600 border-slate-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}
                    >
                      {col.status === 'healthy' ? '✓ متصل' : col.status === 'empty' ? 'فارغ' : '⚠️ خطأ'}
                    </span>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex items-center justify-between text-xs">
                    <span className="text-slate-500 text-[11px]">{tx('السجلات:', 'Records:')}</span>
                    <strong className="text-slate-900 font-mono text-sm">{col.count.toLocaleString()}</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* INSPECT BACKUP MODAL */}
      {inspectBackup && (
        <Modal
          isOpen={true}
          onClose={() => setInspectBackup(null)}
          title={`معاينة تفاصيل النسخة: ${inspectBackup.backupName}`}
          subtitle={`المعرف: #${inspectBackup.id}`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">نوع النسخة</span>
                  <span className="font-bold text-slate-800">{inspectBackup.backupType}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">إجمالي السجلات</span>
                  <span className="font-bold text-slate-800 font-mono">{inspectBackup.totalRecordsCount.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">الحجم الإجمالي</span>
                  <span className="font-bold text-slate-800 font-mono">{(inspectBackup.totalSizeBytes / 1024).toFixed(1)} KB</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">تاريخ الإنشاء</span>
                  <span className="font-bold text-slate-800 font-mono">
                    {new Date(inspectBackup.createdAt).toLocaleString('ar-SA')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">أنشئت بواسطة</span>
                  <span className="font-bold text-slate-800">{inspectBackup.createdByUserName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">حالة الأرشيف</span>
                  <span className="font-bold text-emerald-700">✓ مكتملة ومحمية</span>
                </div>
              </div>

              {/* SHA-256 Checksum Display */}
              <div className="pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>بصمة التشفير والتحقق الرقمي (SHA-256 Checksum):</span>
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(inspectBackup.checksum);
                      setCopiedHash(true);
                      setTimeout(() => setCopiedHash(false), 2000);
                    }}
                    className="text-amber-700 hover:underline text-[10px] flex items-center gap-1 cursor-pointer"
                  >
                    {copiedHash ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedHash ? 'تم النسخ' : 'نسخ البصمة'}</span>
                  </button>
                </div>
                <div className="p-2.5 bg-slate-900 text-emerald-400 rounded-xl text-[10px] font-mono break-all select-all">
                  {inspectBackup.checksum}
                </div>
              </div>
            </div>

            {/* Collections Breakdown */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 mb-2">
                الجداول المتضمنة ({inspectBackup.collectionsIncluded?.length || 0} جدول):
              </h4>
              <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-1">
                {inspectBackup.collectionsIncluded?.map((col) => {
                  const meta = SYSTEM_COLLECTIONS_REGISTRY.find((c) => c.key === col);
                  const docCount = inspectBackup.dataPayload?.[col]?.length || 0;
                  return (
                    <span
                      key={col}
                      className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 flex items-center gap-1.5 shadow-2xs"
                    >
                      <span>{meta?.nameAr || col}</span>
                      <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-[10px] text-slate-600 font-mono">
                        {docCount}
                      </span>
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => downloadBackupFile(inspectBackup)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>تنزيل ملف JSON</span>
              </button>

              <button
                type="button"
                onClick={() => setInspectBackup(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* CONFIRM RESTORE MODAL */}
      {backupToRestore && (
        <Modal
          isOpen={true}
          onClose={() => setBackupToRestore(null)}
          title="تأكيد استعادة النسخة الاحتياطية"
          subtitle={`النسخة: ${backupToRestore.backupName} (#${backupToRestore.id})`}
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs space-y-2 text-amber-950">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <span>تحذير استعادة البيانات النشطة</span>
              </div>
              <p className="leading-relaxed">
                أنت على وشك استعادة بيانات <strong>{backupToRestore.totalRecordsCount} سجل</strong> عبر{' '}
                <strong>{backupToRestore.collectionsIncluded.length} جدول بيانات</strong>.
              </p>
              <div className="p-3 bg-emerald-100/60 border border-emerald-300 rounded-xl text-emerald-950 font-bold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>ضمان السلامة: سيقوم النظام بإنشاء نسخة أمان طارئة تلقائية لحالة النظام الحالية قبل بدء الاستعادة.</span>
              </div>
            </div>

            <div className="text-xs text-slate-600 space-y-1">
              <div>تاريخ النسخة: <strong>{new Date(backupToRestore.createdAt).toLocaleString('ar-SA')}</strong></div>
              <div>حجم البيانات: <strong>{(backupToRestore.totalSizeBytes / 1024).toFixed(1)} KB</strong></div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setBackupToRestore(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                إلغاء
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmRestore}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
              >
                {actionLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جارٍ الاستعادة والتأمين...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>تأكيد الاستعادة الآمنة الآن</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* CONFIRM DELETE MODAL */}
      {backupToDelete && (
        <ConfirmDialog
          isOpen={true}
          title="حذف النسخة الاحتياطية"
          message={`هل أنت متأكد من حذف النسخة الاحتياطية "${backupToDelete.backupName}" (#${backupToDelete.id})؟ هذا الإجراء سيحذف النسخة من السحاب بشكل نهائي.`}
          confirmLabel="حذف النسخة نهائياً"
          cancelLabel="إلغاء"
          variant="danger"
          onConfirm={handleConfirmDelete}
          onClose={() => setBackupToDelete(null)}
        />
      )}
    </div>
  );
};
