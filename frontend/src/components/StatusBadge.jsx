import React from 'react';
import { CheckCircle2, Clock, ShieldAlert, HelpCircle } from 'lucide-react';
import clsx from 'clsx';

export const StatusBadge = ({ status, size = 'md' }) => {
  const normalized = (status || '').toUpperCase();

  const configs = {
    APPROVED: {
      label: 'Approved',
      icon: CheckCircle2,
      style: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      dot: 'bg-emerald-400',
    },
    PENDING_REVIEW: {
      label: 'Pending Review',
      icon: Clock,
      style: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      dot: 'bg-amber-400',
    },
    PENDING: {
      label: 'Pending',
      icon: Clock,
      style: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      dot: 'bg-amber-400',
    },
    BLOCKED: {
      label: 'Blocked',
      icon: ShieldAlert,
      style: 'bg-red-500/10 text-red-400 border-red-500/30',
      dot: 'bg-red-400',
    },
  };

  const current = configs[normalized] || {
    label: normalized || 'Unknown',
    icon: HelpCircle,
    style: 'bg-slate-700/50 text-slate-300 border-slate-600',
    dot: 'bg-slate-400',
  };

  const Icon = current.icon;
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 font-medium rounded-full border shadow-sm',
        sizeClasses,
        current.style
      )}
    >
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      <span>{current.label}</span>
    </span>
  );
};

export default StatusBadge;
