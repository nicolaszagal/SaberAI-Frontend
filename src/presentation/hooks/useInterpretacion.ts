import { useCallback, useEffect, useState } from 'react';
import { useShortcut } from './useShortcut';
import { useRazonamiento } from './useRazonamiento';
import type { AperturaTrazos } from '../components/ModalTrazos';
import type { EventoRazonamiento } from '../../domain/entities/Razonamiento';

type Modal = 'trazos' | 'razonamiento' | null;

/**
 * Coordina los dos modales de apoyo a la revisión (trazos F-031 y razonamiento F-035): cuál está
 * abierto, los atajos T y J, el razonamiento en caché y el salto de un evento a su frame en los trazos.
 * Al cambiar de revisión los modales se cierran. Abrir o cerrar un modal no toca la elección del árbitro.
 *
 * Args:
 *   revisionId: revisión abierta; null = ninguna (los botones y atajos quedan inactivos).
 *
 * Returns:
 *   El estado de los modales y sus acciones, para `BotonesInterpretacion` y `ModalesInterpretacion`.
 */
export function useInterpretacion(revisionId: string | null) {
  const [modal, setModal] = useState<Modal>(null);
  const [abrirEn, setAbrirEn] = useState<AperturaTrazos | null>(null);
  useEffect(() => { setModal(null); setAbrirEn(null); }, [revisionId]);

  const razonamiento = useRazonamiento(revisionId, modal === 'razonamiento');

  const abrirTrazos = useCallback(() => { setAbrirEn(null); setModal('trazos'); }, []);
  const abrirRazonamiento = useCallback(() => setModal('razonamiento'), []);
  const cerrar = useCallback(() => setModal(null), []);
  /** Abre los trazos en el frame del evento; si empezó antes del clip, en el primer frame. */
  const verEnTrazos = useCallback((e: EventoRazonamiento) => {
    setAbrirEn(e.censuradoInicio ? { tipo: 'primero' } : { tipo: 'frame', frameIdx: e.frameIdx });
    setModal('trazos');
  }, []);

  const libre = revisionId !== null && modal === null;
  useShortcut({ tecla: 't', activo: libre }, abrirTrazos);
  useShortcut({ tecla: 'j', activo: libre }, abrirRazonamiento);

  return { revisionId, modal, abrirEn, razonamiento, abrirTrazos, abrirRazonamiento, cerrar, verEnTrazos };
}

/** Lo que devuelve `useInterpretacion`. */
export type Interpretacion = ReturnType<typeof useInterpretacion>;
