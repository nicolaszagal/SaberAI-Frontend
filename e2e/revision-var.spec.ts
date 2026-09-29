import { test, expect, type Page } from '@playwright/test';
import { mockApi, configurarCombate, mockClip, analizarClip, CLIP_OK, ARBITRO_ID, REVISION_ID, MATCH_ID } from './helpers';

const FIXTURE = 'e2e/fixtures/dummy.mp4';
const VIDEO = 'e2e/fixtures/player.webm';
const URL_VEREDICTO = `**/revisiones/${REVISION_ID}/veredicto`;

/** Captura el cuerpo JSON de POST /revisiones/{id}/veredicto y responde como el Fog. */
async function mockVeredicto(page: Page, status = 200) {
  const cuerpos: Record<string, unknown>[] = [];
  await page.route(URL_VEREDICTO, route => {
    const b = route.request().postDataJSON() as Record<string, unknown>;
    cuerpos.push(b);
    return status === 200
      ? route.fulfill({
        status, contentType: 'application/json',
        body: JSON.stringify({ match_id: MATCH_ID, revision_id: REVISION_ID, decision: b.decision, clase_final: b.clase_final ?? null }),
      })
      : route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ detail: 'la revisión ya tiene un veredicto registrado' }) });
  });
  return cuerpos;
}

test.beforeEach(async ({ page }) => {
  await mockApi(page);
  await configurarCombate(page);
  await page.getByTestId('nav-live').click();
});

test.describe('estructura', () => {
  test('muestra los tres pasos y no quedan textos fijos ni botones del panel anterior', async ({ page }) => {
    await expect(page.getByTestId('paso-clip')).toContainText('Paso 1 · Clip');
    await expect(page.getByTestId('paso-sugerencia')).toContainText('Paso 2 · Sugerencia');
    await expect(page.getByTestId('paso-decision')).toContainText('Paso 3 · Decisión del árbitro');
    await expect(page.getByTestId('action-panel')).toHaveCount(0);
    for (const fijo of ['PANTALLA 01', 'PANTALLA 02', 'POSE-ESTIMATION', 'Confirmar', 'Manual']) {
      await expect(page.locator('body')).not.toContainText(fijo);
    }
  });

  test('ningún botón queda sin acción: antes de analizar todo lo que decide está deshabilitado', async ({ page }) => {
    await expect(page.getByTestId('analizar-btn')).toHaveAttribute('aria-disabled', 'true');
    for (const id of ['veredicto-mantener', 'veredicto-cambiar', 'veredicto-anular']) {
      await expect(page.getByTestId(id)).toHaveAttribute('aria-disabled', 'true');
    }
  });

  test('sin combate activo no se puede analizar y lleva a Configuración', async ({ page }) => {
    await page.getByTestId('finalizar-combate-btn').click();
    await page.goto('/live');
    await expect(page.getByTestId('sin-combate')).toBeVisible();
    await page.getByTestId('file-input').setInputFiles(FIXTURE);
    await expect(page.getByTestId('analizar-btn')).toHaveAttribute('aria-disabled', 'true');
    await page.getByTestId('sin-combate').getByRole('button', { name: /Configurar combate/ }).click();
    await expect(page.getByTestId('crear-combate-btn')).toBeVisible();
  });
});

test.describe('Paso 1 · Clip', () => {
  test('toggles de luz cambian el estado', async ({ page }) => {
    await expect(page.getByTestId('luz-hint')).toHaveText('Sin luz');
    await page.getByTestId('luz-a-btn').click();
    await expect(page.getByTestId('luz-hint')).toHaveText('Luz A');
    await page.getByTestId('luz-b-btn').click();
    await expect(page.getByTestId('luz-hint')).toHaveText('Ambas luces');
  });

  test('ANALIZAR exige clip, una luz y el instante del tocado', async ({ page }) => {
    const analizar = page.getByTestId('analizar-btn');
    await expect(page.getByTestId('analizar-falta')).toContainText('elegir un clip');
    await page.getByTestId('file-input').setInputFiles(FIXTURE);
    await expect(page.getByTestId('filename-display')).toContainText('dummy.mp4');
    await expect(page.getByTestId('analizar-falta')).toContainText('luz A o la luz B');
    await page.getByTestId('luz-b-btn').click();
    await expect(page.getByTestId('analizar-falta')).toContainText('tocado');
    await expect(analizar).toHaveAttribute('aria-disabled', 'true');
    await page.getByTestId('marcar-tocado-btn').click();
    await expect(page.getByTestId('tocado-valor')).toHaveText('0 ms');
    await expect(page.getByTestId('analizar-falta')).toHaveCount(0);
    await expect(analizar).not.toHaveAttribute('aria-disabled', 'true');
  });

  test('envía el clip con las luces y el instante del tocado marcados', async ({ page }) => {
    await mockClip(page);
    const peticion = page.waitForRequest('**/matches/*/clip');
    await page.getByTestId('file-input').setInputFiles(VIDEO);
    await page.getByTestId('luz-a-btn').click();
    await page.getByTestId('marcar-tocado-btn').click();
    await page.getByTestId('analizar-btn').click();
    const cuerpo = (await peticion).postData() ?? '';
    expect(cuerpo).toContain('name="has_luz_A"\r\n\r\ntrue');
    expect(cuerpo).toContain('name="has_luz_B"\r\n\r\nfalse');
    expect(cuerpo).toMatch(/name="t_tocado_ms"\r\n\r\n\d+/);
  });

  test('muestra Analizando con el tiempo transcurrido y el límite de 60 s', async ({ page }) => {
    await page.route('**/matches/*/clip', async route => {
      await new Promise(r => setTimeout(r, 2500));
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(CLIP_OK) });
    });
    await analizarClip(page);
    await expect(page.getByTestId('status-analyzing')).toContainText(/Analizando… \d+ s de 60 s/);
    await expect(page.getByTestId('status-done')).toHaveText('✓ Listo', { timeout: 10_000 });
    await expect(page.getByTestId('status-analyzing')).toHaveCount(0);
  });
});

test.describe('reproductor', () => {
  test('cambiar la velocidad ajusta la reproducción sin volver a pedir la clasificación', async ({ page }) => {
    let pedidos = 0;
    await page.route('**/matches/*/clip', route => { pedidos++; return route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify(CLIP_OK),
    }); });
    await analizarClip(page, VIDEO);
    await expect(page.getByTestId('status-done')).toBeVisible();
    expect(pedidos).toBe(1);

    const velocidad = () => page.getByTestId('video-player').evaluate((v: HTMLVideoElement) => v.playbackRate);
    for (const x of [0.5, 0.25, 1]) {
      await page.getByTestId(`speed-${x}`).click();
      expect(await velocidad()).toBe(x);
    }
    await expect(page.getByTestId('action-label')).toHaveText('Ataque');
    expect(pedidos).toBe(1);
  });

  test('avanza y retrocede un cuadro', async ({ page }) => {
    await page.getByTestId('file-input').setInputFiles(VIDEO);
    await expect(page.getByTestId('frame-next')).not.toHaveAttribute('aria-disabled', 'true', { timeout: 10_000 });
    const t = () => page.getByTestId('video-player').evaluate((v: HTMLVideoElement) => v.currentTime);

    const t0 = await t();
    await page.getByTestId('frame-next').click();
    await expect.poll(t).toBeGreaterThan(t0);
    const t1 = await t();
    expect(t1 - t0).toBeCloseTo(1 / 30, 1);
    await page.getByTestId('frame-prev').click();
    await expect.poll(t).toBeLessThan(t1);
  });
});

test.describe('Paso 2 · Sugerencia', () => {
  test('muestra acción completa, tirador, barra de confianza y la etiqueta "Sugerencia del sistema"', async ({ page }) => {
    await mockClip(page);
    await analizarClip(page);
    const paso = page.getByTestId('paso-sugerencia');
    await expect(paso).toContainText('Sugerencia del sistema');
    await expect(page.getByTestId('action-label')).toHaveText('Ataque');
    await expect(page.getByTestId('fencer-label')).toHaveText('A · ROJ');
    await expect(page.getByTestId('confidence-value')).toHaveText('92%');
    await expect(page.getByTestId('confidence-bar')).toBeVisible();
    await expect(page.getByTestId('status-done')).toBeVisible();
  });

  test('traduce Contraataque del lado B', async ({ page }) => {
    await mockClip(page, { ...CLIP_OK, fencer: 'VER', action: 'ContrattackB', confidence: 0.55 });
    await analizarClip(page);
    await expect(page.getByTestId('action-label')).toHaveText('Contraataque');
    await expect(page.getByTestId('fencer-label')).toHaveText('B · VER');
    await expect(page.getByTestId('confidence-value')).toHaveText('55%');
  });
});

test.describe('Paso 3 · Decisión del árbitro', () => {
  test('mantener: envía la clase sugerida como clase_final y confirma', async ({ page }) => {
    await mockClip(page);
    const cuerpos = await mockVeredicto(page);
    await analizarClip(page);
    await expect(page.getByTestId('veredicto-mantener')).not.toHaveAttribute('aria-disabled', 'true');
    await page.getByTestId('veredicto-mantener').click();

    await expect(page.getByTestId('veredicto-confirmado')).toContainText('Veredicto registrado');
    await expect(page.getByTestId('veredicto-confirmado')).toContainText('Mantiene · Ataque · A · ROJ');
    expect(cuerpos).toEqual([{ decision: 'mantener', clase_final: 'AttackA', arbitro_id: ARBITRO_ID }]);
    await expect(page.getByTestId('veredicto-mantener')).toHaveAttribute('aria-disabled', 'true');
    await expect(page.getByTestId('veredicto-anular')).toHaveAttribute('aria-disabled', 'true');
  });

  test('cambiar: abre el selector de las 6 clases y envía la elegida', async ({ page }) => {
    await mockClip(page);
    const cuerpos = await mockVeredicto(page);
    await analizarClip(page);
    await page.getByTestId('veredicto-cambiar').click();

    const selector = page.getByTestId('selector-clase');
    await expect(selector.getByRole('button')).toHaveCount(7); // 6 clases + Cancelar
    for (const clase of ['AttackA', 'AttackB', 'ContrattackA', 'ContrattackB', 'RiposteA', 'RiposteB']) {
      await expect(page.getByTestId(`clase-${clase}`)).toBeVisible();
    }
    await expect(page.getByTestId('clase-AttackA')).toContainText('(sugerida)');
    expect(cuerpos).toHaveLength(0); // la sugerencia se resalta pero no se preselecciona

    await page.getByTestId('clase-ContrattackB').click();
    await expect(page.getByTestId('veredicto-confirmado')).toContainText('Cambia · Contraataque · B · VER');
    expect(cuerpos).toEqual([{ decision: 'cambiar', clase_final: 'ContrattackB', arbitro_id: ARBITRO_ID }]);
  });

  test('cambiar: cancelar no registra nada', async ({ page }) => {
    await mockClip(page);
    const cuerpos = await mockVeredicto(page);
    await analizarClip(page);
    await page.getByTestId('veredicto-cambiar').click();
    await page.getByTestId('selector-cancelar').click();
    await expect(page.getByTestId('selector-clase')).toHaveCount(0);
    expect(cuerpos).toHaveLength(0);
  });

  test('anular: no envía clase_final', async ({ page }) => {
    await mockClip(page);
    const cuerpos = await mockVeredicto(page);
    await analizarClip(page);
    await page.getByTestId('veredicto-anular').click();
    await expect(page.getByTestId('veredicto-confirmado')).toContainText('Anula');
    expect(cuerpos).toEqual([{ decision: 'anular', arbitro_id: ARBITRO_ID }]);
  });

  test('atajos M, C y A', async ({ page }) => {
    await mockClip(page);
    const cuerpos = await mockVeredicto(page);
    await analizarClip(page);
    await expect(page.getByTestId('status-done')).toBeVisible();
    await page.keyboard.press('c');
    await expect(page.getByTestId('selector-clase')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('selector-clase')).toHaveCount(0);
    await page.keyboard.press('m');
    await expect(page.getByTestId('veredicto-confirmado')).toBeVisible();
    expect(cuerpos).toEqual([{ decision: 'mantener', clase_final: 'AttackA', arbitro_id: ARBITRO_ID }]);
  });

  test('si el Fog rechaza el veredicto lo dice y permite volver a decidir', async ({ page }) => {
    await mockClip(page);
    await mockVeredicto(page, 409);
    await analizarClip(page);
    await page.getByTestId('veredicto-mantener').click();
    await expect(page.getByTestId('veredicto-error')).toContainText('ya tiene un veredicto');
    await expect(page.getByTestId('veredicto-confirmado')).toHaveCount(0);
    await expect(page.getByTestId('veredicto-mantener')).not.toHaveAttribute('aria-disabled', 'true');
  });
});

test.describe('clasificación no disponible', () => {
  const NO_DISPONIBLE = {
    ...CLIP_OK, disponible: false, motivo: 'pose_incompleta', fencer: null, action: null, confidence: null,
  };

  test('muestra el motivo y sigue el procedimiento VAR habitual', async ({ page }) => {
    await mockClip(page, NO_DISPONIBLE);
    await analizarClip(page);
    const aviso = page.getByTestId('no-disponible');
    await expect(aviso).toContainText('Clasificación no disponible');
    await expect(page.getByTestId('no-disponible-motivo')).toContainText('No se pudo detectar a ambos tiradores');
    await expect(aviso).toContainText('Continúe con el procedimiento VAR habitual');
    await expect(page.getByTestId('action-label')).toHaveCount(0);
    await expect(page.getByTestId('confidence-value')).toHaveCount(0);
    await expect(page.getByTestId('status-done')).toBeVisible();
  });

  test('sin sugerencia no hay Mantener; Cambiar y Anular siguen disponibles', async ({ page }) => {
    await mockClip(page, NO_DISPONIBLE);
    const cuerpos = await mockVeredicto(page);
    await analizarClip(page);
    await expect(page.getByTestId('veredicto-mantener')).toHaveAttribute('aria-disabled', 'true');
    await expect(page.getByTestId('veredicto-cambiar')).not.toHaveAttribute('aria-disabled', 'true');
    await page.getByTestId('veredicto-cambiar').click();
    await page.getByTestId('clase-RiposteA').click();
    await expect(page.getByTestId('veredicto-confirmado')).toContainText('Cambia · Riposte · A · ROJ');
    expect(cuerpos).toEqual([{ decision: 'cambiar', clase_final: 'RiposteA', arbitro_id: ARBITRO_ID }]);
  });
});

test.describe('error de red', () => {
  test('sin conexión: muestra Error, deshabilita la decisión y permite reintentar', async ({ page }) => {
    let intento = 0;
    await page.route('**/matches/*/clip', route => ++intento === 1
      ? route.abort()
      : route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(CLIP_OK) }));
    await analizarClip(page);
    await expect(page.getByTestId('status-error')).toContainText('Error');
    await expect(page.getByTestId('status-done')).toHaveCount(0);
    for (const id of ['veredicto-mantener', 'veredicto-cambiar', 'veredicto-anular']) {
      await expect(page.getByTestId(id)).toHaveAttribute('aria-disabled', 'true');
    }
    await page.getByTestId('status-error').getByRole('button', { name: /Reintentar/ }).click();
    await expect(page.getByTestId('status-done')).toBeVisible();
    await expect(page.getByTestId('action-label')).toHaveText('Ataque');
  });

  test('el Fog rechaza el clip (422): muestra su detalle', async ({ page }) => {
    await mockClip(page, { detail: 't_tocado_ms fuera del clip' }, 422);
    await analizarClip(page);
    await expect(page.getByTestId('status-error')).toContainText('t_tocado_ms fuera del clip');
  });
});
