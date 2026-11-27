/* Appli installable (PWA) : service worker et invite d'installation.
 * Seulement sur le site hébergé ; rien dans le build artifact ni en développement. */

type InstallEvent = Event & { prompt(): Promise<void> };
let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();

export const installPrompt = () => deferred;
export function onInstallPrompt(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export function isStandalone(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
}

export function setupPwa() {
  if (!import.meta.env.PROD || import.meta.env.MODE === 'single') return;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as InstallEvent;
    listeners.forEach((f) => f());
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    listeners.forEach((f) => f());
  });
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}); });
  }
}
