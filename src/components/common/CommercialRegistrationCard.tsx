import React from 'react';
import { ShieldCheck, CheckCircle2, QrCode, FileText, Building2, Calendar, Phone, ExternalLink } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { BrandLogo } from './BrandLogo';

export const CommercialRegistrationCard: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { tx } = useLanguage();

  if (compact) {
    return (
      <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-850 to-indigo-950 text-white rounded-2xl border border-amber-500/30 shadow-md flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BrandLogo size="md" variant="icon" isDark={true} />
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-black text-sm text-white">شركة مارشال لوجيستيكس</h4>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold rounded-full">
                {tx('سجل تجاري نشط', 'Active CR')}
              </span>
            </div>
            <p className="text-xs text-amber-300 font-mono mt-0.5">
              {tx('الرقم الوطني الموحد:', 'Unified National No:')} <strong>7054828277</strong> • MARSHAL LOGISTIC
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-300 font-mono">
          <span>{tx('تاريخ الإصدار:', 'Issue Date:')} 20/07/2026</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden text-slate-900">
      {/* Top Ministry & Company Header */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-amber-500/30">
        <div className="flex items-center gap-3.5">
          <BrandLogo size="lg" variant="icon" isDark={true} />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black tracking-wide text-white">شركة مارشال لوجيستيكس</h3>
              <span className="px-2.5 py-0.5 bg-emerald-500 text-slate-950 text-[10px] font-black rounded-full">
                {tx('سجل معتمد ونشط', 'Active Verified CR')}
              </span>
            </div>
            <p className="text-xs text-amber-300/90 font-sans tracking-wider font-semibold mt-0.5">
              MARSHAL LOGISTIC LLC • {tx('شركة ذات مسؤولية محدودة (شخص واحد)', 'Single-Person LLC')}
            </p>
          </div>
        </div>

        <div className="text-start sm:text-end">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
            {tx('وزارة التجارة - المملكة العربية السعودية', 'Ministry of Commerce - KSA')}
          </div>
          <div className="text-xs text-amber-400 font-mono font-bold mt-0.5">
            mc.gov.sa • 1900
          </div>
        </div>
      </div>

      {/* Body with Official CR Metadata & QR Code */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        {/* Left 2 Cols: Data items */}
        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
            <span className="text-slate-400 block text-[10px] font-bold">
              {tx('الرقم الوطني الموحد للسجل التجاري', 'Unified National CR Number')}
            </span>
            <span className="text-base font-black text-slate-900 font-mono tracking-wider">
              7054828277
            </span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
            <span className="text-slate-400 block text-[10px] font-bold">
              {tx('تاريخ الإصدار', 'Issue Date')}
            </span>
            <span className="text-sm font-bold text-slate-800 font-mono">
              20/07/2026
            </span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
            <span className="text-slate-400 block text-[10px] font-bold">
              {tx('نوع الكيان والصفة القانونية', 'Legal Entity & Company Type')}
            </span>
            <span className="text-xs font-bold text-slate-800">
              {tx('شركة ذات مسؤولية محدودة (شخص واحد)', 'Limited Liability Company (Single Person)')}
            </span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
            <span className="text-slate-400 block text-[10px] font-bold">
              {tx('حالة السجل التجاري', 'CR Status')}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>{tx('نشط ومطابق لكافة المتطلبات', 'Active & Fully Compliant')}</span>
            </span>
          </div>
        </div>

        {/* Right 1 Col: QR Verification Box */}
        <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl flex flex-col items-center justify-center text-center space-y-2.5">
          <div className="w-20 h-20 bg-white border-2 border-emerald-600/40 rounded-2xl p-1.5 flex items-center justify-center shadow-xs">
            {/* High visual fidelity QR icon with Saudi Palm seal */}
            <QrCode className="w-full h-full text-emerald-800" />
          </div>
          <div>
            <span className="text-xs font-black text-emerald-950 block font-mono">7054828277</span>
            <span className="text-[10px] text-emerald-700 font-medium block mt-0.5">
              {tx('رمز التحقق الإلكتروني المباشر', 'Electronic QR Verification')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
