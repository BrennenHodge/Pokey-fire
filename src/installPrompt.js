import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

// Chrome/Edge/Android fire `beforeinstallprompt` once, often before React mounts,
// so capture it at module load and hand it to whichever screen asks later.
let deferred = null;
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn());

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    notify();
  });
}

function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function isIOS() {
  const ua = window.navigator.userAgent;
  // iPadOS reports itself as a Mac; touch support gives it away.
  return /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && window.navigator.maxTouchPoints > 1);
}

/** Install state for the web build: `null` on native, where there's nothing to install. */
export function useInstallPrompt() {
  const [, rerender] = useState(0);
  useEffect(() => {
    const fn = () => rerender((n) => n + 1);
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, []);
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  return {
    installed: isStandalone(),
    canPrompt: Boolean(deferred),
    ios: isIOS(),
    async install() {
      if (!deferred) return false;
      deferred.prompt();
      const { outcome } = await deferred.userChoice;
      deferred = null;
      notify();
      return outcome === 'accepted';
    },
  };
}
