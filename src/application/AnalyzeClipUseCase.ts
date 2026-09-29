import type { RevisionAnalizada } from '../domain/entities/Action';
import type { CombateActivo } from '../domain/entities/Combate';
import { uploadClip } from '../infrastructure/api/fogApi';
import { scaleConfidence } from './mappers/actionMapper';

/** Límite de espera de la sugerencia dentro de la revisión (D-08, RNF-04). */
export const LIMITE_ANALISIS_MS = 60_000;

export interface AnalyzeClipInput {
  file: File;
  hasLuzA: boolean;
  hasLuzB: boolean;
  tTocadoMs: number;
  combate: CombateActivo;
}

/**
 * Sube el clip y devuelve la sugerencia de la revisión abierta.
 *
 * Si pasan 60 s sin respuesta abandona la espera y devuelve "no disponible"
 * con motivo `timeout` (RF-13, RNF-09): el árbitro sigue el procedimiento VAR habitual.
 *
 * Args:
 *   input: clip, luces, instante del tocado y combate activo.
 *
 * Returns:
 *   La revisión con su sugerencia, o sin ella y con el motivo.
 *
 * Raises:
 *   Error: si el Fog rechaza el clip o no hay conexión.
 */
export async function analyzeClip(input: AnalyzeClipInput): Promise<RevisionAnalizada> {
  const { file, hasLuzA, hasLuzB, tTocadoMs, combate } = input;
  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), LIMITE_ANALISIS_MS);
  try {
    const r = await uploadClip(combate.matchId, file, hasLuzA, hasLuzB, tTocadoMs, control.signal);
    if (!r.disponible || !r.fencer || !r.action || r.confidence == null) {
      return { revisionId: r.revision_id, sugerencia: null, motivo: r.motivo ?? (r.timed_out ? 'timeout' : null) };
    }
    return {
      revisionId: r.revision_id,
      sugerencia: { fencer: r.fencer, action: r.action, confidence: scaleConfidence(r.confidence) },
      motivo: null,
    };
  } catch (e) {
    if (control.signal.aborted) return { revisionId: null, sugerencia: null, motivo: 'timeout' };
    throw e;
  } finally {
    clearTimeout(temporizador);
  }
}
