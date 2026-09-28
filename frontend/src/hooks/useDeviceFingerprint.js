import { useState, useEffect } from 'react';
import FingerprintJS from '@fingerprintjs/fingerprintjs';

export const useDeviceFingerprint = () => {
  const [fingerprint, setFingerprint] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const initializeFingerprint = async () => {
      try {
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        if (isMounted) {
          setFingerprint(result.visitorId);
        }
      } catch {
        // Fallback for adblockers / offline environments
        if (isMounted) {
          const fallback = 'fp_fb_' + Math.random().toString(36).substring(2, 18);
          setFingerprint(fallback);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeFingerprint();

    return () => {
      isMounted = false;
    };
  }, []);

  return { fingerprint, loading };
};

export default useDeviceFingerprint;
