import React from 'react';
import { LucideIcon, ArrowUpRight, ArrowDownRight, Database, ChevronLeft, ShieldCheck, Lock } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
  colorScheme?: 'blue' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'purple' | 'slate' | 'gold';
  onClick?: () => void;
  // Enhanced Enterprise & Database Features:
  collectionName?: string; // e.g. "drivers", "vehicles", "cash_settlements"
  allowedRoles?: UserRole[]; // e.g. ['admin', 'general_manager']
  isLiveSync?: boolean; // Shows live cloud indicator
  actionLabel?: string; // e.g. "استعراض السجلات"
  securityNotice?: string; // e.g. "خاضع لصلاحيات الإدارة"
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  colorScheme = 'amber',
  onClick,
  collectionName,
  allowedRoles,
  isLiveSync = true,
  actionLabel,
  securityNotice,
}) => {
  const { t, tx, language } = useLanguage();
  const { currentUser, canAccess } = useAuth();

  // Role Access Guard: if allowedRoles is specified and user cannot access, render redacted/protected card
  const hasAccess = !allowedRoles || (currentUser && allowedRoles.includes(currentUser.role));

  // Color schemes matching Marshal Logistic Identity (Gold #D4AF37, Navy #0B132B, Slate, Emerald, Blue)
  const schemeStyles: Record<
    string,
    {
      iconBg: string;
      iconColor: string;
      accentBorder: string;
      glowGradient: string;
      hoverGlow: string;
      valueColor: string;
    }
  > = {
    gold: {
      iconBg: 'bg-gradient-to-br from-amber-400/20 via-amber-500/15 to-amber-600/10 border border-amber-400/30',
      iconColor: 'text-amber-500',
      accentBorder: 'group-hover:border-amber-400/60',
      glowGradient: 'from-amber-500/8 via-amber-500/2 to-transparent',
      hoverGlow: 'hover:shadow-[0_8px_30px_rgb(212,175,55,0.12)]',
      valueColor: 'text-slate-900',
    },
    amber: {
      iconBg: 'bg-gradient-to-br from-amber-400/20 via-amber-500/15 to-amber-600/10 border border-amber-400/30',
      iconColor: 'text-amber-500',
      accentBorder: 'group-hover:border-amber-400/60',
      glowGradient: 'from-amber-500/8 via-amber-500/2 to-transparent',
      hoverGlow: 'hover:shadow-[0_8px_30px_rgb(245,158,11,0.12)]',
      valueColor: 'text-slate-900',
    },
    emerald: {
      iconBg: 'bg-emerald-500/15 border border-emerald-500/25',
      iconColor: 'text-emerald-600',
      accentBorder: 'group-hover:border-emerald-400/60',
      glowGradient: 'from-emerald-500/8 via-emerald-500/2 to-transparent',
      hoverGlow: 'hover:shadow-[0_8px_30px_rgb(16,185,129,0.12)]',
      valueColor: 'text-slate-900',
    },
    blue: {
      iconBg: 'bg-blue-500/15 border border-blue-500/25',
      iconColor: 'text-blue-600',
      accentBorder: 'group-hover:border-blue-400/60',
      glowGradient: 'from-blue-500/8 via-blue-500/2 to-transparent',
      hoverGlow: 'hover:shadow-[0_8px_30px_rgb(59,130,246,0.12)]',
      valueColor: 'text-slate-900',
    },
    rose: {
      iconBg: 'bg-rose-500/15 border border-rose-500/25',
      iconColor: 'text-rose-600',
      accentBorder: 'group-hover:border-rose-400/60',
      glowGradient: 'from-rose-500/8 via-rose-500/2 to-transparent',
      hoverGlow: 'hover:shadow-[0_8px_30px_rgb(244,63,94,0.12)]',
      valueColor: 'text-slate-900',
    },
    indigo: {
      iconBg: 'bg-indigo-500/15 border border-indigo-500/25',
      iconColor: 'text-indigo-600',
      accentBorder: 'group-hover:border-indigo-400/60',
      glowGradient: 'from-indigo-500/8 via-indigo-500/2 to-transparent',
      hoverGlow: 'hover:shadow-[0_8px_30px_rgb(99,102,241,0.12)]',
      valueColor: 'text-slate-900',
    },
    purple: {
      iconBg: 'bg-purple-500/15 border border-purple-500/25',
      iconColor: 'text-purple-600',
      accentBorder: 'group-hover:border-purple-400/60',
      glowGradient: 'from-purple-500/8 via-purple-500/2 to-transparent',
      hoverGlow: 'hover:shadow-[0_8px_30px_rgb(168,85,247,0.12)]',
      valueColor: 'text-slate-900',
    },
    slate: {
      iconBg: 'bg-slate-100 border border-slate-200',
      iconColor: 'text-slate-700',
      accentBorder: 'group-hover:border-slate-300',
      glowGradient: 'from-slate-500/5 to-transparent',
      hoverGlow: 'hover:shadow-md',
      valueColor: 'text-slate-900',
    },
  };

  const currentScheme = schemeStyles[colorScheme] || schemeStyles.amber;

  // Render Restrained Unauthorized / Redacted State
  if (!hasAccess) {
    return (
      <div className="relative overflow-hidden bg-slate-50/80 rounded-2xl p-5 border border-slate-200/80 opacity-75 select-none">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>{t(title)}</span>
            </span>
            <div className="h-7 w-20 bg-slate-200/80 rounded-md animate-pulse mt-1" />
            <span className="text-[10px] text-slate-400 block mt-1">
              {securityNotice || 'خاضع لصلاحيات الإدارة والمدير العام'}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-400">
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`group relative overflow-hidden bg-white rounded-2xl p-4.5 border border-slate-200/90 transition-all duration-200 ${
        currentScheme.accentBorder
      } ${currentScheme.hoverGlow} ${
        onClick ? 'cursor-pointer hover:-translate-y-0.5' : ''
      }`}
    >
      {/* Subtle Ambient Gradient Background matching Marshal Palette */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${currentScheme.glowGradient} opacity-60 pointer-events-none transition-opacity group-hover:opacity-100`}
      />

      {/* Top Header Area: Title & Icon */}
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="space-y-1.5 min-w-0 flex-1">
          {/* Metadata Top Row */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-slate-600 leading-snug">
            <span className="font-bold text-slate-700 whitespace-normal break-words">{t(title)}</span>
            {isLiveSync && (
              <span
                className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"
                title="مربوط سحابياً مع قاعدة بيانات Cloudflare D1"
              />
            )}
            {collectionName && (
              <>
                <span className="text-slate-300" aria-hidden="true">·</span>
                <span className="text-[10px] font-mono text-slate-400 lowercase hidden sm:inline">
                  {collectionName}
                </span>
              </>
            )}
          </div>

          {/* Primary Metric Value */}
          <div className="flex items-baseline gap-2 pt-0.5">
            <h4 className={`text-2xl font-black tracking-tight ${currentScheme.valueColor} font-sans`}>
              {value}
            </h4>
          </div>

          {/* Subtitle / Descriptive Context */}
          {subtitle && (
            <p className="text-[11px] text-slate-500 font-medium leading-relaxed whitespace-normal break-words">
              {t(subtitle)}
            </p>
          )}
        </div>

        {/* Brand Icon Box */}
        <div
          className={`p-2.5 rounded-xl shrink-0 transition-transform duration-200 group-hover:scale-105 ${currentScheme.iconBg} ${currentScheme.iconColor}`}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {/* Bottom Bar: Trend, Collection Link & Interactive Trigger */}
      {(trend || onClick || collectionName) && (
        <div className="relative z-10 mt-3 pt-2.5 border-t border-slate-100/90 flex items-center justify-between text-[11px]">
          {/* Trend / Status Indicator */}
          {trend ? (
            <div className="flex items-center gap-1 text-[11px] font-semibold">
              <span
                className={`flex items-center gap-0.5 font-bold ${
                  trend.isPositive !== false ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {trend.isPositive !== false ? (
                  <ArrowUpRight className="w-3.5 h-3.5" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5" />
                )}
                <span>{trend.value}</span>
              </span>
              <span className="text-slate-400 font-normal">
                {trend.label || t('vsPreviousPeriod')}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
              <Database className="w-3 h-3 text-slate-400 shrink-0" />
              <span>{collectionName ? `D1 / ${collectionName}` : 'محدث تلقائياً'}</span>
            </div>
          )}

          {/* Click Navigation Indicator */}
          {onClick && (
            <span className="text-[11px] font-bold text-slate-400 group-hover:text-amber-600 flex items-center gap-0.5 transition-colors">
              <span>{actionLabel || (language === 'ar' ? 'عرض السجلات' : 'View')}</span>
              <ChevronLeft className="w-3.5 h-3.5 rtl:block ltr:hidden group-hover:-translate-x-0.5 transition-transform" />
              <ArrowUpRight className="w-3 h-3 rtl:hidden ltr:block group-hover:translate-x-0.5 transition-transform" />
            </span>
          )}
        </div>
      )}
    </div>
  );
};
