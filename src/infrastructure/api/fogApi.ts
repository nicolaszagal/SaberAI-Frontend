import { FOG_BASE_URL } from '../config';
import type { FencerColor } from '../../domain/entities/Fencer';

export interface ClipUploadResponse {
  match_id: string;
  has_luz_A: boolean;
  has_luz_B: boolean;
  timed_out: boolean;
  fencer?: FencerColor;
  action?: string;
  confidence?: number;
}

export async function uploadClip(
  matchId: string,
  file: File,
  hasLuzA: boolean,
  hasLuzB: boolean,
  tTocadoMs?: number,
): Promise<ClipUploadResponse> {
  const body = new FormData();
  body.append('file', file);
  // has_luz_A/has_luz_B (DEF-14): reemplaza al alias obsoleto luz_frame_a/b,
  // que reducía la señal a un booleano vía "se envió o no un índice de
  // frame" y no dejaba lugar para reportar el instante del tocado (RF-02).
  body.append('has_luz_A', String(hasLuzA));
  body.append('has_luz_B', String(hasLuzB));
  if (tTocadoMs != null) body.append('t_tocado_ms', String(tTocadoMs));

  const res = await fetch(
    `${FOG_BASE_URL}/matches/${encodeURIComponent(matchId)}/clip`,
    { method: 'POST', body },
  );

  if (!res.ok) {
    throw new Error(`Fog ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<ClipUploadResponse>;
}
