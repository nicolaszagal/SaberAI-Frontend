import { test, expect } from '@playwright/test';

/**
 * Qué ve el usuario en cada navegador cuando el frontend (https) habla con SU Fog en http://localhost.
 * Chromium y Firefox deben conectar (localhost es origen de confianza; con un navegador real piden además
 * el permiso de "red local"). WebKit bloquea la llamada como contenido mixto y la interfaz debe explicarlo.
 */
const USUARIO = process.env.E2E_NAV_USER ?? '';
const PASSWORD = process.env.E2E_NAV_PASSWORD ?? '';
const NODO = process.env.E2E_NAV_NODO ?? 'http://localhost:8001';

test.beforeEach(() => {
  test.skip(!USUARIO || !PASSWORD, 'Defina E2E_NAV_USER y E2E_NAV_PASSWORD (ver e2e-navegadores/LEEME.md).');
});

test('Probar conexión y login contra el Fog local', async ({ page, browserName }) => {
  const bloqueos: string[] = [];
  page.on('console', m => { if (/insecure content|blocked|Mixed Content|local network|loopback/i.test(m.text())) bloqueos.push(m.text().slice(0, 200)); });
  await page.goto('/');
  await page.getByTestId('login-nodo').fill(NODO);
  await page.getByTestId('login-probar').click();
  const prueba = page.getByTestId('login-prueba');
  await expect(prueba).toBeVisible({ timeout: 15_000 });
  const textoPrueba = (await prueba.textContent()) ?? '';

  await page.getByTestId('login-usuario').fill(USUARIO);
  await page.getByTestId('login-password').fill(PASSWORD);
  await page.getByTestId('login-btn').click();
  const entro = await page.getByTestId('analizar-btn').waitFor({ timeout: 8_000 }).then(() => true, () => false);
  const textoLogin = entro ? '' : ((await page.getByTestId('login-error').textContent().catch(() => '')) ?? '');

  test.info().annotations.push(
    { type: 'probar', description: textoPrueba },
    { type: 'login', description: entro ? 'entró' : `no entró: ${textoLogin}` },
    { type: 'bloqueos', description: bloqueos.join(' | ') || 'ninguno' },
  );

  if (browserName === 'webkit') {
    // Safari/WebKit: contenido mixto. No debe parecer un fallo del Fog: el mensaje explica el bloqueo.
    expect(textoPrueba).toContain('Safari no permite');
    expect(entro).toBe(false);
    expect(textoLogin).toContain('Safari no permite');
  } else {
    expect(textoPrueba).toContain('Conectado');
    expect(entro).toBe(true);
    await expect(page.getByTestId('health-indicator')).toContainText('Conectado', { timeout: 15_000 });
  }
});
