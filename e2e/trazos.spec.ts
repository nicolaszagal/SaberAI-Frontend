import { test, expect, type Page } from '@playwright/test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { mockApi, configurarCombate, mockClip, analizarClip, mockPose, leerPose, REVISION_ID } from './helpers';

const REAL = leerPose('pose_real');
const DESFASADA = leerPose('pose_frame_inicio');
const SIN_TRAZOS = leerPose('pose_sin_trazos');
const OK = { body: REAL };

/** Frame del tocado en los arreglos de una pose. */
const tocadoDe = (p: typeof REAL) => p.frame_tocado - p.frame_inicio;

async function conRevision(page: Page) {
  await mockClip(page);
  await page.getByTestId('file-input').setInputFiles('e2e/fixtures/dummy.mp4');
  await analizarClip(page);
  await expect(page.getByTestId('status-done')).toBeVisible();
}

async function abrir(page: Page) {
  await page.getByTestId('ver-trazos-btn').click();
  await expect(page.getByTestId('modal-trazos')).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await mockApi(page);
  await configurarCombate(page);
  await page.getByTestId('nav-live').click();
});

test.describe('apertura y carga bajo demanda', () => {
  test('sin revisión el botón está deshabilitado', async ({ page }) => {
    await expect(page.getByTestId('ver-trazos-btn')).toHaveAttribute('aria-disabled', 'true');
  });

  test('con revisión abre el modal y pide la pose una sola vez, aunque se reabra', async ({ page }) => {
    const pose = await mockPose(page, OK);
    await conRevision(page);
    await expect(page.getByTestId('ver-trazos-btn')).not.toHaveAttribute('aria-disabled', 'true');
    expect(pose.peticiones()).toBe(0); // bajo demanda: nada se pide al analizar
    await abrir(page);
    await expect(page.getByTestId('trazos-lienzo')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('modal-trazos')).toHaveCount(0);
    await abrir(page);
    await expect(page.getByTestId('trazos-lienzo')).toBeVisible();
    expect(pose.peticiones()).toBe(1);
  });

  test('el atajo T abre el modal', async ({ page }) => {
    await mockPose(page, OK);
    await conRevision(page);
    await page.keyboard.press('t');
    await expect(page.getByTestId('modal-trazos')).toBeVisible();
  });
});

test.describe('dibujo', () => {
  test('lienzo negro, dos esqueletos con su etiqueta y el ángulo del brazo armado', async ({ page }) => {
    await mockPose(page, OK);
    await conRevision(page);
    await abrir(page);
    await expect(page.getByTestId('trazos-lienzo')).toBeVisible();

    expect(await page.getByTestId('modal-trazos').evaluate(e => getComputedStyle(e).backgroundColor)).toBe('rgb(0, 0, 0)');
    expect(await page.getByTestId('trazos-lienzo').locator('rect').first().getAttribute('fill')).toBe('#000000');
    await expect(page.getByTestId('modal-trazos').locator('video')).toHaveCount(0);

    await expect(page.getByTestId('esqueleto-A')).toHaveCount(1);
    await expect(page.getByTestId('esqueleto-B')).toHaveCount(1);
    await expect(page.getByTestId('etiqueta-A')).toHaveText('A · ROJ');
    await expect(page.getByTestId('etiqueta-B')).toHaveText('B · VER');
    // Se muestra el ángulo que envía Fog para ese frame, sin recalcularlo.
    const i = tocadoDe(REAL);
    const esperado = (a: number) => `${a.toFixed(1).replace('.', ',')}°`;
    await expect(page.getByTestId('angulo-A')).toHaveText(esperado(REAL.tiradores!.A.angulo_codo[i]!));
    await expect(page.getByTestId('angulo-B')).toHaveText(esperado(REAL.tiradores!.B.angulo_codo[i]!));
    await expect(page.getByTestId('brazo-A')).toHaveCount(2);
  });

  test('el SVG usa el tamaño del frame como viewBox sin deformar la escena', async ({ page }) => {
    await mockPose(page, OK);
    await conRevision(page);
    await abrir(page);
    const svg = page.getByTestId('trazos-lienzo');
    await expect(svg).toHaveAttribute('viewBox', `0 0 ${REAL.frame_w} ${REAL.frame_h}`);
    await expect(svg).toHaveAttribute('preserveAspectRatio', 'xMidYMid meet');
  });

  test('un keypoint con conf < conf_min_keypoint no se dibuja', async ({ page }) => {
    await mockPose(page, OK);
    await conRevision(page);
    await abrir(page);
    const i = tocadoDe(REAL);
    const A = REAL.tiradores!.A;
    const bajos = A.conf[i].map((c, kp) => [c, kp]).filter(([c]) => c < REAL.conf_min_keypoint).map(([, kp]) => kp);
    const altos = A.conf[i].map((c, kp) => [c, kp]).filter(([c]) => c >= REAL.conf_min_keypoint).map(([, kp]) => kp);
    expect(bajos.length).toBeGreaterThan(0); // el fixture real tiene keypoints bajo el umbral en este frame
    for (const kp of bajos) await expect(page.getByTestId(`kp-A-${kp}`)).toHaveCount(0);
    for (const kp of altos) await expect(page.getByTestId(`kp-A-${kp}`)).toHaveCount(1);
  });

  test('con detectado=false para B, B no se dibuja y la barra marca detección incompleta', async ({ page }) => {
    await mockPose(page, OK);
    await conRevision(page);
    await abrir(page);
    const sinB = REAL.tiradores!.B.detectado.findIndex(d => !d);
    expect(sinB).toBeGreaterThan(tocadoDe(REAL));
    await expect(page.getByTestId('tramo-incompleto').first()).toHaveAttribute('aria-label', 'Detección incompleta');
    await expect(page.getByTestId('trazos-incompleto')).toHaveCount(0);

    for (let k = tocadoDe(REAL); k < sinB; k++) await page.keyboard.press('.');
    await expect(page.getByTestId('trazos-frame')).toContainText(`Frame ${sinB} de`);
    await expect(page.getByTestId('esqueleto-B')).toHaveCount(0);
    await expect(page.getByTestId('esqueleto-A')).toHaveCount(1);
    await expect(page.getByTestId('trazos-incompleto')).toBeVisible();
    await expect(page.getByTestId('modal-trazos')).toContainText('Detección incompleta');
  });
});

test.describe('controles', () => {
  test('abre en el tocado; "." avanza un frame y "," retrocede uno', async ({ page }) => {
    await mockPose(page, OK);
    await conRevision(page);
    await abrir(page);
    const i = tocadoDe(REAL);
    const ultimo = REAL.n_frames - 1;
    await expect(page.getByTestId('trazos-frame')).toContainText(`Frame ${i} de ${ultimo}`);
    await expect(page.getByTestId('trazos-tiempo')).toHaveText('0,00 s');
    await page.keyboard.press('.');
    await expect(page.getByTestId('trazos-frame')).toContainText(`Frame ${i + 1} de ${ultimo}`);
    await expect(page.getByTestId('trazos-tiempo')).toHaveText('+0,03 s');
    await page.keyboard.press(',');
    await page.keyboard.press(',');
    await expect(page.getByTestId('trazos-frame')).toContainText(`Frame ${i - 1} de ${ultimo}`);
    await expect(page.getByTestId('trazos-tiempo')).toHaveText('-0,03 s');
    for (let k = 0; k < i + 3; k++) await page.keyboard.press(',');
    await expect(page.getByTestId('trazos-frame')).toContainText(`Frame 0 de ${ultimo}`);
    await expect(page.getByTestId('trazos-tiempo')).toHaveText('-0,67 s'); // 20 frames a 30 fps
  });

  test('con frame_inicio > 0 el marcador del tocado cae en frame_tocado - frame_inicio', async ({ page }) => {
    expect(DESFASADA.frame_inicio).toBeGreaterThan(0);
    await mockPose(page, { body: DESFASADA });
    await conRevision(page);
    await abrir(page);
    const i = tocadoDe(DESFASADA);
    const ultimo = DESFASADA.n_frames - 1;
    expect(i).not.toBe(DESFASADA.frame_tocado);
    await expect(page.getByTestId('trazos-frame')).toContainText(`Frame ${i} de ${ultimo}`);
    await expect(page.getByTestId('trazos-frame')).toContainText(`cuadro ${DESFASADA.frame_tocado} del clip`);
    await expect(page.getByTestId('trazos-tiempo')).toHaveText('0,00 s');
    await expect(page.getByTestId('marcador-tocado')).toHaveAttribute('aria-label', `Tocado, frame ${i}`);

    const barra = (await page.getByTestId('trazos-barra').boundingBox())!;
    const marca = (await page.getByTestId('marcador-tocado').boundingBox())!;
    const proporcion = (marca.x + marca.width / 2 - barra.x) / barra.width;
    expect(proporcion).toBeCloseTo(i / ultimo, 1);
    // El cursor y el marcador coinciden al abrir.
    const cursor = (await page.getByTestId('cursor-trazos').boundingBox())!;
    expect(Math.abs(cursor.x + cursor.width / 2 - (marca.x + marca.width / 2))).toBeLessThan(3);
  });

  test('reproducir avanza solo, a 0,25× es más lento, y pausa detiene', async ({ page }) => {
    await mockPose(page, OK);
    await conRevision(page);
    await abrir(page);
    const texto = async () => Number(/Frame (\d+) de/.exec(await page.getByTestId('trazos-frame').innerText())![1]);
    const i = tocadoDe(REAL);
    await page.getByTestId('trazos-play').click();
    await expect.poll(texto).toBeGreaterThan(i + 2);
    await page.getByTestId('trazos-play').click();
    const quieto = await texto();
    await page.waitForTimeout(250);
    expect(await texto()).toBe(quieto);

    await page.getByTestId('trazos-prev').click(); // vuelve a un frame fijo para medir
    await page.getByTestId('trazos-vel-0.25').click();
    const antes = await texto();
    await page.getByTestId('trazos-play').click();
    await page.waitForTimeout(600); // a 30 fps y 1× serían ~18 frames; a 0,25× ~4
    await page.getByTestId('trazos-play').click();
    expect((await texto()) - antes).toBeLessThanOrEqual(8);
  });
});

test.describe('estados', () => {
  test('n_frames 0 muestra que no hay trazos y el motivo', async ({ page }) => {
    await mockPose(page, { body: SIN_TRAZOS });
    await conRevision(page);
    await abrir(page);
    await expect(page.getByTestId('trazos-sin-pose')).toContainText('No hay trazos: la pose no se extrajo');
    await expect(page.getByTestId('trazos-sin-pose')).toContainText('No se pudo detectar a ambos tiradores');
    await expect(page.getByTestId('trazos-lienzo')).toHaveCount(0);
  });

  test('409 por revisión sin clasificación muestra su mensaje', async ({ page }) => {
    await mockPose(page, { status: 409, body: { detail: 'la revisión aún no tiene una clasificación registrada' } });
    await conRevision(page);
    await abrir(page);
    await expect(page.getByTestId('trazos-409')).toContainText('aún no tiene una clasificación registrada');
    await expect(page.getByTestId('trazos-lienzo')).toHaveCount(0);
  });

  test('409 por keypoints alterados muestra el mensaje de integridad', async ({ page }) => {
    await mockPose(page, { status: 409, body: { detail: 'keypoints alterados' } });
    await conRevision(page);
    await abrir(page);
    await expect(page.getByTestId('trazos-409')).toContainText('no pasan la verificación de integridad');
    await expect(page.getByTestId('trazos-lienzo')).toHaveCount(0);
  });

  test('un error del Fog se puede reintentar', async ({ page }) => {
    const pose = await mockPose(page, { status: 500, body: { detail: 'falla' } }, OK);
    await conRevision(page);
    await abrir(page);
    await expect(page.getByTestId('trazos-error')).toContainText('No se pudieron cargar los trazos');
    await page.getByTestId('trazos-error').getByRole('button', { name: /Reintentar/ }).click();
    await expect(page.getByTestId('trazos-lienzo')).toBeVisible();
    expect(pose.peticiones()).toBe(2);
  });

  test('mientras carga muestra el estado de carga', async ({ page }) => {
    await page.route('**/revisiones/*/pose', async route => {
      await new Promise(r => setTimeout(r, 400));
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(REAL) });
    });
    await conRevision(page);
    await abrir(page);
    await expect(page.getByTestId('trazos-cargando')).toBeVisible();
    await expect(page.getByTestId('trazos-lienzo')).toBeVisible();
  });
});

test.describe('foco, teclado y decisión intacta', () => {
  test('Esc cierra el modal, no borra la elección del árbitro y el foco vuelve al botón', async ({ page }) => {
    await mockPose(page, OK);
    await conRevision(page);
    await page.getByTestId('modifica-no').click();
    await expect(page.getByTestId('resumen-decision')).toBeVisible();

    await page.getByTestId('ver-trazos-btn').focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('modal-trazos')).toBeVisible();
    await expect(page.getByTestId('trazos-lienzo')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('modal-trazos')).toHaveCount(0);

    await expect(page.getByTestId('resumen-decision')).toBeVisible();
    await expect(page.getByTestId('resumen-decision')).toContainText('Mantiene la decisión en pista');
    await expect(page.getByTestId('decision-limpiar')).not.toHaveAttribute('aria-disabled', 'true');
    await expect(page.getByTestId('ver-trazos-btn')).toBeFocused();
  });

  test('con el modal abierto los atajos de la pantalla de fondo no responden', async ({ page }) => {
    await mockPose(page, OK);
    await conRevision(page);
    await abrir(page);
    await expect(page.getByTestId('trazos-lienzo')).toBeVisible();
    await page.keyboard.press('a'); // "Anular la acción" en la pantalla de fondo
    await expect(page.getByTestId('resumen-decision')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('modal-trazos')).toHaveCount(0);
    await expect(page.getByTestId('resumen-decision')).toHaveCount(0);
    await expect(page.getByTestId('veredicto-anular')).not.toHaveAttribute('aria-selected', 'true');
  });

  test('abrir y cerrar el modal no registra veredicto ni cambia la elección', async ({ page }) => {
    await mockPose(page, OK);
    let veredictos = 0;
    await page.route(`**/revisiones/${REVISION_ID}/veredicto`, route => { veredictos += 1; return route.abort(); });
    await conRevision(page);
    await page.getByTestId('modifica-si').click();
    await page.getByTestId('clase-AttackB').click();
    await abrir(page);
    await page.getByTestId('trazos-cerrar').click();
    await expect(page.getByTestId('modal-trazos')).toHaveCount(0);
    await expect(page.getByTestId('resumen-decision')).toContainText('Cambia la decisión en pista · clase final: Ataque · B · VER');
    expect(veredictos).toBe(0);
  });
});

test.describe('historial (CU-12)', () => {
  test('el detalle de una revisión tiene "Ver trazos" y abre el modal', async ({ page }) => {
    await mockApi(page, {
      revisiones: [{ id: REVISION_ID, abierta_en: '2026-10-05T15:00:00Z', disponible: true, clase: 'AttackA',
        confianza: 0.9, decision: null, clase_final: null }],
      detalles: { [REVISION_ID]: {
        id: REVISION_ID, abierta_en: '2026-10-05T15:00:00Z', cerrada_en: null,
        sugerencia: { disponible: true, motivo_no_disp: null, clase: 'AttackA', tirador: 'A', confianza: 0.9 },
        probabilidades: null, decision: null, clase_final: null, registrado_en: null, auditoria_seq: null, auditoria_hash: null } },
    });
    const pose = await mockPose(page, OK);
    await page.getByTestId('nav-history').click();
    await page.getByTestId('revision-row').click();
    await expect(page.getByTestId('revision-detalle')).toBeVisible();
    expect(pose.peticiones()).toBe(0);
    await page.getByTestId('ver-trazos-btn').click();
    await expect(page.getByTestId('etiqueta-A')).toHaveText('A · ROJ');
    expect(pose.peticiones()).toBe(1);
  });
});

test('no queda ningún componente con coordenadas de pose fijas en src/', () => {
  const archivos: string[] = [];
  const recorrer = (dir: string) => {
    for (const nombre of readdirSync(dir)) {
      const ruta = join(dir, nombre);
      if (statSync(ruta).isDirectory()) recorrer(ruta); else archivos.push(ruta);
    }
  };
  recorrer('src');
  expect(archivos.filter(a => /StickFigure/i.test(a))).toEqual([]);
  const huellas = /StickFigurePose|GREEN_POSE|RED_POSE|showPose/;
  expect(archivos.filter(a => huellas.test(readFileSync(a, 'utf-8')))).toEqual([]);
});
