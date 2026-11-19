import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { RevisionAnalizada, VeredictoRegistrado } from '../../domain/entities/Action';
import type { Decision } from '../../domain/entities/Combate';
import { analyzeClip } from '../../application/AnalyzeClipUseCase';
import { postVeredicto } from '../../infrastructure/api/fogApi';
import { useCombat } from './CombatContext';

export type SessionStatus = 'idle' | 'analyzing' | 'done' | 'error';
export type VeredictoStatus = 'idle' | 'enviando' | 'registrado' | 'error';

export interface ClipInput {
  file: File;
  /** Instante de la luz A en ms desde el inicio del clip; null = apagada. */
  tLuzAMs: number | null;
  /** Instante de la luz B en ms desde el inicio del clip; null = apagada. */
  tLuzBMs: number | null;
}

interface SessionContextValue {
  revision:         RevisionAnalizada | null;
  sessionStatus:    SessionStatus;
  /** Instante (ms epoch) en que empezó el análisis en curso. */
  inicioAnalisis:   number | null;
  errorMessage:     string | null;
  veredicto:        VeredictoRegistrado | null;
  veredictoStatus:  VeredictoStatus;
  veredictoError:   string | null;
  submitClip:       (clip: ClipInput) => Promise<void>;
  /** Registra la decisión del árbitro sobre la revisión actual (CU-10). */
  registrarVeredicto: (decision: Decision, claseFinal: string | null) => Promise<void>;
  resetSession:     () => void;
}

const SessionCtx = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { combate } = useCombat();
  const [revision,        setRevision]        = useState<RevisionAnalizada | null>(null);
  const [sessionStatus,   setSessionStatus]   = useState<SessionStatus>('idle');
  const [inicioAnalisis,  setInicioAnalisis]  = useState<number | null>(null);
  const [errorMessage,    setErrorMessage]    = useState<string | null>(null);
  const [veredicto,       setVeredicto]       = useState<VeredictoRegistrado | null>(null);
  const [veredictoStatus, setVeredictoStatus] = useState<VeredictoStatus>('idle');
  const [veredictoError,  setVeredictoError]  = useState<string | null>(null);
  // Descarta la respuesta de un análisis que ya no es el vigente (nuevo clip o combate).
  const generacion = useRef(0);

  const resetSession = useCallback(() => {
    generacion.current += 1;
    setRevision(null);
    setSessionStatus('idle');
    setInicioAnalisis(null);
    setErrorMessage(null);
    setVeredicto(null);
    setVeredictoStatus('idle');
    setVeredictoError(null);
  }, []);

  // Otro combate (o ninguno) invalida la revisión en curso.
  useEffect(() => { resetSession(); }, [combate?.matchId, resetSession]);

  const submitClip = useCallback(async (clip: ClipInput) => {
    if (!combate) return;
    const mia = ++generacion.current;
    setSessionStatus('analyzing');
    setInicioAnalisis(Date.now());
    setErrorMessage(null);
    setRevision(null);
    setVeredicto(null);
    setVeredictoStatus('idle');
    setVeredictoError(null);
    try {
      const r = await analyzeClip({ ...clip, combate });
      if (mia !== generacion.current) return;
      setRevision(r);
      setSessionStatus('done');
    } catch (e) {
      if (mia !== generacion.current) return;
      setSessionStatus('error');
      setErrorMessage(e instanceof Error ? e.message : 'Error desconocido al contactar el backend.');
    } finally {
      if (mia === generacion.current) setInicioAnalisis(null);
    }
  }, [combate]);

  const registrarVeredicto = useCallback(async (decision: Decision, claseFinal: string | null) => {
    if (!combate || !revision?.revisionId || veredictoStatus === 'enviando' || veredictoStatus === 'registrado') return;
    const mia = generacion.current;
    setVeredictoStatus('enviando');
    setVeredictoError(null);
    try {
      const v = await postVeredicto(revision.revisionId, { decision, claseFinal, arbitroId: combate.arbitroId });
      if (mia !== generacion.current) return;
      setVeredicto(v);
      setVeredictoStatus('registrado');
    } catch (e) {
      if (mia !== generacion.current) return;
      setVeredictoStatus('error');
      setVeredictoError(e instanceof Error ? e.message : 'Error desconocido al registrar el veredicto.');
    }
  }, [combate, revision, veredictoStatus]);

  return (
    <SessionCtx.Provider value={{
      revision, sessionStatus, inicioAnalisis, errorMessage,
      veredicto, veredictoStatus, veredictoError, submitClip, registrarVeredicto, resetSession,
    }}>
      {children}
    </SessionCtx.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionCtx);
  if (!ctx) throw new Error('useSession must be inside SessionProvider');
  return ctx;
}
