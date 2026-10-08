import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  HelpCircle,
  Sparkles,
  Bot,
  Play,
  RotateCcw,
  ShieldCheck,
  ShieldAlert,
  Network,
  Sliders,
  Ban,
  ScrollText,
  CreditCard,
  Zap,
  Cpu,
  CheckCircle2,
  ExternalLink,
  BookOpen,
  Eye,
} from 'lucide-react';
import clsx from 'clsx';

/**
 * GuidedTour & Feature Guide Bot
 *
 * Provides:
 * 1. Automatic first-visit spotlight walkthrough with "Skip" button.
 * 2. Bottom-right floating AI Guide Bot launcher.
 * 3. Comprehensive Feature Explorer & Fast-Track Judge Guide modal.
 * 4. Listens for window events `fraudguard:open-guide` and `fraudguard:start-tour`.
 */
const GuidedTour = ({ tourId, steps = [], onComplete }) => {
  const [active, setActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState(null);
  const [tooltipStyle, setTooltipStyle] = useState({});
  const [isAnimating, setIsAnimating] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(tourId === 'analyst' ? 'analyst' : 'customer');
  const overlayRef = useRef(null);

  const storageKey = `fraudguard_tour_${tourId}`;

  // Auto-start spotlight tour on first visit
  useEffect(() => {
    if (steps.length === 0) return;
    const seen = localStorage.getItem(storageKey);
    if (!seen) {
      const timer = setTimeout(() => setActive(true), 900);
      return () => clearTimeout(timer);
    }
  }, [storageKey, steps.length]);

  // Global event listeners for sidebar buttons or navbar triggers
  useEffect(() => {
    const handleOpenGuide = () => setIsGuideOpen(true);
    const handleStartTour = () => {
      setIsGuideOpen(false);
      setCurrentStep(0);
      setActive(true);
    };

    window.addEventListener('fraudguard:open-guide', handleOpenGuide);
    window.addEventListener('fraudguard:start-tour', handleStartTour);

    return () => {
      window.removeEventListener('open-feature-guide', handleOpenGuide);
      window.removeEventListener('fraudguard:open-guide', handleOpenGuide);
      window.removeEventListener('fraudguard:start-tour', handleStartTour);
    };
  }, []);

  // Calculate spotlight coordinates
  const updateSpotlight = useCallback(() => {
    if (!active || !steps[currentStep]) return;

    const step = steps[currentStep];
    const el = document.querySelector(step.target);

    if (el) {
      const rect = el.getBoundingClientRect();
      const padding = 8;
      setSpotlightRect({
        top: rect.top - padding,
        left: rect.left - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
      });

      // Position tooltip intelligently
      const tooltipW = 380;
      const tooltipH = 220;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      let top, left;
      const pos = step.position || 'auto';

      if (pos === 'bottom' || (pos === 'auto' && rect.bottom + tooltipH + 24 < vh)) {
        top = rect.bottom + 16;
        left = Math.max(16, Math.min(rect.left + rect.width / 2 - tooltipW / 2, vw - tooltipW - 16));
      } else if (pos === 'top' || (pos === 'auto' && rect.top - tooltipH - 24 > 0)) {
        top = rect.top - tooltipH - 16;
        left = Math.max(16, Math.min(rect.left + rect.width / 2 - tooltipW / 2, vw - tooltipW - 16));
      } else if (pos === 'right' || (pos === 'auto' && rect.right + tooltipW + 24 < vw)) {
        top = Math.max(16, rect.top + rect.height / 2 - tooltipH / 2);
        left = rect.right + 16;
      } else {
        top = Math.max(16, rect.top + rect.height / 2 - tooltipH / 2);
        left = Math.max(16, rect.left - tooltipW - 16);
      }

      setTooltipStyle({ top, left, width: tooltipW });
    } else {
      // Target element not found on screen -> center tooltip
      setSpotlightRect(null);
      setTooltipStyle({
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 380,
      });
    }
  }, [active, currentStep, steps]);

  useEffect(() => {
    if (!active) return;
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 250);
    updateSpotlight();

    const handleResize = () => updateSpotlight();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [active, currentStep, updateSpotlight]);

  const endTour = useCallback(() => {
    setActive(false);
    localStorage.setItem(storageKey, 'true');
    onComplete?.();
  }, [storageKey, onComplete]);

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      endTour();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  };

  const restartSpotlight = () => {
    setIsGuideOpen(false);
    setCurrentStep(0);
    setActive(true);
  };

  const resetAllTours = () => {
    localStorage.removeItem('fraudguard_tour_checkout');
    localStorage.removeItem('fraudguard_tour_analyst');
    localStorage.removeItem(storageKey);
    restartSpotlight();
  };

  const step = steps[currentStep];

  return (
    <>
      {/* Floating AI Guide Bot Launcher — always visible on screen */}
      {!active && (
        <div className="fixed bottom-6 right-6 z-[9998] flex items-center gap-3">
          <button
            onClick={() => setIsGuideOpen(true)}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-brand-500 hover:from-indigo-500 hover:to-brand-400 text-white font-medium text-xs shadow-xl shadow-indigo-600/30 hover:shadow-indigo-500/50 hover:scale-105 active:scale-95 transition-all duration-200 border border-indigo-400/30 group"
            title="Open Platform Guide & Feature Tour"
          >
            <div className="relative">
              <Bot className="w-4 h-4 text-white" />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400" />
            </div>
            <span className="font-semibold tracking-wide">Feature Tour & Guide</span>
            <span className="px-1.5 py-0.5 rounded-md bg-white/20 text-[10px] font-bold uppercase tracking-wider">
              Bot
            </span>
          </button>
        </div>
      )}

      {/* ── 1. SPOTLIGHT WALKTHROUGH OVERLAY ── */}
      {active && (
        <div ref={overlayRef} className="fixed inset-0 z-[9999]" style={{ pointerEvents: 'auto' }}>
          {/* Masked Backdrop with cutout hole */}
          <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
            <defs>
              <mask id={`spotlight-mask-${tourId}`}>
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                {spotlightRect && (
                  <rect
                    x={spotlightRect.left}
                    y={spotlightRect.top}
                    width={spotlightRect.width}
                    height={spotlightRect.height}
                    rx="12"
                    fill="black"
                  />
                )}
              </mask>
            </defs>
            <rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="rgba(2, 6, 23, 0.85)"
              mask={`url(#spotlight-mask-${tourId})`}
            />
          </svg>

          {/* Glowing border around target element */}
          {spotlightRect && (
            <div
              className="absolute rounded-xl border-2 border-indigo-400 pointer-events-none transition-all duration-300 ease-out"
              style={{
                top: spotlightRect.top,
                left: spotlightRect.left,
                width: spotlightRect.width,
                height: spotlightRect.height,
                boxShadow:
                  '0 0 0 4px rgba(99, 102, 241, 0.25), 0 0 35px rgba(99, 102, 241, 0.35)',
              }}
            />
          )}

          {/* Click shield outside spotlight */}
          <div
            className="absolute inset-0"
            onClick={(e) => e.stopPropagation()}
            style={{ pointerEvents: 'auto' }}
          />

          {/* Tooltip Card */}
          {step && (
            <div
              className={`absolute z-[10000] transition-all duration-300 ease-out ${
                isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
              }`}
              style={{
                ...tooltipStyle,
                pointerEvents: 'auto',
              }}
            >
              <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 rounded-2xl border border-indigo-500/40 shadow-2xl shadow-indigo-950/70 overflow-hidden">
                {/* Progress bar */}
                <div className="h-1 bg-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 via-brand-400 to-emerald-400 transition-all duration-500 ease-out"
                    style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                  />
                </div>

                <div className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white leading-tight">{step.title}</h3>
                        <span className="text-[10px] text-indigo-300 font-mono font-medium">
                          Step {currentStep + 1} of {steps.length}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={endTour}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border border-slate-700"
                      title="Skip / Close tour"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-300 leading-relaxed mb-4">
                    {step.description}
                  </p>

                  {/* Footer Navigation */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                    <button
                      onClick={endTour}
                      className="text-xs text-slate-400 hover:text-slate-200 font-medium px-2 py-1 rounded hover:bg-slate-800/60 transition-colors"
                    >
                      Skip Tour
                    </button>

                    <div className="flex items-center gap-2">
                      {currentStep > 0 && (
                        <button
                          onClick={prevStep}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors border border-slate-700"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                          Back
                        </button>
                      )}
                      <button
                        onClick={nextStep}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-md shadow-indigo-600/30"
                      >
                        {currentStep < steps.length - 1 ? (
                          <>
                            Next
                            <ChevronRight className="w-3.5 h-3.5" />
                          </>
                        ) : (
                          <>
                            Finish
                            <Sparkles className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 2. COMPREHENSIVE FEATURE GUIDE BOT MODAL ── */}
      {isGuideOpen && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-indigo-500/40 rounded-2xl shadow-2xl shadow-indigo-950/60 flex flex-col overflow-hidden text-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-brand-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-white">FraudGuard Evaluator Guide Bot</h2>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-semibold">
                      Live Assistant
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Comprehensive platform walk-through and feature reference for evaluators & judges
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsGuideOpen(false)}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border border-slate-700/80"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Action Bar */}
            <div className="px-5 py-3 bg-slate-850/60 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-2">
                {steps.length > 0 && (
                  <button
                    onClick={restartSpotlight}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-all shadow-sm"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Start Interactive Screen Tour</span>
                  </button>
                )}
                <button
                  onClick={resetAllTours}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors border border-slate-700"
                  title="Resets localStorage tour flags so the walkthrough will appear automatically on reload"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset All First-Visit Tours</span>
                </button>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
                <button
                  onClick={() => setActiveTab('customer')}
                  className={clsx(
                    'px-3 py-1 rounded-lg font-medium transition-all',
                    activeTab === 'customer'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  )}
                >
                  🛒 Customer Portal
                </button>
                <button
                  onClick={() => setActiveTab('analyst')}
                  className={clsx(
                    'px-3 py-1 rounded-lg font-medium transition-all',
                    activeTab === 'analyst'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  )}
                >
                  🔍 Analyst Cockpit
                </button>
              </div>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
              {/* TAB 1: CUSTOMER PORTAL FEATURES */}
              {activeTab === 'customer' && (
                <div className="space-y-4">
                  <h4 className="text-xs uppercase font-bold tracking-wider text-indigo-400">
                    Customer Portal Capabilities & What to Test
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-4 rounded-xl bg-slate-850 border border-slate-800 space-y-2">
                      <div className="flex items-center gap-2 text-white font-semibold text-xs">
                        <CreditCard className="w-4 h-4 text-brand-400" />
                        <span>Sub-100ms Adjudication Engine</span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Evaluates 20 rules concurrently in Spring Boot with Redis sliding-window caching, returning deterministic risk scores (0–100) instantly.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-850 border border-slate-800 space-y-2">
                      <div className="flex items-center gap-2 text-white font-semibold text-xs">
                        <Zap className="w-4 h-4 text-amber-400" />
                        <span>Attack Sandbox Vector Toggles</span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Allows judges to simulate Foreign TOR IPs, VPN / Datacenter anonymizers, Device Spoofing, and Headless Browser Automation (Puppeteer flags).
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-850 border border-slate-800 space-y-2">
                      <div className="flex items-center gap-2 text-white font-semibold text-xs">
                        <Cpu className="w-4 h-4 text-indigo-400" />
                        <span>Client Behavioral Telemetry</span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Silently captures 20 behavioral signals: keystroke inter-key latency variance, mouse velocity, clipboard paste detection, and canvas device hash.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-850 border border-slate-800 space-y-2">
                      <div className="flex items-center gap-2 text-white font-semibold text-xs">
                        <ShieldAlert className="w-4 h-4 text-rose-400" />
                        <span>Velocity Burst Attack (5x)</span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Tests rate-limiting defenses against card-testing scripts by blasting 5 concurrent requests, triggering <code className="text-xs text-rose-300">VELOCITY_CARD_1M</code>.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-850 border border-slate-800 space-y-2">
                      <div className="flex items-center gap-2 text-white font-semibold text-xs">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span>3D-Secure (3DS) OTP Challenge</span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        When risk is in the Review zone (40–69), payment is paused for step-up verification. Enter OTP or click 1-click verify to complete checkout.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-850 border border-slate-800 space-y-2">
                      <div className="flex items-center gap-2 text-white font-semibold text-xs">
                        <ScrollText className="w-4 h-4 text-sky-400" />
                        <span>My Transactions History</span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Real-time ledger of past payments showing decision verdicts, risk pills, card masks, timestamps, and country flags.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: ANALYST COCKPIT FEATURES */}
              {activeTab === 'analyst' && (
                <div className="space-y-4">
                  <h4 className="text-xs uppercase font-bold tracking-wider text-emerald-400">
                    Analyst Cockpit Capabilities & What to Test
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-4 rounded-xl bg-slate-850 border border-slate-800 space-y-2">
                      <div className="flex items-center gap-2 text-white font-semibold text-xs">
                        <Zap className="w-4 h-4 text-amber-400" />
                        <span>Real-Time SSE Live Stream</span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Every transaction evaluated by the fraud engine instantly pushes to the analyst screen via Server-Sent Events with zero polling overhead.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-850 border border-slate-800 space-y-2">
                      <div className="flex items-center gap-2 text-white font-semibold text-xs">
                        <Eye className="w-4 h-4 text-indigo-400" />
                        <span>Forensic Inspection Drawer</span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Click any transaction row to open the forensic drawer. Shows 4 sub-scores, full 20-rule contribution audit, IP geolocation, and device telemetry.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-850 border border-slate-800 space-y-2">
                      <div className="flex items-center gap-2 text-white font-semibold text-xs">
                        <Bot className="w-4 h-4 text-emerald-400" />
                        <span>Google Gemini FinCEN SAR Generator</span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Automatically drafts complete Suspicious Activity Report (SAR) narratives for compliance filing, citing triggered rules, IP vectors, and risk typologies.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-850 border border-slate-800 space-y-2">
                      <div className="flex items-center gap-2 text-white font-semibold text-xs">
                        <Network className="w-4 h-4 text-purple-400" />
                        <span>Syndicate Link Graph Analysis</span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Interactive force-directed graph powered by Cytoscape that clusters users sharing device hashes or IP ranges to detect coordinated fraud rings.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-850 border border-slate-800 space-y-2">
                      <div className="flex items-center gap-2 text-white font-semibold text-xs">
                        <Sliders className="w-4 h-4 text-sky-400" />
                        <span>Rules Engine Manager</span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Tune threshold values and risk weights across 20 fraud rules with instant hot-reload and zero system downtime.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-850 border border-slate-800 space-y-2">
                      <div className="flex items-center gap-2 text-white font-semibold text-xs">
                        <Ban className="w-4 h-4 text-rose-400" />
                        <span>Instant Blacklist Engine</span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Manage blocked IPs, Device Fingerprints, and Emails. Blocked entities are declined with max risk (100) on their next transaction.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400">
              <span>
                💡 You can restart this tour anytime using the bottom-right floating button or sidebar guide.
              </span>
              <button
                onClick={() => setIsGuideOpen(false)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GuidedTour;
