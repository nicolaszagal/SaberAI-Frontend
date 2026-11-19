import { fogFetch } from './fogFetch';
import type { VeredictoRegistrado } from '../../domain/entities/Action';
import type { FencerColor } from '../../domain/entities/Fencer';
import type { PoseTirador, VistaPose } from '../../domain/entities/Pose';
import type { EstadoRazonamiento, VistaRazonamiento } from '../../domain/entities/Razonamiento';
import type {
  BrazoArmado, CombateActivo, ConfigCombateInput, Decision, EventoCatalogo, HealthResponse,
  ModeloActivo, RevisionDetalle, RevisionResumen, ResumenValidacion, TiradorConfig, UsuarioCatalogo,
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

/**
 * Error de una respuesta no exitosa del Fog, con su código HTTP para distinguir 404, 409, etc.
 * `codigo` es el identificador estable de los 409 (`sin_clasificacion`, `keypoints_alterados`): se
 * distinguen por él y no por el texto de `detalle`, que puede cambiar.
 */
export class FogError extends Error {
  constructor(message: string, readonly status: number, readonly detalle: string, readonly codigo: string | null = null) {
    super(message);
    this.name = 'FogError';
  }
}

/** Mensaje de error de una respuesta no exitosa: `detail` del Fog si viene, si no el texto crudo. */
export async function errorDeRespuesta(res: Response): Promise<FogError> {
  const texto = await res.text();
  let detalle = texto;
  let codigo: string | null = null;
  try {
    const cuerpo = JSON.parse(texto) as { detail?: unknown; codigo?: unknown };
    if (typeof cuerpo.detail === 'string') detalle = cuerpo.detail;
    if (typeof cuerpo.codigo === 'string') codigo = cuerpo.codigo;
  } catch { /* cuerpo no JSON: se usa el texto tal cual */ }
  return new FogError(`Fog ${res.status}: ${detalle}`, res.status, detalle, codigo);
}

/**
 * POST /matches/{match_id}/clip (CU-02, CU-03). Abre una revisión y devuelve la sugerencia.
 *
 * Args:
 *   matchId: id del combate activo.
 *   file: clip MP4/MOV.
 *   tLuzAMs: instante de la luz Favero simulada de A, en ms desde el inicio del clip; null = apagada.
 *   tLuzBMs: ídem para B. Al menos una debe existir; el servidor deduce la luz encendida de su
 *     instante y calcula `t_tocado_ms` como el menor.
 *   signal: permite abandonar la espera (límite de 60 s, RNF-04).
 *
 * Raises:
 *   Error: si el Fog responde con error o no hay conexión.
 */
export async function uploadClip(
  matchId: string,
  file: File,
  tLuzAMs: number | null,
  tLuzBMs: number | null,
  signal?: AbortSignal,
): Promise<ClipUploadResponse> {
  const body = new FormData();
  body.append('file', file);
  // t_luz_a_ms/t_luz_b_ms (V02): has_luz_A/B y t_tocado_ms quedan como alias obsoletos del Fog.
  if (tLuzAMs !== null) body.append('t_luz_a_ms', String(tLuzAMs));
  if (tLuzBMs !== null) body.append('t_luz_b_ms', String(tLuzBMs));

  const res = await fogFetch(
    `/matches/${encodeURIComponent(matchId)}/clip`,
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
  const res = await fogFetch(`/revisiones/${encodeURIComponent(revisionId)}/veredicto`, {
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
  const res = await fogFetch(`/matches/${encodeURIComponent(matchId)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw await errorDeRespuesta(res);
  const c = (await res.json()) as CombateDto;
  return {
    matchId: c.match_id, eventoId: null, pista: c.pista, arbitroId: c.arbitro_id, arbitro: c.arbitro,
    aliasA: c.alias_A, aliasB: c.alias_B, brazoA: c.weapon_side_A, brazoB: c.weapon_side_B,
  };
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fogFetch(path);
  if (!res.ok) throw new Error(`Fog ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

/** GET /health. Responde 503 con el mismo cuerpo si un componente falla; solo un fallo de red lanza error. */
export async function getHealth(): Promise<HealthResponse> {
  const res = await fogFetch(`/health`);
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

/**
 * GET /revisiones?evento_id= (CU-12): revisiones del evento, de la más reciente a la más antigua.
 *
 * Raises:
 *   Error: si el Fog responde con error o no hay conexión.
 */
export async function getRevisiones(eventoId: string): Promise<RevisionResumen[]> {
  const rows = await getJson<RevisionDto[]>(`/revisiones?evento_id=${encodeURIComponent(eventoId)}`);
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

interface RevisionDetalleDto {
  id: string;
  abierta_en: string;
  cerrada_en: string | null;
  sugerencia: {
    disponible: boolean;
    motivo_no_disp: string | null;
    clase: string | null;
    tirador: 'A' | 'B' | null;
    confianza: number | null;
  } | null;
  probabilidades: Record<string, number> | null;
  decision: string | null;
  clase_final: string | null;
  registrado_en: string | null;
  auditoria_seq: number | null;
  auditoria_hash: string | null;
}

/**
 * GET /revisiones/{id}: detalle de una revisión.
 *
 * Raises:
 *   Error: si la revisión no existe (404) o el Fog no responde.
 */
export async function getRevision(id: string): Promise<RevisionDetalle> {
  const d = await getJson<RevisionDetalleDto>(`/revisiones/${encodeURIComponent(id)}`);
  return {
    id: d.id,
    abiertaEn: d.abierta_en,
    cerradaEn: d.cerrada_en,
    sugerencia: d.sugerencia && {
      disponible: d.sugerencia.disponible,
      motivoNoDisp: d.sugerencia.motivo_no_disp,
      clase: d.sugerencia.clase,
      tirador: d.sugerencia.tirador,
      confianza: d.sugerencia.confianza,
    },
    probabilidades: d.probabilidades,
    decision: d.decision,
    claseFinal: d.clase_final,
    registradoEn: d.registrado_en,
    auditoriaSeq: d.auditoria_seq,
    auditoriaHash: d.auditoria_hash,
  };
}

/**
 * GET /validaciones/{evento_id}/resumen (L02) en texto, tal como lo devuelve el Fog, para exportarlo.
 *
 * Raises:
 *   Error: si el evento no existe (404) o el Fog no responde.
 */
export async function getResumenValidacionTexto(eventoId: string): Promise<string> {
  const res = await fogFetch(`/validaciones/${encodeURIComponent(eventoId)}/resumen`);
  if (!res.ok) throw await errorDeRespuesta(res);
  return res.text();
}

interface ResumenValidacionDto {
  n_revisiones: number;
  latencia: { p95_ms: number | null; p95_excede_umbral: boolean };
  kappa: { calculable: boolean; kappa: number | null; banda: string | null };
}

const aResumenValidacion = (v: ResumenValidacionDto): ResumenValidacion => ({
  nRevisiones: v.n_revisiones,
  latencia: { p95Ms: v.latencia.p95_ms, p95ExcedeUmbral: v.latencia.p95_excede_umbral },
  kappa: { calculable: v.kappa.calculable, kappa: v.kappa.kappa, banda: v.kappa.banda },
});

/**
 * GET /validaciones/{evento_id}/resumen: métricas de la validación (una sola, κ sistema-árbitro).
 *
 * Raises:
 *   Error: si el evento no existe (404) o el Fog no responde.
 */
export async function getResumenSesion(eventoId: string): Promise<ResumenValidacion> {
  const r = await getJson<{ validacion: ResumenValidacionDto }>(
    `/validaciones/${encodeURIComponent(eventoId)}/resumen`);
  return aResumenValidacion(r.validacion);
}

/** POST /matches/config (CU-01). Devuelve el `match_id` del combate creado. */
export async function configureMatch(input: ConfigCombateInput): Promise<string> {
  const lado = (suf: 'A' | 'B', t: TiradorConfig) => ({
    [`alias_${suf}`]: t.alias,
    [`weapon_side_${suf}`]: t.brazo,
  });
  const res = await fogFetch(`/matches/config`, {
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

interface PoseTiradorDto {
  color: 'ROJ' | 'VER';
  brazo: 'diestro' | 'zurdo';
  xy: number[][][];
  conf: number[][];
  detectado: boolean[];
  angulo_codo: (number | null)[];
}

interface PoseDto {
  revision_id: string;
  fps: number;
  frame_w: number;
  frame_h: number;
  frame_inicio: number;
  frame_tocado: number;
  n_frames: number;
  conf_min_keypoint: number;
  tiradores: { A: PoseTiradorDto; B: PoseTiradorDto } | null;
  motivo: string | null;
}

const aPoseTirador = (t: PoseTiradorDto): PoseTirador => ({
  color: t.color, brazo: t.brazo, xy: t.xy, conf: t.conf, detectado: t.detectado, anguloCodo: t.angulo_codo,
});

/**
 * GET /revisiones/{revision_id}/pose (F-031, CU-08): keypoints de A y B para los trazos del modal.
 *
 * Args:
 *   revisionId: id de la revisión.
 *
 * Returns:
 *   La pose. Con `nFrames` 0 (timeout o pose incompleta) no hay `tiradores` y `motivo` lo explica.
 *
 * Raises:
 *   FogError: 404 si no existe, 409 si no hay clasificación o los keypoints fallan la verificación.
 *   TypeError: si no hay conexión.
 */
export async function obtenerPose(revisionId: string): Promise<VistaPose> {
  const res = await fogFetch(`/revisiones/${encodeURIComponent(revisionId)}/pose`);
  if (!res.ok) throw await errorDeRespuesta(res);
  const d = (await res.json()) as PoseDto;
  return {
    revisionId: d.revision_id, fps: d.fps, frameW: d.frame_w, frameH: d.frame_h,
    frameInicio: d.frame_inicio, frameTocado: d.frame_tocado, nFrames: d.n_frames,
    confMinKeypoint: d.conf_min_keypoint, motivo: d.motivo,
    tiradores: d.tiradores && { A: aPoseTirador(d.tiradores.A), B: aPoseTirador(d.tiradores.B) },
  };
}

interface EventoRazonamientoDto {
  tipo: 'inicio_extension_brazo' | 'inicio_desplazamiento' | 'tocado';
  tirador?: 'A' | 'B';
  frame_idx: number;
  t_ms: number;
  censurado_inicio?: boolean;
}

interface RazonamientoDto {
  revision_id: string;
  estado: EstadoRazonamiento;
  frases?: string[];
  criterio_fie?: { articulo: string; clase: string };
  confianza?: number;
  ventana_atencion?: { desde_ms: number; hasta_ms: number };
  frame_clave?: number;
  eventos?: EventoRazonamientoDto[];
  params_version?: string;
  motivo?: string;
}

/**
 * GET /revisiones/{revision_id}/razonamiento (F-035, CU-09): las frases que explican la sugerencia,
 * guardadas por Fog al clasificar. El Fog omite los campos null; aquí quedan como null.
 *
 * Args:
 *   revisionId: id de la revisión.
 *
 * Returns:
 *   El razonamiento, con `estado` `no_registrado`, `no_calculado` o `no_disponible` cuando no hay.
 *
 * Raises:
 *   FogError: 404 si no existe, 409 con `codigo` `sin_clasificacion` si no hay clasificación.
 *   TypeError: si no hay conexión.
 */
export async function obtenerRazonamiento(revisionId: string): Promise<VistaRazonamiento> {
  const res = await fogFetch(`/revisiones/${encodeURIComponent(revisionId)}/razonamiento`);
  if (!res.ok) throw await errorDeRespuesta(res);
  const d = (await res.json()) as RazonamientoDto;
  return {
    revisionId: d.revision_id,
    estado: d.estado,
    frases: d.frases ?? [],
    criterio: d.criterio_fie ?? null,
    confianza: d.confianza ?? null,
    ventanaAtencion: d.ventana_atencion ? { desdeMs: d.ventana_atencion.desde_ms, hastaMs: d.ventana_atencion.hasta_ms } : null,
    frameClave: d.frame_clave ?? null,
    eventos: (d.eventos ?? []).map(e => ({
      tipo: e.tipo, tirador: e.tirador ?? null, frameIdx: e.frame_idx, tMs: e.t_ms,
      censuradoInicio: e.censurado_inicio ?? false,
    })),
    paramsVersion: d.params_version ?? null,
    motivo: d.motivo ?? null,
  };
}
