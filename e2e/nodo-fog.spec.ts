import { test, expect, type Page } from '@playwright/test';
import { mockApi } from './helpers';

const json = (body: unknown, status = 200) => ({
  status, contentType: 'application/json', body: JSON.stringify(body),
  headers: { 'Access-Control-Allow-Origin': '*' },
});

const CLAVE = 'sabre.nodoFog';
const guardado = (page: Page) => page.evaluate(k => localStorage.getItem(k), CLAVE);

test('el login ofrece "Nodo Fog" con http://localhost:8001 por defecto', async ({ page }) => {
  await mockApi(page, { sesion: false });
  await page.goto('/');
  await expect(page.getByTestId('login-nodo')).toHaveValue('http://localhost:8001');
  await expect(page.getByTestId('login-probar')).toBeVisible();
});

test('Probar conexión llama a GET /health del nodo, sin token', async ({ page }) => {
  await mockApi(page, { sesion: false });
  const vistas: { url: string; auth?: string }[] = [];
  await page.route('http://localhost:8001/health', route => {
    vistas.push({ url: route.request().url(), auth: route.request().headers()['authorization'] });
    return route.fulfill(json({ fog: 'ok', cloud: 'ok', postgres: 'ok' }));
  });
  await page.goto('/');
  await page.getByTestId('login-probar').click();
  await expect(page.getByTestId('login-prueba')).toHaveText('Conectado: el Fog responde.');
  expect(vistas).toEqual([{ url: 'http://localhost:8001/health', auth: undefined }]);
});

test('Probar conexión nombra el componente que no responde', async ({ page }) => {
  await mockApi(page, { sesion: false });
  await page.route('http://localhost:8001/health', route => route.fulfill(json({ fog: 'ok', cloud: 'error', postgres: 'ok' }, 503)));
  await page.goto('/');
  await page.getByTestId('login-probar').click();
  await expect(page.getByTestId('login-prueba')).toContainText('no responde Cloud');
});

test('Probar conexión sin Fog explica qué revisar', async ({ page }) => {
  await mockApi(page, { sesion: false });
  await page.route('http://localhost:8001/health', route => route.abort());
  await page.goto('/');
  await page.getByTestId('login-probar').click();
  await expect(page.getByTestId('login-prueba')).toContainText('No se pudo conectar con el Fog');
});

test('Probar conexión rechaza algo que no es un Fog', async ({ page }) => {
  await mockApi(page, { sesion: false });
  await page.route('http://localhost:8001/health', route => route.fulfill(json({ hola: 'mundo' })));
  await page.goto('/');
  await page.getByTestId('login-probar').click();
  await expect(page.getByTestId('login-prueba')).toContainText('no es un Fog de SABRE.AI');
});

for (const [entrada, texto] of [
  ['http://192.168.1.20:8001', 'contenido mixto'],
  ['http://mi-fog.ejemplo.com', 'contenido mixto'],
  ['ftp://localhost', 'http://localhost o https://'],
  ['no es una url', 'no es válida'],
  ['https://u:clave@mi-fog.ejemplo.com', 'usuario ni contraseña'],
  ['http://localhost:8001/api', 'sin ruta'],
]) {
  test(`rechaza "${entrada}" con un mensaje claro y no la recuerda`, async ({ page }) => {
    await mockApi(page, { sesion: false });
    await page.goto('/');
    await page.getByTestId('login-nodo').fill(entrada);
    await page.getByTestId('login-probar').click();
    await expect(page.getByTestId('login-prueba')).toContainText(texto);
    expect(await guardado(page)).toBeNull();
  });
}

test('acepta http://127.0.0.1 y https://, y los recuerda tras recargar', async ({ page }) => {
  await mockApi(page, { sesion: false });
  await page.goto('/');
  await page.getByTestId('login-nodo').fill('http://127.0.0.1:9001/');
  expect(await guardado(page)).toBe('http://127.0.0.1:9001');
  await page.getByTestId('login-nodo').fill('https://fog.ejemplo.com');
  expect(await guardado(page)).toBe('https://fog.ejemplo.com');
  await page.reload();
  await expect(page.getByTestId('login-nodo')).toHaveValue('https://fog.ejemplo.com');
});

test('el login y las llamadas siguientes van al nodo elegido', async ({ page }) => {
  await mockApi(page, { sesion: false });
  const hosts = new Set<string>();
  page.on('request', r => { if (/\/(auth|modelo|health)/.test(r.url())) hosts.add(new URL(r.url()).origin); });
  await page.route('https://fog.ejemplo.com/**', route => {
    const url = route.request().url();
    if (url.endsWith('/auth/login')) return route.fulfill(json({ access_token: 'jwt-nodo', expires_in: 28800 }));
    if (url.endsWith('/auth/me')) return route.fulfill(json({ usuario: 'maestro' }));
    if (url.endsWith('/modelo/activo')) return route.fulfill(json({ nombre: 'm', num_clases: 6, f1_macro_test: null, kappa_piloto: null }));
    if (url.endsWith('/health')) return route.fulfill(json({ fog: 'ok', cloud: 'ok', postgres: 'ok' }));
    return route.fulfill(json([]));
  });
  await page.goto('/');
  await page.getByTestId('login-nodo').fill('https://fog.ejemplo.com');
  await page.getByTestId('login-usuario').fill('maestro');
  await page.getByTestId('login-password').fill('secreta');
  await page.getByTestId('login-btn').click();
  await expect(page.getByTestId('analizar-btn')).toBeVisible();
  await expect.poll(() => [...hosts]).toContain('https://fog.ejemplo.com');
  expect([...hosts].filter(h => h !== 'https://fog.ejemplo.com')).toEqual([]);
});

test('un nodo inválido impide iniciar sesión y no llama a ningún Fog', async ({ page }) => {
  await mockApi(page, { sesion: false });
  let llamadas = 0;
  await page.route('**/auth/login', route => { llamadas++; return route.fulfill(json({ access_token: 'x' })); });
  await page.goto('/');
  await page.getByTestId('login-nodo').fill('http://otro-equipo:8001');
  await page.getByTestId('login-usuario').fill('maestro');
  await page.getByTestId('login-password').fill('secreta');
  await page.getByTestId('login-btn').click();
  await expect(page.getByTestId('login-error')).toContainText('contenido mixto');
  expect(llamadas).toBe(0);
});

test('sin almacenamiento el campo sigue funcionando', async ({ page }) => {
  await mockApi(page, { sesion: false });
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new Error('bloqueado'); } });
  });
  await page.route('http://localhost:8001/health', route => route.fulfill(json({ fog: 'ok', cloud: 'ok', postgres: 'ok' })));
  await page.goto('/');
  await expect(page.getByTestId('login-nodo')).toHaveValue('http://localhost:8001');
  await page.getByTestId('login-nodo').fill('http://localhost:8002');
  await page.getByTestId('login-probar').click();
  await expect(page.getByTestId('login-prueba')).toBeVisible();
});

test('el indicador de conexión acepta /health con cloud en vez de redis', async ({ page }) => {
  await mockApi(page);
  await page.route('**/health', route => route.fulfill(json({ fog: 'ok', cloud: 'ok', postgres: 'ok' })));
  await page.goto('/');
  await expect(page.getByTestId('health-indicator')).toContainText('Conectado');
  await page.unroute('**/health');
  await page.route('**/health', route => route.fulfill(json({ fog: 'ok', cloud: 'error', postgres: 'ok' }, 503)));
  await expect(page.getByTestId('health-indicator')).not.toContainText('Conectado', { timeout: 15_000 });
});
