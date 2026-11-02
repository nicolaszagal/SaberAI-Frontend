/** Razonamiento de la sugerencia (F-035, F-008, CU-09). Viene de GET /revisiones/{id}/razonamiento. */

/** Estado del razonamiento tal como lo define el Fog (CU-09 en contexto_sabre.md). */
export type EstadoRazonamiento =
  | 'respaldada' | 'discordante' | 'no_concluyente' | 'insuficiente'
  | 'no_calculado' | 'no_registrado' | 'no_disponible';

/** Evento medido por Fog sobre la pose. `tMs` es relativo al tocado (negativo = antes). */
export interface EventoRazonamiento {
  tipo: 'inicio_extension_brazo' | 'inicio_desplazamiento' | 'tocado';
  /** Ausente en `inicio_desplazamiento` (acercamiento mutuo) y en `tocado`. */
  tirador: 'A' | 'B' | null;
  /** Frame del clip (el mismo eje que `frameInicio` de la pose). */
  frameIdx: number;
  tMs: number;
  /** true = el evento empezó antes del clip y `frameIdx` es el primer frame disponible. */
  censuradoInicio: boolean;
}

export interface VistaRazonamiento {
  revisionId: string;
  estado: EstadoRazonamiento;
  /** Las frases tal como llegan; el frontend no las reescribe. */
  frases: string[];
  criterio: { articulo: string; clase: string } | null;
  /** Entre 0 y 1. */
  confianza: number | null;
  ventanaAtencion: { desdeMs: number; hastaMs: number } | null;
  frameClave: number | null;
  eventos: EventoRazonamiento[];
  paramsVersion: string | null;
  /** Con `no_disponible`, el `motivo_no_disp` de la clasificación. */
  motivo: string | null;
}
