import { useEffect, useRef, useCallback } from 'react';

export const useSessionSignals = () => {
  const mouseCountRef = useRef(0);
  const pasteDetectedRef = useRef(false);
  const lastKeyTimeRef = useRef(null);
  const keyGapsRef = useRef([]);

  useEffect(() => {
    const handleMouseMove = () => {
      mouseCountRef.current += 1;
    };

    const handlePaste = () => {
      pasteDetectedRef.current = true;
    };

    const handleKeyDown = () => {
      const now = Date.now();
      if (lastKeyTimeRef.current !== null) {
        const gap = now - lastKeyTimeRef.current;
        // Ignore extreme gaps like tab switching (> 5000ms)
        if (gap < 5000) {
          keyGapsRef.current.push(gap);
          if (keyGapsRef.current.length > 50) {
            keyGapsRef.current.shift();
          }
        }
      }
      lastKeyTimeRef.current = now;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('paste', handlePaste, { passive: true });
    window.addEventListener('keydown', handleKeyDown, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('paste', handlePaste);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const getSignals = useCallback(() => {
    // 1. Time on page
    const pageLoadStart = window.__FG_PAGE_LOAD || Date.now();
    const timeOnPageMs = Math.max(0, Date.now() - pageLoadStart);

    // 2. Keystroke variance (std dev)
    const gaps = keyGapsRef.current;
    let keystrokeVariance = 0;
    if (gaps.length >= 2) {
      const mean = gaps.reduce((acc, val) => acc + val, 0) / gaps.length;
      const variance = gaps.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / gaps.length;
      keystrokeVariance = Number(Math.sqrt(variance).toFixed(2));
    }

    // 3. Browser timezone
    let browserTimezone = 'UTC';
    try {
      browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      // fallback
    }

    // 4. Headless detection
    const isHeadless = Boolean(
      navigator.webdriver ||
      window.navigator.webdriver ||
      window.chrome?.runtime === undefined && window.navigator.userAgent.includes('Headless')
    );

    // 5. Screen resolution
    const screenResolution = `${window.screen?.width || 0}x${window.screen?.height || 0}`;

    return {
      timeOnPageMs,
      mouseMovementCount: mouseCountRef.current,
      pasteDetected: pasteDetectedRef.current,
      isHeadless,
      browserTimezone,
      keystrokeVariance,
      screenResolution,
    };
  }, []);

  return { getSignals };
};

export default useSessionSignals;
