import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ChevronDown,
  ChevronRight,
  Loader2,
  AlertTriangle,
  Ban,
  Globe,
  Monitor,
  Cpu,
} from 'lucide-react';
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { adjudicateTransaction, addBlacklist, getTransactionDetail } from '../api/api';
import { useToast } from '../context/ToastContext';
import StatusBadge from './StatusBadge';
import CopyButton from './CopyButton';
import CountryFlag from './CountryFlag';
import clsx from 'clsx';

const ALL_SYSTEM_RULES = [
  { code: 'IP_GEO_HIGH_RISK', name: 'High Risk Geolocation' },
  { code: 'IP_IS_VPN', name: 'VPN Anonymizer Detected' },
  { code: 'IP_IS_TOR', name: 'Tor Exit Node Detected' },
  { code: 'IP_IS_PROXY', name: 'Public Proxy Detected' },
  { code: 'IP_IS_HOSTING', name: 'Datacenter / Hosting IP' },
  { code: 'IP_RISK_SCORE_HIGH', name: 'Elevated IPQS Fraud Score' },
  { code: 'VELOCITY_CARD_1M', name: 'Card 1-Minute Velocity Spike' },
  { code: 'VELOCITY_CARD_1H', name: 'Card 1-Hour Velocity Spike' },
  { code: 'VELOCITY_CARD_24H', name: 'Card 24-Hour Velocity Spike' },
  { code: 'VELOCITY_IP_1H', name: 'IP 1-Hour Velocity Burst' },
  { code: 'VELOCITY_DEVICE_24H', name: 'Device 24-Hour Velocity Burst' },
  { code: 'TIME_ON_PAGE_TOO_FAST', name: 'Automated Bot Page Duration' },
  { code: 'CLIPBOARD_PASTE_DETECTED', name: 'Clipboard Paste Injection' },
  { code: 'BROWSER_TIMEZONE_MISMATCH', name: 'Browser Timezone Discrepancy' },
  { code: 'HEADLESS_BROWSER_DETECTED', name: 'Headless / Automated Browser' },
  { code: 'KEYSTROKE_ZERO_VARIANCE', name: 'Robotic Keystroke Rhythm' },
  { code: 'HIGH_TRANSACTION_AMOUNT', name: 'High Financial Value' },
  { code: 'NEW_DEVICE_FIRST_SEEN', name: 'Unrecognized Device Fingerprint' },
  { code: 'REPEATED_DECLINE_SPIKE', name: 'Repeated Decline Velocity' },
  { code: 'TRANSACTION_AFTER_HOURS', name: 'Off-Hours Anomalous Window' },
];

export const ForensicDrawer = ({ transaction: initialTransaction, isOpen, onClose, onAdjudicated }) => {
  const [transaction, setTransaction] = useState(initialTransaction);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showPassedRules, setShowPassedRules] = useState(false);

  // Adjudication state
  const [notes, setNotes] = useState('');
  const [submittingAction, setSubmittingAction] = useState(null);

  // Blacklist IP inline mini form
  const [showBlacklistForm, setShowBlacklistForm] = useState(false);
  const [blacklistReason, setBlacklistReason] = useState('Flagged during forensic investigation');
  const [submittingBlacklist, setSubmittingBlacklist] = useState(false);

  const toast = useToast();

  useEffect(() => {
    if (initialTransaction?.id && isOpen) {
      setTransaction(initialTransaction);
      setNotes('');
      setShowBlacklistForm(false);

      // Fetch fresh detail
      const fetchDetail = async () => {
        setLoadingDetail(true);
        try {
          const detail = await getTransactionDetail(initialTransaction.id);
          setTransaction(detail);
        } catch {
          // Keep initial transaction if detail fetch fails
        } finally {
          setLoadingDetail(false);
        }
      };
      fetchDetail();
    }
  }, [initialTransaction?.id, isOpen]);

  if (!isOpen || !transaction) return null;

  const score = transaction.riskScore || 0;
  let gaugeColor = '#10b981'; // emerald
  if (score >= 70) {
    gaugeColor = '#ef4444'; // red
  } else if (score >= 30) {
    gaugeColor = '#f59e0b'; // amber
  }

  const triggeredRules = (transaction.triggeredRules || []).sort(
    (a, b) => (b.pointsApplied || 0) - (a.pointsApplied || 0)
  );

  const triggeredCodes = new Set(triggeredRules.map((r) => r.ruleCode));
  const passedRules = ALL_SYSTEM_RULES.filter((r) => !triggeredCodes.has(r.code));

  const handleAdjudicate = async (action) => {
    if (notes.trim().length < 5) {
      toast.error('Resolution notes must be at least 5 characters long.');
      return;
    }

    setSubmittingAction(action);
    try {
      const updated = await adjudicateTransaction(transaction.id, action, notes.trim());
      setTransaction(updated);
      toast.success(
        `Transaction has been successfully ${action === 'APPROVE' ? 'approved' : 'blocked'}.`,
        'Adjudication Submitted'
      );
      if (onAdjudicated) {
        onAdjudicated(updated);
      }
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Adjudication failed';
      toast.error(msg, 'Adjudication Error');
    } finally {
      setSubmittingAction(null);
    }
  };

  const handleAddBlacklist = async (e) => {
    e.preventDefault();
    if (!transaction.ipAddress) return;

    setSubmittingBlacklist(true);
    try {
      await addBlacklist('IP', transaction.ipAddress, blacklistReason);
      toast.success(`IP ${transaction.ipAddress} added to global blacklist.`, 'Blacklist Updated');
      setShowBlacklistForm(false);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to blacklist IP';
      toast.error(msg);
    } finally {
      setSubmittingBlacklist(false);
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Dimmed backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity duration-300"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-xl bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col h-full overflow-hidden text-slate-100 animate-slide-in-right">
          {/* HEADER */}
          <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 backdrop-blur-md">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-sm font-bold text-white truncate max-w-[260px]">
                  {transaction.id}
                </span>
                <CopyButton text={transaction.id} label="Copy full UUID" />
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={transaction.status} size="sm" />
                <span className="text-[11px] text-slate-400 font-mono">
                  {formatDateTime(transaction.createdAt)}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
              aria-label="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* SCROLLABLE BODY */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* SECTION 1 — Risk Score Gauge */}
            <div className="bg-slate-800/40 rounded-2xl border border-slate-800 p-5 flex flex-col items-center relative overflow-hidden">
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-2">
                Composite Risk Assessment
              </span>

              <div className="w-full h-40 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height={160}>
                  <RadialBarChart
                    cx="50%"
                    cy="85%"
                    innerRadius="75%"
                    outerRadius="105%"
                    barSize={16}
                    data={[{ name: 'RiskScore', value: score, fill: gaugeColor }]}
                    startAngle={180}
                    endAngle={0}
                  >
                    <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                    <RadialBar background={{ fill: '#1e293b' }} dataKey="value" cornerRadius={8} />
                  </RadialBarChart>
                </ResponsiveContainer>

                <div className="absolute top-[48%] flex flex-col items-center">
                  <span className="text-4xl font-extrabold tracking-tight font-mono text-white">
                    {score}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">/ 100</span>
                </div>
              </div>

              <div className="mt-2 text-center">
                <span
                  className={clsx(
                    'text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider',
                    score >= 70 && 'text-red-400 bg-red-500/10 border border-red-500/20',
                    score >= 30 && score < 70 && 'text-amber-400 bg-amber-500/10 border border-amber-500/20',
                    score < 30 && 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                  )}
                >
                  {score >= 70 ? 'High Risk Threat' : score >= 30 ? 'Suspicious Activity' : 'Clean Transaction'}
                </span>
              </div>
            </div>

            {/* SECTION 2 — Rule Breakdown */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <span>Risk Signals</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-brand-500/10 text-brand-300 border border-brand-500/20">
                    {triggeredRules.length} triggered
                  </span>
                </h3>
              </div>

              {/* Triggered Rules */}
              {triggeredRules.length > 0 ? (
                <div className="space-y-2.5">
                  {triggeredRules.map((rule, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <span className="w-2 h-2 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                          <div>
                            <h4 className="text-xs font-semibold text-slate-200">
                              {rule.ruleName || rule.ruleCode}
                            </h4>
                            <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
                              {rule.reason || 'Threshold constraint exceeded during risk evaluation'}
                            </p>
                          </div>
                        </div>

                        <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 text-xs font-mono font-semibold flex-shrink-0">
                          +{rule.pointsApplied} pts
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full h-1 bg-slate-700/60 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500 rounded-full"
                          style={{ width: `${Math.min(100, Math.max(10, rule.pointsApplied))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>All heuristics evaluated within nominal risk parameters.</span>
                </div>
              )}

              {/* Passed Rules Collapse */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowPassedRules(!showPassedRules)}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 font-medium transition-colors"
                >
                  {showPassedRules ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {showPassedRules ? 'Hide' : 'Show'} {passedRules.length} passed checks
                  </span>
                </button>

                {showPassedRules && (
                  <div className="mt-3 space-y-1.5 pl-2 border-l border-slate-800">
                    {passedRules.map((pr) => (
                      <div
                        key={pr.code}
                        className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-slate-800/30 text-xs text-slate-400"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span>{pr.name}</span>
                        </div>
                        <span className="text-[11px] text-emerald-400 font-mono">✓ passed</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 3 — Intelligence Chips */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Globe className="w-4 h-4 text-brand-400" />
                <span>Forensic Intelligence</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* IP Address */}
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 block text-[11px]">IP Address</span>
                    <span className="font-mono text-slate-200">{transaction.ipAddress || '127.0.0.1'}</span>
                  </div>
                  <CopyButton text={transaction.ipAddress} />
                </div>

                {/* Country + Flag */}
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                  <span className="text-slate-400 block text-[11px]">Origin Location</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <CountryFlag countryCode={transaction.ipCountry} />
                    <span className="text-slate-200">{transaction.ipCity || 'Unknown City'}</span>
                  </div>
                </div>

                {/* VPN */}
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-between">
                  <span className="text-slate-400">VPN Endpoint</span>
                  <span
                    className={clsx(
                      'px-2 py-0.5 rounded-full font-mono text-[11px]',
                      transaction.isVpn
                        ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                        : 'bg-slate-700/50 text-slate-400'
                    )}
                  >
                    {transaction.isVpn ? 'Yes (Detected)' : 'No'}
                  </span>
                </div>

                {/* Tor */}
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-between">
                  <span className="text-slate-400">Tor Exit Node</span>
                  <span
                    className={clsx(
                      'px-2 py-0.5 rounded-full font-mono text-[11px]',
                      transaction.isTor
                        ? 'bg-red-500/15 text-red-400 border border-red-500/30 font-bold'
                        : 'bg-slate-700/50 text-slate-400'
                    )}
                  >
                    {transaction.isTor ? 'Yes (Tor)' : 'No'}
                  </span>
                </div>

                {/* Proxy */}
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-between">
                  <span className="text-slate-400">Proxy Active</span>
                  <span
                    className={clsx(
                      'px-2 py-0.5 rounded-full font-mono text-[11px]',
                      transaction.isProxy
                        ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                        : 'bg-slate-700/50 text-slate-400'
                    )}
                  >
                    {transaction.isProxy ? 'Yes' : 'No'}
                  </span>
                </div>

                {/* IPQS Score */}
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-between">
                  <span className="text-slate-400">IPQS Reputation</span>
                  <span
                    className={clsx(
                      'font-mono font-semibold',
                      (transaction.ipqsFraudScore || 0) >= 75
                        ? 'text-red-400'
                        : (transaction.ipqsFraudScore || 0) >= 30
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    )}
                  >
                    {transaction.ipqsFraudScore ?? 0} / 100
                  </span>
                </div>

                {/* Hosting */}
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-between">
                  <span className="text-slate-400">Datacenter / Hosting</span>
                  <span className="text-slate-300 font-mono">
                    {transaction.isHostingIp ? 'Yes (Cloud)' : 'Residential / ISP'}
                  </span>
                </div>

                {/* Device Type / Browser / OS */}
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                  <span className="text-slate-400 block text-[11px]">Client Platform</span>
                  <span className="text-slate-200 truncate block mt-0.5">
                    {transaction.deviceType || 'DESKTOP'} • {transaction.browser || 'Browser'} (
                    {transaction.os || 'OS'})
                  </span>
                </div>

                {/* Fingerprint */}
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 sm:col-span-2 flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <span className="text-slate-400 block text-[11px]">Device Fingerprint Hash</span>
                    <span className="font-mono text-slate-300 truncate block">
                      {transaction.deviceFingerprint
                        ? transaction.deviceFingerprint.substring(0, 24) + '...'
                        : 'None'}
                    </span>
                  </div>
                  <CopyButton text={transaction.deviceFingerprint} />
                </div>

                {/* Time on Page */}
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-between">
                  <span className="text-slate-400">Time on Page</span>
                  <span
                    className={clsx(
                      'font-mono',
                      (transaction.timeOnPageMs || 0) < 2000 ? 'text-red-400 font-semibold' : 'text-slate-300'
                    )}
                  >
                    {transaction.timeOnPageMs ? `${transaction.timeOnPageMs}ms` : 'N/A'}
                  </span>
                </div>

                {/* Paste Detected */}
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-between">
                  <span className="text-slate-400">Paste Detected</span>
                  <span
                    className={clsx(
                      'font-mono',
                      transaction.pasteDetected ? 'text-red-400 font-semibold' : 'text-slate-400'
                    )}
                  >
                    {transaction.pasteDetected ? 'Yes (Clipboard)' : 'No'}
                  </span>
                </div>

                {/* Timezone Match */}
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-between">
                  <span className="text-slate-400">Timezone Align</span>
                  <span
                    className={clsx(
                      'font-mono',
                      transaction.timezoneMismatch ? 'text-red-400 font-semibold' : 'text-emerald-400'
                    )}
                  >
                    {transaction.timezoneMismatch ? 'Mismatch Flag' : 'Aligned'}
                  </span>
                </div>

                {/* Headless */}
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-between">
                  <span className="text-slate-400">Headless Driver</span>
                  <span
                    className={clsx(
                      'font-mono',
                      transaction.isHeadless ? 'text-red-400 font-semibold' : 'text-slate-400'
                    )}
                  >
                    {transaction.isHeadless ? 'Bot Automation' : 'Normal'}
                  </span>
                </div>
              </div>
            </div>

            {/* SECTION 4 — Analyst Actions */}
            {transaction.status === 'PENDING_REVIEW' && (
              <div className="bg-slate-800/60 rounded-2xl border border-amber-500/40 p-5 space-y-4">
                <div className="flex items-center gap-2 text-amber-400">
                  <Clock className="w-4 h-4" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider">
                    Manual Adjudication Required
                  </h3>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Resolution Notes (Required)
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter compliance rationale, evidence, or customer verification details..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all placeholder-slate-500"
                  />
                  <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1">
                    <span>Minimum 5 characters required</span>
                    <span className={notes.length < 5 ? 'text-amber-400' : 'text-emerald-400'}>
                      {notes.length} characters
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    disabled={submittingAction !== null || notes.trim().length < 5}
                    onClick={() => handleAdjudicate('APPROVE')}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-xs shadow-md shadow-emerald-950 transition-all"
                  >
                    {submittingAction === 'APPROVE' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span>Approve Transaction</span>
                  </button>

                  <button
                    type="button"
                    disabled={submittingAction !== null || notes.trim().length < 5}
                    onClick={() => handleAdjudicate('BLOCK')}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-medium text-xs shadow-md shadow-red-950 transition-all"
                  >
                    {submittingAction === 'BLOCK' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ShieldAlert className="w-4 h-4" />
                    )}
                    <span>Block Transaction</span>
                  </button>
                </div>

                {/* Secondary Blacklist IP Action */}
                <div className="pt-2 border-t border-slate-700/60">
                  {!showBlacklistForm ? (
                    <button
                      type="button"
                      onClick={() => setShowBlacklistForm(true)}
                      className="text-xs text-red-400 hover:text-red-300 font-medium inline-flex items-center gap-1.5 transition-colors"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>Blacklist this IP ({transaction.ipAddress})</span>
                    </button>
                  ) : (
                    <form onSubmit={handleAddBlacklist} className="space-y-2 mt-2">
                      <label className="block text-[11px] text-slate-300 font-medium">
                        Blacklist Reason:
                      </label>
                      <input
                        type="text"
                        required
                        value={blacklistReason}
                        onChange={(e) => setBlacklistReason(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-red-500"
                      />
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="submit"
                          disabled={submittingBlacklist}
                          className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold disabled:opacity-50"
                        >
                          {submittingBlacklist ? 'Adding...' : 'Confirm Blacklist'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowBlacklistForm(false)}
                          className="px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}

            {/* Resolved Information if already adjudicated */}
            {transaction.status !== 'PENDING_REVIEW' && transaction.reviewedByName && (
              <div className="bg-slate-800/40 rounded-xl border border-slate-800 p-4 text-xs space-y-1.5">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 block">
                  Adjudication Audit
                </span>
                <p className="text-slate-300">
                  Resolved by <span className="font-semibold text-white">{transaction.reviewedByName}</span>
                </p>
                {transaction.resolutionNotes && (
                  <p className="text-slate-400 italic">"{transaction.resolutionNotes}"</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForensicDrawer;
