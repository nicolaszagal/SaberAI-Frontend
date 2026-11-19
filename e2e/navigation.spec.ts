import { test, expect } from '@playwright/test';
import { mockApi } from './helpers';

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

test('la app abre directo en Revisión VAR', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('SABRE.AI').first()).toBeVisible();
  await expect(page.getByTestId('analizar-btn')).toBeVisible();
});

test('la navegación tiene solo Revisión VAR, Historial y Combate', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-testid^="nav-"]')).toHaveText(['Revisión VAR', 'Historial', 'Combate']);
  await expect(page.getByText(/Inicio|CÁMARAS|TORNEO/i)).toHaveCount(0);
});

test('se puede ir a Historial y Combate y volver a Revisión VAR', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('nav-history').click();
  await expect(page.getByTestId('historial-sin-evento')).toBeVisible();
  await page.getByTestId('nav-config').click();
  await expect(page.getByTestId('crear-combate-btn')).toBeVisible();
  await page.getByTestId('nav-live').click();
  await expect(page.getByTestId('analizar-btn')).toBeVisible();
});

test('las rutas retiradas (Inicio, torneo) caen en Revisión VAR', async ({ page }) => {
  for (const ruta of ['/tournament', '/dashboard']) {
    await page.goto(ruta);
    await expect(page.getByTestId('analizar-btn')).toBeVisible();
  }
});

test('sin combate activo Revisión VAR ofrece Configurar combate', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('sin-combate')).toContainText('No hay combate activo');
  await page.getByRole('button', { name: 'Configurar combate' }).click();
  await expect(page.getByTestId('crear-combate-btn')).toBeVisible();
});

test('el encabezado muestra el modelo activo', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('modelo-activo')).toHaveText('Modelo activo: lstm_6class_test');
});
