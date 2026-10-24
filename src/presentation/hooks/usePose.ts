import { useCallback, useEffect, useRef, useState } from 'react';
import { FogError, obtenerPose } from '../../infrastructure/api/fogApi';
import type { VistaPose } from '../../domain/entities/Pose';

/** Estado de la carga de la pose de una revisión. */
export type EstadoPose =
  | { tipo: 'inactivo' }
  | { tipo: 'cargando' }
  | { tipo: 'listo'; pose: VistaPose }
  /** `status` es el código HTTP del Fog (409 = sin clasificación o keypoints alterados); null si no hubo respuesta. */
  | { tipo: 'error'; mensaje: string; status: number | null; detalle: string | null };

/**
 * Carga bajo demanda de la pose de una revisión (F-031). Pide `GET /revisiones/{id}/pose` solo
 * cuando `activo` pasa a `true` y guarda las respuestas por revisión mientras el componente que
 * usa el hook siga montado: reabrir el modal no vuelve a pedirla. Los errores no se guardan,
 * así que `reintentar` sí consulta de nuevo.
 *
 * Args:
 *   revisionId: revisión de la que se piden los trazos; null = ninguna.
 *   activo: si el modal está abierto.
 *
 * Returns:
 *   El estado de la carga y `reintentar`.
 */
export function usePose(revisionId: string | null, activo: boolean): { estado: EstadoPose; reintentar: () => void } {
  const cache = useRef(new Map<string, VistaPose>());
  const enVuelo = useRef(new Set<string>());
  const [recibido, setRecibido] = useState<Record<string, EstadoPose>>({});
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    if (!activo || !revisionId || cache.current.has(revisionId) || enVuelo.current.has(revisionId)) return;
    const id = revisionId;
    enVuelo.current.add(id);
    setRecibido(r => ({ ...r, [id]: { tipo: 'cargando' } }));
    obtenerPose(id)
      .then(pose => {
        cache.current.set(id, pose);
        setRecibido(r => ({ ...r, [id]: { tipo: 'listo', pose } }));
      })
      .catch(e => {
        const mensaje = e instanceof Error ? e.message : 'No se pudo leer la pose';
        setRecibido(r => ({ ...r, [id]: { tipo: 'error', mensaje, status: e instanceof FogError ? e.status : null, detalle: e instanceof FogError ? e.detalle : null } }));
      })
      .finally(() => { enVuelo.current.delete(id); });
  }, [activo, revisionId, intento]);

  const reintentar = useCallback(() => setIntento(n => n + 1), []);

  let estado: EstadoPose = { tipo: 'inactivo' };
  if (revisionId) {
    const guardada = cache.current.get(revisionId);
    estado = guardada ? { tipo: 'listo', pose: guardada } : recibido[revisionId] ?? (activo ? { tipo: 'cargando' } : estado);
  }
  return { estado, reintentar };
}
