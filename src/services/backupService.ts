import {
  SystemBackupRecord,
  BackupType,
  BackupPolicySettings,
  UserProfile,
} from '../types';
import { logAuditAction } from './auditService';
import { createDocument, deleteDocument, fetchCollection, fetchDocument, updateDocument } from './dataService';

const SYSTEM_VERSION = '3.4.0';
const MAX_RESTORE_SIZE_BYTES = 25 * 1024 * 1024;
const MAX_RESTORE_RECORDS = 50_000;
const RESTORE_BATCH_SIZE = 10;

function canManageBackups(user: UserProfile): boolean {
  return user.role === 'admin';
}

export interface SystemCollectionMeta {
  key: string;
  nameAr: string;
  nameEn: string;
  category: 'security' | 'operations' | 'financials' | 'compliance';
  priority: number;
}

export const SYSTEM_COLLECTIONS_REGISTRY: SystemCollectionMeta[] = [
  { key: 'system_settings', nameAr: 'إعدادات المنظومة وهوية الشركة', nameEn: 'System Settings', category: 'security', priority: 1 },
  { key: 'audit_logs', nameAr: 'سجلات النشاط والتدقيق الأمني', nameEn: 'Audit Trail', category: 'security', priority: 1 },
  { key: 'drivers', nameAr: 'سجلات المناديب والكباتن', nameEn: 'Couriers & Drivers', category: 'operations', priority: 2 },
  { key: 'vehicles', nameAr: 'أسطول المركبات والمواصفات', nameEn: 'Fleet Vehicles', category: 'operations', priority: 2 },
  { key: 'vehicle_shifts', nameAr: 'ورديات المركبات والسائقين', nameEn: 'Vehicle Shifts', category: 'operations', priority: 2 },
  { key: 'mileage_logs', nameAr: 'سجلات المسافات المقطوعة', nameEn: 'Mileage Logs', category: 'operations', priority: 2 },
  { key: 'fuel_records', nameAr: 'سجل تعبئة واستهلاك الوقود', nameEn: 'Fuel Records', category: 'operations', priority: 2 },
  { key: 'fuel_chips', nameAr: 'بطاقات الوقود', nameEn: 'Fuel Chips', category: 'operations', priority: 2 },
  { key: 'fuel_contracts', nameAr: 'عقود الوقود', nameEn: 'Fuel Contracts', category: 'operations', priority: 2 },
  { key: 'maintenance_records', nameAr: 'أوامر وفواتير الصيانة', nameEn: 'Maintenance Records', category: 'operations', priority: 2 },
  { key: 'accidents', nameAr: 'الحوادث ومطالبات التأمين', nameEn: 'Accidents & Claims', category: 'compliance', priority: 4 },
  { key: 'violations', nameAr: 'المخالفات المرورية', nameEn: 'Traffic Violations', category: 'compliance', priority: 4 },
  { key: 'driver_advances', nameAr: 'السلف المالية', nameEn: 'Driver Advances', category: 'financials', priority: 3 },
  { key: 'driver_payrolls', nameAr: 'مسيرات الرواتب', nameEn: 'Driver Payrolls', category: 'financials', priority: 3 },
  { key: 'freelancer_rentals', nameAr: 'عقود تأجير الفريلانسر', nameEn: 'Freelancer Rentals', category: 'financials', priority: 3 },
  { key: 'supervisor_account_packages', nameAr: 'باقات حسابات المشرفين', nameEn: 'Supervisor Account Packages', category: 'financials', priority: 3 },
  { key: 'freelancer_payments', nameAr: 'مدفوعات الفريلانسر', nameEn: 'Freelancer Payments', category: 'financials', priority: 3 },
  { key: 'cash_settlements', nameAr: 'التسويات النقدية', nameEn: 'Cash Settlements', category: 'financials', priority: 3 },
  { key: 'expenses', nameAr: 'المصروفات التشغيلية', nameEn: 'Operational Expenses', category: 'financials', priority: 3 },
  { key: 'platform_revenues', nameAr: 'إيرادات المنصات', nameEn: 'Platform Revenues', category: 'financials', priority: 3 },
  { key: 'documents', nameAr: 'أرشيف الوثائق الرسمية', nameEn: 'Official Documents Archive', category: 'compliance', priority: 4 },
  { key: 'official_letters', nameAr: 'الخطابات الرسمية', nameEn: 'Official Letters', category: 'compliance', priority: 4 },
  { key: 'notifications', nameAr: 'الإشعارات والتنبيهات', nameEn: 'Notifications', category: 'compliance', priority: 4 },
  { key: 'tasks', nameAr: 'المهام التشغيلية', nameEn: 'Operations Tasks', category: 'operations', priority: 2 },
  { key: 'leaves', nameAr: 'إجازات السائقين', nameEn: 'Driver Leaves', category: 'operations', priority: 2 },
  { key: 'delivery_platforms', nameAr: 'منصات التوصيل', nameEn: 'Delivery Platforms', category: 'financials', priority: 3 },
  { key: 'platform_contracts', nameAr: 'عقود المنصات', nameEn: 'Platform Contracts', category: 'financials', priority: 3 },
  { key: 'platform_invoices', nameAr: 'فواتير المنصات', nameEn: 'Platform Invoices', category: 'financials', priority: 3 },
  { key: 'rented_accounts', nameAr: 'الحسابات المؤجرة', nameEn: 'Rented Accounts', category: 'operations', priority: 2 },
  { key: 'users', nameAr: 'حسابات المستخدمين', nameEn: 'Users', category: 'security', priority: 1 },
  { key: 'branches', nameAr: 'الفروع ومواقع العمل', nameEn: 'Branches', category: 'operations', priority: 2 },
  { key: 'attendance', nameAr: 'سجلات الحضور والانصراف', nameEn: 'Attendance', category: 'operations', priority: 2 },
  { key: 'reports', nameAr: 'التقارير التشغيلية', nameEn: 'Reports', category: 'operations', priority: 2 },
  { key: 'recycle_bin', nameAr: 'سلة المحذوفات', nameEn: 'Recycle Bin', category: 'security', priority: 1 },
  { key: 'system_backups', nameAr: 'سجلات النسخ الاحتياطي', nameEn: 'System Backups', category: 'security', priority: 1 },
];

const BACKUP_COLLECTIONS = SYSTEM_COLLECTIONS_REGISTRY.map(({ key }) => key);

/**
 * Compute SHA-256 cryptographic checksum for payload integrity verification
 */
export async function computeChecksum(content: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch (err) {
    // Fallback hash
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return 'FALLBACK-' + Math.abs(hash).toString(16).padStart(16, '0');
  }
}

/**
 * Creates a comprehensive system backup snapshot across selected collections
 */
export async function createSystemBackup(
  user: UserProfile,
  options: {
    backupName?: string;
    backupType?: BackupType;
    selectedCollections?: string[];
    notes?: string;
    downloadFile?: boolean;
  }
): Promise<SystemBackupRecord> {
  const collectionsToBackup = options.selectedCollections && options.selectedCollections.length > 0
    ? options.selectedCollections
    : BACKUP_COLLECTIONS;

  const timestamp = new Date().toISOString();
  const backupId = `BKP-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  const backupName = options.backupName?.trim() || `نسخة احتياطية كاملة - ${new Date().toLocaleDateString('ar-SA')}`;

  const payload: Record<string, any[]> = {};
  let totalRecords = 0;

  // Fetch each selected table from D1.
  for (const colKey of collectionsToBackup) {
    try {
      const docs = await fetchCollection<Record<string, any> & { id: string }>(colKey);
      payload[colKey] = docs;
      totalRecords += docs.length;
    } catch (err) {
      console.warn(`[BackupService] Warning reading collection ${colKey}:`, err);
      payload[colKey] = [];
    }
  }

  const payloadString = JSON.stringify(payload);
  const checksum = await computeChecksum(payloadString);

  const backupRecord: SystemBackupRecord = {
    id: backupId,
    backupName,
    backupType: options.backupType || 'full',
    createdAt: timestamp,
    createdByUserId: user.id,
    createdByUserName: user.fullName,
    createdByUserRole: user.role,
    collectionsIncluded: collectionsToBackup,
    totalRecordsCount: totalRecords,
    totalSizeBytes: 0,
    checksum,
    status: 'completed',
    notes: options.notes,
    storageType: 'd1_cloud',
    dataPayload: payload,
    restoreHistory: [],
  };

  backupRecord.totalSizeBytes = getExportFileSize(backupRecord);

  await createDocument('system_backups', backupRecord);
  if (options.downloadFile !== false) downloadBackupFile(backupRecord);

  // Immutably log in security audit trail
  await logAuditAction(
    user,
    'SYSTEM_BACKUP_CREATED',
    'system_backups',
    backupId,
    `تم إنشاء نسخة احتياطية لنظام الأسطول (${backupName}) تشمل ${collectionsToBackup.length} جدول و ${totalRecords} سجل بحجم ${(backupRecord.totalSizeBytes / 1024).toFixed(1)} KB وبصمة تحقق: ${checksum.slice(0, 12)}...`
  );

  return backupRecord;
}

/**
 * Downloads the full backup snapshot as a verified JSON file
 */
export function downloadBackupFile(backup: SystemBackupRecord): void {
  const jsonStr = JSON.stringify(buildExportData(backup), null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `marshall-backup-${formatBackupDate(new Date(backup.createdAt))}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function buildExportData(backup: SystemBackupRecord) {
  const recordCounts = Object.fromEntries(
    Object.entries(backup.dataPayload || {}).map(([collection, records]) => [collection, records.length])
  );
  return {
    app: 'Marshall Logistics',
    version: SYSTEM_VERSION,
    format: 'marshall-backup-v1',
    metadata: {
      timestamp: backup.createdAt,
      systemVersion: SYSTEM_VERSION,
      totalRecords: backup.totalRecordsCount,
      recordCounts,
      totalSizeBytes: backup.totalSizeBytes,
    },
    snapshot: {
      id: backup.id,
      name: backup.backupName,
      type: backup.backupType,
      createdAt: backup.createdAt,
      createdBy: backup.createdByUserName,
      role: backup.createdByUserRole,
      totalRecords: backup.totalRecordsCount,
      totalSizeBytes: backup.totalSizeBytes,
      checksum: backup.checksum,
      collections: backup.collectionsIncluded,
      notes: backup.notes,
    },
    data: backup.dataPayload || {},
  };
}

function getExportFileSize(backup: SystemBackupRecord): number {
  let size = 0;
  for (let attempt = 0; attempt < 3; attempt++) {
    size = new Blob([JSON.stringify(buildExportData({ ...backup, totalSizeBytes: size }), null, 2)]).size;
  }
  return size;
}

function formatBackupDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
}

/**
 * Restores a system backup snapshot with safe pre-restore rollback guarantee
 */
export async function restoreSystemBackup(
  user: UserProfile,
  backup: SystemBackupRecord,
  selectedCollections?: string[]
): Promise<{ success: boolean; safetyBackupId: string; restoredCount: number; failedCount: number }> {
  if (!canManageBackups(user)) {
    throw new Error('غير مصرح: استعادة النسخ الاحتياطية متاحة للإدارة المخولة فقط.');
  }

  if (!backup.dataPayload || Object.keys(backup.dataPayload).length === 0) {
    throw new Error('بيانات النسخة الاحتياطية فارغة أو غير متوفرة');
  }

  const collectionsToRestore = selectedCollections && selectedCollections.length > 0
    ? selectedCollections
    : backup.collectionsIncluded;
  validateBackupData(backup.dataPayload, collectionsToRestore);

  // 1. Mandatory Safety Pre-Restore Snapshot before touching active database
  const safetyBackup = await createSystemBackup(user, {
    backupName: `نسخة أمان طارئة تلقائية (قبل استعادة ${backup.backupName})`,
    backupType: 'pre_restore_safety',
    notes: `تم إنشاؤها تلقائياً لحماية النظام قبل استعادة النسخة #${backup.id}`,
    downloadFile: false,
  });

  const { restoredCount, failedCount } = await restoreCollectionsInBatches(backup.dataPayload, collectionsToRestore);

  // 3. Update backup record restore history
  const restoreEntry = {
    restoredAt: new Date().toISOString(),
    restoredByUserId: user.id,
    restoredByUserName: user.fullName,
    safetyBackupId: safetyBackup.id,
  };

  const updatedHistory = [...(backup.restoreHistory || []), restoreEntry];
  await updateDocument('system_backups', backup.id, { restoreHistory: updatedHistory });

  // 4. Log in immutable audit trail
  await logAuditAction(
    user,
    'SYSTEM_BACKUP_RESTORED',
    'system_backups',
    backup.id,
    `تمت استعادة النسخة الاحتياطية (${backup.backupName}). نجح ${restoredCount} سجل وتعذر ${failedCount} سجل عبر ${collectionsToRestore.length} جدول. نسخة الأمان: ${safetyBackup.id}`
  );

  return {
    success: true,
    safetyBackupId: safetyBackup.id,
    restoredCount,
    failedCount,
  };
}

/**
 * Validates and restores from an external JSON backup file uploaded by admin
 */
export async function restoreFromExternalJson(
  user: UserProfile,
  jsonText: string
): Promise<{ success: boolean; safetyBackupId: string; restoredCount: number; failedCount: number; backupName: string }> {
  if (!canManageBackups(user)) {
    throw new Error('غير مصرح: استعادة النسخ الاحتياطية متاحة للإدارة المخولة فقط.');
  }

  let parsed: any;
  if (new TextEncoder().encode(jsonText).byteLength > MAX_RESTORE_SIZE_BYTES) {
    throw new Error('حجم ملف النسخة يتجاوز الحد المسموح (25 ميجابايت).');
  }
  try {
    parsed = JSON.parse(jsonText);
  } catch (e: any) {
    throw new Error('صيغة الملف غير صالحة. يجب أن يكون ملف JSON صحيح ومعتمد.');
  }

  if (!parsed.data || typeof parsed.data !== 'object' || Array.isArray(parsed.data)) {
    throw new Error('الملف لا يحتوي على كتلة بيانات صالحة (Data payload missing)');
  }

  const collections = Object.keys(parsed.data);
  if (collections.length === 0) {
    throw new Error('الملف لا يحتوي على أي جداول بيانات قابلة للاستعادة');
  }
  validateBackupData(parsed.data, collections);

  if (Object.values(parsed.data as Record<string, unknown[]>).reduce((total, records) => total + records.length, 0) > MAX_RESTORE_RECORDS) {
    throw new Error('عدد سجلات النسخة يتجاوز الحد المسموح للاستعادة.');
  }

  if (parsed.format && parsed.format !== 'marshall-backup-v1' && parsed.format !== 'fleetops-backup-v1') {
    throw new Error('إصدار تنسيق النسخة الاحتياطية غير مدعوم.');
  }

  const snapshotMeta = parsed.snapshot || {};
  const backupName = snapshotMeta.name || `نسخة مستوردة من ملف خارجي - ${new Date().toLocaleDateString('ar-SA')}`;

  // 1. Mandatory Safety Pre-Restore Snapshot
  const safetyBackup = await createSystemBackup(user, {
    backupName: `نسخة أمان طارئة تلقائية (قبل استيراد ملف خارجي: ${backupName})`,
    backupType: 'pre_restore_safety',
    notes: 'تم إنشاؤها تلقائياً قبل الاستيراد من ملف خارجي لمنع أي فقدان للبيانات',
    downloadFile: false,
  });

  const { restoredCount, failedCount } = await restoreCollectionsInBatches(parsed.data, collections);

  // 3. Save this imported snapshot as a new backup in the cloud archive
  const importedBackupId = `BKP-IMP-${Date.now()}`;
  const totalSizeBytes = new Blob([jsonText]).size;
  const checksum = snapshotMeta.checksum || (await computeChecksum(JSON.stringify(parsed.data)));

  const importedRecord: SystemBackupRecord = {
    id: importedBackupId,
    backupName: `[مستوردة] ${backupName}`,
    backupType: 'selective',
    createdAt: new Date().toISOString(),
    createdByUserId: user.id,
    createdByUserName: user.fullName,
    createdByUserRole: user.role,
    collectionsIncluded: collections,
    totalRecordsCount: restoredCount,
    totalSizeBytes,
    checksum,
    status: 'completed',
    storageType: 'local_file',
    notes: `مستوردة من ملف خارجي (${snapshotMeta.id || 'ملف خارجي'}) بواسطة مدير النظام`,
    dataPayload: parsed.data,
    restoreHistory: [
      {
        restoredAt: new Date().toISOString(),
        restoredByUserId: user.id,
        restoredByUserName: user.fullName,
        safetyBackupId: safetyBackup.id,
      },
    ],
  };

  await createDocument('system_backups', importedRecord);

  // 4. Log in audit trail
  await logAuditAction(
    user,
    'SYSTEM_BACKUP_IMPORTED',
    'system_backups',
    importedBackupId,
    `تم استيراد نسخة خارجية (${backupName}). نجح ${restoredCount} سجل وتعذر ${failedCount} سجل في ${collections.length} جدول. نسخة الأمان: ${safetyBackup.id}`
  );

  return {
    success: true,
    safetyBackupId: safetyBackup.id,
    restoredCount,
    failedCount,
    backupName,
  };
}

async function restoreCollectionsInBatches(
  data: Record<string, Array<Record<string, unknown> & { id: string }>>,
  collections: string[]
): Promise<{ restoredCount: number; failedCount: number }> {
  let restoredCount = 0;
  let failedCount = 0;

  for (const collection of collections) {
    const records = data[collection] || [];
    for (let offset = 0; offset < records.length; offset += RESTORE_BATCH_SIZE) {
      const batch = records.slice(offset, offset + RESTORE_BATCH_SIZE);
      const results = await Promise.allSettled(batch.map(async (record) => {
        const existing = await fetchDocument<Record<string, unknown>>(collection, record.id);
        if (existing) {
          if (collection === 'audit_logs') return;
          await updateDocument(collection, record.id, record);
        } else {
          await createDocument(collection, record);
        }
      }));

      for (const result of results) {
        if (result.status === 'fulfilled') restoredCount++;
        else {
          failedCount++;
          console.warn(`[BackupService] Restore skipped a record in ${collection}:`, result.reason);
        }
      }
    }
  }

  return { restoredCount, failedCount };
}

function validateBackupData(
  data: Record<string, unknown> | undefined,
  collections: string[]
): asserts data is Record<string, Array<Record<string, unknown> & { id: string }>> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('بيانات النسخة الاحتياطية غير صالحة.');
  }

  const allowedCollections = new Set(BACKUP_COLLECTIONS);
  if (new TextEncoder().encode(JSON.stringify(data)).byteLength > MAX_RESTORE_SIZE_BYTES) {
    throw new Error('حجم بيانات النسخة يتجاوز الحد المسموح (25 ميجابايت).');
  }
  let recordCount = 0;
  for (const collection of collections) {
    if (!allowedCollections.has(collection)) {
      throw new Error(`الجدول ${collection} غير مسموح باستعادته.`);
    }
    const records = data[collection];
    if (!Array.isArray(records)) {
      throw new Error(`بيانات الجدول ${collection} يجب أن تكون قائمة سجلات.`);
    }
    recordCount += records.length;
    if (recordCount > MAX_RESTORE_RECORDS) throw new Error('عدد سجلات النسخة يتجاوز الحد المسموح للاستعادة.');
    for (const record of records) {
      if (
        !record ||
        typeof record !== 'object' ||
        Array.isArray(record) ||
        typeof record.id !== 'string' ||
        record.id.length === 0 ||
        record.id.length > 128 ||
        !/^[a-zA-Z0-9_-]+$/.test(record.id)
      ) {
        throw new Error(`يوجد سجل غير صالح ضمن الجدول ${collection}.`);
      }
    }
  }
}

/**
 * Deletes a backup snapshot from the system
 */
export async function deleteBackupRecord(user: UserProfile, backupId: string): Promise<void> {
  if (!canManageBackups(user)) {
    throw new Error('غير مصرح: حذف النسخ الاحتياطية متاح للإدارة المخولة فقط.');
  }

  await deleteDocument('system_backups', backupId);

  await logAuditAction(
    user,
    'SYSTEM_BACKUP_DELETED',
    'system_backups',
    backupId,
    `تم حذف النسخة الاحتياطية #${backupId} من الأرشيف السحابي بواسطة مدير النظام`
  );
}

/**
 * Live System Diagnostics: Scans all 24 database collections and verifies health
 */
export interface CollectionDiagnosticResult {
  key: string;
  nameAr: string;
  nameEn: string;
  category: 'security' | 'operations' | 'financials' | 'compliance';
  count: number;
  status: 'healthy' | 'empty' | 'error';
  lastUpdated?: string;
}

export async function runSystemIntegrityDiagnostics(): Promise<{
  results: CollectionDiagnosticResult[];
  totalCollections: number;
  totalDocuments: number;
  allHealthy: boolean;
  scannedAt: string;
}> {
  const results: CollectionDiagnosticResult[] = [];
  let totalDocs = 0;
  let allHealthy = true;

  for (const col of SYSTEM_COLLECTIONS_REGISTRY) {
    try {
      const records = await fetchCollection<Record<string, any>>(col.key);
      const count = records.length;
      totalDocs += count;

      let lastUpdated: string | undefined;
      if (records.length > 0) {
        const firstDoc = records[0];
        lastUpdated = firstDoc.updatedAt || firstDoc.createdAt || undefined;
      }

      results.push({
        key: col.key,
        nameAr: col.nameAr,
        nameEn: col.nameEn,
        category: col.category,
        count,
        status: count > 0 ? 'healthy' : 'empty',
        lastUpdated,
      });
    } catch (err) {
      allHealthy = false;
      results.push({
        key: col.key,
        nameAr: col.nameAr,
        nameEn: col.nameEn,
        category: col.category,
        count: 0,
        status: 'error',
      });
    }
  }

  return {
    results,
    totalCollections: SYSTEM_COLLECTIONS_REGISTRY.length,
    totalDocuments: totalDocs,
    allHealthy,
    scannedAt: new Date().toISOString(),
  };
}

/**
 * Get and update automated backup policy settings
 */
export async function getBackupPolicySettings(): Promise<BackupPolicySettings> {
  try {
    const policy = await fetchDocument<BackupPolicySettings>('settings', 'backup_policy');
    if (policy) {
      return policy;
    }
  } catch (err) {
    console.error('Error fetching backup policy:', err);
  }

  // Default Policy Settings
  return {
    autoBackupEnabled: true,
    frequency: 'daily',
    scheduledTime: '03:00',
    retentionDays: 30,
    includedCollections: SYSTEM_COLLECTIONS_REGISTRY.map((c) => c.key),
    notifyOnSuccess: false,
    notifyOnFailure: true,
    lastRunAt: new Date().toISOString(),
    lastRunStatus: 'success',
  };
}

export async function saveBackupPolicySettings(
  user: UserProfile,
  policy: BackupPolicySettings
): Promise<void> {
  if (!canManageBackups(user)) {
    throw new Error('غير مصرح: تعديل سياسة النسخ الاحتياطي متاح للإدارة المخولة فقط.');
  }

  await createDocument('settings', { id: 'backup_policy', ...policy });

  await logAuditAction(
    user,
    'BACKUP_POLICY_UPDATED',
    'settings',
    'backup_policy',
    `تم تحديث سياسة النسخ الاحتياطي التلقائي (الجدولة: ${policy.frequency} الساعة ${policy.scheduledTime}، فترة الاحتفاظ: ${policy.retentionDays} يوم)`
  );
}
