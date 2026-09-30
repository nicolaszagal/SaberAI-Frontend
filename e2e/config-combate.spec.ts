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
    alias_A: 'Rojo', weapon_side_A: 'right', es_menor_A: false,
    alias_B: 'Verde', weapon_side_B: 'left', es_menor_B: false,
  });
  await expect(page.getByTestId('combate-activo')).toContainText('A · Rojo (diestro) vs B · Verde (zurdo)');
  await expect(page.getByTestId('combate-activo')).toContainText('Pista P1 · Árbitro Árbitro Prueba');
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
  await page.getByTestId('tirador-a-menor-false').click();
  await page.getByTestId('tirador-b-alias').fill('Verde');
  await page.getByTestId('tirador-b-menor-false').click();
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
    await page.getByTestId(`tirador-${l}-menor-false`).click();
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
