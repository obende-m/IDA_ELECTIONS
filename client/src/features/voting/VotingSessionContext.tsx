import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import type { ResolvedVotingSession } from './types';

const STORAGE_KEY = 'ida_voting_session';

interface VotingSessionContextValue {
  session: ResolvedVotingSession | null;
  setSession: (session: ResolvedVotingSession) => void;
  clearSession: () => void;
}

const VotingSessionContext = createContext<VotingSessionContextValue | null>(null);

function readStoredSession(): ResolvedVotingSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ResolvedVotingSession) : null;
  } catch {
    return null;
  }
}

/**
 * Carries the identity resolved from a voter's personal /vote/:token link across the
 * verify -> select -> review screens. Backed by sessionStorage so a browser refresh mid-flow
 * doesn't lose the voter's place (the raw token is only ever kept client-side in this tab).
 */
export function VotingSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<ResolvedVotingSession | null>(readStoredSession);

  const setSession = useCallback((next: ResolvedVotingSession) => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSessionState(next);
  }, []);

  const clearSession = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setSessionState(null);
  }, []);

  return (
    <VotingSessionContext.Provider value={{ session, setSession, clearSession }}>{children}</VotingSessionContext.Provider>
  );
}

export function useVotingSession(): VotingSessionContextValue {
  const ctx = useContext(VotingSessionContext);
  if (!ctx) throw new Error('useVotingSession must be used within a VotingSessionProvider');
  return ctx;
}
