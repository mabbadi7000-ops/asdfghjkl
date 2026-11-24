import React, { useState, useEffect } from 'react';
import { loadCompanySettings } from '../../services/settingsService';
import { BRAND_ASSETS, getCustomLogo } from '../../utils/brandAssets';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon' | 'badge';
  className?: string;
  isDark?: boolean;
  customLogoUrl?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  variant = 'full',
  className = '',
  isDark = true,
  customLogoUrl,
}) => {
  const [activeLogo, setActiveLogo] = useState<string>(() => {
    if (customLogoUrl) return customLogoUrl;
    return getCustomLogo(loadCompanySettings(), isDark);
  });

  useEffect(() => {
    if (customLogoUrl) {
      setActiveLogo(customLogoUrl);
      return;
    }
    const handleSettingsUpdate = (e: Event) => {
      setActiveLogo(getCustomLogo(loadCompanySettings(), isDark));
    };

    window.addEventListener('company-settings-updated', handleSettingsUpdate);
    return () => {
      window.removeEventListener('company-settings-updated', handleSettingsUpdate);
    };
  }, [customLogoUrl, isDark]);

  const iconDimensions = {
    sm: 'w-7 h-7',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
  }[size];

  const textSizeClasses = {
    sm: { title: 'text-xs', subtitle: 'text-[8px]', subtext: 'text-[9px]' },
    md: { title: 'text-sm', subtitle: 'text-[9px]', subtext: 'text-[10px]' },
    lg: { title: 'text-lg', subtitle: 'text-xs', subtext: 'text-xs' },
    xl: { title: 'text-2xl', subtitle: 'text-sm', subtext: 'text-sm' },
  }[size];

  const OfficialEmblem = (
    <img
      src={BRAND_ASSETS.emblem}
      alt="MARSHAL LOGISTIC"
      className={`${iconDimensions} shrink-0 object-contain`}
    />
  );

  // If a custom image logo was uploaded, render that image
  if (activeLogo) {
    const customImage = (
      <div className={`${iconDimensions} shrink-0 relative rounded-xl overflow-hidden border border-amber-500/40 ${isDark ? 'bg-slate-900/60' : 'bg-white'} p-0.5 shadow-sm flex items-center justify-center`}>
        <img
          src={activeLogo}
          alt="MARSHAL LOGISTIC"
          className="w-full h-full object-contain rounded-lg"
          onError={() => setActiveLogo('')}
        />
      </div>
    );

    if (variant === 'icon') {
      return <div className={`inline-flex items-center justify-center ${className}`}>{customImage}</div>;
    }

    if (variant === 'badge') {
      return (
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-900 border border-amber-500/30 text-white ${className}`}>
          {customImage}
          <div>
            <div className="flex items-center gap-1">
              <span className="font-black tracking-widest text-amber-400 text-xs uppercase font-sans">MARSHAL</span>
              <span className="text-[10px] text-slate-300 font-bold">LOGISTIC</span>
            </div>
            <p className="text-[9px] text-amber-200/80 font-medium font-mono">س.ت: 7054828277</p>
          </div>
        </div>
      );
    }

    return (
      <div className={`inline-flex items-center gap-3 ${className}`}>
        {customImage}
        <div className="flex flex-col text-start">
          <div className="flex items-center gap-1.5 leading-none">
            <span className={`font-black tracking-widest uppercase font-sans ${textSizeClasses.title} ${isDark ? 'text-amber-400' : 'text-slate-900'}`}>
              MARSHAL
            </span>
            <span className={`font-bold tracking-wider ${textSizeClasses.subtitle} ${isDark ? 'text-slate-200' : 'text-amber-700'}`}>
              LOGISTIC
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`font-bold tracking-tight ${textSizeClasses.subtext} ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              مارشال لوجستك
            </span>
            <span className="w-1 h-1 rounded-full bg-amber-400"></span>
            <span className="text-[9px] text-amber-400/90 font-mono">CR: 7054828277</span>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'icon') {
    return <div className={`inline-flex items-center justify-center ${className}`}>{OfficialEmblem}</div>;
  }

  if (variant === 'badge') {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-900 border border-amber-500/30 text-white ${className}`}>
        {OfficialEmblem}
        <div>
          <div className="flex items-center gap-1">
            <span className="font-black tracking-widest text-amber-400 text-xs uppercase font-sans">MARSHAL</span>
            <span className="text-[10px] text-slate-300 font-bold">LOGISTIC</span>
          </div>
          <p className="text-[9px] text-amber-200/80 font-medium font-mono">س.ت: 7054828277</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {!isDark ? (
        <img
          src={BRAND_ASSETS.logo}
          alt="MARSHAL LOGISTIC"
          className={`h-12 w-auto shrink-0 object-contain ${size === 'sm' ? 'h-9' : size === 'lg' ? 'h-16' : size === 'xl' ? 'h-24' : ''}`}
        />
      ) : OfficialEmblem}
      <div className="flex flex-col text-start">
        <div className="flex items-center gap-1.5 leading-none">
          <span className={`font-black tracking-widest uppercase font-sans ${textSizeClasses.title} ${isDark ? 'text-amber-400' : 'text-slate-900'}`}>
            MARSHAL
          </span>
          <span className={`font-bold tracking-wider ${textSizeClasses.subtitle} ${isDark ? 'text-slate-200' : 'text-amber-700'}`}>
            LOGISTIC
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={`font-bold tracking-tight ${textSizeClasses.subtext} ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            مارشال لوجستك
          </span>
          <span className="w-1 h-1 rounded-full bg-amber-400"></span>
          <span className="text-[9px] text-amber-400/90 font-mono">CR: 7054828277</span>
        </div>
      </div>
    </div>
  );
};
