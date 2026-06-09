import { createContext, useContext, useEffect, useReducer } from 'react';
import type { Dispatch, ReactNode } from 'react';
import { reducer, initialState, type BracketState, type Action } from './bracketReducer';

const STORAGE_KEY = 'wc2026-bracket-v1';

function load(): BracketState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.r32 && parsed.winners) {
        if (!Array.isArray(parsed.thirds)) parsed.thirds = [];
        return parsed as BracketState;
      }
    }
  } catch {
    // ignore malformed storage
  }
  return initialState();
}

interface BracketContextValue {
  state: BracketState;
  dispatch: Dispatch<Action>;
}

const BracketContext = createContext<BracketContextValue | null>(null);

export function BracketProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage may be unavailable (private mode); progress just won't persist
    }
  }, [state]);

  return <BracketContext.Provider value={{ state, dispatch }}>{children}</BracketContext.Provider>;
}

export function useBracket(): BracketContextValue {
  const value = useContext(BracketContext);
  if (!value) throw new Error('useBracket must be used within a BracketProvider');
  return value;
}
