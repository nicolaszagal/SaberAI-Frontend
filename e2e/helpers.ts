import { expect, type Page } from '@playwright/test';

export const EVENTO_ID = '11111111-1111-4111-8111-111111111111';
export const ARBITRO_ID = '22222222-2222-4222-8222-222222222222';
export const MATCH_ID = '33333333-3333-4333-8333-333333333333';

const json = (body: unknown, status = 200) => ({
  status, contentType: 'application/json', body: JSON.stringify(body),
});

/** Intercepta la API del Fog para correr sin el backend Python. */
export async function mockApi(page: Page, opts: { revisiones?: unknown[]; health?: 'ok' | 'degradado' | 'caido' } = {}) {
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
  await page.route('**/revisiones', route => route.fulfill(json(opts.revisiones ?? [])));
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
  await page.getByTestId('tirador-a-menor-false').click();
  await page.getByTestId('tirador-b-alias').fill('Verde');
  await page.getByTestId('tirador-b-brazo-left').click();
  await page.getByTestId('tirador-b-menor-false').click();
  await page.getByTestId('crear-combate-btn').click();
  await expect(page.getByTestId('combate-activo')).toBeVisible();
}
