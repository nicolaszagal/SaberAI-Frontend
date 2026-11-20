import { test, expect, type Page } from '@playwright/test';
import {
  mockApi, configurarCombate, mockClip, analizarClip, mockPose, mockRazonamiento, leerPose, leerRazonamiento,
  REVISION_ID, type EstadoFixtureRazonamiento,
} from './helpers';

/**
 * UX01 · Una sola vista de interpretación: trazos y razonamiento a la vez. Cubre la apertura (I, T, J),
 * el enlace evento ↔ barra, el foco, la independencia de las dos cargas, las dos disposiciones,
 * el Historial y que abrirla o cerrarla no toque la elección del árbitro (RNF-01, P-008).
 */

const POSE = { body: leerPose('pose_real') };
const raz = (estado: EstadoFixtureRazonamiento) => ({ body: leerRazonamiento(estado) });
const FALLA = { status: 500, body: { detail: 'falla' } };

/** Combate configurado en Revisión VAR, con pose y razonamiento simulados y una revisión analizada. */
async function conRevision(
  page: Page,
  { pose = POSE, razonamiento = raz('respaldada') }: { pose?: typeof POSE | typeof FALLA; razonamiento?: typeof FALLA | ReturnType<typeof raz> } = {},
) {
  await mockApi(page);
  await configurarCombate(page);
  await page.getByTestId('nav-live').click();
  const p = await mockPose(page, pose);
  const r = await mockRazonamiento(page, razonamiento);
  await mockClip(page);
  await analizarClip(page);
  await expect(page.getByTestId('status-done')).toBeVisible();
  return { pose: p, razonamiento: r };
}

const vista = (page: Page) => page.getByTestId('vista-interpretacion');
const frame = (page: Page) => page.getByTestId('trazos-frame');

test.describe('apertura: I, T y J abren la misma vista', () => {
  for (const [tecla, seccion] of [['i', 'seccion-trazos'], ['t', 'seccion-trazos'], ['j', 'seccion-razonamiento']] as const) {
    test(`${tecla.toUpperCase()} abre la vista con el foco en ${seccion}`, async ({ page }) => {
      await conRevision(page);
      await page.keyboard.press(tecla);
      await expect(vista(page)).toBeVisible();
      await expect(page.getByTestId('trazos-lienzo')).toBeVisible();
      await expect(page.getByTestId('razonamiento-estado')).toBeVisible();
      await expect(page.getByTestId(seccion)).toBeFocused();
      await expect(page.getByTestId('vista-interpretacion')).toHaveCount(1);
    });
  }

  test('el botón "Ver interpretación" muestra el atajo I y no quedan los botones de los dos modales', async ({ page }) => {
    await conRevision(page);
    await expect(page.getByTestId('ver-interpretacion-btn')).toContainText('Ver interpretación');
    await expect(page.getByTestId('ver-interpretacion-btn')).toContainText('I');
    await expect(page.getByTestId('ver-trazos-btn')).toHaveCount(0);
    await expect(page.getByTestId('ver-razonamiento-btn')).toHaveCount(0);
  });

  test('sin revisión el botón está deshabilitado y I, T y J no abren nada', async ({ page }) => {
    await mockApi(page);
    await configurarCombate(page);
    await page.getByTestId('nav-live').click();
    await expect(page.getByTestId('ver-interpretacion-btn')).toHaveAttribute('aria-disabled', 'true');
    for (const t of ['i', 't', 'j']) await page.keyboard.press(t);
    await expect(vista(page)).toHaveCount(0);
  });
});

test.describe('eventos: mueven el cursor en el lugar, sin cerrar ni abrir nada', () => {
  test('pulsar un evento lleva el cursor a su frame y la vista sigue abierta', async ({ page }) => {
    await conRevision(page);
    await page.keyboard.press('j');
    const eventos = page.getByTestId('razonamiento-evento');
    await eventos.nth(0).click(); // A: frame 7
    await expect(frame(page)).toContainText('Frame 7 de 39');
    await expect(vista(page)).toBeVisible();
    await expect(page.getByTestId('razonamiento-estado')).toBeVisible();
    await eventos.nth(1).click(); // B: frame 11
    await expect(frame(page)).toContainText('Frame 11 de 39');
    await expect(vista(page)).toHaveCount(1);
    await expect(page.getByTestId('razonamiento-estado')).toBeVisible();
  });

  test('el evento y su marca de la barra quedan enlazados en los dos sentidos', async ({ page }) => {
    await conRevision(page);
    await page.keyboard.press('i');
    const eventos = page.getByTestId('razonamiento-evento');
    const marcas = page.getByTestId('marca-evento');
    await expect(marcas).toHaveCount(3);
    for (const l of [eventos, marcas]) await expect(l.locator('visible=true')).toHaveCount(3);

    // lista → barra
    await eventos.nth(1).click();
    await expect(eventos.nth(1)).toHaveAttribute('aria-pressed', 'true');
    await expect(marcas.nth(1)).toHaveAttribute('aria-pressed', 'true');
    await expect(marcas.nth(0)).toHaveAttribute('aria-pressed', 'false');
    await expect(eventos.nth(1)).toContainText('Mostrado en los trazos');
    await expect(eventos.nth(0)).toContainText('Ver en trazos');

    // barra → lista, y el cursor va al frame de la marca
    await marcas.nth(0).click();
    await expect(eventos.nth(0)).toHaveAttribute('aria-pressed', 'true');
    await expect(eventos.nth(1)).toHaveAttribute('aria-pressed', 'false');
    await expect(marcas.nth(0)).toHaveAttribute('aria-pressed', 'true');
    await expect(frame(page)).toContainText('Frame 7 de 39');
    await expect(vista(page)).toBeVisible();
  });

  test('el cursor queda sobre la marca del evento elegido', async ({ page }) => {
    await conRevision(page);
    await page.keyboard.press('i');
    await page.getByTestId('razonamiento-evento').nth(1).click();
    await expect(frame(page)).toContainText('Frame 11 de 39');
    const cursor = (await page.getByTestId('cursor-trazos').boundingBox())!;
    const marca = (await page.getByTestId('marca-evento').nth(1).boundingBox())!;
    expect(Math.abs(cursor.x + cursor.width / 2 - (marca.x + marca.width / 2))).toBeLessThan(4);
  });

  test('volver a pulsar un evento después de mover el cursor a mano lo devuelve a su frame', async ({ page }) => {
    await conRevision(page);
    await page.keyboard.press('i');
    const evento = page.getByTestId('razonamiento-evento').nth(1);
    await evento.click();
    await expect(frame(page)).toContainText('Frame 11 de 39');
    await page.keyboard.press('.');
    await expect(frame(page)).toContainText('Frame 12 de 39');
    await expect(evento).toHaveAttribute('aria-pressed', 'false'); // moverlo a mano suelta el resaltado
    await evento.click();
    await expect(frame(page)).toContainText('Frame 11 de 39');
    await expect(evento).toHaveAttribute('aria-pressed', 'true');
  });

  test('un evento censurado lleva el cursor al primer frame', async ({ page }) => {
    await conRevision(page, { razonamiento: raz('censurado') });
    await page.keyboard.press('i');
    const evento = page.getByTestId('razonamiento-evento').nth(0);
    await expect(evento.getByTestId('razonamiento-evento-tiempo')).toHaveText('antes del inicio del clip');
    await page.getByTestId('trazos-next').click(); // el cursor sale del frame 0 y del tocado
    await evento.click();
    await expect(frame(page)).toContainText('Frame 0 de 39');
    await expect(evento).toHaveAttribute('aria-pressed', 'true');
    await expect(vista(page)).toBeVisible();
  });
});

test.describe('cada parte falla por su cuenta', () => {
  test('si la pose falla, el razonamiento se ve igual y el aviso está en el panel de trazos', async ({ page }) => {
    await conRevision(page, { pose: FALLA });
    await page.keyboard.press('i');
    await expect(page.getByTestId('trazos-error')).toBeVisible();
    await expect(page.getByTestId('seccion-trazos').getByTestId('trazos-error')).toContainText('No se pudieron cargar los trazos');
    await expect(page.getByTestId('razonamiento-estado')).toBeVisible();
    await expect(page.getByTestId('razonamiento-frase').first()).toBeVisible();
    await expect(page.getByTestId('razonamiento-error')).toHaveCount(0);
    // sin trazos no hay a dónde llevar el cursor: los eventos no se ofrecen como pulsables
    await expect(page.getByTestId('razonamiento-evento').first()).toBeDisabled();
    await expect(page.getByTestId('ver-en-trazos')).toHaveCount(0);
  });

  test('si el razonamiento falla, los trazos se ven igual y el aviso está en su panel', async ({ page }) => {
    await conRevision(page, { razonamiento: FALLA });
    await page.keyboard.press('i');
    await expect(page.getByTestId('seccion-razonamiento').getByTestId('razonamiento-error')).toContainText('No se pudo cargar el razonamiento');
    await expect(page.getByTestId('trazos-lienzo')).toBeVisible();
    await expect(page.getByTestId('trazos-error')).toHaveCount(0);
    await page.getByTestId('trazos-next').click();
    await expect(page.getByTestId('resumen-razonamiento')).toHaveCount(0); // sin dato no se muestra nada
  });

  test('los 409 de las dos partes conservan sus mensajes', async ({ page }) => {
    const c409 = { status: 409, body: { detail: 'x', codigo: 'sin_clasificacion' } };
    await conRevision(page, { pose: c409, razonamiento: c409 });
    await page.keyboard.press('i');
    await expect(page.getByTestId('trazos-409')).toContainText('aún no tiene una clasificación registrada');
    await expect(page.getByTestId('razonamiento-409')).toContainText('aún no tiene una clasificación registrada');
  });

  test('reintentar una parte no repite la otra', async ({ page }) => {
    const { pose, razonamiento } = await conRevision(page, { pose: FALLA });
    await page.keyboard.press('i');
    await page.getByTestId('trazos-error').getByRole('button', { name: /Reintentar/ }).click();
    await expect.poll(pose.peticiones).toBe(2);
    expect(razonamiento.peticiones()).toBe(1);
  });
});

test.describe('precarga y resumen en el Paso 2', () => {
  test('al terminar el análisis se piden la pose y el razonamiento sin abrir nada', async ({ page }) => {
    const { pose, razonamiento } = await conRevision(page);
    await expect.poll(pose.peticiones).toBe(1);
    await expect.poll(razonamiento.peticiones).toBe(1);
    await expect(vista(page)).toHaveCount(0);
    await page.keyboard.press('i');
    await expect(page.getByTestId('trazos-lienzo')).toBeVisible();
    await expect(page.getByTestId('trazos-cargando')).toHaveCount(0);
    expect(pose.peticiones()).toBe(1);
    expect(razonamiento.peticiones()).toBe(1);
  });

  test('bajo la sugerencia hay una línea con la insignia del estado y la primera frase, sin abrir la vista', async ({ page }) => {
    await conRevision(page);
    const fx = leerRazonamiento('respaldada');
    await expect(page.getByTestId('resumen-razonamiento-estado')).toHaveText('Respaldada por la pose');
    await expect(page.getByTestId('resumen-razonamiento-frase')).toHaveText(fx.frases![0]);
    await expect(vista(page)).toHaveCount(0);
    // va bajo la tarjeta de la sugerencia, dentro del Paso 2
    const resumen = (await page.getByTestId('resumen-razonamiento').boundingBox())!;
    const tarjeta = (await page.getByTestId('confidence-bar').boundingBox())!;
    expect(resumen.y).toBeGreaterThan(tarjeta.y);
    await expect(page.getByTestId('paso-sugerencia').getByTestId('resumen-razonamiento')).toBeVisible();
  });

  for (const estado of ['no_registrado', 'no_calculado'] as const) {
    test(`con ${estado} no hay resumen: no se inventa evidencia`, async ({ page }) => {
      await conRevision(page, { razonamiento: raz(estado) });
      await page.getByTestId('ver-interpretacion-btn').click();
      await expect(page.getByTestId('razonamiento-' + estado.replace('_', '-'))).toBeVisible();
      await expect(page.getByTestId('resumen-razonamiento')).toHaveCount(0);
    });
  }

  test('el texto de la línea es el del Fog, sin reescribir, con el estado discordante', async ({ page }) => {
    const fx = leerRazonamiento('discordante');
    await conRevision(page, { razonamiento: { body: fx } });
    await expect(page.getByTestId('resumen-razonamiento-estado')).toHaveText('Evidencia discordante');
    await expect(page.getByTestId('resumen-razonamiento-frase')).toHaveText(fx.frases![0]);
  });
});

test.describe('un solo cierre y el foco vuelve al Paso 3', () => {
  test('Esc cierra la vista y el foco vuelve al Paso 3 (Decisión)', async ({ page }) => {
    await conRevision(page);
    await page.keyboard.press('i');
    await expect(vista(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(vista(page)).toHaveCount(0);
    await expect(page.getByTestId('paso-decision')).toBeFocused();
  });

  test('el botón Cerrar hace lo mismo y es el único cierre', async ({ page }) => {
    await conRevision(page);
    await page.keyboard.press('j');
    await expect(page.getByTestId('interpretacion-cerrar')).toHaveCount(1);
    await page.getByTestId('interpretacion-cerrar').click();
    await expect(vista(page)).toHaveCount(0);
    await expect(page.getByTestId('paso-decision')).toBeFocused();
  });

  test('tras cerrar, I vuelve a abrirla con los trazos en el tocado', async ({ page }) => {
    await conRevision(page);
    await page.keyboard.press('i');
    await page.getByTestId('razonamiento-evento').nth(1).click();
    await page.keyboard.press('Escape');
    await page.keyboard.press('i');
    await expect(frame(page)).toContainText('Frame 20 de 39');
    await expect(page.getByTestId('razonamiento-evento').nth(1)).toHaveAttribute('aria-pressed', 'false');
  });
});

test.describe('la decisión es del árbitro (RNF-01, P-008)', () => {
  test('abrir, recorrer eventos y cerrar (Esc y Cerrar) no cambia la elección ni registra veredicto', async ({ page }) => {
    let veredictos = 0;
    await page.route(`**/revisiones/${REVISION_ID}/veredicto`, route => { veredictos += 1; return route.abort(); });
    await conRevision(page);
    await page.getByTestId('modifica-si').click();
    await page.getByTestId('clase-AttackB').click();
    const resumen = page.getByTestId('resumen-decision');
    const antes = (await resumen.textContent())!;
    expect(antes).toContain('Cambia la decisión en pista · clase final: Ataque · B · VER');

    for (const [abrir, cerrar] of [['i', 'esc'], ['t', 'boton'], ['j', 'esc']] as const) {
      await page.keyboard.press(abrir);
      await expect(vista(page)).toBeVisible();
      await page.getByTestId('razonamiento-evento').nth(0).click();
      await page.getByTestId('marca-evento').nth(1).click();
      await page.keyboard.press('a'); // atajo del fondo: la vista abierta lo silencia
      await page.keyboard.press('.');
      if (cerrar === 'esc') await page.keyboard.press('Escape');
      else await page.getByTestId('interpretacion-cerrar').click();
      await expect(vista(page)).toHaveCount(0);
      await expect(resumen).toHaveText(antes);
    }
    expect(veredictos).toBe(0);
    await expect(page.getByTestId('veredicto-enviar')).not.toHaveAttribute('aria-disabled', 'true');
  });

  test('la nota fija "La decisión es del árbitro" está en la cabecera y al pie del razonamiento', async ({ page }) => {
    await conRevision(page);
    await page.keyboard.press('i');
    await expect(vista(page)).toContainText('Apoyo a la sugerencia: la decisión es del árbitro.');
    await expect(page.getByTestId('razonamiento-nota')).toHaveText(
      'Los eventos se miden sobre la pose y el artículo FIE es la referencia de la clase sugerida. La decisión es del árbitro.');
  });
});

test.describe('disposición', () => {
  test.describe('pantalla ancha (1280 × 800)', () => {
    test.use({ viewport: { width: 1280, height: 800 } });
    test('trazos a la izquierda (~60 %, negro) y razonamiento a la derecha (~40 %, con scroll propio)', async ({ page }) => {
      await conRevision(page);
      await page.keyboard.press('i');
      await expect(page.getByTestId('interpretacion-ancha')).toBeVisible();
      const t = (await page.getByTestId('seccion-trazos').boundingBox())!;
      const r = (await page.getByTestId('interpretacion-scroll').boundingBox())!;
      expect(r.x).toBeGreaterThanOrEqual(t.x + t.width - 2);
      expect(Math.abs(t.y - r.y)).toBeLessThan(2);
      const proporcion = t.width / (t.width + r.width);
      expect(proporcion).toBeGreaterThan(0.55);
      expect(proporcion).toBeLessThan(0.65);
      expect(await page.getByTestId('seccion-trazos').evaluate(e => getComputedStyle(e).backgroundColor)).toBe('rgb(0, 0, 0)');
      const overflow = await page.getByTestId('interpretacion-scroll').evaluate(e => getComputedStyle(e).overflowY);
      expect(['auto', 'scroll']).toContain(overflow);
    });
  });

  test.describe('pantalla angosta (600 × 900)', () => {
    test.use({ viewport: { width: 600, height: 900 } });
    test('trazos arriba y razonamiento debajo, sin modal anidado, y los eventos siguen moviendo el cursor', async ({ page }) => {
      await conRevision(page);
      await page.keyboard.press('i');
      await expect(page.getByTestId('interpretacion-angosta')).toBeVisible();
      await expect(page.getByTestId('interpretacion-ancha')).toHaveCount(0);
      const t = (await page.getByTestId('seccion-trazos').boundingBox())!;
      const r = (await page.getByTestId('seccion-razonamiento').boundingBox())!;
      expect(r.y).toBeGreaterThanOrEqual(t.y + t.height - 2);
      expect(Math.abs(t.x - r.x)).toBeLessThan(2);
      await expect(page.locator('[aria-modal="true"]')).toHaveCount(1);
      await page.getByTestId('razonamiento-evento').nth(1).click();
      await expect(frame(page)).toContainText('Frame 11 de 39');
      await expect(vista(page)).toHaveCount(1);
    });

    test('J abre la vista con el razonamiento a la vista', async ({ page }) => {
      await conRevision(page);
      await page.keyboard.press('j');
      await expect(page.getByTestId('seccion-razonamiento')).toBeFocused();
      await expect(page.getByTestId('razonamiento-estado')).toBeInViewport();
    });
  });
});

test.describe('contraste de la insignia del resumen', () => {
  const rgb = (c: string) => (c.match(/\d+(\.\d+)?/g) ?? []).slice(0, 3).map(Number);
  const lum = ([r, g, b]: number[]) => {
    const f = (v: number) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const contraste = (a: string, b: string) => {
    const [l1, l2] = [lum(rgb(a)), lum(rgb(b))].sort((x, y) => y - x);
    return (l1 + 0.05) / (l2 + 0.05);
  };
  for (const estado of ['respaldada', 'discordante', 'no_concluyente', 'insuficiente'] as const) {
    test(`${estado}: texto con contraste AA en el tema claro y el oscuro`, async ({ page }) => {
      await conRevision(page, { razonamiento: raz(estado) });
      for (const tema of ['actual', 'alterno']) {
        if (tema === 'alterno') await page.getByTestId('theme-toggle').click();
        const { texto, fondo } = await page.getByTestId('resumen-razonamiento-estado').evaluate(el => ({
          texto: getComputedStyle(el.firstElementChild as Element).color,
          fondo: getComputedStyle(el).backgroundColor,
        }));
        expect(contraste(texto, fondo), `${estado} (${tema})`).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
});

test.describe('historial (CU-12): la misma vista', () => {
  const DETALLE = {
    id: REVISION_ID, abierta_en: '2026-10-05T15:00:00Z', cerrada_en: null,
    sugerencia: { disponible: true, motivo_no_disp: null, clase: 'AttackA', tirador: 'A', confianza: 0.9 },
    probabilidades: null, decision: null, clase_final: null, registrado_en: null, auditoria_seq: null, auditoria_hash: null,
  };

  async function enHistorial(page: Page) {
    await mockApi(page, {
      revisiones: [{ id: REVISION_ID, abierta_en: '2026-10-05T15:00:00Z', disponible: true, clase: 'AttackA', confianza: 0.9, decision: null, clase_final: null }],
      detalles: { [REVISION_ID]: DETALLE },
    });
    const pose = await mockPose(page, POSE);
    const razonamiento = await mockRazonamiento(page, raz('respaldada'));
    await page.getByTestId('nav-history').click();
    await page.getByTestId('revision-row').click();
    await expect(page.getByTestId('revision-detalle')).toBeVisible();
    return { pose, razonamiento };
  }

  test.beforeEach(async ({ page }) => {
    await mockApi(page);
    await configurarCombate(page);
  });

  test('el botón abre la vista con trazos y razonamiento; pide los datos al abrir, una vez', async ({ page }) => {
    const { pose, razonamiento } = await enHistorial(page);
    expect(pose.peticiones()).toBe(0);
    expect(razonamiento.peticiones()).toBe(0);
    await page.getByTestId('ver-interpretacion-btn').click();
    await expect(vista(page)).toBeVisible();
    await expect(page.getByTestId('trazos-lienzo')).toBeVisible();
    await expect(page.getByTestId('razonamiento-estado')).toHaveText('Respaldada por la pose');
    await page.getByTestId('razonamiento-evento').nth(0).click();
    await expect(frame(page)).toContainText('Frame 7 de 39');
    await page.keyboard.press('Escape');
    await page.keyboard.press('i');
    await expect(vista(page)).toBeVisible();
    expect(pose.peticiones()).toBe(1);
    expect(razonamiento.peticiones()).toBe(1);
  });

  test('I, T y J abren la vista; Esc devuelve el foco a la fila de la revisión', async ({ page }) => {
    await enHistorial(page);
    for (const [tecla, seccion] of [['i', 'seccion-trazos'], ['t', 'seccion-trazos'], ['j', 'seccion-razonamiento']] as const) {
      await page.keyboard.press(tecla);
      await expect(vista(page)).toBeVisible();
      await expect(page.getByTestId(seccion)).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(vista(page)).toHaveCount(0);
      await expect(page.getByTestId('revision-row')).toBeFocused();
    }
  });
});

test.describe('medición para la memoria: ver los trazos del evento 1, del 2 y volver a decidir', () => {
  test('después: 4 interacciones (antes, en main: 6)', async ({ page }) => {
    await conRevision(page);
    const pasos: string[] = [];
    await page.keyboard.press('i'); pasos.push('I abre la vista');
    await page.getByTestId('razonamiento-evento').nth(0).click(); pasos.push('clic evento 1');
    await expect(frame(page)).toContainText('Frame 7 de 39');
    await page.getByTestId('razonamiento-evento').nth(1).click(); pasos.push('clic evento 2');
    await expect(frame(page)).toContainText('Frame 11 de 39');
    await page.keyboard.press('Escape'); pasos.push('Esc cierra');
    await expect(page.getByTestId('paso-decision')).toBeFocused(); // ya se puede decidir
    console.log('MEDICION_DESPUES', pasos.length, JSON.stringify(pasos));
    expect(pasos).toHaveLength(4);
  });
});

test.describe('capturas para la memoria (CAPTURAS=1)', () => {
  test.skip(!process.env.CAPTURAS, 'Definir CAPTURAS=1 para generar las capturas');
  for (const [nombre, width, height] of [['ancha', 1280, 800], ['angosta', 600, 900]] as const) {
    test(`vista de interpretación, pantalla ${nombre}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await conRevision(page);
      await page.keyboard.press('i');
      await expect(page.getByTestId('trazos-lienzo')).toBeVisible();
      await page.getByTestId('razonamiento-evento').nth(1).click();
      await expect(frame(page)).toContainText('Frame 11 de 39');
      await page.screenshot({ path: `docs/evidencia/ux/interpretacion-${nombre}-${width}x${height}.png` });
    });
  }
});
