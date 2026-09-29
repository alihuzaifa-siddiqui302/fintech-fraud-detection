import React, { useState, useEffect, useCallback } from 'react';
import { ScrollText, Search, RefreshCw, ChevronDown, ChevronRight, ShieldCheck, ChevronLeft } from 'lucide-react';
import { getAuditLogs } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import CopyButton from '../../components/CopyButton';
import clsx from 'clsx';

const ACTION_OPTIONS = [
  { value: 'ALL', label: 'All Actions' },
  { value: 'RULE_UPDATED', label: 'RULE_UPDATED' },
  { value: 'BLACKLIST_ADDED', label: 'BLACKLIST_ADDED' },
  { value: 'BLACKLIST_REMOVED', label: 'BLACKLIST_REMOVED' },
  { value: 'TXN_APPROVED', label: 'TXN_APPROVED' },
  { value: 'TXN_BLOCKED', label: 'TXN_BLOCKED' },
  { value: 'TXN_ADJUDICATED', label: 'TXN_ADJUDICATED' },
];

export const AuditLog = () => {
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [actionFilter, setActionFilter] = useState('ALL');
  const [actorEmailSearch, setActorEmailSearch] = useState('');

  // Expanded row ID for diff inspection
  const [expandedRowId, setExpandedRowId] = useState(null);

  const toast = useToast();

  const fetchLogs = useCallback(
    async (targetPage = 0, action = actionFilter, actorEmail = actorEmailSearch) => {
      setLoading(true);
      try {
        const data = await getAuditLogs(targetPage, 15, action, actorEmail);
        setLogs(data.content || []);
        setPage(data.page || 0);
        setTotalPages(data.totalPages || 1);
      } catch {
        toast.error('Failed to load compliance audit logs');
      } finally {
        setLoading(false);
      }
    },
    [actionFilter, actorEmailSearch, toast]
  );

  useEffect(() => {
    fetchLogs(0, actionFilter, actorEmailSearch);
  }, [fetchLogs]);

  const handleActionChange = (e) => {
    const val = e.target.value;
    setActionFilter(val);
    fetchLogs(0, val, actorEmailSearch);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLogs(0, actionFilter, actorEmailSearch);
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const renderActionBadge = (action) => {
    const act = action || '';
    let style = 'bg-slate-700 text-slate-300 border-slate-600';

    if (act.includes('RULE')) {
      style = 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
    } else if (act.includes('BLACKLIST')) {
      style = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    } else if (act.includes('APPROVED')) {
      style = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    } else if (act.includes('BLOCKED')) {
      style = 'bg-red-500/15 text-red-300 border-red-500/30';
    } else if (act.includes('TXN')) {
      style = 'bg-blue-500/15 text-blue-300 border-blue-500/30';
    }

    return (
      <span className={clsx('px-2.5 py-0.5 rounded-full font-mono text-[11px] font-semibold border', style)}>
        {act}
      </span>
    );
  };

  const formatJson = (jsonString) => {
    if (!jsonString) return 'null';
    try {
      const parsed = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
      return JSON.stringify(parsed, null, 2);
    } catch {
      return jsonString;
    }
  };

  const toggleRow = (id) => {
    setExpandedRowId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <ScrollText className="w-6 h-6 text-brand-400" />
            <span>Compliance Audit Trail</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Append-only cryptographic audit ledger. Rows cannot be modified or deleted.</span>
          </p>
        </div>

        <button
          onClick={() => fetchLogs(page, actionFilter, actorEmailSearch)}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-medium transition-colors self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={clsx('w-3.5 h-3.5', loading && 'animate-spin')} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <label className="text-xs uppercase font-semibold tracking-wider text-slate-400">
            Action:
          </label>
          <select
            value={actionFilter}
            onChange={handleActionChange}
            className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono"
          >
            {ACTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={actorEmailSearch}
            onChange={(e) => setActorEmailSearch(e.target.value)}
            placeholder="Filter by actor email..."
            className="w-full pl-9 pr-4 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </form>
      </div>

      {/* Audit Table */}
      <div className="w-full bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-[11px] uppercase font-semibold text-slate-400 tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 w-44">Timestamp</th>
                <th className="py-3.5 px-4">Actor Email</th>
                <th className="py-3.5 px-4 w-40">Action</th>
                <th className="py-3.5 px-4">Entity</th>
                <th className="py-3.5 px-4">Origin IP</th>
                <th className="py-3.5 px-4 w-28 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td colSpan={6} className="p-4">
                      <div className="h-5 bg-slate-800/80 rounded" />
                    </td>
                  </tr>
                ))
              ) : logs.length > 0 ? (
                logs.map((row) => {
                  const isExpanded = expandedRowId === row.id;

                  return (
                    <React.Fragment key={row.id}>
                      <tr
                        onClick={() => toggleRow(row.id)}
                        className={clsx(
                          'cursor-pointer transition-colors duration-150',
                          isExpanded ? 'bg-slate-800/60' : 'hover:bg-slate-800/30'
                        )}
                      >
                        {/* Timestamp */}
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                          {formatDateTime(row.createdAt)}
                        </td>

                        {/* Actor Email */}
                        <td className="py-3.5 px-4 font-semibold text-slate-200">
                          {row.actorEmail || 'system'}
                        </td>

                        {/* Action Badge */}
                        <td className="py-3.5 px-4">{renderActionBadge(row.action)}</td>

                        {/* Entity */}
                        <td className="py-3.5 px-4">
                          <span className="font-mono text-slate-300">
                            {row.entityType} [{row.entityId ? row.entityId.substring(0, 10) : 'N/A'}]
                          </span>
                        </td>

                        {/* IP */}
                        <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                          {row.ipAddress || '127.0.0.1'}
                        </td>

                        {/* Expand Details button */}
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRow(row.id);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-400 hover:text-brand-300"
                          >
                            <span>{isExpanded ? 'Hide' : 'Inspect'}</span>
                            {isExpanded ? (
                              <ChevronDown className="w-3 h-3" />
                            ) : (
                              <ChevronRight className="w-3 h-3" />
                            )}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable JSON Diff Row */}
                      {isExpanded && (
                        <tr className="bg-slate-950/70 border-y border-slate-800">
                          <td colSpan={6} className="p-4 sm:p-6 space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-xs uppercase font-semibold tracking-wider text-slate-400">
                                State Transition Snapshot
                              </span>
                              {row.notes && (
                                <span className="text-xs text-slate-400 italic">
                                  Notes: "{row.notes}"
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Before JSON */}
                              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                                  <span className="text-[11px] font-semibold uppercase text-amber-400">
                                    Before State
                                  </span>
                                  {row.beforeValue && <CopyButton text={row.beforeValue} />}
                                </div>
                                <pre className="text-[11px] font-mono text-slate-400 max-h-60 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                                  {formatJson(row.beforeValue)}
                                </pre>
                              </div>

                              {/* After JSON */}
                              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                                  <span className="text-[11px] font-semibold uppercase text-emerald-400">
                                    After State
                                  </span>
                                  {row.afterValue && <CopyButton text={row.afterValue} />}
                                </div>
                                <pre className="text-[11px] font-mono text-slate-300 max-h-60 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                                  {formatJson(row.afterValue)}
                                </pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No compliance audit log records matched the query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-slate-800/50 border-t border-slate-800 text-xs text-slate-400">
            <div>
              Page <span className="font-semibold text-slate-200">{page + 1}</span> of{' '}
              <span className="font-semibold text-slate-200">{totalPages}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchLogs(page - 1, actionFilter, actorEmailSearch)}
                disabled={page <= 0 || loading}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>
              <button
                onClick={() => fetchLogs(page + 1, actionFilter, actorEmailSearch)}
                disabled={page >= totalPages - 1 || loading}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLog;
