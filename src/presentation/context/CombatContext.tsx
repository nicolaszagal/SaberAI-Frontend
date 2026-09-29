import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import type { CombateActivo } from '../../domain/entities/Combate';
import { getCombate } from '../../infrastructure/api/fogApi';

/** Clave de localStorage: solo se guarda el `match_id`, nunca los datos del combate. */
const CLAVE_MATCH_ID = 'sabre.match_id';

function leerMatchId(): string | null {
  if (Platform.OS !== 'web') return null;
  try { return window.localStorage.getItem(CLAVE_MATCH_ID); } catch { return null; }
}

function escribirMatchId(matchId: string | null): void {
  if (Platform.OS !== 'web') return;
  try {
    if (matchId) window.localStorage.setItem(CLAVE_MATCH_ID, matchId);
    else window.localStorage.removeItem(CLAVE_MATCH_ID);
  } catch { /* sin almacenamiento: el combate solo dura hasta recargar */ }
}

interface CombatContextValue {
  combate: CombateActivo | null;
  /** Fija (o limpia) el combate activo y recuerda su `match_id`. */
  setCombate: (c: CombateActivo | null) => void;
  /** Limpia el combate activo y su `match_id` guardado (botón "Finalizar combate"). */
  finalizarCombate: () => void;
  /** Validando con el Fog el combate recordado. */
  validando: boolean;
  /** Fallo (distinto de 404) al validar el combate recordado; el `match_id` se conserva. */
  errorValidacion: string | null;
  reintentarValidacion: () => void;
}

const CombatCtx = createContext<CombatContextValue | null>(null);

export function CombatProvider({ children }: { children: React.ReactNode }) {
  const [combate, setCombateState] = useState<CombateActivo | null>(null);
  // `match_id` recordado de la sesión anterior: se valida una sola vez al cargar.
  const [recordado] = useState<string | null>(leerMatchId);
  const [validando, setValidando] = useState<boolean>(() => recordado !== null);
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  // Al cargar la app valida el combate recordado con GET /matches/{id}: un 404 lo descarta.
  useEffect(() => {
    if (!recordado) { setValidando(false); return; }
    let activo = true;
    setValidando(true);
    setErrorValidacion(null);
    getCombate(recordado)
      .then(c => {
        if (!activo) return;
        if (c) setCombateState(prev => prev ?? c);
        else if (leerMatchId() === recordado) escribirMatchId(null);
      })
      .catch(e => { if (activo) setErrorValidacion(e instanceof Error ? e.message : 'No se pudo validar el combate'); })
      .finally(() => { if (activo) setValidando(false); });
    return () => { activo = false; };
  }, [recordado, intento]);

  const setCombate = useCallback((c: CombateActivo | null) => {
    escribirMatchId(c ? c.matchId : null);
    setErrorValidacion(null);
    setCombateState(c);
  }, []);

  const finalizarCombate = useCallback(() => setCombate(null), [setCombate]);
  const reintentarValidacion = useCallback(() => setIntento(n => n + 1), []);

  return (
    <CombatCtx.Provider value={{ combate, setCombate, finalizarCombate, validando, errorValidacion, reintentarValidacion }}>
      {children}
    </CombatCtx.Provider>
  );
}

export function useCombat(): CombatContextValue {
  const ctx = useContext(CombatCtx);
  if (!ctx) throw new Error('useCombat must be inside CombatProvider');
  return ctx;
}
