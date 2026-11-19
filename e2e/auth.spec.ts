import { test, expect } from '@playwright/test';
import { mockApi } from './helpers';

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) => ({
  status, contentType: 'application/json', body: JSON.stringify(body), headers,
});

const token = (page: import('@playwright/test').Page) =>
  page.evaluate(() => sessionStorage.getItem('sabre.token'));

test('sin token no se ve ninguna pantalla protegida ni se llama al Fog', async ({ page }) => {
  await mockApi(page, { sesion: false });
  const llamadas: string[] = [];
  page.on('request', r => { if (/\/(matches|revisiones|eventos|usuarios|modelo|validaciones)/.test(r.url())) llamadas.push(r.url()); });
  for (const ruta of ['/', '/history', '/config']) {
    await page.goto(ruta);
    await expect(page.getByTestId('login-btn')).toBeVisible();
    await expect(page.getByTestId('analizar-btn')).toHaveCount(0);
    await expect(page.locator('[data-testid^="nav-"]')).toHaveCount(0);
  }
  expect(llamadas).toEqual([]);
});

test('login correcto guarda el token en sessionStorage y lleva a la pantalla inicial', async ({ page }) => {
  await mockApi(page, { sesion: false });
  let cuerpo: unknown;
  await page.route('**/auth/login', route => {
    cuerpo = route.request().postDataJSON();
    return route.fulfill(json({ access_token: 'jwt-123', expires_in: 28800 }));
  });
  const conAuth: (string | undefined)[] = [];
  page.on('request', r => { if (r.url().endsWith('/modelo/activo')) conAuth.push(r.headers()['authorization']); });
  await page.goto('/');
  await page.getByTestId('login-usuario').fill('maestro');
  await page.getByTestId('login-password').fill('secreta');
  await page.getByTestId('login-btn').click();
  await expect(page.getByTestId('analizar-btn')).toBeVisible();
  expect(cuerpo).toEqual({ usuario: 'maestro', password: 'secreta' });
  expect(await token(page)).toBe('jwt-123');
  expect(await page.evaluate(() => localStorage.getItem('sabre.token'))).toBeNull();
  await expect.poll(() => conAuth[0]).toBe('Bearer jwt-123');
});

test('login incorrecto muestra un mensaje genérico y no guarda token', async ({ page }) => {
  await mockApi(page, { sesion: false });
  await page.route('**/auth/login', route => route.fulfill(json({ detail: 'Credenciales inválidas' }, 401)));
  await page.goto('/');
  await page.getByTestId('login-usuario').fill('maestro');
  await page.getByTestId('login-password').fill('mala');
  await page.getByTestId('login-btn').click();
  await expect(page.getByTestId('login-error')).toHaveText('Usuario o contraseña incorrectos.');
  await expect(page.getByTestId('analizar-btn')).toHaveCount(0);
  expect(await token(page)).toBeNull();
});

test('429 muestra el mensaje de espera', async ({ page }) => {
  await mockApi(page, { sesion: false });
  await page.route('**/auth/login', route =>
    route.fulfill(json({ detail: 'Demasiados intentos' }, 429, {
      'Retry-After': '900', 'Access-Control-Allow-Origin': '*', 'Access-Control-Expose-Headers': 'Retry-After',
    })));
  await page.goto('/');
  await page.getByTestId('login-usuario').fill('maestro');
  await page.getByTestId('login-password').fill('x');
  await page.getByTestId('login-btn').click();
  await expect(page.getByTestId('login-error')).toContainText('Demasiados intentos');
  await expect(page.getByTestId('login-error')).toContainText('15 min');
});

test('el botón se deshabilita mientras se envía', async ({ page }) => {
  await mockApi(page, { sesion: false });
  let liberar!: () => void;
  const espera = new Promise<void>(r => { liberar = r; });
  await page.route('**/auth/login', async route => {
    await espera;
    await route.fulfill(json({ detail: 'Credenciales inválidas' }, 401));
  });
  await page.goto('/');
  await expect(page.getByTestId('login-btn')).toBeDisabled();
  await page.getByTestId('login-usuario').fill('maestro');
  await page.getByTestId('login-password').fill('x');
  await expect(page.getByTestId('login-btn')).toBeEnabled();
  await page.getByTestId('login-btn').click();
  await expect(page.getByTestId('login-btn')).toBeDisabled();
  liberar();
  await expect(page.getByTestId('login-error')).toBeVisible();
});

test('al cargar, un token que /auth/me rechaza (401) vuelve al login y se borra', async ({ page }) => {
  await mockApi(page);
  await page.route('**/auth/me', route => route.fulfill(json({ detail: 'No autenticado' }, 401)));
  await page.goto('/');
  await expect(page.getByTestId('login-btn')).toBeVisible();
  await expect(page.getByTestId('analizar-btn')).toHaveCount(0);
  expect(await token(page)).toBeNull();
});

test('un 401 simulado en una llamada vuelve al login', async ({ page }) => {
  await mockApi(page);
  await page.goto('/');
  await expect(page.getByTestId('analizar-btn')).toBeVisible();
  // Desde ahora el Fog rechaza el token en toda llamada.
  await page.route('**/eventos', route => route.fulfill(json({ detail: 'No autenticado' }, 401)));
  await page.getByTestId('nav-config').click();
  await expect(page.getByTestId('login-btn')).toBeVisible();
  expect(await token(page)).toBeNull();
});

test('cerrar sesión borra el token de sessionStorage y muestra el login', async ({ page }) => {
  await mockApi(page);
  await page.goto('/');
  await expect(page.getByTestId('logout-btn')).toBeVisible();
  expect(await token(page)).toBe('token-de-prueba');
  await page.getByTestId('logout-btn').click();
  await expect(page.getByTestId('login-btn')).toBeVisible();
  expect(await token(page)).toBeNull();
});
