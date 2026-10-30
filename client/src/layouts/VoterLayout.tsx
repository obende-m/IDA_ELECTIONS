import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Icon } from '../components/ui';

/** Shows a persistent, friendly banner while the browser reports no network connection. */
function OfflineBanner() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-0 left-0 w-full z-[60] flex items-center justify-center gap-2 bg-on-background text-on-primary px-4 py-3 text-label-md font-label-md"
    >
      <Icon name="wifi_off" size={18} className="text-primary-container" />
      You appear to be offline. Your selections are kept on this device; reconnect to continue.
    </div>
  );
}

/**
 * Minimal mobile canvas shell for every /vote/* route. Top bars, bottom action bars, and
 * footers vary meaningfully screen-to-screen in the Stitch mocks (back button presence,
 * title alignment, terminal-state chrome), so those are composed per-page from
 * `components/voter/*` rather than forced into a single shared header here.
 */
export function VoterLayout() {
  return (
    <div className="canvas-container">
      <Outlet />
      <OfflineBanner />
    </div>
  );
}
