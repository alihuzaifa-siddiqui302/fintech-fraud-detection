import React from 'react';
import clsx from 'clsx';

export const LoadingSkeleton = ({ rows = 5, columns = 4, className }) => {
  return (
    <div className={clsx('w-full space-y-3 animate-pulse', className)}>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div key={rIdx} className="flex items-center gap-4 p-4 bg-slate-800/40 rounded-xl border border-slate-700/50">
          {Array.from({ length: columns }).map((_, cIdx) => (
            <div
              key={cIdx}
              className={clsx(
                'h-4 bg-slate-700/60 rounded',
                cIdx === 0 ? 'w-24' : cIdx === 1 ? 'w-36' : 'flex-1'
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export default LoadingSkeleton;
