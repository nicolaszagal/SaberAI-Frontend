import { test, expect } from '@playwright/test';
import { mockApi, configurarCombate, bloqueValidacion, EVENTO_ID } from './helpers';

test('Inicio da acceso a Revisión VAR, Historial y Configuración', async ({ page }) => {
  await mockApi(page);
  await page.goto('/');
  await page.getByTestId('tile-history').click();
  await expect(page.getByTestId('historial-sin-evento')).toBeVisible();
  await page.goto('/');
  await page.getByTestId('tile-config').click();
  await expect(page.getByTestId('crear-combate-btn')).toBeVisible();
  await page.goto('/');
  await page.getByTestId('tile-live').click();
  await expect(page.getByTestId('analizar-btn')).toBeVisible();
});

test('sin combate activo no muestra resumen ni consulta las métricas', async ({ page }) => {
  await mockApi(page);
  let consultas = 0;
  await page.route('**/validaciones/*/resumen', route => { consultas++; return route.abort(); });
  await page.goto('/');
  await expect(page.getByTestId('tile-live')).toBeVisible();
  await expect(page.getByTestId('resumen-sesion')).toHaveCount(0);
  expect(consultas).toBe(0);
});

test('con datos reales muestra N revisiones, κ y latencia p95 del evento activo', async ({ page }) => {
  await mockApi(page, {
    resumen: { por_validacion: {
      V1: bloqueValidacion({ n: 8, kappa: 0.3333, banda: 'aceptable', p95: 4800 }),
      V2: bloqueValidacion(),
    } },
  });
  await configurarCombate(page);
  const consulta = page.waitForRequest(r => r.url().includes('/validaciones/'));
  await page.getByTestId('nav-dashboard').click();
  expect(new URL((await consulta).url()).pathname).toBe(`/validaciones/${EVENTO_ID}/resumen`);
  await expect(page.getByTestId('resumen-V1')).toHaveText('Validación 1 · 8 revisiones · κ 0.33 (aceptable) · latencia p95 4.8 s');
  await expect(page.getByTestId('resumen-V2')).toHaveCount(0);
});

test('sin κ calculable ni p95 muestra solo lo que existe', async ({ page }) => {
  await mockApi(page, { resumen: { por_validacion: { V1: bloqueValidacion({ n: 1 }), V2: bloqueValidacion() } } });
  await configurarCombate(page);
  await page.getByTestId('nav-dashboard').click();
  await expect(page.getByTestId('resumen-V1')).toHaveText('Validación 1 · 1 revisión');
});

test('si el p95 excede 60 s lo indica como > 60 s', async ({ page }) => {
  await mockApi(page, { resumen: { por_validacion: { V1: bloqueValidacion({ n: 4, excede: true }), V2: bloqueValidacion() } } });
  await configurarCombate(page);
  await page.getByTestId('nav-dashboard').click();
  await expect(page.getByTestId('resumen-V1')).toContainText('latencia p95 > 60 s');
});

test('sin revisiones con veredicto o con error del Fog no muestra el resumen', async ({ page }) => {
  await mockApi(page);
  await configurarCombate(page);
  await page.getByTestId('nav-dashboard').click();
  await expect(page.getByTestId('tile-live')).toBeVisible();
  await expect(page.getByTestId('resumen-sesion')).toHaveCount(0);

  await page.route('**/validaciones/*/resumen', route => route.fulfill({ status: 500, body: 'boom' }));
  await page.reload();
  await expect(page.getByTestId('tile-live')).toBeVisible();
  await expect(page.getByTestId('resumen-sesion')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText(/NaN|undefined/);
});
