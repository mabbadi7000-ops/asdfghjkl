import React, { useState, useRef } from 'react';
import { Modal } from './Modal';
import { DocumentRecord, DocumentType, DocumentOwnerType } from '../../types';
import { appendSessionToken, createDocument, updateDocument } from '../../services/dataService';
import { logAuditAction } from '../../services/auditService';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { isImageData, uploadFileToR2 } from '../../utils/fileUtils';
import {
  Upload,
  Image,
  FileText,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Eye,
  Link,
  ShieldCheck,
  Camera,
} from 'lucide-react';

interface DocumentUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  ownerType: DocumentOwnerType;
  ownerId: string;
  ownerName: string;
  defaultDocType?: DocumentType;
  onSuccess?: (newDoc: DocumentRecord) => void;
}

export const DocumentUploaderModal: React.FC<DocumentUploaderModalProps> = ({
  isOpen,
  onClose,
  ownerType,
  ownerId,
  ownerName,
  defaultDocType,
  onSuccess,
}) => {
  const { currentUser } = useAuth();
  const { t, language } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState<DocumentType>(
    defaultDocType || (ownerType === 'driver' ? 'iqama' : 'istemara')
  );
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [expiryDate, setExpiryDate] = useState(
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [fileUrl, setFileUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError(language === 'ar' ? 'حجم الملف يتجاوز 5 ميجابايت' : 'File size exceeds 5MB');
      e.target.value = '';
      return;
    }

    try {
      setUploading(true);
      const uploadedFile = await uploadFileToR2(file);
      setFileUrl(uploadedFile.fileUrl);
      setError('');
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'File upload failed.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError(language === 'ar' ? 'يرجى إدخال عنوان المستند' : 'Please provide document title');
      return;
    }

    if (!fileUrl) {
      setError(
        language === 'ar'
          ? 'يرجى تحميل ملف أو اختيار صورة للمستند'
          : 'Please upload a file or provide document image'
      );
      return;
    }

    try {
      setLoading(true);

      const docPayload: Omit<DocumentRecord, 'id'> = {
        title: title.trim(),
        docType,
        ownerType,
        ownerId,
        fileUrl,
        issueDate,
        expiryDate,
        uploadedById: currentUser?.id || 'system',
        department: ownerType === 'driver' ? 'إدارة السائقين' : 'إدارة الأسطول والحركة',
        notes: notes.trim(),
        createdAt: new Date().toISOString(),
      };

      const docId = await createDocument<Omit<DocumentRecord, 'id'>>('documents', docPayload);

      // Interconnection: sync primary photos & expiry dates to the driver/vehicle records directly
      if (ownerType === 'driver') {
        const driverUpdates: any = { updatedAt: new Date().toISOString() };
        if (docType === 'personal_photo') {
          driverUpdates.photoUrl = fileUrl;
        } else if (docType === 'iqama') {
          driverUpdates.iqamaDocUrl = fileUrl;
          if (expiryDate) driverUpdates.iqamaExpiryDate = expiryDate;
        } else if (docType === 'driver_license') {
          driverUpdates.licenseDocUrl = fileUrl;
          if (expiryDate) driverUpdates.licenseExpiryDate = expiryDate;
        } else if (docType === 'medical_check') {
          driverUpdates.medicalDocUrl = fileUrl;
        } else if (docType === 'contract') {
          driverUpdates.contractDocUrl = fileUrl;
        } else if (docType === 'driver_card') {
          driverUpdates.driverCardDocUrl = fileUrl;
        } else if (docType === 'operation_card') {
          driverUpdates.operationCardDocUrl = fileUrl;
        }
        await updateDocument('drivers', ownerId, driverUpdates);
      } else if (ownerType === 'vehicle') {
        const vehicleUpdates: any = { updatedAt: new Date().toISOString() };
        if (docType === 'vehicle_photo') {
          vehicleUpdates.photoUrl = fileUrl;
        } else if (docType === 'istemara') {
          vehicleUpdates.istemaraDocUrl = fileUrl;
          if (expiryDate) vehicleUpdates.istemaraExpiryDate = expiryDate;
        } else if (docType === 'insurance') {
          vehicleUpdates.insuranceDocUrl = fileUrl;
          if (expiryDate) vehicleUpdates.insuranceExpiryDate = expiryDate;
        } else if (docType === 'vehicle_check') {
          vehicleUpdates.mvpiDocUrl = fileUrl;
        } else if (docType === 'operation_card') {
          vehicleUpdates.operationCardDocUrl = fileUrl;
        }
        await updateDocument('vehicles', ownerId, vehicleUpdates);
      }

      await logAuditAction(
        currentUser,
        'UPLOAD_DOCUMENT',
        'documents',
        docId,
        `أرشفة وربط مستند جديد (${title}) للمنشأة (${ownerName})`
      );

      if (onSuccess) {
        onSuccess({ id: docId, ...docPayload });
      }

      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'حدث خطأ أثناء أرشفة المستند');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        ownerType === 'driver'
          ? `إضافة مستند أو صورة للكابتن: ${ownerName}`
          : `إضافة مستند أو صورة للمركبة: ${ownerName}`
      }
      subtitle="ربط الوثائق والصور الرسمية بأرشيف النظام وقاعدة البيانات السحابية"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}



        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              عنوان المستند / الصورة *
            </label>
            <input
              type="text"
              required
              placeholder="مثال: رخصة قيادة - 2026"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              تصنيف ونوع المستند *
            </label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as DocumentType)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden cursor-pointer"
            >
              {ownerType === 'driver' ? (
                <>
                  <option value="personal_photo">صورة شخصية للكابتن (Photo)</option>
                  <option value="iqama">بطاقة الإقامة / الهوية (Iqama)</option>
                  <option value="driver_license">رخصة القيادة (Driving License)</option>
                  <option value="driver_card">كرت السائق (Driver Card - TGA)</option>
                  <option value="operation_card">كرت التشغيل للمندوب (Operation Card)</option>
                  <option value="medical_check">الكشف الطبي المعتمد (Medical)</option>
                  <option value="contract">عقد العمل والاتفاقية (Contract)</option>
                  <option value="other">مستند إضافي آخر (Custom Document)</option>
                </>
              ) : ownerType === 'financial' ? (
                <>
                  <option value="platform_revenue_statement">كشف إيرادات منصة التوصيل (Platform Revenue Statement)</option>
                  <option value="tax_invoice">فاتورة ضريبية رسمية (Tax Invoice)</option>
                  <option value="settlement_receipt">سند تصفية مالية / إيداع كاش (Settlement Receipt)</option>
                  <option value="bank_statement">كشف حساب بنكي (Bank Statement)</option>
                  <option value="invoice">فاتورة تشغيلية (Operating Invoice)</option>
                  <option value="other">وثيقة مالية أخرى (Other Financial)</option>
                </>
              ) : ownerType === 'company' ? (
                <>
                  <option value="commercial_register">السجل التجاري للشركة (CR)</option>
                  <option value="company_registration">شهادة ضريبة القيمة المضافة / الزكاة (VAT / Zakat)</option>
                  <option value="contract">عقد تشغيل منصة / اتفاقية رئيسية (Platform Agreement)</option>
                  <option value="operation_card">ترخيص هيئة النقل للمنشأة (TGA Facility License)</option>
                  <option value="other">وثيقة رسمية للشركة (Company Document)</option>
                </>
              ) : (
                <>
                  <option value="vehicle_photo">صورة المركبة (Vehicle Photo)</option>
                  <option value="istemara">رخصة السير / الاستمارة (Istemara)</option>
                  <option value="insurance">وثيقة التأمين (Insurance)</option>
                  <option value="vehicle_check">شهادة الفحص الدوري (MVPI)</option>
                  <option value="operation_card">بطاقة التشغيل من هيئة النقل (TGA)</option>
                  <option value="contract">عقد الملكية / التأجير (Contract)</option>
                  <option value="other">مستند فني آخر (Other)</option>
                </>
              )}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              تاريخ الإصدار / السريان
            </label>
            <input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              تاريخ الانتهاء (للتنبيهات التلقائية)
            </label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white outline-hidden"
            />
          </div>
        </div>

        {/* File Upload Zone */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-700">
            ملف الوثيقة أو الصورة *
          </label>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,application/pdf"
            onChange={handleFileUpload}
            className="hidden"
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-2xl p-4 text-center cursor-pointer transition-all bg-slate-50 hover:bg-emerald-50/20"
          >
            <div className="w-10 h-10 rounded-xl bg-white shadow-xs border border-slate-200 flex items-center justify-center mx-auto text-emerald-600 mb-2">
              <Upload className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-800">
              انقر لتحميل ملف من جهازك (صورة أو PDF)
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              يدعم صور JPG, PNG أو ملفات PDF حتى 5 ميجابايت
            </p>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <span className="text-[11px] text-slate-400">أو رابط مباشر:</span>
            <div className="relative flex-1">
              <Link className="w-3.5 h-3.5 absolute top-1/2 -translate-y-1/2 start-2.5 text-slate-400" />
              <input
                type="url"
                placeholder="https://..."
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                className="w-full ps-8 pe-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Live Preview if available */}
        {fileUrl && (
          <div className="p-3 bg-slate-100 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-12 h-12 rounded-lg bg-white overflow-hidden border border-slate-200 shrink-0 flex items-center justify-center">
                {isImageData(fileUrl) ? (
                  <img src={appendSessionToken(fileUrl)} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <FileText className="w-6 h-6 text-slate-500" />
                )}
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 block truncate max-w-xs">
                  {title || 'معاينة المستند المرفق'}
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  تم تجهيز الملف للأرشفة
                </span>
              </div>
            </div>

            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors flex items-center gap-1 shrink-0"
            >
              <Eye className="w-3.5 h-3.5 text-slate-500" />
              <span>معاينة</span>
            </a>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            ملاحظات وتفاصيل إضافية
          </label>
          <input
            type="text"
            placeholder="مثال: تم تدقيق الأصل ومطابقته بواسطة إدارة العمليات..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={loading || uploading}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{uploading ? t('loading') : loading ? t('loading') : 'حفظ وأرشفة المستند'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
