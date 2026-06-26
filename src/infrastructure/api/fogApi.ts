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
): Promise<ClipUploadResponse> {
  const body = new FormData();
  body.append('file', file);
  if (hasLuzA) body.append('luz_frame_a', '0');
  if (hasLuzB) body.append('luz_frame_b', '0');

  const res = await fetch(
    `${FOG_BASE_URL}/matches/${encodeURIComponent(matchId)}/clip`,
    { method: 'POST', body },
  );

  if (!res.ok) {
    throw new Error(`Fog ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<ClipUploadResponse>;
}
