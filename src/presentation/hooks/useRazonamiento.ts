import { obtenerRazonamiento } from '../../infrastructure/api/fogApi';
import type { VistaRazonamiento } from '../../domain/entities/Razonamiento';
import { useCargaPorRevision, type EstadoCarga } from './useCargaPorRevision';

/** Estado de la carga del razonamiento de una revisión. */
export type EstadoRazonamientoCarga = EstadoCarga<VistaRazonamiento>;

/**
 * Carga bajo demanda del razonamiento de una revisión (F-035): `GET /revisiones/{id}/razonamiento`
 * solo cuando `activo` pasa a `true`, con caché por revisión.
 *
 * Args:
 *   revisionId: revisión de la que se pide el razonamiento; null = ninguna.
 *   activo: si hay que pedirlo (vista abierta o precarga de Revisión VAR).
 *
 * Returns:
 *   El estado de la carga, el razonamiento ya guardado de esa revisión (o null, sin pedirlo) y `reintentar`.
 */
export function useRazonamiento(revisionId: string | null, activo: boolean) {
  return useCargaPorRevision(obtenerRazonamiento, revisionId, activo);
}
