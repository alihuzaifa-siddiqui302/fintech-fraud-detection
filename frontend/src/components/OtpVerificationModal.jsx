// frontend/src/components/OtpVerificationModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCw,
  Loader2,
  Lock,
  AlertTriangle,
  X,
} from 'lucide-react';
import { verifyOtp, issueOtpChallenge } from '../api/axiosClient';

/**
 * 3D Secure (3DS) OTP Step-Up Verification Modal
 * Appears when a checkout transaction receives PENDING_REVIEW / OTP_REQUIRED adjudication.
 */
export default function OtpVerificationModal({
  transactionId,
  maskedEmail: initialMaskedEmail,
  expiresAt: initialExpiresAt,
  onSuccess,
  onBlocked,
  onClose,
}) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [remainingAttempts, setRemainingAttempts] = useState(3);
  const [shake, setShake] = useState(false);

  // Modal terminal states: 'INPUT' | 'SUCCESS' | 'BLOCKED'
  const [modalState, setModalState] = useState('INPUT');
  const [blockedReason, setBlockedReason] = useState('');

  // Expiry timer (5 minutes countdown)
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes = 300s
  const [isExpired, setIsExpired] = useState(false);

  // Resend cooldown timer (60s cooldown)
  const [resendCooldown, setResendCooldown] = useState(60);
  const [resending, setResending] = useState(false);

  // Masked email display
  const [maskedEmail, setMaskedEmail] = useState(initialMaskedEmail || 'your registered email');

  const inputRefs = useRef([]);

  // Calculate remaining seconds from expiresAt
  useEffect(() => {
    if (initialExpiresAt) {
      const expiryTime = new Date(initialExpiresAt).getTime();
      const now = Date.now();
      const diffSecs = Math.max(0, Math.floor((expiryTime - now) / 1000));
      setTimeLeft(diffSecs > 0 ? diffSecs : 300);
    } else {
      setTimeLeft(300);
    }
  }, [initialExpiresAt]);

  // Main countdown timer
  useEffect(() => {
    if (modalState !== 'INPUT') return;

    if (timeLeft <= 0) {
      setIsExpired(true);
      setModalState('BLOCKED');
      setBlockedReason('Verification window expired. Payment blocked for security.');
      if (onBlocked) onBlocked('Verification window expired. Transaction declined.');
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, modalState, onBlocked]);

  // Resend cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Auto-focus first input box on modal mount
  useEffect(() => {
    if (modalState === 'INPUT' && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [modalState]);

  // Format MM:SS for countdown timer
  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Handle digit input in single-character box
  const handleDigitChange = (index, value) => {
    if (loading || isExpired) return;

    // Allow only single numeric digit
    const cleaned = value.replace(/\D/g, '');
    const char = cleaned.slice(-1); // Take latest char

    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);
    setErrorMsg(null);

    // Auto-advance to next box if character was entered
    if (char && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1].focus();
    }

    // Auto-submit when 6th digit entered
    if (char && index === 5) {
      const fullCode = newDigits.join('');
      if (fullCode.length === 6) {
        submitVerification(fullCode);
      }
    }
  };

  // Handle backspace navigation between boxes
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0 && inputRefs.current[index - 1]) {
        inputRefs.current[index - 1].focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1].focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  // Handle paste across all 6 boxes
  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim().replace(/\D/g, '');
    if (!pasteData) return;

    const chars = pasteData.slice(0, 6).split('');
    const newDigits = [...digits];
    chars.forEach((c, idx) => {
      newDigits[idx] = c;
    });
    setDigits(newDigits);
    setErrorMsg(null);

    // Focus appropriate box
    const nextIdx = Math.min(chars.length, 5);
    if (inputRefs.current[nextIdx]) {
      inputRefs.current[nextIdx].focus();
    }

    if (chars.length === 6) {
      submitVerification(newDigits.join(''));
    }
  };

  // Submit verification request to backend
  const submitVerification = async (codeToSubmit) => {
    const otp = codeToSubmit || digits.join('');
    if (otp.length !== 6 || loading) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const result = await verifyOtp(transactionId, otp);

      if (result.success) {
        setModalState('SUCCESS');
        setTimeout(() => {
          if (onSuccess) onSuccess(result);
        }, 2200);
      } else {
        // Trigger shake animation
        setShake(true);
        setTimeout(() => setShake(false), 600);

        if (result.transactionStatus === 'BLOCKED') {
          setModalState('BLOCKED');
          setBlockedReason(result.message || 'Verification failed. Transaction declined.');
          if (onBlocked) onBlocked(result.message);
        } else {
          setRemainingAttempts(result.remainingAttempts);
          setErrorMsg(result.message || 'Incorrect verification code. Please try again.');
          // Clear boxes and focus first
          setDigits(['', '', '', '', '', '']);
          if (inputRefs.current[0]) inputRefs.current[0].focus();
        }
      }
    } catch (err) {
      setShake(true);
      setTimeout(() => setShake(false), 600);
      const msg = err.response?.data?.message || err.message || 'Failed to verify OTP';
      setErrorMsg(msg);
      setDigits(['', '', '', '', '', '']);
      if (inputRefs.current[0]) inputRefs.current[0].focus();
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP Challenge
  const handleResend = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    setErrorMsg(null);

    try {
      const res = await issueOtpChallenge(transactionId);
      setTimeLeft(300);
      setResendCooldown(60);
      setRemainingAttempts(res.maxAttempts || 3);
      if (res.maskedEmail) setMaskedEmail(res.maskedEmail);
      setDigits(['', '', '', '', '', '']);
      if (inputRefs.current[0]) inputRefs.current[0].focus();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  // Circular timer SVG parameters
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (timeLeft / 300) * circumference;
  const isWarning = timeLeft < 60;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      {/* Modal Dialog Card */}
      <div
        className={`relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/80 transition-all ${
          shake ? 'animate-shake' : ''
        }`}
      >
        {/* Close Button */}
        {modalState === 'INPUT' && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Cancel verification"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* STATE 1: SUCCESSFUL VERIFICATION */}
        {modalState === 'SUCCESS' && (
          <div className="text-center py-6 space-y-4 animate-scaleUp">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-10 h-10 animate-bounce" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">Transaction Approved!</h3>
              <p className="text-sm text-slate-300 mt-1">3D Secure identity successfully verified.</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 font-mono">
              Redirecting to checkout summary...
            </div>
          </div>
        )}

        {/* STATE 2: BLOCKED / EXHAUSTED / EXPIRED */}
        {modalState === 'BLOCKED' && (
          <div className="text-center py-6 space-y-4 animate-scaleUp">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 border-2 border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto shadow-lg shadow-rose-500/20">
              <XCircle className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">Transaction Declined</h3>
              <p className="text-sm text-rose-300 mt-1">{blockedReason || 'Security verification failed.'}</p>
            </div>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              This transaction has been blocked under financial compliance rules. If you believe this is an error, please contact fraud support.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* STATE 3: INPUT PASSCODE FORM */}
        {modalState === 'INPUT' && (
          <div className="space-y-6">
            {/* Header with Shield Icon & Email */}
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-xl bg-indigo-600/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">Security Verification Required</h2>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                Elevated activity requires two-factor confirmation. We sent a 6-digit code to{' '}
                <span className="font-semibold text-slate-200">{maskedEmail}</span>.
              </p>
            </div>

            {/* Countdown Timer with SVG progress ring */}
            <div className="flex items-center justify-center gap-3 p-2 rounded-xl bg-slate-950/70 border border-slate-800">
              <div className="relative w-12 h-12 flex items-center justify-center">
                <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 52 52">
                  <circle
                    cx="26"
                    cy="26"
                    r={radius}
                    stroke="currentColor"
                    strokeWidth="3.5"
                    className="text-slate-800"
                    fill="transparent"
                  />
                  <circle
                    cx="26"
                    cy="26"
                    r={radius}
                    stroke="currentColor"
                    strokeWidth="3.5"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className={`transition-all duration-1000 ${
                      isWarning ? 'text-rose-500' : 'text-indigo-500'
                    }`}
                    fill="transparent"
                  />
                </svg>
                <Clock className={`w-4 h-4 absolute ${isWarning ? 'text-rose-400' : 'text-indigo-400'}`} />
              </div>

              <div className="text-left">
                <div className={`font-mono text-lg font-bold ${isWarning ? 'text-rose-400 animate-pulse' : 'text-white'}`}>
                  {formatTimer(timeLeft)}
                </div>
                <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                  {isWarning ? 'Expiring soon' : 'Time remaining'}
                </div>
              </div>
            </div>

            {/* 6-Digit Passcode Input Boxes */}
            <div>
              <div className="flex justify-between items-center gap-2" onPaste={handlePaste}>
                {digits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (inputRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    disabled={loading || isExpired}
                    className={`w-12 h-14 text-center text-2xl font-bold font-mono rounded-xl bg-slate-950 border transition-all outline-none text-white select-all ${
                      digit
                        ? 'border-indigo-500 shadow-md shadow-indigo-500/20 bg-indigo-950/20'
                        : 'border-slate-700 hover:border-slate-600 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20'
                    } ${errorMsg ? 'border-rose-500' : ''}`}
                  />
                ))}
              </div>

              {/* Error or Remaining Attempts */}
              <div className="mt-3 min-h-[20px] flex items-center justify-between text-xs">
                {errorMsg ? (
                  <span className="text-rose-400 font-medium flex items-center gap-1.5 animate-fadeIn">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errorMsg}</span>
                  </span>
                ) : (
                  <span className="text-slate-400">Enter the 6-digit code</span>
                )}

                <span
                  className={`font-medium ${
                    remainingAttempts === 1 ? 'text-rose-400 font-bold' : 'text-slate-400'
                  }`}
                >
                  {remainingAttempts} {remainingAttempts === 1 ? 'attempt' : 'attempts'} left
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="button"
              onClick={() => submitVerification()}
              disabled={digits.join('').length !== 6 || loading || isExpired}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Code...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Verify Transaction</span>
                </>
              )}
            </button>

            {/* Resend Link Footer */}
            <div className="pt-2 text-center text-xs text-slate-400 border-t border-slate-800">
              <span>Didn't receive the code? </span>
              {resendCooldown > 0 ? (
                <span className="text-slate-500 font-mono">Resend in {resendCooldown}s</span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-2 transition-colors disabled:opacity-50 inline-flex items-center gap-1"
                >
                  {resending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCw className="w-3 h-3" />}
                  <span>Resend Code</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
