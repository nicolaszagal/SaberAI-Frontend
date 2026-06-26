import { test, expect } from '@playwright/test';

const FIXTURE = 'e2e/fixtures/dummy.mp4';

const MOCK_VERDICT = {
  match_id:  'test-match-1',
  has_luz_A: true,
  has_luz_B: false,
  timed_out: false,
  fencer:     'ROJ',
  action:     'AttackA',
  confidence: 0.92,
};

test.beforeEach(async ({ page }) => {
  // Intercept the Fog API so tests run without the Python backend
  await page.route('**/matches/*/clip', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_VERDICT),
    }),
  );
  await page.goto('/live');
});

test('toggles de Luz Favero cambian estado visual', async ({ page }) => {
  await expect(page.getByTestId('luz-hint')).toHaveText('SIN LUZ');

  await page.getByTestId('luz-a-btn').click();
  await expect(page.getByTestId('luz-hint')).toHaveText('LUZ A');

  await page.getByTestId('luz-b-btn').click();
  await expect(page.getByTestId('luz-hint')).toHaveText('AMBAS LUCES');
});

test('seleccionar un clip habilita el botón ANALIZAR', async ({ page }) => {
  await page.getByTestId('file-input').setInputFiles(FIXTURE);
  await expect(page.getByTestId('filename-display')).toContainText('dummy.mp4');
  await expect(page.getByTestId('analizar-btn')).not.toBeDisabled();
});

test('flujo completo: upload → analizar → veredicto en ActionPanel', async ({ page }) => {
  await page.getByTestId('luz-a-btn').click();
  await page.getByTestId('file-input').setInputFiles(FIXTURE);
  await page.getByTestId('analizar-btn').click();

  await expect(page.getByTestId('fencer-name')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId('action-label')).toHaveText('ATAQUE');
  await expect(page.getByTestId('confidence-value')).toHaveText('92%');
  await expect(page.getByTestId('status-done')).toBeVisible();
});

test('veredicto queda registrado en HistorialPanel', async ({ page }) => {
  await expect(page.getByTestId('historial-empty')).toBeVisible();

  await page.getByTestId('file-input').setInputFiles(FIXTURE);
  await page.getByTestId('analizar-btn').click();
  await expect(page.getByTestId('fencer-name')).toBeVisible({ timeout: 10_000 });

  await expect(page.getByTestId('historial-empty')).not.toBeVisible();
  await expect(page.getByTestId('historial-list')).toBeVisible();
});
