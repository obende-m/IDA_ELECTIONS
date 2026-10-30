import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Icon } from '../components/ui';

/** Persistent banner while the browser reports no network connection. */
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
    <div role="alert" className="fixed top-0 inset-x-0 z-[70] flex items-center justify-center gap-2 bg-on-background text-on-primary px-4 py-2.5 text-[0.8125rem] animate-fade">
      <Icon name="wifi_off" size={16} className="text-primary-fixed-dim" />
      You're offline. Your selections stay on this device — reconnect to continue.
    </div>
  );
}

/** Voter-facing canvas: paper background, single column, generous touch targets. Headers are composed per screen. */
export function VoterLayout() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <Outlet />
      <OfflineBanner />
    </div>
  );
}
