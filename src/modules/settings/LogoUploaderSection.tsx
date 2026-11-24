import React, { useState, useRef } from 'react';
import {
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Sparkles,
  Download,
  FileCheck,
  ShieldCheck,
  Eye,
  FileSpreadsheet,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { CompanyProfileSettings, saveSettings } from '../../services/settingsService';
import { BrandLogo } from '../../components/common/BrandLogo';
import { uploadFileToR2 } from '../../utils/fileUtils';
import { BRAND_ASSETS } from '../../utils/brandAssets';

interface LogoUploaderSectionProps {
  settings: CompanyProfileSettings;
  onChange: (updated: Partial<CompanyProfileSettings>) => void;
}

export const LogoUploaderSection: React.FC<LogoUploaderSectionProps> = ({
  settings,
  onChange,
}) => {
  const { tx, t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [uploading, setUploading] = useState(false);
  const [previewTab, setPreviewTab] = useState<'dark' | 'pdf' | 'excel' | 'stamp'>('dark');
  const [assetField, setAssetField] = useState<'logoUrl' | 'darkLogo' | 'stampUrl'>('logoUrl');

  const currentLogo = settings[assetField] || (assetField === 'logoUrl' ? settings.logoBase64 : '') || '';

  const handleFileProcess = async (file: File) => {
    setErrorMsg('');
    setSuccessMsg('');

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setErrorMsg(tx('يرجى اختيار ملف صورة صالح (PNG, JPG, WebP)', 'Please upload a valid image file (PNG, JPG, WebP)'));
      return;
    }

    // Limit to 4MB
    if (file.size > 4 * 1024 * 1024) {
      setErrorMsg(tx('حجم الصورة كبير جداً، يرجى اختيار ملف بحجم أقل من 4 ميجابايت', 'Image is too large, please select an image under 4MB'));
      return;
    }

    try {
      setUploading(true);
      const uploadedFile = await uploadFileToR2(file, 'branding');
      const updates: Partial<CompanyProfileSettings> = {
        [assetField]: uploadedFile.fileUrl,
        ...(assetField === 'logoUrl' ? { logoBase64: '' } : {}),
      };
      await saveSettings(updates);
      onChange(updates);
      setSuccessMsg(tx('تم رفع وحفظ ملف الهوية بنجاح!', 'Branding asset uploaded and saved successfully!'));
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (uploadError) {
      setErrorMsg(uploadError instanceof Error ? uploadError.message : tx('حدث خطأ أثناء رفع الصورة', 'Error uploading image'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileProcess(e.target.files[0]);
    }
  };

  const handleResetToDefault = async () => {
    try {
      const updates: Partial<CompanyProfileSettings> = {
        [assetField]: '',
        ...(assetField === 'logoUrl' ? { logoBase64: '' } : {}),
      };
      await saveSettings(updates);
      onChange(updates);
      setSuccessMsg(tx('تمت استعادة الهوية الافتراضية', 'Restored the default branding asset'));
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (resetError) {
      setErrorMsg(resetError instanceof Error ? resetError.message : tx('تعذر حفظ التغيير', 'Could not save the change'));
    }
  };

  const handleDownloadCurrentLogo = () => {
    if (currentLogo) {
      const a = document.createElement('a');
      a.href = currentLogo;
      a.download = `marshal_logistics_logo_${Date.now()}.png`;
      a.click();
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>{tx('الهوية البصرية وشعار مارشال لوجستيكس (Marshal Brand Logo & Seal)', 'Marshal Visual Identity, Logo & Stamp')}</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {tx(
              'قم برفع وتخصيص شعار الشركة الرسمي، ليتم تطبيقه فوراً في كافة صفحات النظام وقوالب تقارير PDF وسندات القبض وملفات Excel.',
              'Upload custom Marshal logo to be used across all system views, PDF reports, vouchers & Excel exports.'
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {currentLogo ? (
            <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
              <span>{tx('شعار مخصص معتمد', 'Custom Logo Active')}</span>
            </span>
          ) : (
            <span className="px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-bold rounded-full flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
              <span>{tx('الشعار المتجهي الرسمي (Vector Crest)', 'Official Vector Crest')}</span>
            </span>
          )}
        </div>
      </div>

      {/* Messages */}
      {successMsg && (
        <div role="status" className="fixed bottom-4 end-4 z-[100] max-w-md p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-center gap-2 shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Upload Zone & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Drag & Drop Zone (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1">
            {([
              ['logoUrl', tx('الشعار الرئيسي', 'Main logo')],
              ['darkLogo', tx('الشعار الداكن', 'Dark logo')],
              ['stampUrl', tx('الختم', 'Stamp')],
            ] as const).map(([field, label]) => (
              <button
                key={field}
                type="button"
                onClick={() => setAssetField(field)}
                className={`flex-1 rounded-lg px-2 py-2 text-xs font-bold ${assetField === field ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`p-6 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
              dragActive
                ? 'border-amber-500 bg-amber-50/50 scale-[1.01]'
                : 'border-slate-300 hover:border-amber-400 bg-slate-50/60 hover:bg-slate-50'
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-xs">
              <Upload className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-800">
                {tx('اسحب الملف هنا، أو انقر للتصفح', 'Drag & drop a file here, or browse')}
              </p>
              <p className="text-[11px] text-slate-400">
                {tx('يدعم صيغ PNG الشفافة، JPG، WebP (حتى 4MB)', 'Supports transparent PNG, JPG, WebP (up to 4MB)')}
              </p>
            </div>

            <button
              type="button"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors pointer-events-none"
            >
              {uploading ? tx('جارٍ رفع الملف...', 'Uploading...') : tx('اختيار ملف', 'Choose File')}
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {currentLogo && (
              <>
                <button
                  type="button"
                  onClick={handleDownloadCurrentLogo}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>{tx('تنزيل الشعار', 'Download')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetToDefault}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{tx('استعادة الشعار المتجهي', 'Reset to Vector')}</span>
                </button>
              </>
            )}

            {!currentLogo && (
              <div className="w-full text-center p-2.5 bg-amber-50/50 rounded-xl border border-amber-200/60 text-[11px] text-amber-900">
                {tx(
                  'يتم حالياً استخدام الشعار الرسمي لمارشال لوجستيكس بدقة فائقة مع الختم الذهبي.',
                  'Currently using high-precision official Marshal vector crest with gold seal.'
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Live Multi-view Previews (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          {/* Tab Switcher for Preview */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setPreviewTab('dark')}
              className={`flex-1 py-1.5 px-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                previewTab === 'dark'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{tx('الشريط الرئيسي', 'Main Header')}</span>
            </button>

            <button
              type="button"
              onClick={() => setPreviewTab('pdf')}
              className={`flex-1 py-1.5 px-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                previewTab === 'pdf'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{tx('ترويسة تقارير PDF', 'PDF Letterhead')}</span>
            </button>

            <button
              type="button"
              onClick={() => setPreviewTab('excel')}
              className={`flex-1 py-1.5 px-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                previewTab === 'excel'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{tx('ترويسة Excel', 'Excel Export')}</span>
            </button>

            <button
              type="button"
              onClick={() => setPreviewTab('stamp')}
              className={`flex-1 py-1.5 px-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                previewTab === 'stamp'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{tx('الختم الرسمي', 'Official Stamp')}</span>
            </button>
          </div>

          {/* Preview Container */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 min-h-[170px] flex items-center justify-center">
            {/* View 1: Dark Navigation Header */}
            {previewTab === 'dark' && (
              <div className="w-full p-4 bg-slate-900 text-white rounded-xl border border-amber-500/30 flex items-center justify-between shadow-inner">
                <BrandLogo size="md" variant="full" isDark={true} />
                <div className="text-end text-[10px] text-slate-400 font-mono">
                  <div className="text-amber-400 font-bold">MARSHAL CLOUD ERP</div>
                  <div>v2.4 • KSA Logistics</div>
                </div>
              </div>
            )}

            {/* View 2: PDF Official Letterhead */}
            {previewTab === 'pdf' && (
              <div className="relative aspect-[210/297] h-[min(340px,70vw)] overflow-hidden border border-slate-200 bg-white shadow-md">
                <img src={BRAND_ASSETS.letterhead.portrait.header} alt="" className="absolute inset-x-0 top-0 h-auto w-full" />
                <img src={BRAND_ASSETS.letterhead.watermark} alt="" className="absolute left-[19%] top-[32.7%] w-[57.2%]" />
                <div className="absolute inset-x-[12%] top-[24%] text-center text-[10px] font-bold text-slate-500">
                  {tx('معاينة ترويسة الخطابات والمكاتبات الرسمية', 'Official letter and document paper preview')}
                </div>
                <img src={BRAND_ASSETS.letterhead.portrait.footer} alt="" className="absolute inset-x-0 bottom-0 h-auto w-full" />
              </div>
            )}

            {/* View 3: Excel Corporate Header */}
            {previewTab === 'excel' && (
              <div className="w-full rounded-xl overflow-hidden border border-slate-300 font-sans shadow-xs text-start">
                <div className="bg-[#0b132b] text-white p-3 flex items-center justify-between border-b-2 border-amber-500">
                  <div className="flex items-center gap-3">
                    <BrandLogo size="sm" variant="icon" isDark={true} />
                    <div>
                      <h4 className="text-xs font-bold text-amber-400">{settings.companyNameAr || 'شركة مارشال لوجيستيكس'}</h4>
                      <p className="text-[9px] text-slate-300 font-bold">{settings.companyNameEn || 'MARSHAL LOGISTIC LLC'}</p>
                    </div>
                  </div>
                  <div className="text-end text-[9px] text-slate-300 font-mono">
                    <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 font-bold rounded border border-amber-500/30">
                      EXCEL-EXP-2026
                    </span>
                    <div className="mt-0.5 text-slate-300">س.ت: {settings.crNumber || '7054828277'}</div>
                  </div>
                </div>
                <div className="bg-[#1c2541] text-[#cbd5e1] p-1.5 text-center text-[9px] font-mono">
                  {settings.headquarters || 'المملكة العربية السعودية - الرياض'} • الرقم الضريبي: {settings.taxNumber || '310298471200003'}
                </div>
                <div className="bg-slate-50 p-2.5 text-center text-[10px] font-bold text-slate-800 border-t border-amber-600 flex items-center justify-between">
                  <span>{tx('تقرير العمليات والأسطول المالي المعتمد', 'Certified Operations & Fleet Export')}</span>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[9px] font-bold border border-emerald-200">
                    {tx('مطابق لترويسة PDF باللوغو والختم', '100% Matches PDF with Logo & Seal')}
                  </span>
                </div>
              </div>
            )}

            {/* View 4: Official Stamp */}
            {previewTab === 'stamp' && (
              <div className="flex items-center justify-center gap-6 p-2">
                {(settings.stampUrl || settings.stamp) ? (
                  <img src={settings.stampUrl || settings.stamp} alt={tx('الختم الرسمي', 'Official stamp')} className="h-28 w-28 object-contain" />
                ) : <div className="w-28 h-28 rounded-full border-2 border-amber-600 p-1 flex items-center justify-center shadow-lg bg-white -rotate-6 shrink-0">
                  <div className="w-full h-full rounded-full border-1.5 border-dashed border-amber-700 flex flex-col items-center justify-center text-center p-1 bg-radial from-amber-50/60 to-white">
                    <div className="text-[7px] font-black text-amber-700 uppercase tracking-tight">★ معتمد رسمياً ★</div>
                    <div className="my-1 shrink-0">
                      <BrandLogo size="sm" variant="icon" isDark={false} />
                    </div>
                    <div className="text-[8px] font-black text-slate-950 leading-tight">
                      {settings.stampTextAr || 'مارشال لوجستيكس'}
                    </div>
                    <div className="text-[6px] font-extrabold text-amber-700 tracking-wider leading-none">
                      {settings.stampTextEn || 'MARSHAL LOGISTIC'}
                    </div>
                    <div className="text-[5.5px] font-mono text-slate-600 font-bold mt-0.5">
                      CR: {settings.crNumber || '7054828277'}
                    </div>
                  </div>
                </div>}

                <div className="text-xs space-y-1.5 text-slate-600 max-w-xs">
                  <h5 className="font-bold text-slate-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    <span>{tx('الختم الرقمي الرسمي لمارشال لوجستيكس', 'Official Certified Digital Stamp')}</span>
                  </h5>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    {tx(
                      'تم اعتماد الشعار والدرع المتجهي داخل الختم الرسمي ليطابق الهوية البصرية للشركة تماماً، ويتم إدراجه تلقائياً أسفل تقارير الإكسيل والبي دي اف وسندات التصفية وعقود الكباتن.',
                      'The official seal incorporates the company logo crest matching brand identity, embedded automatically in Excel, PDF, settlement vouchers and contracts.'
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
