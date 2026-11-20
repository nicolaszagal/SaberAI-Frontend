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

async function intentar(page: import('@playwright/test').Page) {
  const bloqueos: string[] = [];
  page.on('console', m => { if (/insecure content|blocked|Mixed Content|local network|loopback/i.test(m.text())) bloqueos.push(m.text().slice(0, 220)); });
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
  return { textoPrueba, entro, textoLogin };
}

// Con el frontend en un origen público (Railway) el permiso de red local decide. Con https://localhost
// (prueba local) el origen ya es de loopback y no hay regla que probar: use la URL desplegada.
test('sin permiso de red local el navegador bloquea y la interfaz lo explica', async ({ page, browserName }) => {
  test.skip(browserName === 'firefox', 'Firefox: el permiso no se puede simular con Playwright; se observa a mano.');
  const r = await intentar(page);
  expect(r.entro).toBe(false);
  expect(r.textoPrueba).toContain('No se pudo conectar con el Fog');
  expect(r.textoPrueba).toContain(browserName === 'webkit' ? 'Safari no permite' : 'piden permiso');
});

test('con el permiso de red local concedido conecta y entra (no aplica a WebKit)', async ({ page, context, browserName, baseURL }) => {
  test.skip(browserName !== 'chromium', 'WebKit bloquea como contenido mixto; Firefox no se puede simular.');
  await context.grantPermissions(['local-network-access'], { origin: new URL(baseURL!).origin });
  const r = await intentar(page);
  expect(r.textoPrueba).toContain('Conectado');
  expect(r.entro).toBe(true);
  await expect(page.getByTestId('health-indicator')).toContainText('Conectado', { timeout: 15_000 });
});
