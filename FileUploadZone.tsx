import React, { useRef, useState } from 'react';
import { Upload, X, FileText, Image as ImageIcon, CheckCircle2, Loader2 } from 'lucide-react';
import { formatBytes, isImageData, uploadFileToR2 } from '../../utils/fileUtils';
import { appendSessionToken } from '../../services/dataService';
import { useLanguage } from '../../context/LanguageContext';

interface FileUploadZoneProps {
  label?: string;
  sublabel?: string;
  value?: string;
  onChange: (fileUrl: string, fileName?: string) => void;
  accept?: string;
  maxSizeMB?: number;
  previewHeight?: string;
  isImageOnly?: boolean;
  asDataUrl?: boolean;
}

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  label,
  sublabel,
  value,
  onChange,
  accept = 'image/png,image/jpeg,image/webp,application/pdf',
  maxSizeMB = 5,
  previewHeight = 'h-36',
  isImageOnly = false,
  asDataUrl = false,
}) => {
  const { tx } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const [localPreview, setLocalPreview] = useState<string>('');

  const defaultSublabel = tx(
    'اسحب الملف هنا أو انقر للاختيار (PNG, JPG, PDF بحد أقصى 5 م.ب)',
    'Drag & drop file here or click to browse (PNG, JPG, PDF up to 5MB)'
  );

  const handleProcessFile = async (file: File) => {
    setError('');
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(
        tx(
          `حجم الملف كبير جداً. الحد الأقصى المسموح به هو ${maxSizeMB} ميجابايت.`,
          `File is too large. Maximum allowed size is ${maxSizeMB} MB.`
        )
      );
      return;
    }

    try {
      setIsProcessing(true);
      setFileName(file.name);
      setFileSize(file.size);

      if (asDataUrl) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
          reader.onerror = () => reject(reader.error || new Error('تعذر قراءة الملف'));
          reader.readAsDataURL(file);
        });
        onChange(dataUrl, file.name);
        setLocalPreview('');
        return;
      }

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => setLocalPreview(typeof reader.result === 'string' ? reader.result : '');
        reader.readAsDataURL(file);
      }

      const uploadedFile = await uploadFileToR2(file);
      onChange(uploadedFile.fileUrl, file.name);
      setLocalPreview('');
    } catch (err: any) {
      setLocalPreview('');
      console.error('File process error:', err);
      setError(err instanceof Error ? err.message : tx(
        'حدث خطأ أثناء معالجة الملف. يرجى تجربة ملف آخر.',
        'An error occurred while processing the file. Please try another file.'
      ));
    } finally {
      setIsProcessing(false);
    }
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleProcessFile(files[0]);
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setLocalPreview('');
    setFileName('');
    setFileSize(0);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const displayValue = value || localPreview;
  const hasImagePreview = displayValue && isImageData(displayValue);

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-xs font-semibold text-slate-700">
          {label}
        </label>
      )}

      {displayValue ? (
        <div className={`relative rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 p-2 group transition-all hover:border-slate-300 ${previewHeight}`}>
          {hasImagePreview ? (
            <div className="w-full h-full flex items-center justify-center relative bg-slate-900/5 rounded-xl overflow-hidden">
              <img
                src={appendSessionToken(displayValue)}
                alt={tx('معاينة الملف المرفوع', 'Uploaded File Preview')}
                className="w-full h-full object-contain"
              />
              <div className="absolute bottom-2 start-2 bg-slate-900/80 backdrop-blur-xs text-white px-2.5 py-1 rounded-lg text-[10px] font-medium flex items-center gap-1.5 shadow-xs">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>{tx('تم إرفاق الصورة بنجاح', 'Photo attached successfully')}</span>
                {fileSize > 0 && <span className="opacity-75 font-mono">({formatBytes(fileSize)})</span>}
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 rounded-xl text-slate-700 p-4">
              <FileText className="w-8 h-8 text-emerald-600 mb-1" />
              <span className="text-xs font-bold text-slate-900 line-clamp-1">{fileName || tx('وثيقة ممسوحة ضوئياً (PDF/Doc)', 'Scanned Document (PDF/Doc)')}</span>
              <span className="text-[10px] text-slate-500 mt-0.5">{tx('جاهز للأرشفة والربط بالمنظومة', 'Ready for archiving & cloud sync')}</span>
            </div>
          )}

          {/* Action buttons on hover */}
          <div className="absolute top-3 end-3 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 bg-white/90 hover:bg-white text-slate-700 rounded-lg shadow-sm border border-slate-200 text-xs font-medium cursor-pointer transition-transform active:scale-95"
              title={tx('تغيير الملف', 'Change File')}
            >
              {tx('تغيير', 'Change')}
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg shadow-sm text-xs cursor-pointer transition-transform active:scale-95"
              title={tx('حذف الملف', 'Delete File')}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
            isDragging
              ? 'border-emerald-500 bg-emerald-50/50 scale-[0.99]'
              : 'border-slate-300 hover:border-slate-400 bg-slate-50/60 hover:bg-slate-50'
          } ${previewHeight}`}
        >
          {isProcessing ? (
            <div className="flex flex-col items-center justify-center text-slate-600">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mb-2" />
              <span className="text-xs font-bold">{tx('جاري ضغط ومعالجة الملف...', 'Compressing and processing file...')}</span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 mb-2 shadow-xs group-hover:scale-105 transition-transform">
                {isImageOnly ? <ImageIcon className="w-5 h-5 text-slate-500" /> : <Upload className="w-5 h-5 text-slate-500" />}
              </div>
              <p className="text-xs font-bold text-slate-800">
                {tx('انقر للاختيار أو اسحب المستند هنا', 'Click to upload or drag and drop file here')}
              </p>
              <p className="text-[10px] text-slate-400 mt-1 max-w-xs leading-relaxed">
                {sublabel || defaultSublabel}
              </p>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-[11px] text-rose-600 font-semibold mt-1">
          {error}
        </p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={onFileSelect}
        className="hidden"
      />
    </div>
  );
};
