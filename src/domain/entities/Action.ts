import type { FencerColor } from './Fencer';
import type { Decision } from './Combate';

export type ActionClass =
  | 'AttackA' | 'AttackB'
  | 'ContrattackA' | 'ContrattackB'
  | 'RiposteA' | 'RiposteB';

/** Sugerencia del sistema para una revisión (RNF-01: nunca es la decisión). */
export interface Sugerencia {
  fencer: FencerColor;
  /** Clase del modelo (p. ej. `AttackA`). */
  action: string;
  /** Confianza en porcentaje entero, 0–100. */
  confidence: number;
}

/**
 * Resultado de analizar un clip. `revisionId` es null solo si el análisis se
 * abandonó por superar el límite de 60 s (el Fog no llegó a responder).
 */
export interface RevisionAnalizada {
  revisionId: string | null;
  /** null = "Clasificación no disponible"; el motivo va en `motivo`. */
  sugerencia: Sugerencia | null;
  motivo: string | null;
}

/** Decisión del árbitro ya registrada en el Fog. `claseFinal` es null con `anular`. */
export interface VeredictoRegistrado {
  decision: Decision;
  claseFinal: string | null;
}
