import React, { useState } from 'react';
import {
  X,
  Download,
  Printer,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Calendar,
  User,
  Truck,
  Building,
  FileText,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { Modal } from './Modal';
import { DocumentRecord } from '../../types';
import { isImageData, downloadFile } from '../../utils/fileUtils';
import { appendSessionToken } from '../../services/dataService';

interface DocumentPreviewModalProps {
  document: DocumentRecord | null;
  ownerLabel?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  document: doc,
  ownerLabel,
  isOpen,
  onClose,
}) => {
  const [rotation, setRotation] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(1);

  if (!doc) return null;

  const previewUrl = appendSessionToken(doc.fileUrl || '');
  const isImage = isImageData(doc.fileUrl);
  const now = new Date().getTime();
  const daysDiff = doc.expiryDate
    ? Math.ceil((new Date(doc.expiryDate).getTime() - now) / (1000 * 60 * 60 * 24))
    : 999;

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 2.5));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleDownload = () => {
    if (doc.fileUrl) {
      const ext = isImage ? 'jpg' : 'pdf';
      downloadFile(previewUrl, `${doc.title || 'document'}.${ext}`);
    }
  };

  const handlePrint = () => {
    if (!doc.fileUrl) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    if (isImage) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
          <title>${doc.title}</title>
          <style>
            body { font-family: sans-serif; text-align: center; margin: 20px; }
            img { max-width: 90%; max-height: 80vh; object-fit: contain; }
            h2 { margin-bottom: 8px; color: #1e293b; }
            p { margin-top: 4px; color: #64748b; font-size: 13px; }
          </style>
        </head>
        <body>
          <h2>${doc.title}</h2>
          <p>تاريخ الانتهاء: ${doc.expiryDate || 'غير محدد'} | التبعية: ${ownerLabel || doc.ownerId}</p>
            <img src="${previewUrl}" onload="window.print(); window.close();" />
        </body>
        </html>
      `);
    } else {
      printWindow.location.href = previewUrl;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={doc.title}
      subtitle={`نوع الوثيقة: ${doc.docType.replace('_', ' ')} • التبعية: ${ownerLabel || doc.ownerId}`}
      maxWidth="4xl"
    >
      <div className="space-y-4">
        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
          {/* Status badge */}
          <div className="flex items-center gap-2">
            {daysDiff <= 0 ? (
              <span className="px-2.5 py-1 text-xs font-black rounded-lg bg-rose-600 text-white flex items-center gap-1 shadow-xs">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>منتهي الصلاحية</span>
              </span>
            ) : daysDiff <= 15 ? (
              <span className="px-2.5 py-1 text-xs font-black rounded-lg bg-rose-100 text-rose-800 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>ينتهي قريباً (متبقي {daysDiff} يوم)</span>
              </span>
            ) : daysDiff <= 30 ? (
              <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-100 text-amber-800 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>متبقي {daysDiff} يوم</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-100 text-emerald-800 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>ساري ومطابق</span>
              </span>
            )}

            {doc.expiryDate && (
              <span className="text-xs text-slate-500 font-mono">
                تاريخ الانتهاء: <strong>{doc.expiryDate}</strong>
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5">
            {isImage && (
              <>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  title="تكبير"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  title="تصغير"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleRotate}
                  className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  title="تدوير الصورة"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </>
            )}

            {doc.fileUrl && (
              <>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تحميل الملف</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Preview Viewer Area */}
        <div className="relative min-h-[380px] max-h-[540px] bg-slate-900/5 rounded-2xl border border-slate-200 overflow-hidden flex items-center justify-center p-4">
          {doc.fileUrl ? (
            isImage ? (
              <div className="w-full h-full flex items-center justify-center overflow-auto max-h-[500px]">
                <img
                  src={previewUrl}
                  alt={doc.title}
                  style={{
                    transform: `rotate(${rotation}deg) scale(${zoom})`,
                    transition: 'transform 0.2s ease',
                  }}
                  className="max-h-[460px] max-w-full object-contain rounded-lg shadow-sm"
                />
              </div>
            ) : (
              <iframe
                src={previewUrl}
                title={doc.title}
                className="w-full h-[460px] rounded-lg bg-white"
              />
            )
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-8 text-slate-400">
              <FileText className="w-12 h-12 mb-2 stroke-1" />
              <p className="text-xs font-bold text-slate-600">لا يوجد ملف مرفق لهذه الوثيقة حتى الآن</p>
              <p className="text-[11px] text-slate-400 mt-1">تم تسجيل بيانات المستند النظامية بدون نسخة ممسوحة ضوئياً</p>
            </div>
          )}
        </div>

        {/* Metadata Details Card */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px]">التبعية / المالك</span>
            <span className="font-bold text-slate-800 block truncate">{ownerLabel || doc.ownerId}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">نوع الوثيقة</span>
            <span className="font-bold text-slate-800 capitalize">{doc.docType.replace('_', ' ')}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">تاريخ الإصدار</span>
            <span className="font-mono text-slate-800">{doc.issueDate || '—'}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">القسم المسؤول</span>
            <span className="font-bold text-slate-800">{doc.department || 'إدارة الحركة'}</span>
          </div>
          {doc.notes && (
            <div className="col-span-2 sm:col-span-4 pt-2 border-t border-slate-200/60 mt-1">
              <span className="text-slate-400 block text-[10px]">ملاحظات</span>
              <span className="text-slate-700 text-xs">{doc.notes}</span>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
