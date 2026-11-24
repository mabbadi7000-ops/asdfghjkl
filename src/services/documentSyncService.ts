import { createDocument, updateDocument, fetchCollection } from './dataService';
import { Driver, Vehicle, DocumentRecord, DocumentType } from '../types';

export async function syncDocument(input: {
  entityType: 'settlement' | 'payroll' | 'advance' | 'leave';
  entityId: string;
  title: string;
  fileUrl?: string;
  category: string;
}, uploadedById = 'sys'): Promise<void> {
  if (!input.fileUrl) return;

  const existing = await fetchCollection<DocumentRecord>('documents', { entityId: input.entityId });
  const matchingDocument = existing.find((document) => document.entityType === input.entityType);
  const now = new Date().toISOString();
  const documentData: Partial<DocumentRecord> = {
    title: input.title,
    fileUrl: input.fileUrl,
    category: input.entityType === 'leave' ? input.category : 'financial',
    ownerType: input.entityType === 'leave' ? 'leave' : 'financial',
    ownerId: input.entityId,
    entityType: input.entityType,
    entityId: input.entityId,
    docType: input.entityType === 'settlement'
      ? 'settlement_receipt'
      : input.entityType === 'advance'
        ? 'advance_receipt'
        : input.entityType === 'payroll'
          ? 'payroll_receipt'
          : 'other',
    fileName: input.entityType === 'settlement'
      ? `receipt-${input.entityId}.jpg`
      : input.entityType === 'leave'
        ? `leave-attachment-${input.entityId}`
        : `transfer-slip-${input.entityId}.pdf`,
    fileType: input.entityType === 'settlement'
      ? 'image/jpeg'
      : input.entityType === 'leave'
        ? 'application/octet-stream'
        : 'application/pdf',
    uploadedAt: now,
    department: input.entityType === 'leave' ? 'إدارة شؤون الموظفين' : 'الإدارة المالية',
  };

  if (matchingDocument) {
    await updateDocument<DocumentRecord>('documents', matchingDocument.id, documentData);
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('documents-archive-updated'));
    return;
  }

  await createDocument<DocumentRecord>('documents', {
    ...documentData,
    id: `doc-${input.entityType}-${input.entityId}`,
    issueDate: new Date().toISOString().slice(0, 10),
    uploadedById,
    createdAt: now,
  } as DocumentRecord);
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('documents-archive-updated'));
}

export async function syncDriverDocuments(
  driverId: string,
  driverData: Partial<Driver>,
  uploadedById = 'sys'
) {
  try {
    const docItems: Array<{
      type: DocumentType;
      url?: string;
      title: string;
      expiry?: string;
    }> = [
      {
        type: 'iqama',
        url: driverData.iqamaDocUrl,
        title: `هوية السائق: ${driverData.fullName || 'كابتن'}`,
        expiry: driverData.iqamaExpiryDate,
      },
      {
        type: 'driver_license',
        url: driverData.licenseDocUrl,
        title: `رخصة قيادة: ${driverData.fullName || 'كابتن'}`,
        expiry: driverData.licenseExpiryDate,
      },
      {
        type: 'medical_check',
        url: driverData.medicalDocUrl,
        title: `فحص طبي: ${driverData.fullName || 'كابتن'}`,
        expiry: '',
      },
      {
        type: 'contract',
        url: driverData.contractDocUrl,
        title: `عقد عمل: ${driverData.fullName || 'كابتن'}`,
        expiry: '',
      },
      {
        type: 'personal_photo',
        url: driverData.photoUrl,
        title: `صورة شخصية: ${driverData.fullName || 'كابتن'}`,
        expiry: '',
      },
      {
        type: 'driver_card',
        url: driverData.driverCardDocUrl,
        title: `بطاقة سائق (الهيئة): ${driverData.fullName || 'كابتن'}`,
        expiry: '',
      },
      {
        type: 'operation_card',
        url: driverData.operationCardDocUrl,
        title: `بطاقة تشغيل: ${driverData.fullName || 'كابتن'}`,
        expiry: '',
      },
    ];

    const existingDocs = await fetchCollection<DocumentRecord>('documents', { ownerId: driverId });

    for (const item of docItems) {
      if (!item.url) continue;
      const existing = existingDocs.find((d) => d.docType === item.type);
      if (existing) {
        await updateDocument<DocumentRecord>('documents', existing.id, {
          title: item.title,
          fileUrl: item.url,
          entityType: 'driver',
          entityId: driverId,
          expiryDate: item.expiry || existing.expiryDate,
          department: 'العمليات الميدانية',
        });
      } else {
        await createDocument<Omit<DocumentRecord, 'id'>>('documents', {
          title: item.title,
          docType: item.type,
          ownerType: 'driver',
          ownerId: driverId,
          entityType: 'driver',
          entityId: driverId,
          fileUrl: item.url,
          issueDate: new Date().toISOString().slice(0, 10),
          expiryDate: item.expiry || '',
          uploadedById,
          department: 'العمليات الميدانية',
          notes: `مزامنة ملف كابتن (${driverData.fullName})`,
        });
      }
    }
  } catch (error) {
    console.error('[syncDriverDocuments] Failed to sync driver documents:', error);
    throw error;
  }
}

export async function syncVehicleDocuments(
  vehicleId: string,
  vehicleData: Partial<Vehicle>,
  uploadedById = 'sys'
) {
  try {
    const docItems: Array<{
      type: DocumentType;
      url?: string;
      title: string;
      expiry?: string;
    }> = [
      {
        type: 'istemara',
        url: vehicleData.istemaraDocUrl,
        title: `استمارة مركبة (${vehicleData.plateNumber})`,
        expiry: vehicleData.istemaraExpiryDate,
      },
      {
        type: 'insurance',
        url: vehicleData.insuranceDocUrl,
        title: `وثيقة تأمين (${vehicleData.plateNumber}) - ${vehicleData.insuranceCompany || 'شركة التأمين'}`,
        expiry: vehicleData.insuranceExpiryDate,
      },
      {
        type: 'vehicle_check',
        url: vehicleData.mvpiDocUrl,
        title: `فحص دوري (${vehicleData.plateNumber})`,
        expiry: '',
      },
      {
        type: 'operation_card',
        url: vehicleData.operationCardDocUrl,
        title: `كرت تشغيل (${vehicleData.plateNumber})`,
        expiry: '',
      },
      {
        type: 'vehicle_photo',
        url: vehicleData.photoUrl,
        title: `صورة مركبة (${vehicleData.plateNumber})`,
        expiry: '',
      },
    ];

    const existingDocs = await fetchCollection<DocumentRecord>('documents', { ownerId: vehicleId });

    for (const item of docItems) {
      if (!item.url) continue;
      const existing = existingDocs.find((d) => d.docType === item.type);
      if (existing) {
        await updateDocument<DocumentRecord>('documents', existing.id, {
          title: item.title,
          fileUrl: item.url,
          entityType: 'vehicle',
          entityId: vehicleId,
          expiryDate: item.expiry || existing.expiryDate,
          department: 'إدارة الحركة والأسطول',
          category: 'vehicles',
        });
      } else {
        await createDocument<Omit<DocumentRecord, 'id'>>('documents', {
          title: item.title,
          docType: item.type,
          ownerType: 'vehicle',
          ownerId: vehicleId,
          entityType: 'vehicle',
          entityId: vehicleId,
          fileUrl: item.url,
          issueDate: new Date().toISOString().slice(0, 10),
          expiryDate: item.expiry || '',
          uploadedById,
          department: 'إدارة الحركة والأسطول',
          category: 'vehicles',
          notes: `مزامنة وثائق مركبة (${vehicleData.plateNumber})`,
        });
      }
    }
  } catch (error) {
    console.error('[syncVehicleDocuments] Failed to sync vehicle documents:', error);
    throw error;
  }
}

export async function syncPlatformRevenueDocument(
  statement: {
    id: string;
    statementNumber: string;
    platformName: string;
    month: string;
    fileName: string;
    totalNetRevenue?: number;
    fileUrl?: string;
  },
  uploadedById = 'sys'
) {
  const existing = await fetchCollection<DocumentRecord>('documents', { platformRevenueId: statement.id });
  const title = `فاتورة إيرادات تشغيلية: ${statement.platformName} (${statement.month}) - #${statement.statementNumber}`;
  const now = new Date().toISOString();
  const extension = statement.fileName.split('.').pop()?.toLowerCase();
  const fileType = extension === 'pdf'
    ? 'application/pdf'
    : extension === 'xlsx'
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : extension === 'xls'
        ? 'application/vnd.ms-excel'
        : extension === 'csv'
          ? 'text/csv'
          : undefined;
  const documentData: Partial<DocumentRecord> = {
    title,
    docType: 'platform_revenue_statement',
    ownerType: 'financial',
    ownerId: statement.id,
    entityType: 'financial',
    entityId: statement.id,
    category: 'financial',
    platformRevenueId: statement.id,
    platformName: statement.platformName,
    amount: statement.totalNetRevenue || 0,
    fileUrl: statement.fileUrl || '',
    fileName: statement.fileName,
    fileType,
    uploadedAt: now,
    issueDate: now.slice(0, 10),
    uploadedById,
    department: 'الإدارة المالية',
    notes: `فاتورة إيرادات تشغيلية: ${statement.fileName} (${statement.statementNumber})`,
  };

  if (existing.length > 0) {
    await updateDocument<DocumentRecord>('documents', existing[0].id, documentData);
  } else {
    await createDocument<DocumentRecord>('documents', {
      ...documentData,
      id: `doc-platform-revenue-${statement.id}`,
      createdAt: now,
    } as DocumentRecord);
  }

  if (typeof window !== 'undefined') window.dispatchEvent(new Event('documents-archive-updated'));
}
