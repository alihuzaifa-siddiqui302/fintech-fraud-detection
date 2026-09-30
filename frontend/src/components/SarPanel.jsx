import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Zap,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Download,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Loader2,
  FileCheck,
  CheckCircle2,
  Cpu,
  Clock,
} from 'lucide-react';
import { generateSar, getSarReports, updateSarStatus } from '../api/api';
import { useToast } from '../context/ToastContext';
import clsx from 'clsx';

const GENERATING_STAGES = [
  '🔍 Analyzing transaction signals...',
  '📡 Querying IP intelligence data...',
  '⚖️ Evaluating regulatory criteria...',
  '✍️ Drafting SAR narrative...',
  '✅ Finalizing report...',
];

export const SarPanel = ({ transactionId, transactionStatus }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [reports, setReports] = useState([]);
  const [activeReport, setActiveReport] = useState(null);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);

  const toast = useToast();
  const stageTimerRef = useRef(null);
  const progressTimerRef = useRef(null);

  // Load existing SAR reports when transactionId changes or panel is expanded
  useEffect(() => {
    if (!transactionId) return;

    let isMounted = true;
    const fetchReports = async () => {
      setLoadingInitial(true);
      setError(null);
      try {
        const data = await getSarReports(transactionId);
        if (isMounted) {
          setReports(data || []);
          if (data && data.length > 0) {
            setActiveReport(data[0]);
          } else {
            setActiveReport(null);
          }
        }
      } catch (err) {
        if (isMounted) {
          console.warn('Failed to load existing SAR reports:', err);
        }
      } finally {
        if (isMounted) setLoadingInitial(false);
      }
    };

    fetchReports();

    return () => {
      isMounted = false;
      if (stageTimerRef.current) clearInterval(stageTimerRef.current);
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [transactionId]);

  // Clean timers on unmount
  useEffect(() => {
    return () => {
      if (stageTimerRef.current) clearInterval(stageTimerRef.current);
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, []);

  const handleStartGenerate = async () => {
    setGenerating(true);
    setError(null);
    setShowRegenConfirm(false);
    setStageIndex(0);
    setProgress(5);

    // Stage cycler (every 2.5s)
    stageTimerRef.current = setInterval(() => {
      setStageIndex((prev) => (prev + 1) % GENERATING_STAGES.length);
    }, 2500);

    // Progress bar fill (simulates ~12-15s max, caps at 95% until complete)
    progressTimerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 92) return 92;
        return prev + Math.floor(Math.random() * 8) + 4;
      });
    }, 800);

    try {
      const newReport = await generateSar(transactionId);
      setProgress(100);
      setActiveReport(newReport);
      setReports((prev) => [newReport, ...prev.filter((r) => r.id !== newReport.id)]);
      toast?.success?.('FinCEN SAR narrative generated successfully via Gemini 2.0 Flash');
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to generate SAR narrative';
      setError(msg);
      toast?.error?.(msg);
    } finally {
      clearInterval(stageTimerRef.current);
      clearInterval(progressTimerRef.current);
      setGenerating(false);
    }
  };

  const handleUpdateStatus = async (nextStatus) => {
    if (!activeReport) return;
    setUpdatingStatus(true);
    try {
      const updated = await updateSarStatus(activeReport.id, nextStatus, '');
      setActiveReport(updated);
      setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      toast?.success?.(`SAR status updated to ${nextStatus}`);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to update SAR status';
      toast?.error?.(msg);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleCopy = () => {
    if (!activeReport?.reportText) return;
    navigator.clipboard.writeText(activeReport.reportText);
    setCopied(true);
    toast?.success?.('SAR report narrative copied to clipboard');
    setTimeout(() => setCopied(false), 2200);
  };

  const handleExportTxt = () => {
    if (!activeReport?.reportText) return;
    const blob = new Blob([activeReport.reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const dateStr = new Date().toISOString().slice(0, 10);
    const txnShort = (transactionId || 'UNKNOWN').substring(0, 8);
    const filename = `SAR_${txnShort}_${dateStr}.txt`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast?.success?.(`Downloaded ${filename}`);
  };

  const formatRelativeTime = (dateString) => {
    if (!dateString) return 'Just now';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="pt-4 border-t border-slate-700/60 mt-4">
      {/* Compliance Section Header & Toggle */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-left group focus:outline-none"
        >
          <div className="p-1 rounded bg-indigo-950/60 border border-indigo-700/50 text-indigo-400 group-hover:text-indigo-300 transition-colors">
            <FileText className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors flex items-center gap-2">
              Compliance Documents
              {activeReport && (
                <span
                  className={clsx(
                    'text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold',
                    activeReport.status === 'FILED'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : activeReport.status === 'FINAL'
                      ? 'bg-blue-950 text-blue-300 border border-blue-800'
                      : 'bg-slate-700/80 text-slate-300 border border-slate-600'
                  )}
                >
                  SAR {activeReport.status}
                </span>
              )}
            </span>
            <p className="text-[10px] text-slate-400">FinCEN Suspicious Activity Report (AI SAR)</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 text-slate-400 hover:text-slate-200 transition-colors rounded hover:bg-slate-800"
          aria-label={isExpanded ? 'Collapse compliance section' : 'Expand compliance section'}
        >
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* Expandable Container */}
      {isExpanded && (
        <div className="space-y-3 bg-slate-900/60 border border-slate-800/90 rounded-xl p-3.5 transition-all">
          {/* Loading Initial Data */}
          {loadingInitial && !generating && (
            <div className="py-6 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
              <span>Checking compliance documents...</span>
            </div>
          )}

          {/* STATE 2: GENERATING (Loading / Progress Bar / Cycling Stages) */}
          {generating && (
            <div className="py-5 px-3 rounded-lg bg-indigo-950/20 border border-indigo-800/40 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-indigo-300 flex items-center gap-1.5 animate-pulse">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  Generating Regulatory Narrative
                </span>
                <span className="text-[11px] font-mono text-indigo-400">{progress}%</span>
              </div>

              {/* Linear Progress Bar */}
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Cycling animated stage text */}
              <div className="text-center py-1">
                <p className="text-xs text-slate-300 font-medium tracking-wide">
                  {GENERATING_STAGES[stageIndex]}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">
                  Gemini 2.0 Flash is synthesizing rule violations, telemetry & BSA guidelines
                </p>
              </div>
            </div>
          )}

          {/* STATE 4: ERROR */}
          {!generating && error && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/60 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="text-xs text-red-200">
                  <p className="font-semibold">Generation Failed</p>
                  <p className="text-red-300/90 text-[11px] mt-0.5">{error}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleStartGenerate}
                className="px-2.5 py-1 rounded bg-red-800/80 hover:bg-red-700 text-white text-[11px] font-medium transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* STATE 1: IDLE (No SAR on file) */}
          {!loadingInitial && !generating && !error && !activeReport && (
            <div className="py-6 px-4 rounded-lg bg-slate-900/80 border border-slate-800 flex flex-col items-center text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-slate-800/90 border border-slate-700/60 flex items-center justify-center text-slate-400">
                <FileText className="w-5 h-5 opacity-60" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-semibold text-slate-200">No SAR on file</h4>
                <p className="text-[11px] text-slate-400 max-w-xs">
                  Generate a FinCEN-compliant narrative using Google Gemini 2.0 Flash based on all
                  detected risk heuristics.
                </p>
              </div>

              <div className="pt-1 flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleStartGenerate}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-950/40 transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>Generate SAR</span>
                </button>
                <span className="text-[10px] text-slate-500 font-mono">
                  gemini-2.0-flash · ~3 seconds
                </span>
              </div>
            </div>
          )}

          {/* STATE 3: SAR REPORT EXISTS */}
          {!generating && !error && activeReport && (
            <div className="space-y-3">
              {/* Metadata row */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-purple-950/70 border border-purple-800/60 text-purple-300 font-mono text-[10px] font-semibold flex items-center gap-1">
                    <Cpu className="w-3 h-3 text-purple-400" />
                    {activeReport.modelUsed || 'gemini-2.0-flash'}
                  </span>
                  <span className="text-slate-400 text-[10px] font-mono">
                    ↑{activeReport.promptTokenCount || 0} ↓{activeReport.outputTokenCount || 0} tok
                  </span>
                  {activeReport.generationMs && (
                    <span className="text-slate-400 text-[10px] font-mono">
                      {activeReport.generationMs}ms
                    </span>
                  )}
                </div>

                {/* Status + Action Button */}
                <div className="flex items-center gap-2">
                  {activeReport.status === 'DRAFT' && (
                    <>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-700 text-slate-200">
                        DRAFT
                      </span>
                      <button
                        type="button"
                        disabled={updatingStatus}
                        onClick={() => handleUpdateStatus('FINAL')}
                        className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
                      >
                        {updatingStatus ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                        <span>Mark as Final</span>
                      </button>
                    </>
                  )}

                  {activeReport.status === 'FINAL' && (
                    <>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-950 border border-blue-800 text-blue-300">
                        FINAL
                      </span>
                      <button
                        type="button"
                        disabled={updatingStatus}
                        onClick={() => handleUpdateStatus('FILED')}
                        className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
                      >
                        {updatingStatus ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                        <span>Mark as Filed</span>
                      </button>
                    </>
                  )}

                  {activeReport.status === 'FILED' && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 border border-emerald-800 text-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      Filed {formatRelativeTime(activeReport.filedAt || activeReport.updatedAt)}
                    </span>
                  )}
                </div>
              </div>

              {/* Subtitle with author info */}
              <div className="text-[10px] text-slate-400 flex items-center justify-between">
                <span>
                  Generated {formatRelativeTime(activeReport.createdAt)}
                  {activeReport.generatedByEmail && (
                    <> by <span className="text-slate-300 font-medium">{activeReport.generatedByEmail}</span></>
                  )}
                </span>
                {reports.length > 1 && (
                  <span className="text-indigo-400 font-medium">
                    Revision 1 of {reports.length}
                  </span>
                )}
              </div>

              {/* Narrative Text Box */}
              <div className="relative group">
                <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 max-h-[300px] overflow-y-auto font-mono text-[11.5px] leading-relaxed text-slate-200 select-text whitespace-pre-wrap selection:bg-indigo-900 selection:text-white scrollbar-thin scrollbar-thumb-slate-700">
                  {activeReport.reportText}
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="pt-1 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors inline-flex items-center gap-1.5"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied!' : 'Copy Report'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportTxt}
                    className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors inline-flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export .txt</span>
                  </button>
                </div>

                {/* Regenerate Action */}
                {!showRegenConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowRegenConfirm(true)}
                    className="text-xs text-slate-400 hover:text-slate-200 transition-colors inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-800"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Regenerate</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 bg-slate-800/90 p-1 rounded-lg border border-slate-700">
                    <span className="text-[10px] text-amber-300 font-medium px-1">Replace existing?</span>
                    <button
                      type="button"
                      onClick={handleStartGenerate}
                      className="px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-semibold"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowRegenConfirm(false)}
                      className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 text-[10px]"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SarPanel;
