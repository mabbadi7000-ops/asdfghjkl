import React from 'react';

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200 p-4 space-y-4 animate-pulse">
      <div className="h-10 bg-slate-100 rounded-xl w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4 space-x-reverse">
          <div className="h-8 bg-slate-100 rounded-lg flex-1" />
          <div className="h-8 bg-slate-100 rounded-lg w-24" />
          <div className="h-8 bg-slate-100 rounded-lg w-32" />
        </div>
      ))}
    </div>
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 animate-pulse space-y-3">
      <div className="flex justify-between items-center">
        <div className="h-4 bg-slate-100 rounded-md w-24" />
        <div className="h-10 w-10 bg-slate-100 rounded-xl" />
      </div>
      <div className="h-8 bg-slate-100 rounded-md w-36" />
      <div className="h-3 bg-slate-100 rounded-md w-28" />
    </div>
  );
};
