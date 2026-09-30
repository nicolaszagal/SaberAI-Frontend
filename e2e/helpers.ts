import { expect, type Page } from '@playwright/test';

export const EVENTO_ID = '11111111-1111-4111-8111-111111111111';
export const ARBITRO_ID = '22222222-2222-4222-8222-222222222222';
export const MATCH_ID = '33333333-3333-4333-8333-333333333333';
export const REVISION_ID = '44444444-4444-4444-8444-444444444444';

/** Respuesta de POST /matches/{id}/clip con sugerencia disponible. */
export const CLIP_OK = {
  match_id: MATCH_ID, revision_id: REVISION_ID, has_luz_A: true, has_luz_B: false,
  timed_out: false, disponible: true, motivo: null, fencer: 'ROJ', action: 'AttackA', confidence: 0.92,
};

/** Respuesta de GET /matches/{id}: el mismo combate que crea `configurarCombate`. */
export const COMBATE_OK = {
  match_id: MATCH_ID, pista: 'P1', arbitro_id: ARBITRO_ID, arbitro: 'Árbitro Prueba',
  alias_A: 'Rojo', weapon_side_A: 'right', alias_B: 'Verde', weapon_side_B: 'left',
};

/** Bloque V1/V2 de GET /validaciones/{evento_id}/resumen (solo los campos que usa la interfaz). */
export function bloqueValidacion(o: {
  n?: number; kappa?: number | null; banda?: string | null; p95?: number | null; excede?: boolean;
} = {}) {
  const kappa = o.kappa ?? null;
  return {
    n_revisiones: o.n ?? 0,
    latencia: { p95_ms: o.p95 ?? null, p95_excede_umbral: o.excede ?? false },
    kappa: { calculable: kappa !== null, kappa, banda: o.banda ?? null },
  };
}

/** Resumen de la sesión sin revisiones con veredicto. */
export const RESUMEN_VACIO = {
  evento_id: EVENTO_ID,
  por_validacion: { V1: bloqueValidacion(), V2: bloqueValidacion() },
};

const json = (body: unknown, status = 200) => ({
  status, contentType: 'application/json', body: JSON.stringify(body),
});

/** Intercepta la API del Fog para correr sin el backend Python. */
export async function mockApi(page: Page, opts: {
  revisiones?: unknown[];
  /** Detalle de GET /revisiones/{id} por id; sin él responde 404. */
  detalles?: Record<string, unknown>;
  /** Cuerpo de GET /validaciones/{evento_id}/resumen (por defecto, sin revisiones). */
  resumen?: unknown;
  health?: 'ok' | 'degradado' | 'caido';
} = {}) {
  // GET /matches/{id}: valida el combate activo recordado (404 si no es el creado).
  await page.route(/\/matches\/[0-9a-f-]{36}$/, route =>
    route.request().url().endsWith(MATCH_ID)
      ? route.fulfill(json(COMBATE_OK))
      : route.fulfill(json({ detail: 'no existe' }, 404)));
  await page.route('**/health', route => {
    if (opts.health === 'caido') return route.abort();
    if (opts.health === 'degradado') return route.fulfill(json({ fog: 'ok', redis: 'error', postgres: 'ok' }, 503));
    return route.fulfill(json({ fog: 'ok', redis: 'ok', postgres: 'ok' }));
  });
  await page.route('**/modelo/activo', route =>
    route.fulfill(json({ nombre: 'lstm_6class_test', num_clases: 6, f1_macro_test: null, kappa_piloto: null })));
  await page.route('**/eventos', route =>
    route.fulfill(json([{ id: EVENTO_ID, nombre: 'Piloto 1', fecha: '2026-10-05', lugar: null, tipo: 'piloto' }])));
  await page.route('**/usuarios?rol=arbitro', route =>
    route.fulfill(json([{ id: ARBITRO_ID, nombre: 'Árbitro Prueba', rol: 'arbitro', activo: true }])));
  await page.route(/\/revisiones(\?.*)?$/, route => route.fulfill(json(opts.revisiones ?? [])));
  await page.route(/\/revisiones\/[^/?]+$/, route => {
    const id = route.request().url().split('/').pop()!;
    const d = opts.detalles?.[id];
    return route.fulfill(d ? json(d) : json({ detail: 'no existe' }, 404));
  });
  await page.route('**/validaciones/*/resumen', route => route.fulfill(json(opts.resumen ?? RESUMEN_VACIO)));
  await page.route('**/matches/config', route =>
    route.fulfill(json({ match_id: MATCH_ID, weapon_side_A: 'right', weapon_side_B: 'left' })));
}

/** Completa el formulario de Configuración del combate y lo envía. */
export async function configurarCombate(page: Page) {
  await page.goto('/config');
  await page.getByTestId(`evento-${EVENTO_ID}`).click();
  await page.getByTestId('pista').fill('P1');
  await page.getByTestId(`arbitro-${ARBITRO_ID}`).click();
  await page.getByTestId('tirador-a-alias').fill('Rojo');
  await page.getByTestId('tirador-a-brazo-right').click();
  await page.getByTestId('tirador-b-alias').fill('Verde');
  await page.getByTestId('tirador-b-brazo-left').click();
  await page.getByTestId('crear-combate-btn').click();
  await expect(page.getByTestId('combate-activo')).toBeVisible();
}

/** Intercepta POST /matches/{id}/clip con la respuesta dada (por defecto, sugerencia disponible). */
export async function mockClip(page: Page, body: unknown = CLIP_OK, status = 200) {
  await page.route('**/matches/*/clip', route => route.fulfill(json(body, status)));
}

/** Elige el clip, marca la luz de A en el instante actual del reproductor y pulsa ANALIZAR. */
export async function analizarClip(page: Page, fixture = 'e2e/fixtures/dummy.mp4') {
  await page.getByTestId('file-input').setInputFiles(fixture);
  await page.getByTestId('marcar-luz-a-btn').click();
  await page.getByTestId('analizar-btn').click();
}
