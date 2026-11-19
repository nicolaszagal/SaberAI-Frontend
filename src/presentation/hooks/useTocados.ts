import { useEffect, useRef, useState } from 'react';
import type { EstadoEdge, Tocado } from '../../domain/entities/Tocado';
import { getEstadoEdge, listarTocados } from '../../infrastructure/api/tocadosApi';

/** Cada cuánto se consulta la lista de tocados (ms): el visor cambia al clip nuevo en menos de 1 s. */
export const INTERVALO_TOCADOS_MS = 500;
/** Cada cuánto se consulta el estado de Edge (ms). */
export const INTERVALO_EDGE_MS = 3000;

/**
 * Sondea la lista de tocados del combate (Fog los registra y preprocesa).
 *
 * Args:
 *   matchId: combate activo, o null si no hay.
 *
 * Returns:
 *   `tocados` (el más reciente primero), `error` (último fallo, sin borrar lo ya mostrado) y
 *   `refrescar` para actualizar de inmediato tras una acción.
 */
export function useTocados(matchId: string | null) {
  const [tocados, setTocados] = useState<Tocado[]>([]);
  const [error, setError] = useState<string | null>(null);
  const refrescarRef = useRef<() => void>(() => {});

  useEffect(() => {
    setTocados([]);
    setError(null);
    if (!matchId) return undefined;
    let vivo = true;
    let enCurso = false;
    const tick = async () => {
      if (enCurso) return;
      enCurso = true;
      try {
        const lista = await listarTocados(matchId);
        if (vivo) { setTocados(lista); setError(null); }
      } catch (e) {
        if (vivo) setError(e instanceof Error ? e.message : 'No se pudo leer la lista de tocados');
      } finally {
        enCurso = false;
      }
    };
    refrescarRef.current = () => { void tick(); };
    void tick();
    const id = setInterval(() => { void tick(); }, INTERVALO_TOCADOS_MS);
    return () => { vivo = false; clearInterval(id); };
  }, [matchId]);

  return { tocados, error, refrescar: () => refrescarRef.current() };
}

/**
 * Sondea el estado de Edge a través de Fog (cámara, fps reales, señal Favero y modo de prueba).
 *
 * Returns:
 *   `estado` (null si Edge no responde) y `error`.
 */
export function useEstadoEdge() {
  const [estado, setEstado] = useState<EstadoEdge | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let vivo = true;
    const tick = async () => {
      try {
        const e = await getEstadoEdge();
        if (vivo) { setEstado(e); setError(null); }
      } catch (err) {
        if (vivo) { setEstado(null); setError(err instanceof Error ? err.message : 'Edge no disponible'); }
      }
    };
    void tick();
    const id = setInterval(() => { void tick(); }, INTERVALO_EDGE_MS);
    return () => { vivo = false; clearInterval(id); };
  }, []);
  return { estado, error };
}
