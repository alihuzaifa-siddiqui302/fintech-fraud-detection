import React, { useState } from 'react';
import {
  CreditCard,
  Globe,
  Lock,
  Smartphone,
  Bot,
  Zap,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Loader2,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';
import { submitCheckout, getOtpStatus } from '../../api/api';
import { useSessionSignals } from '../../hooks/useSessionSignals';
import { useDeviceFingerprint } from '../../hooks/useDeviceFingerprint';
import { useToast } from '../../context/ToastContext';
import RiskScorePill from '../../components/RiskScorePill';
import OtpVerificationModal from '../../components/OtpVerificationModal';
import clsx from 'clsx';

export const Checkout = () => {
  const [amount, setAmount] = useState('150.00');
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [latencyMs, setLatencyMs] = useState(null);

  // Sandbox simulation toggles
  const [simulateForeignIp, setSimulateForeignIp] = useState(false);
  const [simulateVpn, setSimulateVpn] = useState(false);
  const [simulateNewDevice, setSimulateNewDevice] = useState(false);
  const [simulateHeadless, setSimulateHeadless] = useState(false);

  // Velocity attack state
  const [velocityInProgress, setVelocityInProgress] = useState(false);
  const [velocityProgress, setVelocityProgress] = useState(0);

  // 3DS OTP Step-Up Modal state
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpData, setOtpData] = useState(null);

  const { getSignals } = useSessionSignals();
  const { fingerprint } = useDeviceFingerprint();
  const toast = useToast();

  const buildPayload = (overrideAmount) => {
    const signals = getSignals();
    return {
      amount: parseFloat(overrideAmount || amount),
      currency: currency,
      deviceFingerprint: simulateNewDevice
        ? 'sim_fp_' + Math.random().toString(36).substring(2, 12)
        : fingerprint || 'fp_default_client',
      deviceType: /Mobi|Android/i.test(navigator.userAgent) ? 'MOBILE' : 'DESKTOP',
      browser: 'Chrome',
      os: 'Windows',
      timeOnPageMs: signals.timeOnPageMs,
      pasteDetected: signals.pasteDetected,
      timezoneOffsetMinutes: new Date().getTimezoneOffset(),
      browserTimezone: signals.browserTimezone,
      screenResolution: signals.screenResolution,
      mouseMovementCount: signals.mouseMovementCount,
      keystrokeVariance: signals.keystrokeVariance,
      isHeadless: simulateHeadless || signals.isHeadless,
      simulateForeignIp,
      simulateVpn,
      simulateNewDevice,
    };
  };

  const handleCheckout = async (e) => {
    if (e) e.preventDefault();
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid transaction amount greater than 0');
      return;
    }

    setLoading(true);
    const start = performance.now();

    try {
      const payload = buildPayload();
      const response = await submitCheckout(payload);
      const elapsed = Math.round(performance.now() - start);

      setResult(response);
      setLatencyMs(elapsed);

      if (response.status === 'APPROVED') {
        toast.success(`Transaction approved with score ${response.riskScore}`, 'Checkout Approved');
      } else if (response.status === 'OTP_REQUIRED') {
        toast.info(
          "Security verification required. A 6-digit code has been dispatched to your email.",
          "3D Secure Step-Up"
        );
        const txnId = response.otpTransactionId || response.transactionId;
        try {
          const statusResp = await getOtpStatus(txnId);
          setOtpData({
            transactionId: txnId,
            maskedEmail: statusResp.maskedEmail,
            expiresAt: statusResp.expiresAt,
          });
        } catch {
          setOtpData({
            transactionId: txnId,
            maskedEmail: 'your registered email',
            expiresAt: null,
          });
        }
        setShowOtpModal(true);
      } else if (response.status === 'PENDING_REVIEW') {
        toast.warning('Transaction flagged for compliance investigation', 'Hold for Review');
      } else {
        toast.error('Transaction blocked due to elevated risk indicators', 'Payment Declined');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to process checkout transaction';
      toast.error(msg, 'Transaction Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSuccess = (verificationResult) => {
    setShowOtpModal(false);
    setResult((prev) => ({
      ...prev,
      status: 'APPROVED',
      statusColor: 'green',
      statusMessage: 'Transaction approved after 3DS identity verification.',
    }));
    toast.success('3D Secure verification passed! Payment approved.', 'Verification Success');
  };

  const handleOtpBlocked = (reason) => {
    setShowOtpModal(false);
    setResult((prev) => ({
      ...prev,
      status: 'BLOCKED',
      statusColor: 'red',
      statusMessage: reason || 'Transaction declined due to failed 3D Secure verification.',
    }));
    toast.error(reason || 'Verification failed. Transaction declined.', 'Payment Declined');
  };

  const handleVelocityAttack = async () => {
    setVelocityInProgress(true);
    setVelocityProgress(0);
    toast.warning('Initiating 5 rapid consecutive checkout transactions...', 'Velocity Simulator');

    const totalRequests = 5;
    for (let i = 1; i <= totalRequests; i++) {
      try {
        const start = performance.now();
        const payload = buildPayload(amount);
        const resp = await submitCheckout(payload);
        const elapsed = Math.round(performance.now() - start);
        setResult(resp);
        setLatencyMs(elapsed);
        setVelocityProgress((i / totalRequests) * 100);
      } catch (err) {
        toast.error(`Velocity burst ${i} encountered an error`);
      }

      if (i < totalRequests) {
        await new Promise((res) => setTimeout(res, 300));
      }
    }

    toast.info('Velocity attack simulation completed. Velocity rules triggered.');
    setVelocityInProgress(false);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
          <CreditCard className="w-6 h-6 text-brand-400" />
          <span>Checkout Simulator</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Execute simulated payments with real-time biometric and telemetry fraud risk evaluation.
        </p>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Transaction Input (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800">
            <div>
              <h2 className="text-base font-semibold text-white">New Transaction</h2>
              <p className="text-xs text-slate-400">Specify payment amount and currency details</p>
            </div>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-brand-400 border border-indigo-500/20">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>

          <form onSubmit={handleCheckout} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Amount
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-mono text-sm">
                    $
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 font-mono text-base focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all font-mono"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="INR">INR (₹)</option>
                  <option value="AED">AED (د.إ)</option>
                </select>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 text-xs text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Active Device Fingerprint:</span>
                <span className="font-mono text-slate-300">
                  {fingerprint ? fingerprint.substring(0, 16) + '...' : 'Calculating...'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Client Telemetry:</span>
                <span className="text-emerald-400 font-mono">20 behavioral signals active</span>
              </div>
            </div>

            <button
              id="submit-checkout-button"
              type="submit"
              disabled={loading || velocityInProgress}
              className="w-full py-3.5 px-6 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:bg-brand-500/50 text-white font-semibold text-sm shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2 transition-all duration-200"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Evaluating Risk Pipeline...</span>
                </>
              ) : (
                <>
                  <span>Submit Payment</span>
                  <Zap className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Sandbox Controls (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/90 rounded-2xl border border-amber-500/40 p-6 shadow-xl relative overflow-hidden backdrop-blur-sm">
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-lg">🧪</span>
              <h2 className="text-base font-semibold text-white">Sandbox Controls</h2>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
              Testing Mode
            </span>
          </div>

          <div className="space-y-3 mb-6">
            {/* Toggle 1: Foreign IP */}
            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 cursor-pointer hover:bg-slate-800 transition-colors">
              <div className="flex items-center gap-3">
                <Globe className="w-4 h-4 text-indigo-400" />
                <div>
                  <p className="text-xs font-medium text-slate-200">Foreign IP</p>
                  <p className="text-[11px] text-slate-400">Simulate traffic from Russia (High Risk Geo)</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={simulateForeignIp}
                onChange={(e) => setSimulateForeignIp(e.target.checked)}
                className="w-4 h-4 rounded text-brand-500 bg-slate-900 border-slate-700 focus:ring-brand-500"
              />
            </label>

            {/* Toggle 2: VPN Active */}
            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 cursor-pointer hover:bg-slate-800 transition-colors">
              <div className="flex items-center gap-3">
                <Lock className="w-4 h-4 text-amber-400" />
                <div>
                  <p className="text-xs font-medium text-slate-200">VPN Active</p>
                  <p className="text-[11px] text-slate-400">Route through anonymizing VPN endpoint</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={simulateVpn}
                onChange={(e) => setSimulateVpn(e.target.checked)}
                className="w-4 h-4 rounded text-brand-500 bg-slate-900 border-slate-700 focus:ring-brand-500"
              />
            </label>

            {/* Toggle 3: New Device */}
            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 cursor-pointer hover:bg-slate-800 transition-colors">
              <div className="flex items-center gap-3">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <div>
                  <p className="text-xs font-medium text-slate-200">New Device</p>
                  <p className="text-[11px] text-slate-400">Randomise device fingerprint hash</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={simulateNewDevice}
                onChange={(e) => setSimulateNewDevice(e.target.checked)}
                className="w-4 h-4 rounded text-brand-500 bg-slate-900 border-slate-700 focus:ring-brand-500"
              />
            </label>

            {/* Toggle 4: Headless Mode */}
            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 cursor-pointer hover:bg-slate-800 transition-colors">
              <div className="flex items-center gap-3">
                <Bot className="w-4 h-4 text-rose-400" />
                <div>
                  <p className="text-xs font-medium text-slate-200">Headless Mode</p>
                  <p className="text-[11px] text-slate-400">Simulate automated bot / selenium browser</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={simulateHeadless}
                onChange={(e) => setSimulateHeadless(e.target.checked)}
                className="w-4 h-4 rounded text-brand-500 bg-slate-900 border-slate-700 focus:ring-brand-500"
              />
            </label>
          </div>

          {/* Velocity Attack Button */}
          <div>
            <button
              type="button"
              disabled={velocityInProgress || loading}
              onClick={handleVelocityAttack}
              className="w-full py-3 px-4 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span>⚡ Velocity Attack (×5)</span>
            </button>

            {velocityInProgress && (
              <div className="mt-3 space-y-1.5">
                <div className="flex justify-between text-[11px] text-amber-300">
                  <span>Firing velocity burst...</span>
                  <span className="font-mono">{Math.round(velocityProgress)}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 transition-all duration-300"
                    style={{ width: `${velocityProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Result Card */}
      {result && (
        <div
          className={clsx(
            'rounded-2xl border p-6 transition-all duration-300 shadow-2xl',
            result.status === 'APPROVED' && 'bg-emerald-950/20 border-emerald-500/40',
            result.status === 'PENDING_REVIEW' && 'bg-amber-950/20 border-amber-500/40',
            result.status === 'BLOCKED' && 'bg-red-950/20 border-red-500/40'
          )}
        >
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              {result.status === 'APPROVED' && (
                <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
              )}
              {result.status === 'PENDING_REVIEW' && (
                <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
                  <Clock className="w-8 h-8" />
                </div>
              )}
              {result.status === 'BLOCKED' && (
                <div className="p-3 rounded-2xl bg-red-500/20 text-red-400 border border-red-500/40">
                  <ShieldAlert className="w-8 h-8" />
                </div>
              )}

              <div>
                <h3 className="text-xl font-bold text-white">
                  {result.status === 'APPROVED' && 'Transaction Approved'}
                  {result.status === 'PENDING_REVIEW' && 'Held for Review'}
                  {result.status === 'BLOCKED' && 'Transaction Declined'}
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Txn ID: {result.transactionId}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <RiskScorePill score={result.riskScore} showLabel size="md" />
              {latencyMs !== null && (
                <span className="text-xs text-slate-400 font-mono bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
                  Processed in {latencyMs}ms
                </span>
              )}
            </div>
          </div>

          {/* Status Message */}
          <p className="text-sm text-slate-300 mt-4 leading-relaxed">
            {result.status === 'PENDING_REVIEW'
              ? 'Your transaction is under compliance review. Funds are temporarily on hold.'
              : result.statusMessage}
          </p>

          {/* Triggered Rules Breakdown */}
          {result.triggeredRules && result.triggeredRules.length > 0 ? (
            <div className="mt-6 pt-4 border-t border-slate-800/80">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Triggered Risk Rules ({result.triggeredRules.length})
                </h4>
                <span className="text-xs text-slate-500">
                  {result.totalRulesEvaluated || 20} checks executed
                </span>
              </div>

              <div className="space-y-2">
                {result.triggeredRules.map((rule, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                      <span className="font-mono font-semibold text-slate-200">{rule.ruleCode}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-300">{rule.reason || rule.ruleName}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-mono font-semibold">
                      +{rule.points} pts
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-4 pt-4 border-t border-slate-800/80 text-xs text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>No adverse risk heuristics or blacklist hits were detected.</span>
            </div>
          )}
        </div>
      )}

      {/* 3D Secure (3DS) OTP Step-Up Modal */}
      {showOtpModal && otpData && (
        <OtpVerificationModal
          transactionId={otpData.transactionId}
          maskedEmail={otpData.maskedEmail}
          expiresAt={otpData.expiresAt}
          onSuccess={handleOtpSuccess}
          onBlocked={handleOtpBlocked}
          onClose={() => setShowOtpModal(false)}
        />
      )}
    </div>
  );
};

export default Checkout;
