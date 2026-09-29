import { test, expect } from '@playwright/test';
import { mockApi, configurarCombate } from './helpers';

test('el encabezado muestra pista y árbitro solo tras configurar el combate', async ({ page }) => {
  await mockApi(page);
  await page.goto('/');
  await expect(page.getByTestId('header-pista')).toHaveCount(0);

  await configurarCombate(page);
  await expect(page.getByTestId('header-pista')).toHaveText('Pista P1');
  await expect(page.getByTestId('header-arbitro')).toHaveText('Árbitro: Árbitro Prueba');
});

test('exige el brazo armado y no crea el combate sin él', async ({ page }) => {
  await mockApi(page);
  let posts = 0;
  await page.route('**/matches/config', route => { posts++; return route.abort(); });
  await page.goto('/config');
  await page.getByTestId('evento-11111111-1111-4111-8111-111111111111').click();
  await page.getByTestId('pista').fill('P1');
  await page.getByTestId('arbitro-22222222-2222-4222-8222-222222222222').click();
  await page.getByTestId('tirador-a-alias').fill('Rojo');
  await page.getByTestId('crear-combate-btn').click();
  await expect(page.getByTestId('config-error')).toContainText('brazo armado del tirador A');
  expect(posts).toBe(0);
});

test('indicador de conexión: conectado, degradado y sin conexión', async ({ page }) => {
  for (const [health, texto] of [['ok', 'Conectado'], ['degradado', 'Degradado'], ['caido', 'Sin conexión']] as const) {
    await page.unroute('**/health').catch(() => {});
    await mockApi(page, { health });
    await page.goto('/');
    await expect(page.getByTestId('health-indicator')).toContainText(texto);
  }
});

test('el historial muestra las revisiones de GET /revisiones', async ({ page }) => {
  await mockApi(page, {
    revisiones: [{
      id: 'r1', combate_id: 'c1', abierta_en: '2026-10-01T15:00:00Z', cerrada_en: null,
      disponible: true, clase: 'RiposteB', confianza: 0.74, decision: null, clase_final: null,
    }],
  });
  await page.goto('/history');
  const fila = page.getByTestId('revision-row');
  await expect(fila).toHaveCount(1);
  await expect(fila).toContainText('RIPOSTE · B');
  await expect(fila).toContainText('74%');
  await expect(fila).toContainText('Pendiente');
});

test('historial vacío no inventa filas', async ({ page }) => {
  await mockApi(page);
  await page.goto('/history');
  await expect(page.getByTestId('historial-vacio')).toBeVisible();
});
