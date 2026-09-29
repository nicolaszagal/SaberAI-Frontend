import type { FencerColor } from './Fencer';

export type ActionClass =
  | 'AttackA' | 'AttackB'
  | 'ContrattackA' | 'ContrattackB'
  | 'RiposteA' | 'RiposteB';

export interface HistorialEntry {
  id: string;
  fencer: FencerColor;
  action: string;
  confidence: number;
  timestamp: string;
  durationMs: number;
}

export interface CurrentActionData {
  fencer: FencerColor;
  fencerName: string;
  action: string;
  confidence: number;
  model: string;
  latencyMs: number;
}
