import { test, expect } from '@playwright/test';
import { mockApi, configurarCombate, MATCH_ID, COMBATE_OK } from './helpers';

const CLAVE = 'sabre.match_id';
const OTRO_ID = '99999999-9999-4999-8999-999999999999';

test('guarda solo el match_id del combate activo', async ({ page }) => {
  await mockApi(page);
  await configurarCombate(page);
  const guardado = await page.evaluate(() =>
    Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])));
  expect(guardado[CLAVE]).toBe(MATCH_ID);
  expect(JSON.stringify(guardado)).not.toContain('Rojo');
  expect(JSON.stringify(guardado)).not.toContain('P1');
});

test('al recargar valida el combate con GET /matches/{id} y lo recupera', async ({ page }) => {
  await mockApi(page);
  await configurarCombate(page);
  const consulta = page.waitForRequest(r => r.method() === 'GET' && r.url().endsWith(`/matches/${MATCH_ID}`));
  await page.goto('/live');
  await consulta;
  await expect(page.getByTestId('header-pista')).toHaveText('Pista P1');
  await expect(page.getByTestId('header-arbitro')).toHaveText('Árbitro: Árbitro Prueba');
  await expect(page.getByTestId('sin-combate')).toHaveCount(0);
});

test('si el Fog responde 404 descarta el combate recordado', async ({ page }) => {
  await page.addInitScript(([clave, id]) => localStorage.setItem(clave, id), [CLAVE, OTRO_ID]);
  await mockApi(page);
  await page.goto('/live');
  await expect(page.getByTestId('sin-combate')).toBeVisible();
  await expect(page.getByTestId('header-pista')).toHaveCount(0);
  expect(await page.evaluate(k => localStorage.getItem(k), CLAVE)).toBeNull();
});

test('si no se puede verificar (sin conexión) conserva el match_id y permite reintentar', async ({ page }) => {
  await page.addInitScript(([clave, id]) => localStorage.setItem(clave, id), [CLAVE, MATCH_ID]);
  await mockApi(page);
  let responde = false;
  await page.route(`**/matches/${MATCH_ID}`, route => responde
    ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(COMBATE_OK) })
    : route.abort());
  await page.goto('/live');
  await expect(page.getByTestId('error-combate')).toContainText('No se pudo verificar el combate activo');
  await expect(page.getByTestId('sin-combate')).toHaveCount(0);
  expect(await page.evaluate(k => localStorage.getItem(k), CLAVE)).toBe(MATCH_ID);

  responde = true;
  await page.getByTestId('error-combate').getByRole('button', { name: /Reintentar/ }).click();
  await expect(page.getByTestId('header-pista')).toHaveText('Pista P1');
  await expect(page.getByTestId('error-combate')).toHaveCount(0);
});

test('sin acceso a localStorage la app funciona (lecturas y escrituras en try/catch)', async ({ page }) => {
  await page.addInitScript(() => {
    const falla = () => { throw new DOMException('bloqueado', 'SecurityError'); };
    Storage.prototype.getItem = falla;
    Storage.prototype.setItem = falla;
    Storage.prototype.removeItem = falla;
  });
  await mockApi(page);
  await configurarCombate(page);
  await expect(page.getByTestId('header-pista')).toHaveText('Pista P1');
});

test('Finalizar combate limpia el combate y lleva a Configuración', async ({ page }) => {
  await mockApi(page);
  await configurarCombate(page);
  await page.getByTestId('finalizar-combate-btn').click();

  await expect(page.getByTestId('crear-combate-btn')).toBeVisible();
  await expect(page.getByTestId('combate-activo')).toHaveCount(0);
  await expect(page.getByTestId('header-pista')).toHaveCount(0);
  await expect(page.getByTestId('finalizar-combate-btn')).toHaveCount(0);
  expect(await page.evaluate(k => localStorage.getItem(k), CLAVE)).toBeNull();

  await page.reload();
  await expect(page.getByTestId('header-pista')).toHaveCount(0);
});

test('el Historial muestra la decisión como Mantiene, Cambia y Anula', async ({ page }) => {
  const fila = (id: string, decision: string | null, claseFinal: string | null) => ({
    id, combate_id: 'c1', abierta_en: '2026-10-01T15:00:00Z', cerrada_en: null,
    disponible: true, clase: 'AttackA', confianza: 0.74, decision, clase_final: claseFinal,
  });
  await mockApi(page, {
    revisiones: [fila('r1', 'mantener', 'AttackA'), fila('r2', 'cambiar', 'RiposteB'), fila('r3', 'anular', null), fila('r4', null, null)],
  });
  await page.goto('/history');
  const filas = page.getByTestId('revision-row');
  await expect(filas).toHaveCount(4);
  await expect(filas.nth(0)).toContainText('Mantiene  ·  ATAQUE · A');
  await expect(filas.nth(1)).toContainText('Cambia  ·  RIPOSTE · B');
  await expect(filas.nth(2)).toContainText('Anula');
  await expect(filas.nth(2)).not.toContainText('Anula  ·');
  await expect(filas.nth(3)).toContainText('Pendiente');
  await expect(page.locator('body')).not.toContainText(/\b(mantener|cambiar|anular)\b/);
});
