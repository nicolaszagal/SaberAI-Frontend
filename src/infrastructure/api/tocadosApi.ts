import { fogFetch } from './fogFetch';
import { errorDeRespuesta, type ClipUploadResponse } from './fogApi';
import type {
  CamaraDispositivo, ConfigCamara, DecisionPista, EstadoEdge, Tocado,
} from '../../domain/entities/Tocado';

interface TocadoJson {
  tocado_id: string; creado_en: string; fuente: Tocado['fuente']; luz_A: boolean; luz_B: boolean;
  t_luz_a_ms: number | null; t_luz_b_ms: number | null; estado: Tocado['estado']; tiene_clip: boolean;
  revision_id: string | null; revisado: boolean; admite_var: boolean;
  decision_pista: { clase: string | null; anulado: boolean } | null;
}

function aTocado(j: TocadoJson): Tocado {
  return {
    tocadoId: j.tocado_id, creadoEn: j.creado_en, fuente: j.fuente, luzA: j.luz_A, luzB: j.luz_B,
    tLuzAMs: j.t_luz_a_ms, tLuzBMs: j.t_luz_b_ms, estado: j.estado, tieneClip: j.tiene_clip,
    revisionId: j.revision_id, revisado: j.revisado, admiteVar: j.admite_var,
    decisionPista: j.decision_pista ? { clase: j.decision_pista.clase, anulado: j.decision_pista.anulado } : null,
  };
}

/** GET /matches/{id}/tocados: los últimos tocados, el más reciente primero (sin sugerencia, D-04). */
export async function listarTocados(matchId: string): Promise<Tocado[]> {
  const res = await fogFetch(`/matches/${encodeURIComponent(matchId)}/tocados`);
  if (!res.ok) throw await errorDeRespuesta(res);
  return ((await res.json()) as TocadoJson[]).map(aTocado);
}

/**
 * POST /tocados/{id}/revision ("Solicitar VAR"): abre la revisión con la sugerencia ya calculada.
 *
 * Raises:
 *   FogError: 404 si no existe, 409 (`ventana_var_cerrada`) si llegó un tocado posterior.
 */
export async function solicitarVar(tocadoId: string, signal?: AbortSignal): Promise<ClipUploadResponse> {
  const res = await fogFetch(`/tocados/${encodeURIComponent(tocadoId)}/revision`, { method: 'POST', signal });
  if (!res.ok) throw await errorDeRespuesta(res);
  return res.json() as Promise<ClipUploadResponse>;
}

/** POST /tocados/{id}/decision-pista: lo que cantó el árbitro, sin ver la sugerencia. */
export async function registrarDecisionPista(
  tocadoId: string, clase: string | null, arbitroId?: string,
): Promise<DecisionPista> {
  const res = await fogFetch(`/tocados/${encodeURIComponent(tocadoId)}/decision-pista`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clase, anulado: clase === null, registrado_por: arbitroId }),
  });
  if (!res.ok) throw await errorDeRespuesta(res);
  const j = (await res.json()) as DecisionPista;
  return { clase: j.clase, anulado: j.anulado };
}

/** GET /tocados/{id}/clip como URL de objeto (el `<video>` no puede enviar el JWT). */
export async function descargarClipTocado(tocadoId: string): Promise<string> {
  const res = await fogFetch(`/tocados/${encodeURIComponent(tocadoId)}/clip`);
  if (!res.ok) throw await errorDeRespuesta(res);
  return URL.createObjectURL(await res.blob());
}

// ─── Edge, siempre a través de Fog (/edge/*) ────────────────────────────────

export async function getEstadoEdge(): Promise<EstadoEdge> {
  const res = await fogFetch('/edge/estado');
  if (!res.ok) throw await errorDeRespuesta(res);
  return res.json() as Promise<EstadoEdge>;
}

export async function getCamarasEdge(): Promise<CamaraDispositivo[]> {
  const res = await fogFetch('/edge/camaras');
  if (!res.ok) throw await errorDeRespuesta(res);
  return res.json() as Promise<CamaraDispositivo[]>;
}

export async function getConfigCamara(): Promise<ConfigCamara> {
  const res = await fogFetch('/edge/config');
  if (!res.ok) throw await errorDeRespuesta(res);
  return res.json() as Promise<ConfigCamara>;
}

/** PUT /edge/config. Raises FogError 422 si no cumple ≥ 720p y ≥ 30 fps (RNF-13). */
export async function guardarConfigCamara(c: ConfigCamara): Promise<ConfigCamara> {
  const res = await fogFetch('/edge/config', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c),
  });
  if (!res.ok) throw await errorDeRespuesta(res);
  return res.json() as Promise<ConfigCamara>;
}

/** GET /edge/preview: un cuadro de la cámara como URL de objeto, o null si todavía no hay frames. */
export async function getPreviewCamara(): Promise<string | null> {
  const res = await fogFetch('/edge/preview');
  if (res.status === 404) return null;
  if (!res.ok) throw await errorDeRespuesta(res);
  return URL.createObjectURL(await res.blob());
}

/** POST /edge/senal-prueba (botón temporal): el tocado queda con fuente 'simulado'. */
export async function emitirSenalPrueba(luzA: boolean, luzB: boolean): Promise<void> {
  const res = await fogFetch('/edge/senal-prueba', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ luz_a: luzA, luz_b: luzB }),
  });
  if (!res.ok) throw await errorDeRespuesta(res);
}
