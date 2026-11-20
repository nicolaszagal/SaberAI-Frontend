import { useCallback, useEffect, useRef, useState } from 'react';
import { useShortcut } from './useShortcut';
import { usePose } from './usePose';
import { useRazonamiento } from './useRazonamiento';

/** Sección de la vista que recibe el foco al abrirla. */
export type FocoInterpretacion = 'trazos' | 'razonamiento';

/** Frame al que lleva el cursor un evento: un frame del clip, o el primero si el evento está censurado. */
export type AperturaTrazos = { tipo: 'frame'; frameIdx: number } | { tipo: 'primero' };

/**
 * Evento del razonamiento elegido por el árbitro. `vez` cambia en cada pulsación, así que volver a
 * pulsar el mismo evento (tras mover el cursor a mano) lleva otra vez el cursor a su frame.
 */
export interface FrameSeleccionado {
  /** Posición del evento en `razonamiento.eventos`. */
  evento: number;
  destino: AperturaTrazos;
  vez: number;
}

interface Opciones {
  /** true = pide la pose y el razonamiento en cuanto hay revisión, sin esperar a abrir la vista. */
  precargar?: boolean;
  /** Se llama al cerrar la vista, para devolver el foco al lugar de donde se abrió. */
  alCerrar?: () => void;
}

/**
 * Coordina la vista de interpretación (trazos F-031 y razonamiento F-035 en una sola vista): si está
 * abierta, en qué sección cae el foco, los atajos I, T y J, la carga de la pose y del razonamiento
 * (con caché por revisión) y el evento elegido, que mueve el cursor de los trazos sin cerrar nada.
 * Al cambiar de revisión la vista se cierra. Abrirla o cerrarla no toca la elección del árbitro
 * (RNF-01, P-008).
 *
 * Args:
 *   revisionId: revisión abierta; null = ninguna (el botón y los atajos quedan inactivos).
 *   opciones: `precargar` pide los datos en segundo plano; `alCerrar` devuelve el foco al cerrar.
 *
 * Returns:
 *   El estado de la vista, la carga de cada parte y sus acciones, para `BotonInterpretacion` y `VistaInterpretacion`.
 */
export function useInterpretacion(revisionId: string | null, { precargar = false, alCerrar }: Opciones = {}) {
  const [abierta, setAbierta] = useState(false);
  const [foco, setFoco] = useState<FocoInterpretacion>('trazos');
  const [frameSeleccionado, setFrameSeleccionado] = useState<FrameSeleccionado | null>(null);
  const vez = useRef(0);
  const alCerrarRef = useRef(alCerrar);
  alCerrarRef.current = alCerrar;
  useEffect(() => { setAbierta(false); setFrameSeleccionado(null); }, [revisionId]);

  // Cada parte se pide por su cuenta: si una falla, la otra se muestra igual.
  const cargar = revisionId !== null && (precargar || abierta);
  const pose = usePose(revisionId, cargar);
  const razonamiento = useRazonamiento(revisionId, cargar);

  const abrir = useCallback((en: FocoInterpretacion) => { setFoco(en); setAbierta(true); }, []);
  const cerrar = useCallback(() => {
    setAbierta(false);
    setFrameSeleccionado(null);
    // Tras desmontar el modal, que no pisa el foco que se devuelve.
    setTimeout(() => alCerrarRef.current?.(), 0);
  }, []);

  /** Lleva el cursor al frame del evento (al primero si empezó antes del clip) sin abrir ni cerrar nada. */
  const verEnTrazos = useCallback((indiceEvento: number) => {
    const e = razonamiento.guardado?.eventos[indiceEvento];
    if (!e) return;
    vez.current += 1;
    setFrameSeleccionado({
      evento: indiceEvento, vez: vez.current,
      destino: e.censuradoInicio ? { tipo: 'primero' } : { tipo: 'frame', frameIdx: e.frameIdx },
    });
  }, [razonamiento.guardado]);
  /** El árbitro movió el cursor a mano: el evento deja de estar resaltado. */
  const soltarEvento = useCallback(() => setFrameSeleccionado(null), []);

  const libre = revisionId !== null && !abierta;
  useShortcut({ tecla: 'i', activo: libre }, () => abrir('trazos'));
  useShortcut({ tecla: 't', activo: libre }, () => abrir('trazos'));
  useShortcut({ tecla: 'j', activo: libre }, () => abrir('razonamiento'));

  return {
    revisionId, abierta, foco, frameSeleccionado, pose, razonamiento,
    abrir, cerrar, verEnTrazos, soltarEvento,
  };
}

/** Lo que devuelve `useInterpretacion`. */
export type Interpretacion = ReturnType<typeof useInterpretacion>;
