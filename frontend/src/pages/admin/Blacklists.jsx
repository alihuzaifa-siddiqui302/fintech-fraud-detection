import React, { useState, useEffect, useCallback } from 'react';
import { Ban, Plus, Trash2, AlertTriangle, RefreshCw, Loader2, Check } from 'lucide-react';
import { getBlacklists, addBlacklist, deleteBlacklist } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import CopyButton from '../../components/CopyButton';
import clsx from 'clsx';

const TYPE_CONFIG = {
  IP: {
    label: 'IP',
    placeholder: 'e.g. 185.220.101.45',
    badge: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  },
  DEVICE: {
    label: 'Device',
    placeholder: 'e.g. dev_uuid_893247923',
    badge: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  },
  EMAIL: {
    label: 'Email',
    placeholder: 'e.g. fraudster@malicious.com',
    badge: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  },
  FINGERPRINT: {
    label: 'Fingerprint',
    placeholder: 'e.g. fp_9a8b7c6d5e4f3a2b',
    badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
};

export const Blacklists = () => {
  const [blacklists, setBlacklists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('ALL');

  // Form State
  const [newType, setNewType] = useState('IP');
  const [newValue, setNewValue] = useState('');
  const [newReason, setNewReason] = useState('');
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Inline delete confirmation state
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const toast = useToast();

  const fetchBlacklistsData = useCallback(async (type = selectedType) => {
    setLoading(true);
    try {
      const data = await getBlacklists(type);
      setBlacklists(data || []);
    } catch {
      toast.error('Failed to load blacklist entries');
    } finally {
      setLoading(false);
    }
  }, [selectedType, toast]);

  useEffect(() => {
    fetchBlacklistsData(selectedType);
  }, [fetchBlacklistsData, selectedType]);

  const handleTabChange = (type) => {
    setSelectedType(type);
    fetchBlacklistsData(type);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!newValue.trim() || !newReason.trim()) {
      toast.error('Both target value and reason are required');
      return;
    }

    setSubmittingAdd(true);
    try {
      const created = await addBlacklist(newType, newValue.trim(), newReason.trim());
      toast.success(`${newType} ${newValue} added to blacklist`, 'Blacklist Updated');
      setNewValue('');
      setNewReason('');
      fetchBlacklistsData(selectedType);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add blacklist entry');
    } finally {
      setSubmittingAdd(false);
    }
  };

  const handleDeleteConfirm = async (id) => {
    setDeletingId(id);
    try {
      await deleteBlacklist(id);
      toast.success('Blacklist entry removed successfully', 'Removed');
      setBlacklists((prev) => prev.filter((item) => item.id !== id));
      setConfirmDeleteId(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove blacklist entry');
    } finally {
      setDeletingId(null);
    }
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
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Ban className="w-6 h-6 text-red-400" />
            <span>Blacklist Management</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Entries are cached in Redis and applied in &lt; 1ms to instantly drop suspicious actors.
          </p>
        </div>

        <button
          onClick={() => fetchBlacklistsData(selectedType)}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-medium transition-colors self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={clsx('w-3.5 h-3.5', loading && 'animate-spin')} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Add Form */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl backdrop-blur-sm">
        <h2 className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-4">
          Add Entity to Global Blacklist
        </h2>

        <form onSubmit={handleAddSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Type
            </label>
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono"
            >
              <option value="IP">IP Address</option>
              <option value="DEVICE">Device</option>
              <option value="EMAIL">Email</option>
              <option value="FINGERPRINT">Fingerprint</option>
            </select>
          </div>

          <div className="sm:col-span-4">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Target Value
            </label>
            <input
              type="text"
              required
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder={TYPE_CONFIG[newType]?.placeholder || 'Enter value...'}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div className="sm:col-span-4">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Justification / Reason
            </label>
            <input
              type="text"
              required
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              placeholder="e.g. Card-testing syndicate / confirmed chargeback"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={submittingAdd}
              className="w-full py-2 px-4 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-medium text-xs shadow-md shadow-red-950 flex items-center justify-center gap-1.5 transition-all"
            >
              {submittingAdd ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              <span>Add Blacklist</span>
            </button>
          </div>
        </form>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        {['ALL', 'IP', 'DEVICE', 'EMAIL', 'FINGERPRINT'].map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={clsx(
              'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all',
              selectedType === tab
                ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
            )}
          >
            {tab === 'ALL' ? 'All Types' : TYPE_CONFIG[tab]?.label || tab}
          </button>
        ))}
      </div>

      {/* Blacklists Table */}
      <div className="w-full bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-[11px] uppercase font-semibold text-slate-400 tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 w-28">Type</th>
                <th className="py-3.5 px-4">Blocked Value</th>
                <th className="py-3.5 px-4">Reason</th>
                <th className="py-3.5 px-4">Added By</th>
                <th className="py-3.5 px-4 w-40">Date Added</th>
                <th className="py-3.5 px-4 w-32 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td colSpan={6} className="p-4">
                      <div className="h-5 bg-slate-800/80 rounded" />
                    </td>
                  </tr>
                ))
              ) : blacklists.length > 0 ? (
                blacklists.map((entry) => {
                  const typeConf = TYPE_CONFIG[entry.targetType] || TYPE_CONFIG.IP;
                  const isConfirming = confirmDeleteId === entry.id;

                  return (
                    <tr key={entry.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Type Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={clsx(
                            'px-2 py-0.5 rounded-full font-mono font-semibold text-[11px] border',
                            typeConf.badge
                          )}
                        >
                          {entry.targetType}
                        </span>
                      </td>

                      {/* Value with copy button */}
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-100">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate max-w-xs">{entry.targetValue}</span>
                          <CopyButton text={entry.targetValue} />
                        </div>
                      </td>

                      {/* Reason */}
                      <td className="py-3.5 px-4 text-slate-300">{entry.reason}</td>

                      {/* Added By Email */}
                      <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                        {entry.addedByEmail || 'system'}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                        {formatDateTime(entry.createdAt)}
                      </td>

                      {/* Delete with inline confirmation */}
                      <td className="py-3.5 px-4 text-right">
                        {isConfirming ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="text-[11px] text-amber-400 font-semibold mr-1">Remove?</span>
                            <button
                              onClick={() => handleDeleteConfirm(entry.id)}
                              disabled={deletingId === entry.id}
                              className="px-2 py-1 rounded bg-red-600 hover:bg-red-500 text-white text-[11px] font-semibold"
                            >
                              {deletingId === entry.id ? '...' : 'Yes'}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-[11px]"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(entry.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Remove from blacklist"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No blacklist entries found for {selectedType === 'ALL' ? 'any type' : selectedType}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Blacklists;
