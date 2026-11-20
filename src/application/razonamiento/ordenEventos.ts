import type { EventoRazonamiento, VistaRazonamiento } from '../../domain/entities/Razonamiento';

/** Un evento con su posición original en `razonamiento.eventos` (el enlace con las marcas de la barra). */
export interface EventoOrdenado {
  evento: EventoRazonamiento;
  /** Posición del evento en `razonamiento.eventos`. */
  indice: number;
}

/**
 * Eventos medidos sobre la pose en orden cronológico, del más antiguo al más reciente respecto del
 * tocado. Un evento censurado al inicio (empezó antes del clip) va primero. El tocado es la referencia,
 * no un evento: no se incluye. A igual instante se conserva el orden en que llegan.
 *
 * Args:
 *   razonamiento: razonamiento ya cargado de la revisión.
 *
 * Returns:
 *   Los eventos con su posición original, ordenados por tiempo.
 */
export function eventosCronologicos(razonamiento: VistaRazonamiento): EventoOrdenado[] {
  return razonamiento.eventos
    .map((evento, indice) => ({ evento, indice }))
    .filter(x => x.evento.tipo !== 'tocado')
    .sort((a, b) => {
      if (a.evento.censuradoInicio !== b.evento.censuradoInicio) return a.evento.censuradoInicio ? -1 : 1;
      return a.evento.tMs - b.evento.tMs || a.indice - b.indice;
    });
}
