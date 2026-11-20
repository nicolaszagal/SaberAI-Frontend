import { obtenerPose } from '../../infrastructure/api/fogApi';
import type { VistaPose } from '../../domain/entities/Pose';
import { useCargaPorRevision, type EstadoCarga } from './useCargaPorRevision';

/** Estado de la carga de la pose de una revisión. */
export type EstadoPose = EstadoCarga<VistaPose>;

/**
 * Carga bajo demanda de la pose de una revisión (F-031): `GET /revisiones/{id}/pose` solo cuando
 * `activo` pasa a `true`, con caché por revisión (ver `useCargaPorRevision`).
 *
 * Args:
 *   revisionId: revisión de la que se piden los trazos; null = ninguna.
 *   activo: si hay que pedirla (vista abierta o precarga de Revisión VAR).
 *
 * Returns:
 *   El estado de la carga y `reintentar`.
 */
export function usePose(revisionId: string | null, activo: boolean): { estado: EstadoPose; reintentar: () => void } {
  const { estado, reintentar } = useCargaPorRevision(obtenerPose, revisionId, activo);
  return { estado, reintentar };
}
