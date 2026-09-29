import { FOG_BASE_URL } from '../config';
import type { VeredictoRegistrado } from '../../domain/entities/Action';
import type { FencerColor } from '../../domain/entities/Fencer';
import type {
  BrazoArmado, CombateActivo, ConfigCombateInput, Decision, EventoCatalogo, HealthResponse,
  ModeloActivo, RevisionResumen, TiradorConfig, UsuarioCatalogo,
} from '../../domain/entities/Combate';

export interface ClipUploadResponse {
  match_id: string;
  revision_id: string;
  has_luz_A: boolean;
  has_luz_B: boolean;
  timed_out: boolean;
  disponible: boolean;
  motivo: string | null;
  fencer?: FencerColor | null;
  action?: string | null;
  confidence?: number | null;
}

/** Mensaje de error de una respuesta no exitosa: `detail` del Fog si viene, si no el texto crudo. */
async function errorDeRespuesta(res: Response): Promise<Error> {
  const texto = await res.text();
  let detalle = texto;
  try {
    const d = (JSON.parse(texto) as { detail?: unknown }).detail;
    if (typeof d === 'string') detalle = d;
  } catch { /* cuerpo no JSON: se usa el texto tal cual */ }
  return new Error(`Fog ${res.status}: ${detalle}`);
}

/**
 * POST /matches/{match_id}/clip (CU-02, CU-03). Abre una revisión y devuelve la sugerencia.
 *
 * Args:
 *   matchId: id del combate activo.
 *   file: clip MP4/MOV.
 *   hasLuzA: luz Favero simulada de A.
 *   hasLuzB: luz Favero simulada de B.
 *   tTocadoMs: instante del tocado en ms desde el inicio del clip.
 *   signal: permite abandonar la espera (límite de 60 s, RNF-04).
 *
 * Raises:
 *   Error: si el Fog responde con error o no hay conexión.
 */
export async function uploadClip(
  matchId: string,
  file: File,
  hasLuzA: boolean,
  hasLuzB: boolean,
  tTocadoMs: number,
  signal?: AbortSignal,
): Promise<ClipUploadResponse> {
  const body = new FormData();
  body.append('file', file);
  // has_luz_A/has_luz_B (DEF-14): reemplaza al alias obsoleto luz_frame_a/b.
  body.append('has_luz_A', String(hasLuzA));
  body.append('has_luz_B', String(hasLuzB));
  body.append('t_tocado_ms', String(tTocadoMs));

  const res = await fetch(
    `${FOG_BASE_URL}/matches/${encodeURIComponent(matchId)}/clip`,
    { method: 'POST', body, signal },
  );
  if (!res.ok) throw await errorDeRespuesta(res);
  return res.json() as Promise<ClipUploadResponse>;
}

/** Cuerpo de POST /revisiones/{id}/veredicto. `clase_final` va con mantener y cambiar, nunca con anular. */
export interface VeredictoInput {
  decision: Decision;
  claseFinal: string | null;
  arbitroId: string;
}

/**
 * POST /revisiones/{revision_id}/veredicto (CU-10, F-033).
 *
 * Raises:
 *   Error: si el Fog rechaza el veredicto (404, 409, 422) o no hay conexión.
 */
export async function postVeredicto(revisionId: string, input: VeredictoInput): Promise<VeredictoRegistrado> {
  const res = await fetch(`${FOG_BASE_URL}/revisiones/${encodeURIComponent(revisionId)}/veredicto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      decision: input.decision,
      ...(input.claseFinal ? { clase_final: input.claseFinal } : {}),
      arbitro_id: input.arbitroId,
    }),
  });
  if (!res.ok) throw await errorDeRespuesta(res);
  const b = (await res.json()) as { decision: Decision; clase_final: string | null };
  return { decision: b.decision, claseFinal: b.clase_final };
}

interface CombateDto {
  match_id: string;
  pista: string;
  arbitro_id: string;
  arbitro: string;
  alias_A: string;
  weapon_side_A: BrazoArmado;
  alias_B: string;
  weapon_side_B: BrazoArmado;
}

/**
 * GET /matches/{match_id}: valida el combate activo recordado.
 *
 * Returns:
 *   El combate, o null si el Fog responde 404 (no existe).
 *
 * Raises:
 *   Error: con cualquier otro fallo (sin conexión, 5xx): el combate no se descarta.
 */
export async function getCombate(matchId: string): Promise<CombateActivo | null> {
  const res = await fetch(`${FOG_BASE_URL}/matches/${encodeURIComponent(matchId)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw await errorDeRespuesta(res);
  const c = (await res.json()) as CombateDto;
  return {
    matchId: c.match_id, pista: c.pista, arbitroId: c.arbitro_id, arbitro: c.arbitro,
    aliasA: c.alias_A, aliasB: c.alias_B, brazoA: c.weapon_side_A, brazoB: c.weapon_side_B,
  };
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
