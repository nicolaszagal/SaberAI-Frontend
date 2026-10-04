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
    await expect(page.getByTestId('selector-clase')).toHaveCount(0);
    await expect(page.getByTestId('veredicto-anular')).toHaveCount(0);
    await expect(page.getByTestId('decision-deshabilitada')).toContainText('Disponible cuando el análisis termine');
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
  test('marcar y quitar cada luz muestra su instante', async ({ page }) => {
    await page.getByTestId('file-input').setInputFiles(FIXTURE);
    await expect(page.getByTestId('luz-a-valor')).toHaveText('Luz A: sin marcar');
    await expect(page.getByTestId('luz-b-valor')).toHaveText('Luz B: sin marcar');
    await expect(page.getByTestId('quitar-luz-a-btn')).toHaveAttribute('aria-disabled', 'true');

    await page.getByTestId('marcar-luz-a-btn').click();
    await expect(page.getByTestId('luz-a-valor')).toHaveText('Luz A: 0 ms');
    await expect(page.getByTestId('luz-b-valor')).toHaveText('Luz B: sin marcar');
    await page.getByTestId('marcar-luz-b-btn').click();
    await expect(page.getByTestId('luz-b-valor')).toHaveText('Luz B: 0 ms');

    await page.getByTestId('quitar-luz-a-btn').click();
    await expect(page.getByTestId('luz-a-valor')).toHaveText('Luz A: sin marcar');
    await expect(page.getByTestId('luz-b-valor')).toHaveText('Luz B: 0 ms');
  });

  test('ANALIZAR se habilita con al menos una luz marcada y se deshabilita al quitarla', async ({ page }) => {
    const analizar = page.getByTestId('analizar-btn');
    await expect(page.getByTestId('analizar-falta')).toContainText('elegir un clip');
    await page.getByTestId('file-input').setInputFiles(FIXTURE);
    await expect(page.getByTestId('filename-display')).toContainText('dummy.mp4');
    await expect(page.getByTestId('analizar-falta')).toContainText('luz A o la luz B');
    await expect(analizar).toHaveAttribute('aria-disabled', 'true');
    await page.getByTestId('marcar-luz-b-btn').click();
    await expect(page.getByTestId('analizar-falta')).toHaveCount(0);
    await expect(analizar).not.toHaveAttribute('aria-disabled', 'true');
    await page.getByTestId('quitar-luz-b-btn').click();
    await expect(analizar).toHaveAttribute('aria-disabled', 'true');
  });

  test('los atajos R y V marcan la luz A y la luz B', async ({ page }) => {
    await page.getByTestId('file-input').setInputFiles(FIXTURE);
    await page.keyboard.press('r');
    await expect(page.getByTestId('luz-a-valor')).toHaveText('Luz A: 0 ms');
    await page.keyboard.press('v');
    await expect(page.getByTestId('luz-b-valor')).toHaveText('Luz B: 0 ms');
  });

  test('las luces se reinician al elegir otro clip', async ({ page }) => {
    await page.getByTestId('file-input').setInputFiles(FIXTURE);
    await page.getByTestId('marcar-luz-a-btn').click();
    await page.getByTestId('marcar-luz-b-btn').click();
    await page.getByTestId('file-input').setInputFiles(VIDEO);
    await expect(page.getByTestId('luz-a-valor')).toHaveText('Luz A: sin marcar');
    await expect(page.getByTestId('luz-b-valor')).toHaveText('Luz B: sin marcar');
  });

  test('analizar con una luz envía solo el instante de esa luz', async ({ page }) => {
    await mockClip(page);
    const peticion = page.waitForRequest('**/matches/*/clip');
    await page.getByTestId('file-input').setInputFiles(VIDEO);
    await page.getByTestId('marcar-luz-a-btn').click();
    await page.getByTestId('analizar-btn').click();
    const cuerpo = (await peticion).postData() ?? '';
    expect(cuerpo).toMatch(/name="t_luz_a_ms"\r\n\r\n\d+/);
    expect(cuerpo).not.toContain('name="t_luz_b_ms"');
    expect(cuerpo).not.toContain('has_luz_A');
    expect(cuerpo).not.toContain('t_tocado_ms');
  });

  test('cada luz guarda el instante del reproductor en que se marcó', async ({ page }) => {
    await page.getByTestId('file-input').setInputFiles(VIDEO);
    const irA = async (ms: number) => {
      await page.evaluate(t => {
        (document.querySelector('[data-testid="video-player"]') as HTMLVideoElement).currentTime = t / 1000;
      }, ms);
      await page.waitForFunction(t => {
        const v = document.querySelector('[data-testid="video-player"]') as HTMLVideoElement;
        return Math.abs(v.currentTime * 1000 - t) < 50 && !v.seeking;
      }, ms);
    };
    await page.getByTestId('video-player').waitFor();
    await irA(400);
    await page.getByTestId('marcar-luz-b-btn').click();
    await irA(200);
    await page.getByTestId('marcar-luz-a-btn').click();
    const a = Number((await page.getByTestId('luz-a-valor').innerText()).match(/(\d+) ms/)![1]);
    const b = Number((await page.getByTestId('luz-b-valor').innerText()).match(/(\d+) ms/)![1]);
    expect(Math.abs(a - 200)).toBeLessThan(50);
    expect(Math.abs(b - 400)).toBeLessThan(50);
    expect(b).toBeGreaterThan(a);
  });

  test('analizar con dos luces envía el instante de cada una', async ({ page }) => {
    await mockClip(page);
    const peticion = page.waitForRequest('**/matches/*/clip');
    await page.getByTestId('file-input').setInputFiles(VIDEO);
    await page.getByTestId('marcar-luz-a-btn').click();
    await page.getByTestId('marcar-luz-b-btn').click();
    await page.getByTestId('analizar-btn').click();
    const cuerpo = (await peticion).postData() ?? '';
    expect(cuerpo).toMatch(/name="t_luz_a_ms"\r\n\r\n\d+/);
    expect(cuerpo).toMatch(/name="t_luz_b_ms"\r\n\r\n\d+/);
    await expect(page.getByTestId('status-done')).toBeVisible();
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
  const CLASES = ['AttackA', 'AttackB', 'ContrattackA', 'ContrattackB', 'RiposteA', 'RiposteB'];
  const enviar = (page: Page) => page.getByTestId('veredicto-enviar');

  test('sin preselección: 6 clases, la sugerida marcada, ninguna elegida, sin pregunta ni envío', async ({ page }) => {
    await mockClip(page);
    const cuerpos = await mockVeredicto(page);
    await analizarClip(page);

    for (const clase of CLASES) {
      await expect(page.getByTestId(`clase-${clase}`)).toBeVisible();
      await expect(page.getByTestId(`clase-${clase}`)).not.toHaveAttribute('aria-selected', 'true');
    }
    await expect(page.getByTestId('clase-AttackA')).toContainText('Sugerencia del sistema');
    await expect(page.getByTestId('selector-clase')).toContainText('Sugerencia del sistema');
    await expect(page.getByTestId('selector-clase').getByText('Sugerencia del sistema')).toHaveCount(1);
    await expect(page.getByTestId('pregunta-cambia')).toHaveCount(0);
    await expect(page.getByTestId('resumen-decision')).toHaveCount(0);
    await expect(enviar(page)).toHaveAttribute('aria-disabled', 'true');
    await expect(page.getByTestId('veredicto-mantener')).toHaveCount(0);
    expect(cuerpos).toHaveLength(0);
  });

  test('el envío queda bloqueado mientras falte la clase o la respuesta', async ({ page }) => {
    await mockClip(page);
    const cuerpos = await mockVeredicto(page);
    await analizarClip(page);

    await expect(page.getByTestId('decision-falta')).toContainText('elegir la clase final o anular');
    await expect(enviar(page)).toHaveAttribute('aria-disabled', 'true');

    // Con clase, pero sin responder la pregunta: la pregunta no tiene respuesta por defecto.
    await page.getByTestId('clase-AttackA').click();
    await expect(page.getByTestId('pregunta-cambia')).toContainText('¿Cambia la decisión original en pista?');
    await expect(page.getByTestId('cambia-si')).not.toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('cambia-no')).not.toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('decision-falta')).toContainText('responder si cambia');
    await expect(page.getByTestId('resumen-decision')).toHaveCount(0);
    await expect(enviar(page)).toHaveAttribute('aria-disabled', 'true');
    await enviar(page).click({ force: true });
    expect(cuerpos).toHaveLength(0);

    await page.getByTestId('cambia-no').click();
    await expect(enviar(page)).not.toHaveAttribute('aria-disabled', 'true');
    expect(cuerpos).toHaveLength(0); // elegir no envía: falta confirmar
  });

  test('anular: sin clase ni pregunta, resumen y envío sin clase_final', async ({ page }) => {
    await mockClip(page);
    const cuerpos = await mockVeredicto(page);
    await analizarClip(page);
    await page.getByTestId('veredicto-anular').click();
    await expect(page.getByTestId('pregunta-cambia')).toHaveCount(0);
    await expect(page.getByTestId('resumen-decision')).toContainText('Anula la acción · sin clase final');
    expect(cuerpos).toHaveLength(0);

    await enviar(page).click();
    await expect(page.getByTestId('veredicto-confirmado')).toContainText('Anula');
    expect(cuerpos).toEqual([{ decision: 'anular', arbitro_id: ARBITRO_ID }]);
    await expect(page.getByTestId('selector-clase')).toHaveCount(0);
  });

  test('mantener con una clase distinta de la sugerida: clase_final es la elegida, no la sugerida', async ({ page }) => {
    await mockClip(page);
    const cuerpos = await mockVeredicto(page);
    await analizarClip(page);
    await page.getByTestId('clase-RiposteB').click();
    await page.getByTestId('cambia-no').click();
    await expect(page.getByTestId('resumen-decision')).toContainText('Mantiene la decisión en pista · clase final: Riposte · B · VER');

    await enviar(page).click();
    await expect(page.getByTestId('veredicto-confirmado')).toContainText('Mantiene · Riposte · B · VER');
    expect(cuerpos).toEqual([{ decision: 'mantener', clase_final: 'RiposteB', arbitro_id: ARBITRO_ID }]);
  });

  test('cambiar: la respuesta Sí registra cambiar con la clase elegida', async ({ page }) => {
    await mockClip(page);
    const cuerpos = await mockVeredicto(page);
    await analizarClip(page);
    await page.getByTestId('clase-ContrattackB').click();
    await page.getByTestId('cambia-si').click();
    await expect(page.getByTestId('resumen-decision')).toContainText('Cambia la decisión en pista · clase final: Contraataque · B · VER');

    await enviar(page).click();
    await expect(page.getByTestId('veredicto-confirmado')).toContainText('Cambia · Contraataque · B · VER');
    expect(cuerpos).toEqual([{ decision: 'cambiar', clase_final: 'ContrattackB', arbitro_id: ARBITRO_ID }]);
    await expect(page.getByTestId('selector-clase')).toHaveCount(0);
  });

  test('elegir anular tras una clase descarta la clase; Esc borra la elección', async ({ page }) => {
    await mockClip(page);
    const cuerpos = await mockVeredicto(page);
    await analizarClip(page);
    await page.getByTestId('clase-AttackB').click();
    await page.getByTestId('cambia-si').click();
    await page.keyboard.press('a');
    await expect(page.getByTestId('pregunta-cambia')).toHaveCount(0);
    await expect(page.getByTestId('resumen-decision')).toContainText('Anula');
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('resumen-decision')).toHaveCount(0);
    await expect(enviar(page)).toHaveAttribute('aria-disabled', 'true');
    expect(cuerpos).toHaveLength(0);
  });

  test('un clip nuevo no hereda la elección del clip anterior', async ({ page }) => {
    await mockClip(page);
    const cuerpos = await mockVeredicto(page);
    await analizarClip(page);
    await page.getByTestId('clase-AttackA').click();
    await page.getByTestId('cambia-no').click();
    await enviar(page).click();
    await expect(page.getByTestId('veredicto-confirmado')).toBeVisible();

    // Segundo clip: la sugerencia es otra y la decisión debe empezar en blanco.
    await mockClip(page, { ...CLIP_OK, fencer: 'VER', action: 'ContrattackB', confidence: 0.55 });
    await analizarClip(page);
    await expect(page.getByTestId('action-label')).toHaveText('Contraataque');
    for (const clase of CLASES) {
      await expect(page.getByTestId(`clase-${clase}`)).not.toHaveAttribute('aria-selected', 'true');
    }
    await expect(page.getByTestId('pregunta-cambia')).toHaveCount(0);
    await expect(page.getByTestId('resumen-decision')).toHaveCount(0);
    await expect(enviar(page)).toHaveAttribute('aria-disabled', 'true');
    expect(cuerpos).toEqual([{ decision: 'mantener', clase_final: 'AttackA', arbitro_id: ARBITRO_ID }]);
  });

  test('si el Fog rechaza el veredicto lo dice y permite volver a confirmar', async ({ page }) => {
    await mockClip(page);
    await mockVeredicto(page, 409);
    await analizarClip(page);
    await page.getByTestId('clase-AttackA').click();
    await page.getByTestId('cambia-no').click();
    await enviar(page).click();
    await expect(page.getByTestId('veredicto-error')).toContainText('ya tiene un veredicto');
    await expect(page.getByTestId('veredicto-confirmado')).toHaveCount(0);
    await expect(enviar(page)).not.toHaveAttribute('aria-disabled', 'true');
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

  test('sin sugerencia el selector sigue disponible y ninguna clase lleva la marca', async ({ page }) => {
    await mockClip(page, NO_DISPONIBLE);
    const cuerpos = await mockVeredicto(page);
    await analizarClip(page);
    await expect(page.getByTestId('selector-clase')).not.toContainText('Sugerencia del sistema');
    await page.getByTestId('clase-RiposteA').click();
    await page.getByTestId('cambia-si').click();
    await page.getByTestId('veredicto-enviar').click();
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
    await expect(page.getByTestId('selector-clase')).toHaveCount(0);
    await expect(page.getByTestId('veredicto-enviar')).toHaveCount(0);
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
