import { FOG_BASE_URL } from '../config';
import type { FencerColor } from '../../domain/entities/Fencer';
import type {
  ConfigCombateInput, EventoCatalogo, HealthResponse, ModeloActivo,
  RevisionResumen, TiradorConfig, UsuarioCatalogo,
} from '../../domain/entities/Combate';

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

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${FOG_BASE_URL}${path}`);
  if (!res.ok) throw new Error(`Fog ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

/** GET /health. Responde 503 con el mismo cuerpo si un componente falla; solo un fallo de red lanza error. */
export async function getHealth(): Promise<HealthResponse> {
  const res = await fetch(`${FOG_BASE_URL}/health`);
  return res.json() as Promise<HealthResponse>;
}

export function getEventos(): Promise<EventoCatalogo[]> {
  return getJson<EventoCatalogo[]>('/eventos');
}

export function getArbitros(): Promise<UsuarioCatalogo[]> {
  return getJson<UsuarioCatalogo[]>('/usuarios?rol=arbitro');
}

export function getModeloActivo(): Promise<ModeloActivo> {
  return getJson<ModeloActivo>('/modelo/activo');
}

interface RevisionDto {
  id: string;
  abierta_en: string;
  disponible: boolean;
  clase: string | null;
  confianza: number | null;
  decision: string | null;
  clase_final: string | null;
}

export async function getRevisiones(): Promise<RevisionResumen[]> {
  const rows = await getJson<RevisionDto[]>('/revisiones');
  return rows.map(r => ({
    id: r.id,
    abiertaEn: r.abierta_en,
    disponible: r.disponible,
    clase: r.clase,
    confianza: r.confianza,
    decision: r.decision,
    claseFinal: r.clase_final,
  }));
}

/** POST /matches/config (CU-01). Devuelve el `match_id` del combate creado. */
export async function configureMatch(input: ConfigCombateInput): Promise<string> {
  const lado = (suf: 'A' | 'B', t: TiradorConfig) => ({
    [`alias_${suf}`]: t.alias,
    [`weapon_side_${suf}`]: t.brazo,
    [`es_menor_${suf}`]: t.esMenor,
    [`consentimiento_firmado_${suf}`]: t.consentimientoFirmado,
    [`consentimiento_fecha_${suf}`]: t.consentimientoFirmado ? t.consentimientoFecha : null,
    [`firmante_${suf}`]: t.esMenor && t.consentimientoFirmado ? t.firmante : null,
  });
  const res = await fetch(`${FOG_BASE_URL}/matches/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      evento_id: input.eventoId,
      pista: input.pista,
      arbitro_id: input.arbitroId,
      ...lado('A', input.a),
      ...lado('B', input.b),
    }),
  });
  if (!res.ok) throw new Error(`Fog ${res.status}: ${await res.text()}`);
  const body = (await res.json()) as { match_id: string };
  return body.match_id;
}
