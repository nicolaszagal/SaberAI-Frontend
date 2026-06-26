import { test, expect } from '@playwright/test';

test('dashboard carga y muestra SABRE.AI', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('SABRE.AI').first()).toBeVisible();
});

test('navegar a LiveScreen desde Dashboard', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('tile-live').click();
  await expect(page.getByText('ANÁLISIS EN VIVO')).toBeVisible();
  await expect(page.getByTestId('analizar-btn')).toBeVisible();
});
