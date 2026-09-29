import React, { useState, useEffect } from 'react';
import { Sliders, RefreshCw, Save, Info, Check, Loader2 } from 'lucide-react';
import { getRules, updateRule } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import clsx from 'clsx';

export const RulesManager = () => {
  const [rules, setRules] = useState([]);
  const [editedRules, setEditedRules] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  const toast = useToast();

  const fetchRules = async () => {
    setLoading(true);
    try {
      const data = await getRules();
      setRules(data || []);
      setEditedRules({});
    } catch {
      toast.error('Unable to fetch fraud detection rules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleFieldChange = (id, field, value) => {
    const originalRule = rules.find((r) => r.id === id);
    if (!originalRule) return;

    const currentEdited = editedRules[id] || {
      thresholdValue: originalRule.thresholdValue,
      riskWeight: originalRule.riskWeight,
      isEnabled: originalRule.isEnabled,
    };

    const updated = { ...currentEdited, [field]: value };

    // Check if differs from original
    const hasChanges =
      parseFloat(updated.thresholdValue) !== parseFloat(originalRule.thresholdValue) ||
      parseInt(updated.riskWeight, 10) !== parseInt(originalRule.riskWeight, 10) ||
      updated.isEnabled !== originalRule.isEnabled;

    if (hasChanges) {
      setEditedRules((prev) => ({ ...prev, [id]: updated }));
    } else {
      setEditedRules((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    }
  };

  const handleToggle = async (rule) => {
    const newStatus = !rule.isEnabled;
    const payload = {
      thresholdValue: rule.thresholdValue,
      riskWeight: rule.riskWeight,
      isEnabled: newStatus,
    };

    setSavingId(rule.id);
    try {
      const updated = await updateRule(rule.id, payload);
      setRules((prev) => prev.map((r) => (r.id === rule.id ? updated : r)));
      // clear any pending edit state for this rule
      setEditedRules((prev) => {
        const copy = { ...prev };
        delete copy[rule.id];
        return copy;
      });
      toast.success(
        `Rule ${rule.ruleCode} is now ${newStatus ? 'ENABLED' : 'DISABLED'}.`,
        'Rule Recalibrated'
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to toggle rule state');
    } finally {
      setSavingId(null);
    }
  };

  const handleSaveRow = async (ruleId) => {
    const edits = editedRules[ruleId];
    if (!edits) return;

    const original = rules.find((r) => r.id === ruleId);
    const payload = {
      thresholdValue: parseFloat(edits.thresholdValue),
      riskWeight: parseInt(edits.riskWeight, 10),
      isEnabled: edits.isEnabled,
    };

    setSavingId(ruleId);
    try {
      const updated = await updateRule(ruleId, payload);
      setRules((prev) => prev.map((r) => (r.id === ruleId ? updated : r)));
      setEditedRules((prev) => {
        const copy = { ...prev };
        delete copy[ruleId];
        return copy;
      });
      toast.success(`Rule ${original?.ruleCode} parameters successfully updated.`, 'Rule Saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update rule parameters');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Sliders className="w-6 h-6 text-brand-400" />
            <span>Live Rule Configuration</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Dynamic threshold tuning and risk weight recalibration for the real-time scoring engine.
          </p>
        </div>

        <button
          onClick={fetchRules}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-medium transition-colors self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={clsx('w-3.5 h-3.5', loading && 'animate-spin')} />
          <span>Reload Rules</span>
        </button>
      </div>

      {/* Note Banner */}
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 text-xs backdrop-blur-sm">
        <Info className="w-5 h-5 flex-shrink-0 text-brand-400" />
        <span className="leading-relaxed">
          Changes apply to the next transaction evaluated — no service restart required. Redis and
          in-memory engine caches are invalidated synchronously across instances.
        </span>
      </div>

      {/* Rules Table */}
      <div className="w-full bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-[11px] uppercase font-semibold text-slate-400 tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 w-12 text-center">Status</th>
                <th className="py-3.5 px-4 w-44">Rule Code</th>
                <th className="py-3.5 px-4">Name & Description</th>
                <th className="py-3.5 px-4 w-32">Threshold</th>
                <th className="py-3.5 px-4 w-36">Risk Weight (pts)</th>
                <th className="py-3.5 px-4 w-24 text-center">Enabled</th>
                <th className="py-3.5 px-4 w-24 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td colSpan={7} className="p-4">
                      <div className="h-5 bg-slate-800/80 rounded" />
                    </td>
                  </tr>
                ))
              ) : rules.length > 0 ? (
                rules.map((rule) => {
                  const isModified = Boolean(editedRules[rule.id]);
                  const currentValues = editedRules[rule.id] || rule;
                  const weight = parseInt(currentValues.riskWeight, 10) || 0;

                  return (
                    <tr
                      key={rule.id}
                      className={clsx(
                        'transition-colors duration-150',
                        isModified ? 'bg-amber-950/20' : 'hover:bg-slate-800/40'
                      )}
                    >
                      {/* Status indicator dot */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={clsx(
                            'inline-block w-2.5 h-2.5 rounded-full',
                            rule.isEnabled ? 'bg-emerald-400 shadow-sm shadow-emerald-500/50' : 'bg-slate-600'
                          )}
                          title={rule.isEnabled ? 'Active rule' : 'Disabled rule'}
                        />
                      </td>

                      {/* Rule Code */}
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-200">
                        {rule.ruleCode}
                      </td>

                      {/* Name & Description */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-100">{rule.name}</div>
                        <div className="text-[11px] text-slate-400 leading-relaxed mt-0.5 line-clamp-2">
                          {rule.description}
                        </div>
                      </td>

                      {/* Threshold Input */}
                      <td className="py-3.5 px-4">
                        <input
                          type="number"
                          step="any"
                          value={currentValues.thresholdValue}
                          onChange={(e) => handleFieldChange(rule.id, 'thresholdValue', e.target.value)}
                          className="w-24 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 font-mono text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                      </td>

                      {/* Weight/pts input with dynamic colored bar */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1.5">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={currentValues.riskWeight}
                            onChange={(e) => handleFieldChange(rule.id, 'riskWeight', e.target.value)}
                            className="w-20 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 font-mono text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
                          />
                          <div className="w-20 h-1 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={clsx(
                                'h-full transition-all duration-200',
                                weight >= 70 && 'bg-red-500',
                                weight >= 30 && weight < 70 && 'bg-amber-500',
                                weight < 30 && 'bg-emerald-500'
                              )}
                              style={{ width: `${Math.min(100, Math.max(0, weight))}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Enabled Toggle Switch */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggle(rule)}
                          disabled={savingId === rule.id}
                          className={clsx(
                            'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                            rule.isEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                          )}
                        >
                          <span
                            className={clsx(
                              'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                              rule.isEnabled ? 'translate-x-4' : 'translate-x-0'
                            )}
                          />
                        </button>
                      </td>

                      {/* Save Button (shows only when modified) */}
                      <td className="py-3.5 px-4 text-right">
                        {isModified && (
                          <button
                            type="button"
                            onClick={() => handleSaveRow(rule.id)}
                            disabled={savingId === rule.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-medium text-xs shadow-md shadow-brand-500/20 transition-all"
                          >
                            {savingId === rule.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Save className="w-3.5 h-3.5" />
                            )}
                            <span>Save</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No rules loaded from database.
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

export default RulesManager;
