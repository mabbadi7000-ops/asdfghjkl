import React from 'react';
import { ShieldCheck, UserCheck, Lock, CheckCircle2, FileSignature, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export interface FinancialOperatorBadgeProps {
  name?: string;
  role?: string;
  actionTitle?: string;
  timestamp?: string;
  verificationCode?: string;
  variant?: 'inline' | 'card' | 'stamp' | 'compact';
  className?: string;
}

export const FinancialOperatorBadge: React.FC<FinancialOperatorBadgeProps> = ({
  name,
  role,
  actionTitle,
  timestamp,
  verificationCode,
  variant = 'inline',
  className = '',
}) => {
  const { tx, language } = useLanguage();

  const displayName = name || tx('مسؤول النظام المالي', 'Financial System Operator');

  const getRoleLabel = (r?: string) => {
    switch (r) {
      case 'admin':
        return { label: tx('مدير النظام والأمان', 'System Admin'), color: 'bg-amber-100 text-amber-900 border-amber-300' };
      case 'general_manager':
        return { label: tx('المدير العام', 'General Manager'), color: 'bg-emerald-100 text-emerald-900 border-emerald-300' };
      case 'operations_manager':
        return { label: tx('مدير العمليات', 'Operations Manager'), color: 'bg-blue-100 text-blue-900 border-blue-300' };
      case 'supervisor':
        return { label: tx('مشرف العمليات', 'Supervisor'), color: 'bg-indigo-100 text-indigo-900 border-indigo-300' };
      default:
        return { label: r || tx('مسؤول معتمد', 'Authorized Officer'), color: 'bg-slate-100 text-slate-800 border-slate-200' };
    }
  };

  const roleInfo = getRoleLabel(role);

  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-50 border border-slate-200/80 text-slate-800 ${className}`}>
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span className="text-xs font-bold truncate max-w-[130px]">{displayName}</span>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={`flex flex-col gap-0.5 text-start ${className}`}>
        {actionTitle && (
          <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            <span>{actionTitle}</span>
          </span>
        )}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-slate-900">{displayName}</span>
          <span className={`px-1.5 py-0.2 text-[9px] font-bold rounded-md border ${roleInfo.color}`}>
            {roleInfo.label}
          </span>
        </div>
        {timestamp && (
          <span className="text-[10px] font-mono text-slate-400">{timestamp}</span>
        )}
      </div>
    );
  }

  if (variant === 'stamp') {
    return (
      <div className={`p-3 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/40 text-slate-900 flex items-center justify-between gap-3 ${className}`}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-emerald-950">
                {actionTitle || tx('تم التحقق والتسجيل المالي المعتمد', 'Verified Financial Record')}
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-emerald-200/80 text-emerald-900 font-mono">
                ANTI-FRAUD VERIFIED
              </span>
            </div>
            <p className="text-xs font-bold text-slate-800 mt-0.5">
              {tx('بواسطة المسؤول:', 'By Operator:')} <strong className="text-slate-900">{displayName}</strong>
              <span className="text-[10px] text-slate-500 font-normal mr-1 ml-1">({roleInfo.label})</span>
            </p>
          </div>
        </div>

        {verificationCode && (
          <div className="text-end font-mono text-[10px] text-slate-500 border-s border-emerald-200 ps-3">
            <span className="block text-[9px] text-slate-400 font-sans">{tx('معرف التوثيق الأمني:', 'Security Hash:')}</span>
            <strong className="text-emerald-800 font-bold">{verificationCode}</strong>
          </div>
        )}
      </div>
    );
  }

  // Card variant
  return (
    <div className={`p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 text-slate-800 ${className}`}>
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200/60 mb-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>{actionTitle || tx('المسؤول المالي المنفذ للعملية', 'Authorized Financial Operator')}</span>
        </div>
        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-lg border ${roleInfo.color}`}>
          {roleInfo.label}
        </span>
      </div>

      <div className="flex items-center justify-between gap-3 text-xs">
        <div>
          <span className="text-slate-400 text-[11px] block">{tx('الاسم الكامل المعتمد:', 'Full Name:')}</span>
          <strong className="text-slate-900 font-bold text-sm">{displayName}</strong>
        </div>

        {verificationCode && (
          <div className="text-end font-mono text-[10px]">
            <span className="text-slate-400 block font-sans">{tx('رقم القيد والتحقق:', 'Audit Trace #:')}</span>
            <span className="font-bold text-slate-700">{verificationCode}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export interface FinancialAuditBannerProps {
  currentUserFullName?: string;
  currentUserRole?: string;
  actionDescription?: string;
  className?: string;
}

export const FinancialAuditBanner: React.FC<FinancialAuditBannerProps> = ({
  currentUserFullName,
  currentUserRole,
  actionDescription,
  className = '',
}) => {
  const { tx } = useLanguage();

  return (
    <div className={`p-3 bg-linear-to-r from-amber-50 to-emerald-50 border border-amber-200/80 rounded-xl text-xs text-slate-800 ${className}`}>
      <div className="flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <strong className="text-slate-900 font-bold">
              {tx('نظام الحماية من الاحتيال المالي والمساءلة الرقمية (Anti-Fraud)', 'Anti-Fraud & Financial Accountability Protection')}
            </strong>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-200/60 text-amber-900 font-mono">
              SEC-FIN-AUDIT
            </span>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            {tx(
              `سيتم تسجيل هوية منفذ العملية المالية باسم: (${currentUserFullName || 'المستخدم الحالي'}) بصلاحية (${currentUserRole || 'المسؤول'}) مع الختم الزمني المشفر في سجلات التدقيق لمنع التلاعب وضمان موثوقية العمليات المحاسبية.`,
              `This financial transaction is cryptographically bound to (${currentUserFullName || 'Current User'}) with role (${currentUserRole || 'Officer'}) for full anti-fraud protection and accounting audit compliance.`
            )}
          </p>
          {actionDescription && (
            <p className="text-[10px] text-slate-500 font-medium pt-0.5">
              • {actionDescription}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
