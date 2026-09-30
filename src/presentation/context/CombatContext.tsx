import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import type { CombateActivo } from '../../domain/entities/Combate';
import { getCombate } from '../../infrastructure/api/fogApi';

/**
 * Claves de localStorage: solo los ids del combate y del evento, nunca los datos del combate.
 * El evento se recuerda aparte porque GET /matches/{id} no lo devuelve.
 */
const CLAVE_MATCH_ID = 'sabre.match_id';
const CLAVE_EVENTO_ID = 'sabre.evento_id';

function leerClave(clave: string): string | null {
  if (Platform.OS !== 'web') return null;
  try { return window.localStorage.getItem(clave); } catch { return null; }
}

function escribirClave(clave: string, valor: string | null): void {
  if (Platform.OS !== 'web') return;
  try {
    if (valor) window.localStorage.setItem(clave, valor);
    else window.localStorage.removeItem(clave);
  } catch { /* sin almacenamiento: el combate solo dura hasta recargar */ }
}

const leerMatchId = () => leerClave(CLAVE_MATCH_ID);

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
        if (c) setCombateState(prev => prev ?? { ...c, eventoId: leerClave(CLAVE_EVENTO_ID) });
        else if (leerMatchId() === recordado) { escribirClave(CLAVE_MATCH_ID, null); escribirClave(CLAVE_EVENTO_ID, null); }
      })
      .catch(e => { if (activo) setErrorValidacion(e instanceof Error ? e.message : 'No se pudo validar el combate'); })
      .finally(() => { if (activo) setValidando(false); });
    return () => { activo = false; };
  }, [recordado, intento]);

  const setCombate = useCallback((c: CombateActivo | null) => {
    escribirClave(CLAVE_MATCH_ID, c ? c.matchId : null);
    escribirClave(CLAVE_EVENTO_ID, c ? c.eventoId : null);
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
