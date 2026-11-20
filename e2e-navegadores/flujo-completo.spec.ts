import { test, expect } from '@playwright/test';

/**
 * Flujo completo con el frontend desplegado (https) y el Fog del propio equipo (http://localhost):
 * login, combate, clip con la luz de A, sugerencia, trazos, razonamiento y veredicto. Mide el tiempo desde
 * "Analizar" hasta la sugerencia.
 *
 * Variables: E2E_NAV_USER, E2E_NAV_PASSWORD, E2E_NAV_CLIP (ruta del .mp4), E2E_NAV_LUZ_A_S (instante de la
 * luz de A en segundos; por defecto 29/30), E2E_NAV_NODO (por defecto http://localhost:8001).
 */
const USUARIO = process.env.E2E_NAV_USER ?? '';
const PASSWORD = process.env.E2E_NAV_PASSWORD ?? '';
const CLIP = process.env.E2E_NAV_CLIP ?? '';
const LUZ_A_S = Number(process.env.E2E_NAV_LUZ_A_S ?? 29 / 30);
const NODO = process.env.E2E_NAV_NODO ?? 'http://localhost:8001';

test.beforeEach(({ browserName }) => {
  test.skip(!USUARIO || !PASSWORD || !CLIP, 'Defina E2E_NAV_USER, E2E_NAV_PASSWORD y E2E_NAV_CLIP.');
  test.skip(browserName === 'webkit', 'WebKit bloquea http://localhost desde https (ver navegadores.spec.ts).');
});

test('login, combate, clip, sugerencia, trazos, razonamiento y veredicto', async ({ page, context, baseURL }) => {
  test.setTimeout(180_000);
  // Permiso de red local de Chrome/Chromium para que la página llegue al Fog del equipo (el usuario lo concede
  // en el aviso del navegador al pulsar "Probar conexión").
  await context.grantPermissions(['local-network-access'], { origin: new URL(baseURL!).origin });
  const fallos: string[] = [];
  page.on('requestfailed', r => fallos.push(`${r.method()} ${r.url()} ${r.failure()?.errorText}`));

  await page.goto('/');
  await page.getByTestId('login-nodo').fill(NODO);
  await page.getByTestId('login-usuario').fill(USUARIO);
  await page.getByTestId('login-password').fill(PASSWORD);
  await page.getByTestId('login-btn').click();
  await expect(page.getByTestId('analizar-btn')).toBeVisible({ timeout: 20_000 });

  await page.goto('/config');
  await page.locator('[data-testid^="evento-"]').first().click();
  await page.locator('[data-testid^="arbitro-"]').first().click();
  await page.getByTestId('tirador-a-brazo-left').click();
  await page.getByTestId('tirador-b-brazo-right').click();
  await page.getByTestId('crear-combate-btn').click();
  await expect(page.getByTestId('combate-activo')).toBeVisible({ timeout: 15_000 });

  await page.getByTestId('nav-live').click();
  await page.getByTestId('file-input').setInputFiles(CLIP);
  await page.waitForFunction(() => { const v = document.querySelector('video'); return !!v && v.readyState >= 1; });
  await page.evaluate(s => { (document.querySelector('video') as HTMLVideoElement).currentTime = s; }, LUZ_A_S);
  await page.waitForTimeout(300);
  await page.getByTestId('marcar-luz-a-btn').click();

  const t0 = Date.now();
  await page.getByTestId('analizar-btn').click();
  await expect(page.getByTestId('status-done')).toBeVisible({ timeout: 90_000 });
  const segundos = (Date.now() - t0) / 1000;
  const sugerencia = (await page.getByTestId('action-label').textContent()) ?? '';
  const confianza = (await page.getByTestId('confidence-value').textContent()) ?? '';
  test.info().annotations.push(
    { type: 'latencia_s', description: segundos.toFixed(1) },
    { type: 'sugerencia', description: `${sugerencia} · ${confianza}` },
  );
  expect(sugerencia).toMatch(/contraataque/i);

  await page.getByTestId('ver-interpretacion-btn').click();
  await expect(page.getByTestId('trazos-lienzo')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('razonamiento-estado')).toBeVisible({ timeout: 20_000 });
  test.info().annotations.push({ type: 'razonamiento', description: ((await page.getByTestId('razonamiento-estado').textContent()) ?? '').trim() });
  await page.keyboard.press('Escape');

  await page.getByTestId('modifica-no').click();
  const veredicto = page.waitForResponse(r => r.url().includes('/veredicto') && r.request().method() === 'POST');
  await page.getByTestId('veredicto-enviar').click();
  expect((await veredicto).status()).toBe(200);
  test.info().annotations.push({ type: 'fallos_de_red', description: fallos.join(' | ') || 'ninguno' });
});
