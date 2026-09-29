import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import clsx from 'clsx';

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const STYLES = {
  success: {
    border: 'border-emerald-500/30',
    bg: 'bg-slate-800/95',
    iconColor: 'text-emerald-400',
    titleColor: 'text-emerald-300',
    progress: 'bg-emerald-500',
  },
  error: {
    border: 'border-red-500/30',
    bg: 'bg-slate-800/95',
    iconColor: 'text-red-400',
    titleColor: 'text-red-300',
    progress: 'bg-red-500',
  },
  warning: {
    border: 'border-amber-500/30',
    bg: 'bg-slate-800/95',
    iconColor: 'text-amber-400',
    titleColor: 'text-amber-300',
    progress: 'bg-amber-500',
  },
  info: {
    border: 'border-blue-500/30',
    bg: 'bg-slate-800/95',
    iconColor: 'text-blue-400',
    titleColor: 'text-blue-300',
    progress: 'bg-blue-500',
  },
};

export const ToastItem = ({ toast, onDismiss }) => {
  const Icon = ICONS[toast.type] || Info;
  const style = STYLES[toast.type] || STYLES.info;

  return (
    <div
      className={clsx(
        'relative flex items-start gap-3 w-80 sm:w-96 p-4 rounded-xl border shadow-xl backdrop-blur-md transition-all duration-300 animate-slide-in-right',
        style.bg,
        style.border
      )}
      role="alert"
    >
      <Icon className={clsx('w-5 h-5 flex-shrink-0 mt-0.5', style.iconColor)} />
      <div className="flex-1 pr-2">
        {toast.title && (
          <h4 className={clsx('text-xs font-semibold uppercase tracking-wider mb-1', style.titleColor)}>
            {toast.title}
          </h4>
        )}
        <p className="text-sm text-slate-200 leading-relaxed font-normal">{toast.message}</p>
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-slate-400 hover:text-slate-100 transition-colors rounded p-1"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export const ToastContainer = ({ toasts, onDismiss }) => {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
