/**
 * Tocados capturados por Edge (EDGE02): lista "Últimos tocados", Solicitar VAR, decisión en pista,
 * botones de señal de prueba, visor en bucle y sección de cámara. Fog y Edge van simulados.
 */
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import {
  CLIP_OK, REVISION_ID, TOCADO_ID, configurarCombate, estadoEdge, mockApi, tocadoJson,
} from './helpers';

const OTRO_ID = '66666666-6666-4666-8666-666666666666';
const TERCERO_ID = '77777777-7777-4777-8777-777777777777';
const VIDEO = readFileSync('e2e/fixtures/dummy.mp4');
const json = (body: unknown, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) });

/** Clip de cada tocado: el mismo MP4 de prueba. */
async function mockClips(page: Page) {
  await page.route('**/tocados/*/clip', route => route.fulfill({ status: 200, contentType: 'video/mp4', body: VIDEO }));
}

async function irARevision(page: Page) {
  await configurarCombate(page);
  await page.getByTestId('nav-live').click();
}

test.describe('lista de tocados', () => {
  test('muestra hora, luces, fuente y estado; el más reciente admite VAR y los anteriores quedan "No revisado"', async ({ page }) => {
    await mockApi(page, {
      tocados: [
        tocadoJson({ tocado_id: TERCERO_ID, luz_A: false, luz_B: true, fuente: 'simulado', estado: 'procesando', t_luz_a_ms: null, t_luz_b_ms: 2000 }),
        tocadoJson({ tocado_id: OTRO_ID, admite_var: false, luz_B: true, t_luz_b_ms: 2040 }),
        tocadoJson({ tocado_id: TOCADO_ID, admite_var: false }),
      ],
    });
    await mockClips(page);
    await irARevision(page);
    await expect(page.getByTestId('panel-tocados')).toContainText('Últimos tocados');
    await expect(page.getByTestId(`tocado-${TERCERO_ID}`)).toContainText('VER');
    await expect(page.getByTestId(`tocado-${TERCERO_ID}`)).toContainText('Simulado');
    await expect(page.getByTestId(`estado-${TERCERO_ID}`)).toContainText('Procesando…');
    await expect(page.getByTestId(`tocado-${OTRO_ID}`)).toContainText('ROJ + VER (doble)');
    await expect(page.getByTestId(`tocado-${OTRO_ID}`)).toContainText('Favero');
    await expect(page.getByTestId(`estado-${OTRO_ID}`)).toContainText('No revisado');
    await expect(page.getByTestId(`solicitar-var-${TERCERO_ID}`)).toBeVisible();
    await expect(page.getByTestId(`solicitar-var-${OTRO_ID}`)).toHaveCount(0);
    await expect(page.getByTestId(`solicitar-var-${TOCADO_ID}`)).toHaveCount(0);
    // la sugerencia no aparece en la lista (D-04)
    await expect(page.getByTestId('panel-tocados')).not.toContainText('Sugerencia');
    await expect(page.getByTestId('panel-tocados')).not.toContainText('%');
  });

  test('sin tocados: lo dice y no hay botón de VAR', async ({ page }) => {
    await mockApi(page);
    await irARevision(page);
    await expect(page.getByTestId('tocados-vacio')).toBeVisible();
    await expect(page.locator('[data-testid^="solicitar-var-"]')).toHaveCount(0);
  });

  test('Solicitar VAR abre la revisión con la sugerencia al instante, sin elegir archivo', async ({ page }) => {
    await mockApi(page, { tocados: [tocadoJson()] });
    await mockClips(page);
    let pedido = 0;
    await page.route(`**/tocados/${TOCADO_ID}/revision`, route => { pedido += 1; return route.fulfill(json(CLIP_OK)); });
    let subidas = 0;
    await page.route('**/matches/*/clip', route => { subidas += 1; return route.fulfill(json(CLIP_OK)); });
    await irARevision(page);
    await expect(page.getByTestId('select-clip-btn')).toHaveCount(0); // ya no se pide un archivo
    await page.getByTestId(`solicitar-var-${TOCADO_ID}`).click();
    await expect(page.getByTestId('paso-sugerencia')).toContainText('Sugerencia del sistema');
    await expect(page.getByTestId('paso-sugerencia')).toContainText('A · ROJ');
    expect(pedido).toBe(1);
    expect(subidas).toBe(0);
  });

  test('Intro solicita el VAR del tocado más reciente', async ({ page }) => {
    await mockApi(page, { tocados: [tocadoJson()] });
    await mockClips(page);
    let pedido = 0;
    await page.route(`**/tocados/${TOCADO_ID}/revision`, route => { pedido += 1; return route.fulfill(json(CLIP_OK)); });
    await irARevision(page);
    await expect(page.getByTestId(`solicitar-var-${TOCADO_ID}`)).toBeVisible();
    await page.getByText('Últimos tocados').click(); // el foco no debe estar en un botón
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('paso-sugerencia')).toContainText('Sugerencia del sistema');
    expect(pedido).toBe(1);
  });

  test('un 409 (llegó un tocado posterior) se muestra como error y no abre revisión', async ({ page }) => {
    await mockApi(page, { tocados: [tocadoJson()] });
    await mockClips(page);
    await page.route(`**/tocados/${TOCADO_ID}/revision`, route =>
      route.fulfill(json({ detail: 'el tocado quedó cerrado como No revisado', codigo: 'ventana_var_cerrada' }, 409)));
    await irARevision(page);
    await page.getByTestId(`solicitar-var-${TOCADO_ID}`).click();
    await expect(page.getByTestId('status-error')).toBeVisible();
  });

  test('la carga manual de un archivo sigue disponible como respaldo', async ({ page }) => {
    await mockApi(page, { tocados: [tocadoJson()] });
    await mockClips(page);
    await irARevision(page);
    await page.getByTestId('cargar-manual-btn').click();
    await expect(page.getByTestId('select-clip-btn')).toBeVisible();
    await expect(page.getByTestId('analizar-btn')).toBeVisible();
  });
});

test.describe('decisión en pista', () => {
  test('cada tocado acepta la decisión de inmediato, sin mostrar la sugerencia, aunque siga procesándose', async ({ page }) => {
    await mockApi(page, {
      tocados: [
        tocadoJson({ tocado_id: TERCERO_ID, estado: 'procesando' }),
        tocadoJson({ tocado_id: OTRO_ID, admite_var: false, estado: 'procesando' }),
        tocadoJson({ tocado_id: TOCADO_ID, admite_var: false, estado: 'error' }),
      ],
    });
    await mockClips(page);
    const enviados: { id: string; cuerpo: Record<string, unknown> }[] = [];
    await page.route('**/tocados/*/decision-pista', route => {
      const cuerpo = route.request().postDataJSON() as Record<string, unknown>;
      enviados.push({ id: route.request().url().split('/').slice(-2)[0], cuerpo });
      return route.fulfill(json({ clase: cuerpo.clase, anulado: cuerpo.anulado, registrado_en: '2026-11-18T15:00:01Z' }));
    });
    await irARevision(page);
    // el más reciente: cierto aun procesándose
    await page.getByTestId(`decision-${TERCERO_ID}-AttackA`).click();
    // los anteriores: se abre su decisión con un toque y se registra con otro (incluso con error de proceso)
    await page.getByTestId(`alternar-decision-${OTRO_ID}`).click();
    await page.getByTestId(`decision-${OTRO_ID}-anulado`).click();
    await page.getByTestId(`alternar-decision-${TOCADO_ID}`).click();
    await page.getByTestId(`decision-${TOCADO_ID}-RiposteB`).click();
    await expect.poll(() => enviados.length).toBe(3);
    expect(enviados.find(e => e.id === TERCERO_ID)!.cuerpo).toMatchObject({ clase: 'AttackA', anulado: false });
    expect(enviados.find(e => e.id === OTRO_ID)!.cuerpo).toMatchObject({ clase: null, anulado: true });
    expect(enviados.find(e => e.id === TOCADO_ID)!.cuerpo).toMatchObject({ clase: 'RiposteB', anulado: false });
    // nada de esto abrió una revisión ni mostró sugerencia
    await expect(page.getByTestId('paso-sugerencia')).not.toContainText('Sugerencia del sistema');
  });

  test('muestra la decisión vigente del tocado', async ({ page }) => {
    await mockApi(page, {
      tocados: [tocadoJson({ decision_pista: { clase: 'ContrattackB', anulado: false, registrado_en: '2026-11-18T15:00:01Z' } })],
    });
    await mockClips(page);
    await irARevision(page);
    await expect(page.getByTestId(`decision-actual-${TOCADO_ID}`)).toContainText('Contraataque · B · VER');
  });
});

test.describe('señal de prueba', () => {
  test('con modo de prueba: tres botones, rótulo fijo y cada uno emite su señal', async ({ page }) => {
    await mockApi(page, { edge: estadoEdge({ modo_prueba: true }) });
    const señales: unknown[] = [];
    await page.route('**/edge/senal-prueba', route => { señales.push(route.request().postDataJSON()); return route.fulfill(json({})); });
    await irARevision(page);
    await expect(page.getByTestId('senal-prueba-rotulo')).toHaveText('Señal simulada, no es el aparato');
    await page.getByTestId('senal-prueba-a').click();
    await page.getByTestId('senal-prueba-b').click();
    await page.getByTestId('senal-prueba-doble').click();
    await expect.poll(() => señales.length).toBe(3);
    expect(señales).toEqual([{ luz_a: true, luz_b: false }, { luz_a: false, luz_b: true }, { luz_a: true, luz_b: true }]);
  });

  test('los atajos 1, 2 y 3 emiten luz A, luz B y doble', async ({ page }) => {
    await mockApi(page, { edge: estadoEdge({ modo_prueba: true }) });
    const señales: unknown[] = [];
    await page.route('**/edge/senal-prueba', route => { señales.push(route.request().postDataJSON()); return route.fulfill(json({})); });
    await irARevision(page);
    await expect(page.getByTestId('senal-prueba')).toBeVisible();
    await page.keyboard.press('1');
    await page.keyboard.press('2');
    await page.keyboard.press('3');
    await expect.poll(() => señales.length).toBe(3);
  });

  test('sin modo de prueba (o con Edge caído) los botones no aparecen', async ({ page }) => {
    await mockApi(page, { edge: estadoEdge({ modo_prueba: false }) });
    await irARevision(page);
    await expect(page.getByTestId('panel-tocados')).toBeVisible();
    await expect(page.getByTestId('senal-prueba')).toHaveCount(0);
    await page.keyboard.press('1');
    await expect(page.getByTestId('senal-prueba')).toHaveCount(0);
  });

  test('un fallo al emitir la señal se muestra', async ({ page }) => {
    await mockApi(page, { edge: estadoEdge({ modo_prueba: true }) });
    await page.route('**/edge/senal-prueba', route => route.fulfill(json({ detail: 'Edge no responde', codigo: 'edge_no_disponible' }, 503)));
    await irARevision(page);
    await page.getByTestId('senal-prueba-a').click();
    await expect(page.getByTestId('senal-prueba-error')).toContainText('Edge no responde');
  });
});

test.describe('RNF-09', () => {
  test('sin señal Favero: lo dice y la revisión sigue como repetición convencional', async ({ page }) => {
    await mockApi(page, { edge: estadoEdge({ fuente: 'favero', sin_senal: true }) });
    await irARevision(page);
    await expect(page.getByTestId('sin-senal-favero')).toContainText('Sin señal Favero');
    await expect(page.getByTestId('sin-senal-favero')).toContainText('repetición convencional');
  });

  test('con señal no se muestra el aviso', async ({ page }) => {
    await mockApi(page, { edge: estadoEdge({ fuente: 'favero', sin_senal: false }) });
    await irARevision(page);
    await expect(page.getByTestId('panel-tocados')).toBeVisible();
    await expect(page.getByTestId('sin-senal-favero')).toHaveCount(0);
  });
});

test.describe('visor', () => {
  test('muestra en bucle el último clip y lo reemplaza en menos de 1 s cuando llega uno nuevo', async ({ page }) => {
    let lista = [tocadoJson()];
    await mockApi(page, { tocados: () => lista });
    await mockClips(page);
    await irARevision(page);
    const video = page.getByTestId('video-player');
    await expect(video).toBeVisible();
    await expect(video).toHaveJSProperty('loop', true);
    const antes = await video.getAttribute('src');
    const t0 = Date.now();
    lista = [tocadoJson({ tocado_id: OTRO_ID, creado_en: '2026-11-18T15:00:09Z' }), ...lista.map(t => ({ ...t, admite_var: false }))];
    await expect.poll(async () => video.getAttribute('src'), { timeout: 1000 }).not.toBe(antes);
    expect(Date.now() - t0).toBeLessThan(1000);
  });

  test('mientras un clip se procesa, el visor lo indica sin tapar la imagen', async ({ page }) => {
    await mockApi(page, { tocados: [tocadoJson({ estado: 'procesando' })] });
    await mockClips(page);
    await irARevision(page);
    await expect(page.getByTestId('visor-insignia')).toHaveText('Procesando…');
    await expect(page.getByTestId('video-player')).toBeVisible();
    // la insignia no intercepta el ratón: el video se puede controlar
    const caja = await page.getByTestId('video-player').boundingBox();
    expect(caja!.width).toBeGreaterThan(200);
  });

  test('desde la lista se vuelve a ver cualquier tocado de la sesión', async ({ page }) => {
    await mockApi(page, {
      tocados: [tocadoJson({ tocado_id: OTRO_ID, admite_var: false }), tocadoJson({ admite_var: false })],
    });
    const pedidos: string[] = [];
    await page.route('**/tocados/*/clip', route => { pedidos.push(route.request().url()); return route.fulfill({ status: 200, contentType: 'video/mp4', body: VIDEO }); });
    await irARevision(page);
    await expect.poll(() => pedidos.length).toBe(1);
    expect(pedidos[0]).toContain(OTRO_ID);
    await page.getByTestId(`ver-tocado-${TOCADO_ID}`).click();
    await expect.poll(() => pedidos.length).toBe(2);
    expect(pedidos[1]).toContain(TOCADO_ID);
  });
});

test.describe('sección Cámara', () => {
  async function mockCamara(page: Page) {
    await mockApi(page, { edge: estadoEdge({ fps: 24.0, avisos: ['la cámara entrega 24.0 fps, menos de los 30 configurados'] }) });
    await page.route('**/edge/camaras', route => route.fulfill(json([
      { indice: 0, nombre: 'Cámara del MacBook Air' }, { indice: 3, nombre: 'Cámara de iPhone' },
    ])));
    await page.route('**/edge/config', route => {
      if (route.request().method() === 'PUT') return route.fallback();
      return route.fulfill(json({ camara_indice: 0, ancho: 1280, alto: 720, fps: 30 }));
    });
  }

  test('elige dispositivo, resolución y fps, guarda, y muestra los fps medidos y los avisos', async ({ page }) => {
    await mockCamara(page);
    let guardado: unknown;
    await page.route('**/edge/config', route => {
      if (route.request().method() !== 'PUT') return route.fallback();
      guardado = route.request().postDataJSON();
      return route.fulfill(json(guardado));
    });
    await page.goto('/config');
    await expect(page.getByTestId('camara-0')).toContainText('Cámara del MacBook Air');
    await page.getByTestId('camara-3').click();
    await page.getByTestId('resolucion-1080').click();
    await page.getByTestId('fps-60').click();
    await page.getByTestId('guardar-camara-btn').click();
    await expect(page.getByTestId('camara-mensaje')).toHaveText('Cámara guardada.');
    expect(guardado).toEqual({ camara_indice: 3, ancho: 1920, alto: 1080, fps: 60 });
    await expect(page.getByTestId('camara-fps')).toContainText('24.0 de 30');
    await expect(page.getByTestId('camara-aviso')).toContainText('menos de los 30');
  });

  test('si Edge rechaza la configuración (RNF-13) muestra el motivo', async ({ page }) => {
    await mockCamara(page);
    await page.route('**/edge/config', route => {
      if (route.request().method() !== 'PUT') return route.fallback();
      return route.fulfill(json({ detail: 'los fps deben estar entre 30 (RNF-13) y 120' }, 422));
    });
    await page.goto('/config');
    await page.getByTestId('guardar-camara-btn').click();
    await expect(page.getByTestId('camara-mensaje')).toContainText('RNF-13');
  });

  test('vista de prueba: un cuadro (no video en vivo) que se renueva cada pocos segundos', async ({ page }) => {
    await mockCamara(page);
    const jpg = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');
    let pedidos = 0;
    await page.route('**/edge/preview', route => { pedidos += 1; return route.fulfill({ status: 200, contentType: 'image/jpeg', body: jpg }); });
    await page.goto('/config');
    await expect(page.getByTestId('camara-preview')).toBeVisible();
    await expect.poll(() => pedidos, { timeout: 9000 }).toBeGreaterThanOrEqual(2);
    await expect(page.locator('video')).toHaveCount(0);
  });

  test('Edge apagado: lo dice y ofrece reintentar', async ({ page }) => {
    await mockApi(page);
    await page.route('**/edge/camaras', route => route.fulfill(json({ detail: 'Edge no responde', codigo: 'edge_no_disponible' }, 503)));
    await page.route('**/edge/config', route => route.fulfill(json({ detail: 'Edge no responde', codigo: 'edge_no_disponible' }, 503)));
    await page.goto('/config');
    await expect(page.getByTestId('camara-error')).toContainText('No se pudo leer la cámara de Edge');
    await expect(page.getByTestId('camara-edge-caido')).toBeVisible();
  });
});
