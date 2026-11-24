import React, { useEffect, useState } from 'react';
import { Driver } from '../../types';
import { appendSessionToken } from '../../services/dataService';

interface DriverAvatarProps {
  driver: Pick<Driver, 'fullName' | 'photoUrl' | 'avatar'>;
  className?: string;
  shapeClassName?: string;
  textClassName?: string;
}

const getInitials = (name?: string) => {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '؟';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

export const DriverAvatar: React.FC<DriverAvatarProps> = ({
  driver,
  className = 'w-8 h-8',
  shapeClassName = 'rounded-full',
  textClassName = 'text-xs',
}) => {
  const [imgError, setImgError] = useState(false);
  const src = driver.photoUrl || driver.avatar;

  useEffect(() => {
    setImgError(false);
  }, [src]);

  const base = `${className} ${shapeClassName} shrink-0 overflow-hidden border border-slate-200`;

  if (!src || imgError) {
    return (
      <div className={`${base} bg-slate-100 flex items-center justify-center font-bold text-slate-700 ${textClassName}`}>
        {getInitials(driver.fullName)}
      </div>
    );
  }

  return (
    <div className={base}>
      <img
        src={appendSessionToken(src)}
        alt={driver.fullName}
        onError={() => setImgError(true)}
        className={`w-full h-full object-cover ${shapeClassName}`}
      />
    </div>
  );
};
