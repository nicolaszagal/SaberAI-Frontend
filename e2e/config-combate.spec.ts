import { test, expect } from '@playwright/test';
import { mockApi, configurarCombate, EVENTO_ID, ARBITRO_ID, MATCH_ID } from './helpers';

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

test('POST /matches/config envía evento, pista, árbitro, alias y brazo armado de A y B', async ({ page }) => {
  const enviado = page.waitForRequest(r => r.method() === 'POST' && r.url().endsWith('/matches/config'));
  await configurarCombate(page);
  const body = (await enviado).postDataJSON() as Record<string, unknown>;
  expect(body).toMatchObject({
    evento_id: EVENTO_ID, pista: 'P1', arbitro_id: ARBITRO_ID,
    alias_A: 'Rojo', weapon_side_A: 'right',
    alias_B: 'Verde', weapon_side_B: 'left',
  });
  await expect(page.getByTestId('combate-activo')).toContainText('A · Rojo (diestro) vs B · Verde (zurdo)');
  await expect(page.getByTestId('combate-activo')).toContainText('Pista P1 · Árbitro Árbitro Prueba');
});

const EVENTOS_SEMBRADOS = [
  { id: EVENTO_ID, nombre: 'Evento de prueba', fecha: '2026-10-05', lugar: null, tipo: 'formativo' },
  { id: '22222222-2222-4222-8222-222222222222', nombre: 'Validación 1', fecha: '2026-10-05', lugar: null, tipo: 'piloto' },
];

test('viene preseleccionado: Validación 1, árbitro único y pista P1; los brazos no', async ({ page }) => {
  await page.route('**/eventos', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(EVENTOS_SEMBRADOS) }));
  await page.goto('/config');
  await expect(page.getByTestId('evento-22222222-2222-4222-8222-222222222222')).toContainText('✓');
  await expect(page.getByTestId(`evento-${EVENTO_ID}`)).not.toContainText('✓');
  await expect(page.getByTestId(`arbitro-${ARBITRO_ID}`)).toContainText('✓');
  await expect(page.getByTestId('pista')).toHaveValue('P1');
  for (const l of ['a', 'b']) {
    for (const brazo of ['right', 'left']) {
      await expect(page.getByTestId(`tirador-${l}-brazo-${brazo}`)).not.toContainText('✓');
    }
  }
});

test('el formulario ya no pide menor de edad ni consentimiento', async ({ page }) => {
  await page.goto('/config');
  await expect(page.getByTestId('crear-combate-btn')).toBeVisible();
  await expect(page.getByText(/menor de edad|consentimiento|firmante/i)).toHaveCount(0);
});

test('con un clic en cada brazo y Crear combate queda listo, con alias por defecto', async ({ page }) => {
  await page.route('**/eventos', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(EVENTOS_SEMBRADOS) }));
  const enviado = page.waitForRequest(r => r.method() === 'POST' && r.url().endsWith('/matches/config'));
  await page.goto('/config');
  await page.getByTestId('tirador-a-brazo-left').click();
  await page.getByTestId('tirador-b-brazo-right').click();
  await page.getByTestId('crear-combate-btn').click();

  const body = (await enviado).postDataJSON() as Record<string, unknown>;
  expect(body).toEqual({
    evento_id: '22222222-2222-4222-8222-222222222222', pista: 'P1', arbitro_id: ARBITRO_ID,
    alias_A: 'Tirador A', weapon_side_A: 'left', alias_B: 'Tirador B', weapon_side_B: 'right',
  });
  await expect(page.getByTestId('combate-activo')).toContainText('A · Tirador A (zurdo) vs B · Tirador B (diestro)');
});

test('sin brazo armado de un tirador no se crea el combate (CU-01, 4a)', async ({ page }) => {
  let posts = 0;
  await page.route('**/matches/config', route => { posts++; return route.abort(); });
  await page.goto('/config');
  await page.getByTestId(`evento-${EVENTO_ID}`).click();
  await page.getByTestId('pista').fill('P1');
  await page.getByTestId(`arbitro-${ARBITRO_ID}`).click();
  await page.getByTestId('tirador-a-alias').fill('Rojo');
  await page.getByTestId('tirador-a-brazo-right').click();
  await page.getByTestId('tirador-b-alias').fill('Verde');
  await page.getByTestId('crear-combate-btn').click();

  await expect(page.getByTestId('config-error')).toContainText('Falta el brazo armado del tirador B');
  expect(posts).toBe(0);
  await expect(page.getByTestId('combate-activo')).toHaveCount(0);
});

test('un error del Fog al guardar se muestra y no deja combate activo', async ({ page }) => {
  await page.route('**/matches/config', route =>
    route.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ detail: 'weapon_side_A requerido' }) }));
  await page.goto('/config');
  await page.getByTestId(`evento-${EVENTO_ID}`).click();
  await page.getByTestId('pista').fill('P1');
  await page.getByTestId(`arbitro-${ARBITRO_ID}`).click();
  for (const l of ['a', 'b']) {
    await page.getByTestId(`tirador-${l}-alias`).fill(l);
    await page.getByTestId(`tirador-${l}-brazo-right`).click();
  }
  await page.getByTestId('crear-combate-btn').click();
  await expect(page.getByTestId('config-error')).toContainText('422');
  await expect(page.getByTestId('combate-activo')).toHaveCount(0);
});

test('recuerda el evento del combate activo junto al match_id', async ({ page }) => {
  await configurarCombate(page);
  const guardado = await page.evaluate(() =>
    Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])));
  expect(guardado).toEqual({ 'sabre.match_id': MATCH_ID, 'sabre.evento_id': EVENTO_ID });
});
