import React, { createContext, useContext, useState, useCallback } from 'react';
import type { HistorialEntry, CurrentActionData } from '../../domain/entities/Action';
import { analyzeClip } from '../../application/AnalyzeClipUseCase';

export type SessionStatus = 'idle' | 'analyzing' | 'done' | 'error';

interface SessionContextValue {
  historial:     HistorialEntry[];
  currentAction: CurrentActionData | null;
  sessionStatus: SessionStatus;
  errorMessage:  string | null;
  submitClip:    (file: File, hasLuzA: boolean, hasLuzB: boolean) => Promise<void>;
  resetSession:  () => void;
}

const SessionCtx = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [historial,     setHistorial]     = useState<HistorialEntry[]>([]);
  const [currentAction, setCurrentAction] = useState<CurrentActionData | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('idle');
  const [errorMessage,  setErrorMessage]  = useState<string | null>(null);

  const submitClip = useCallback(async (file: File, hasLuzA: boolean, hasLuzB: boolean) => {
    setSessionStatus('analyzing');
    setErrorMessage(null);
    try {
      const { action, entry } = await analyzeClip({ file, hasLuzA, hasLuzB });
      setCurrentAction(action);
      setHistorial(prev => [entry, ...prev]);
      setSessionStatus('done');
    } catch (e) {
      setSessionStatus('error');
      setErrorMessage(e instanceof Error ? e.message : 'Error desconocido al contactar el backend.');
    }
  }, []);

  const resetSession = useCallback(() => {
    setCurrentAction(null);
    setSessionStatus('idle');
    setErrorMessage(null);
  }, []);

  return (
    <SessionCtx.Provider value={{ historial, currentAction, sessionStatus, errorMessage, submitClip, resetSession }}>
      {children}
    </SessionCtx.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionCtx);
  if (!ctx) throw new Error('useSession must be inside SessionProvider');
  return ctx;
}
