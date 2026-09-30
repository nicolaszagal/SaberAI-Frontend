import { test, expect } from '@playwright/test';
import { mockApi, configurarCombate, EVENTO_ID, REVISION_ID } from './helpers';

const R2 = '55555555-5555-4555-8555-555555555555';

const fila = (id: string, o: Record<string, unknown>) => ({
  id, combate_id: 'c1', abierta_en: '2026-10-01T15:00:00Z', cerrada_en: null,
  disponible: true, clase: 'AttackA', confianza: 0.74, decision: null, clase_final: null, ...o,
});

const DETALLE = {
  id: REVISION_ID, combate_id: 'c1', abierta_en: '2026-10-01T15:00:00Z', cerrada_en: '2026-10-01T15:01:00Z',
  sugerencia: { disponible: true, motivo_no_disp: null, clase: 'AttackA', tirador: 'A', confianza: 0.74 },
  probabilidades: { AttackA: 0.74, AttackB: 0, ContrattackA: 0.16, ContrattackB: 0, RiposteA: 0.1, RiposteB: 0 },
  decision: 'cambiar', clase_final: 'RiposteB', registrado_en: '2026-10-01T15:01:00Z',
  auditoria_seq: 7, auditoria_hash: 'abc123hash',
};

const DETALLE_NO_DISP = {
  ...DETALLE, id: R2, decision: 'anular', clase_final: null,
  sugerencia: { disponible: false, motivo_no_disp: 'pose_incompleta', clase: null, tirador: null, confianza: null },
  probabilidades: null,
};

test('lista las revisiones del evento activo con hora, sugerencia, confianza, decisión y concordancia', async ({ page }) => {
  await mockApi(page, {
    revisiones: [
      fila(REVISION_ID, { decision: 'mantener', clase_final: 'AttackA' }),
      fila('r2', { decision: 'cambiar', clase_final: 'RiposteB' }),
      fila('r3', { decision: 'anular' }),
      fila('r4', { disponible: false, clase: null, confianza: null, decision: 'cambiar', clase_final: 'AttackA' }),
      fila('r5', {}),
    ],
  });
  await configurarCombate(page);
  const consulta = page.waitForRequest(r => r.method() === 'GET' && /\/revisiones\?/.test(r.url()));
  await page.getByTestId('nav-history').click();
  expect(new URL((await consulta).url()).searchParams.get('evento_id')).toBe(EVENTO_ID);

  const filas = page.getByTestId('revision-row');
  await expect(filas).toHaveCount(5);
  await expect(filas.nth(0)).toContainText('ATAQUE · A');
  await expect(filas.nth(0)).toContainText('74%');
  await expect(filas.nth(0)).toContainText('Mantiene  ·  ATAQUE · A');
  await expect(filas.nth(0)).toContainText('Coincide');
  await expect(filas.nth(1)).toContainText('Difiere');
  await expect(filas.nth(2)).toContainText('Anula');
  await expect(filas.nth(2)).not.toContainText(/Coincide|Difiere/);
  await expect(filas.nth(3)).toContainText('No disponible');
  await expect(filas.nth(3)).not.toContainText(/Coincide|Difiere/);
  await expect(filas.nth(4)).toContainText('Pendiente');
});

test('sin evento activo no lista nada y lleva a Configuración', async ({ page }) => {
  await mockApi(page, { revisiones: [fila('r1', {})] });
  await page.goto('/history');
  await expect(page.getByTestId('historial-sin-evento')).toBeVisible();
  await expect(page.getByTestId('revision-row')).toHaveCount(0);
  await page.getByTestId('historial-sin-evento').getByRole('button', { name: /Configurar combate/ }).click();
  await expect(page.getByTestId('crear-combate-btn')).toBeVisible();
});

test('al seleccionar una fila muestra el detalle y al repetir lo oculta', async ({ page }) => {
  await mockApi(page, {
    revisiones: [fila(REVISION_ID, { decision: 'cambiar', clase_final: 'RiposteB' })],
    detalles: { [REVISION_ID]: DETALLE },
  });
  await configurarCombate(page);
  await page.getByTestId('nav-history').click();
  await expect(page.getByTestId('revision-detalle')).toHaveCount(0);

  await page.getByTestId('revision-row').click();
  const d = page.getByTestId('revision-detalle');
  await expect(d).toContainText('ATAQUE · A · Tirador A · ROJ · 74%');
  await expect(page.getByTestId('prob-ContrattackA')).toHaveText('CONTRAATAQUE · A: 16%');
  await expect(d).toContainText('Cambia  ·  RIPOSTE · B');
  await expect(d).toContainText('Registro n.º 7');
  await expect(d).toContainText('abc123hash');

  await page.getByTestId('revision-row').click();
  await expect(d).toHaveCount(0);
});

test('el detalle de una revisión sin sugerencia muestra el motivo', async ({ page }) => {
  await mockApi(page, { revisiones: [fila(R2, { disponible: false, clase: null, confianza: null, decision: 'anular' })], detalles: { [R2]: DETALLE_NO_DISP } });
  await configurarCombate(page);
  await page.getByTestId('nav-history').click();
  await page.getByTestId('revision-row').click();
  await expect(page.getByTestId('revision-detalle')).toContainText('Clasificación no disponible');
  await expect(page.getByTestId('revision-detalle')).toContainText('No se pudo detectar a ambos tiradores');
  await expect(page.getByTestId('revision-detalle')).toContainText('Anula');
});

test('un detalle que falla muestra el error con Reintentar', async ({ page }) => {
  await mockApi(page, { revisiones: [fila(REVISION_ID, {})] });
  await configurarCombate(page);
  await page.getByTestId('nav-history').click();
  await page.getByTestId('revision-row').click();
  await expect(page.getByTestId('detalle-error')).toContainText('404');
  await expect(page.getByTestId('detalle-error').getByRole('button', { name: /Reintentar/ })).toBeVisible();
});

test('estados vacío y de error del listado', async ({ page }) => {
  await mockApi(page);
  await configurarCombate(page);
  await page.getByTestId('nav-history').click();
  await expect(page.getByTestId('historial-vacio')).toBeVisible();

  await page.route(/\/revisiones(\?.*)?$/, route => route.fulfill({ status: 500, body: 'boom' }));
  await page.getByTestId('nav-live').click();
  await page.getByTestId('nav-history').click();
  await expect(page.getByTestId('historial-error')).toContainText('500');
});

test('Exportar evidencia descarga el resumen del evento activo', async ({ page }) => {
  const resumen = { evento_id: EVENTO_ID, por_validacion: { V1: { n_revisiones: 2 } } };
  await mockApi(page, { revisiones: [fila(REVISION_ID, {})], resumen });
  await configurarCombate(page);
  await page.getByTestId('nav-history').click();

  const peticion = page.waitForRequest(r => r.url().includes('/validaciones/'));
  const descarga = page.waitForEvent('download');
  await page.getByTestId('exportar-evidencia-btn').click();
  expect(new URL((await peticion).url()).pathname).toBe(`/validaciones/${EVENTO_ID}/resumen`);
  const d = await descarga;
  expect(d.suggestedFilename()).toBe(`resumen-${EVENTO_ID}.json`);
  const ruta = await d.path();
  const contenido = JSON.parse(await (await import('node:fs/promises')).readFile(ruta, 'utf-8'));
  expect(contenido).toEqual(resumen);
  await expect(page.getByTestId('exportar-ok')).toContainText(`resumen-${EVENTO_ID}.json`);
});

test('si el resumen no se puede obtener no descarga y muestra el error', async ({ page }) => {
  await mockApi(page, { revisiones: [fila(REVISION_ID, {})] });
  await configurarCombate(page);
  await page.route('**/validaciones/*/resumen', route =>
    route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ detail: 'el evento no existe' }) }));
  await page.getByTestId('nav-history').click();
  let descargas = 0;
  page.on('download', () => { descargas++; });
  await page.getByTestId('exportar-evidencia-btn').click();
  await expect(page.getByTestId('exportar-error')).toContainText('el evento no existe');
  await expect(page.getByTestId('exportar-ok')).toHaveCount(0);
  expect(descargas).toBe(0);
});
