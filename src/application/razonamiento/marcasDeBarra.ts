import type { VistaPose } from '../../domain/entities/Pose';
import type { VistaRazonamiento } from '../../domain/entities/Razonamiento';

/** Evento del razonamiento ubicado en la barra de tiempo de los trazos. */
export interface MarcaEvento {
  /** Posición del evento en `razonamiento.eventos`: enlaza la marca con su fila en la lista. */
  evento: number;
  /** Posición en los arreglos de la pose. */
  indice: number;
  /** `A` o `B` para la extensión del brazo; `acercamiento` para el desplazamiento mutuo. */
  rotulo: 'A' | 'B' | 'acercamiento';
}

export interface MarcasDeBarra {
  eventos: MarcaEvento[];
  /** Tramo [desde, hasta] de la ventana de atención, en índices de la pose; null si no hay. */
  ventana: { desde: number; hasta: number } | null;
}

/**
 * Ubica los eventos y la ventana de atención del razonamiento en la barra de tiempo de los trazos.
 * Los eventos con `censuradoInicio` no se marcan: su instante real es anterior al clip y su frame
 * solo es el primero disponible. Un evento fuera del rango de la pose tampoco se marca.
 *
 * Args:
 *   razonamiento: razonamiento ya cargado de la revisión.
 *   pose: pose de la misma revisión (da el eje de frames y los fps).
 *
 * Returns:
 *   Las marcas de eventos y la ventana, en índices de los arreglos de la pose.
 */
export function marcasDeBarra(razonamiento: VistaRazonamiento, pose: VistaPose): MarcasDeBarra {
  const ultimo = pose.nFrames - 1;
  const eventos: MarcaEvento[] = [];
  for (const [evento, e] of razonamiento.eventos.entries()) {
    if (e.censuradoInicio || e.tipo === 'tocado') continue;
    const indice = e.frameIdx - pose.frameInicio;
    if (indice < 0 || indice > ultimo) continue;
    eventos.push({ evento, indice, rotulo: e.tipo === 'inicio_desplazamiento' ? 'acercamiento' : e.tirador ?? 'acercamiento' });
  }
  let ventana: MarcasDeBarra['ventana'] = null;
  const v = razonamiento.ventanaAtencion;
  if (v) {
    const tocado = pose.frameTocado - pose.frameInicio;
    const aIndice = (ms: number) => Math.min(Math.max(Math.round(tocado + (ms / 1000) * pose.fps), 0), ultimo);
    ventana = { desde: aIndice(v.desdeMs), hasta: aIndice(v.hastaMs) };
  }
  return { eventos, ventana };
}
