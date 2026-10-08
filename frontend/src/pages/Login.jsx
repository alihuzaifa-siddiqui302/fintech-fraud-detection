import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Zap, Search, ClipboardCheck, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { login as loginApi } from '../api/api';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../context/ToastContext';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e, customEmail, customPassword) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    const targetEmail = customEmail || email;
    const targetPassword = customPassword || password;

    try {
      const data = await loginApi(targetEmail, targetPassword);
      const user = {
        id: data.userId,
        email: data.email,
        name: data.fullName,
        role: data.role,
      };
      login(data.token, user);
      toast.success(`Welcome back, ${user.name}!`, 'Authenticated');

      if (user.role === 'ROLE_ANALYST') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/portal/checkout', { replace: true });
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Invalid credentials or connection error.';
      setErrorMessage(msg);
      toast.error(msg, 'Authentication Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    handleSubmit(null, demoEmail, demoPassword);
  };

  return (
    <div className="min-h-screen w-full flex bg-slate-950 text-slate-100 antialiased overflow-hidden">
      {/* Left Column: Hero branding (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 lg:p-16 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 border-r border-indigo-900/30 overflow-hidden">
        {/* Ambient background glow circles */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-3 px-3.5 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-medium tracking-wide mb-8">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
            <span>FraudGuard Engine v1.0 • Enterprise Active</span>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <div className="p-3.5 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 text-brand-400 shadow-xl shadow-indigo-950">
              <Shield className="w-10 h-10 animate-pulse" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
                FraudGuard
              </h1>
              <p className="text-xs uppercase tracking-widest text-indigo-400 font-semibold">Autonomous Defense</p>
            </div>
          </div>

          <p className="text-xl text-slate-300 font-light max-w-lg leading-relaxed mt-4">
            Real-time fraud intelligence. Every transaction, evaluated in milliseconds.
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="relative z-10 space-y-6 max-w-md my-8">
          <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
            <div className="p-2.5 rounded-lg bg-indigo-500/10 text-brand-400 border border-indigo-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-200">Sub-100ms risk evaluation</h3>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                Asynchronous Redis sliding-window velocity checks and zero-latency decision pipelines.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-200">20-signal behavioral analysis</h3>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                Correlating VPN proxies, device telemetry, paste events, and Tor exit nodes.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-200">Tamper-evident audit trail</h3>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                Cryptographically tracked state transitions and immutable compliance event logs.
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-slate-500 flex items-center justify-between border-t border-slate-800/60 pt-6">
          <span>&copy; 2026 FraudGuard Inc. All rights reserved.</span>
          <span className="font-mono">ISO/IEC 27001 Certified</span>
        </div>
      </div>

      {/* Right Column: Interactive Login Card */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative bg-slate-900">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Brand Header */}
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-indigo-500/20 text-brand-400 border border-indigo-500/30">
              <Shield className="w-6 h-6" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">FraudGuard</span>
          </div>

          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Welcome back</h2>
            <p className="text-sm text-slate-400 mt-1">Sign in with your enterprise credentials to access your console</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase tracking-wider">
                Work Email
              </label>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm transition-all"
              />
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs animate-shake">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              id="login-submit-button"
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:bg-brand-500/60 text-white font-medium text-sm shadow-lg shadow-brand-500/25 transition-all duration-200"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <span>Sign in</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* ── Demo Guide Banner for Evaluators ── */}
          <div className="mt-6 p-4 rounded-2xl bg-gradient-to-br from-indigo-950/80 via-slate-800/60 to-slate-900/80 border border-indigo-500/30 shadow-lg shadow-indigo-950/40 relative overflow-hidden">
            {/* Subtle glow */}
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-lg">🎯</span>
                <h3 className="text-sm font-bold text-white tracking-tight">Demo Access — Start Here</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mb-3">
                Click one of the buttons below to instantly log in and explore the platform — <span className="text-indigo-300 font-medium">no credentials needed</span>.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleQuickLogin('customer@fraudguard.io', 'demo1234')}
                  className="group flex flex-col items-start gap-1 p-3 rounded-xl border border-indigo-500/40 bg-indigo-500/5 hover:bg-indigo-500/15 text-left transition-all duration-150 disabled:opacity-50"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">🛒</span>
                    <span className="text-xs font-semibold text-indigo-200 group-hover:text-white transition-colors">Customer Portal</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-snug pl-6">
                    Simulate payments, trigger fraud signals, and experience 3D-Secure OTP challenges.
                  </p>
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleQuickLogin('analyst@fraudguard.io', 'demo1234')}
                  className="group flex flex-col items-start gap-1 p-3 rounded-xl border border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/15 text-left transition-all duration-150 disabled:opacity-50"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">🔍</span>
                    <span className="text-xs font-semibold text-emerald-200 group-hover:text-white transition-colors">Analyst Cockpit</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-snug pl-6">
                    Live fraud triage, syndicate link graph, AI SAR reports, and rule tuning.
                  </p>
                </button>
              </div>

              <p className="text-[10px] text-slate-500 italic">
                💡 Tip: Start with <span className="text-indigo-400 not-italic font-medium">Customer Portal</span> to submit test transactions, then switch to <span className="text-emerald-400 not-italic font-medium">Analyst Cockpit</span> to investigate them in real time.
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-slate-500 pt-3">
            Automated session security with end-to-end token verification.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
