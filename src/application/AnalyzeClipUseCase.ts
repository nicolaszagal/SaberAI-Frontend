import type { CurrentActionData, HistorialEntry } from '../domain/entities/Action';
import type { CombateActivo } from '../domain/entities/Combate';
import { uploadClip } from '../infrastructure/api/fogApi';
import { translateAction, scaleConfidence, formatTimestamp, aliasDelTirador } from './mappers/actionMapper';

let entryCounter = 200;

export interface AnalyzeClipInput {
  file: File;
  hasLuzA: boolean;
  hasLuzB: boolean;
  combate: CombateActivo;
}

export interface AnalyzeClipOutput {
  action: CurrentActionData;
  entry: HistorialEntry;
}

export async function analyzeClip(input: AnalyzeClipInput): Promise<AnalyzeClipOutput> {
  const { file, hasLuzA, hasLuzB, combate } = input;
  const startMs = Date.now();

  const result = await uploadClip(combate.matchId, file, hasLuzA, hasLuzB);

  if (result.timed_out || !result.fencer || !result.action || result.confidence == null) {
    throw new Error('El análisis excedió el tiempo máximo o no devolvió veredicto.');
  }

  const latencyMs = Date.now() - startMs;
  const conf      = scaleConfidence(result.confidence);
  const action    = translateAction(result.action);
  const fencer    = result.fencer;

  return {
    action: {
      fencer,
      fencerName: aliasDelTirador(result.action, combate),
      action,
      confidence: conf,
      model: 'sabre-lstm-6class',
      latencyMs,
    },
    entry: {
      id:         `P${++entryCounter}`,
      fencer,
      action,
      confidence: conf,
      timestamp:  formatTimestamp(new Date()),
      durationMs: latencyMs,
    },
  };
}
