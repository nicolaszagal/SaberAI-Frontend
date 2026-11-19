/**
 * Cierre de sesión de validación (EDGE02, D-26): confirmación en la propia página, respaldo verificado y
 * purga solo si pasa; si el respaldo falla no se borra nada y se informa.
 */
import { expect, test, type Page } from '@playwright/test';
import { configurarCombate, mockApi } from './helpers';

const json = (body: unknown, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) });

async function irAConfig(page: Page) {
  await mockApi(page);
  await configurarCombate(page); // termina en Configuración con el combate activo
}

test('el cierre pide confirmación en la página, sin cuadro del navegador, y no llama al Fog hasta confirmar', async ({ page }) => {
  let dialogos = 0;
  page.on('dialog', d => { dialogos += 1; void d.dismiss(); });
  let llamadas = 0;
  await page.route('**/sesion/cerrar', route => { llamadas += 1; return route.fulfill(json({})); });
  await irAConfig(page);
  await page.getByTestId('cerrar-validacion-btn').click();
  await expect(page.getByTestId('cerrar-validacion-confirmacion')).toContainText('respaldo verificado');
  await expect(page.getByTestId('cerrar-validacion-confirmacion')).toContainText('no se puede deshacer');
  await page.getByTestId('cerrar-validacion-cancelar').click();
  await expect(page.getByTestId('cerrar-validacion-btn')).toBeVisible();
  expect(llamadas).toBe(0);
  expect(dialogos).toBe(0);
});

test('confirmar cierra la sesión: informa el respaldo y los clips borrados, y el combate deja de estar activo', async ({ page }) => {
  let llamadas = 0;
  await page.route('**/sesion/cerrar', route => {
    llamadas += 1;
    return route.fulfill(json({ respaldo: 'Respaldo verificado', clips_borrados: 3, archivos_edge_borrados: 4 }));
  });
  await irAConfig(page);
  await page.getByTestId('cerrar-validacion-btn').click();
  await page.getByTestId('cerrar-validacion-confirmar').click();
  await expect(page.getByTestId('cerrar-validacion-ok')).toContainText('Sesión cerrada');
  await expect(page.getByTestId('cerrar-validacion-ok')).toContainText('3 en Fog');
  await expect(page.getByTestId('cerrar-validacion-ok')).toContainText('4 archivos en Edge');
  expect(llamadas).toBe(1);
  await expect(page.getByTestId('combate-activo')).toHaveCount(0);
});

test('si el respaldo falla: lo dice, aclara que no se borró nada, el combate sigue activo y se puede reintentar', async ({ page }) => {
  let intento = 0;
  await page.route('**/sesion/cerrar', route => {
    intento += 1;
    return intento === 1
      ? route.fulfill(json({ detail: 'El respaldo falló y no se borró nada: la verificación falló: conteos distintos', codigo: 'respaldo_fallido' }, 500))
      : route.fulfill(json({ respaldo: 'ok', clips_borrados: 1, archivos_edge_borrados: 0 }));
  });
  await irAConfig(page);
  await page.getByTestId('cerrar-validacion-btn').click();
  await page.getByTestId('cerrar-validacion-confirmar').click();
  await expect(page.getByTestId('cerrar-validacion-fallo')).toContainText('NO se cerró');
  await expect(page.getByTestId('cerrar-validacion-fallo')).toContainText('no se borró ningún clip');
  await expect(page.getByTestId('cerrar-validacion-detalle')).toContainText('conteos distintos');
  await expect(page.getByTestId('combate-activo')).toBeVisible();
  await page.getByTestId('cerrar-validacion-reintentar').click();
  await expect(page.getByTestId('cerrar-validacion-ok')).toBeVisible();
  expect(intento).toBe(2);
});

test('sin conexión con el Fog: informa que no se borró nada', async ({ page }) => {
  await page.route('**/sesion/cerrar', route => route.abort());
  await irAConfig(page);
  await page.getByTestId('cerrar-validacion-btn').click();
  await page.getByTestId('cerrar-validacion-confirmar').click();
  await expect(page.getByTestId('cerrar-validacion-detalle')).toContainText('No se borró nada');
  await expect(page.getByTestId('combate-activo')).toBeVisible();
});

test('no se confunde con el "Cerrar sesión" del encabezado: ese solo sale de la cuenta y no llama a /sesion/cerrar', async ({ page }) => {
  let llamadas = 0;
  await page.route('**/sesion/cerrar', route => { llamadas += 1; return route.fulfill(json({})); });
  await mockApi(page);
  await page.goto('/');
  await page.getByTestId('logout-btn').click();
  await expect(page.getByTestId('login-btn')).toBeVisible();
  expect(llamadas).toBe(0);
});
