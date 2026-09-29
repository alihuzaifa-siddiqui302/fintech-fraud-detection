import React from 'react';
import { Inbox } from 'lucide-react';

export const EmptyState = ({ icon: Icon = Inbox, title = 'No data found', message, action }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-slate-800 bg-slate-800/30">
      <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/60 text-slate-400 mb-4 shadow-inner">
        <Icon className="w-8 h-8 stroke-[1.5]" />
      </div>
      <h3 className="text-base font-semibold text-slate-200 mb-1">{title}</h3>
      {message && <p className="text-sm text-slate-400 max-w-sm mb-6 leading-relaxed">{message}</p>}
      {action && <div>{action}</div>}
    </div>
  );
};

export default EmptyState;
