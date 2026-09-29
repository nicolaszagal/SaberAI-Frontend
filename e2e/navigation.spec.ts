import { test, expect } from '@playwright/test';
import { mockApi } from './helpers';

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

test('dashboard carga y muestra SABRE.AI', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('SABRE.AI').first()).toBeVisible();
});

test('navegar a Revisión VAR desde Inicio', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('tile-live').click();
  await expect(page.getByTestId('analizar-btn')).toBeVisible();
});

test('la navegación tiene solo las 4 pantallas de la Validación 1', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-testid^="nav-"]')).toHaveText(['Inicio', 'Revisión VAR', 'Historial', 'Combate']);
  await expect(page.getByText(/CÁMARAS|TORNEO/i)).toHaveCount(0);
});

test('las rutas retiradas caen en Inicio', async ({ page }) => {
  await page.goto('/tournament');
  await expect(page.getByTestId('tile-live')).toBeVisible();
});
