import { useEffect, useState } from 'react';

/** True once `active` has been continuously true for `delayMs` (used for "waking up the server" hints). */
export function useSlowHint(active: boolean, delayMs = 8000): boolean {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!active) {
      setSlow(false);
      return;
    }
    const id = window.setTimeout(() => setSlow(true), delayMs);
    return () => window.clearTimeout(id);
  }, [active, delayMs]);
  return slow;
}
