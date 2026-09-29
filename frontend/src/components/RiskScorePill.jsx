import React from 'react';
import clsx from 'clsx';

export const RiskScorePill = ({ score, showLabel = false, size = 'md' }) => {
  const numScore = typeof score === 'number' ? score : parseInt(score, 10) || 0;

  let colorClasses = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
  let label = 'Low';

  if (numScore >= 70) {
    colorClasses = 'bg-red-500/10 text-red-400 border-red-500/30 font-semibold';
    label = 'High Risk';
  } else if (numScore >= 30) {
    colorClasses = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    label = 'Medium Risk';
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 font-mono font-medium rounded-full border shadow-sm',
        sizeClasses,
        colorClasses
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
      <span>{numScore}</span>
      {showLabel && <span className="font-sans text-[11px] opacity-80">({label})</span>}
    </span>
  );
};

export default RiskScorePill;
