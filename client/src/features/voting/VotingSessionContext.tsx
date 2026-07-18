import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import type { Ballot, BallotSelections, ResolvedVotingSession } from './types';

const STORAGE_KEY = 'ida_voting_session';

interface StoredState {
  session: ResolvedVotingSession | null;
  ballot: Ballot | null;
  selections: BallotSelections;
  referenceNumber: string | null;
}

const EMPTY_STATE: StoredState = { session: null, ballot: null, selections: {}, referenceNumber: null };

interface VotingSessionContextValue extends StoredState {
  setSession: (session: ResolvedVotingSession) => void;
  setBallot: (ballot: Ballot) => void;
  setSelection: (positionId: string, candidateIds: string[]) => void;
  setReferenceNumber: (referenceNumber: string) => void;
  clearSession: () => void;
}

const VotingSessionContext = createContext<VotingSessionContextValue | null>(null);

function readStoredState(): StoredState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? { ...EMPTY_STATE, ...(JSON.parse(raw) as Partial<StoredState>) } : EMPTY_STATE;
  } catch {
    return EMPTY_STATE;
  }
}

/**
 * Carries the identity resolved from a voter's personal /vote/:token link, their fetched ballot,
 * and their in-progress selections across the verify -> select -> review -> success screens.
 * Backed by sessionStorage so a browser refresh mid-vote doesn't lose the voter's place.
 */
export function VotingSessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoredState>(readStoredState);

  const persist = useCallback((next: StoredState) => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setState(next);
  }, []);

  const setSession = useCallback(
    (session: ResolvedVotingSession) => persist({ ...EMPTY_STATE, session }),
    [persist]
  );

  const setBallot = useCallback((ballot: Ballot) => persist({ ...state, ballot }), [persist, state]);

  const setSelection = useCallback(
    (positionId: string, candidateIds: string[]) =>
      persist({ ...state, selections: { ...state.selections, [positionId]: candidateIds } }),
    [persist, state]
  );

  const setReferenceNumber = useCallback((referenceNumber: string) => persist({ ...state, referenceNumber }), [persist, state]);

  const clearSession = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setState(EMPTY_STATE);
  }, []);

  return (
    <VotingSessionContext.Provider value={{ ...state, setSession, setBallot, setSelection, setReferenceNumber, clearSession }}>
      {children}
    </VotingSessionContext.Provider>
  );
}

export function useVotingSession(): VotingSessionContextValue {
  const ctx = useContext(VotingSessionContext);
  if (!ctx) throw new Error('useVotingSession must be used within a VotingSessionProvider');
  return ctx;
}
