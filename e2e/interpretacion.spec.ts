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
    await eventos.nth(1).click(); // ROJ: frame 7
    await expect(frame(page)).toContainText('Frame 7 de 39');
    await expect(vista(page)).toBeVisible();
    await expect(page.getByTestId('razonamiento-estado')).toBeVisible();
    await eventos.nth(2).click(); // VER: frame 11
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
    await eventos.nth(2).click();
    await expect(eventos.nth(2)).toHaveAttribute('aria-pressed', 'true');
    await expect(marcas.nth(2)).toHaveAttribute('aria-pressed', 'true');
    await expect(marcas.nth(1)).toHaveAttribute('aria-pressed', 'false');
    await expect(eventos.nth(2)).toContainText('Mostrado en los trazos');
    await expect(eventos.nth(1)).toContainText('Ver en trazos');

    // barra → lista, y el cursor va al frame de la marca
    await marcas.nth(1).click();
    await expect(eventos.nth(1)).toHaveAttribute('aria-pressed', 'true');
    await expect(eventos.nth(2)).toHaveAttribute('aria-pressed', 'false');
    await expect(marcas.nth(1)).toHaveAttribute('aria-pressed', 'true');
    await expect(frame(page)).toContainText('Frame 7 de 39');
    await expect(vista(page)).toBeVisible();
  });

  test('el cursor queda sobre la marca del evento elegido', async ({ page }) => {
    await conRevision(page);
    await page.keyboard.press('i');
    await page.getByTestId('razonamiento-evento').nth(2).click();
    await expect(frame(page)).toContainText('Frame 11 de 39');
    const cursor = (await page.getByTestId('cursor-trazos').boundingBox())!;
    const marca = (await page.getByTestId('marca-evento').nth(2).boundingBox())!;
    expect(Math.abs(cursor.x + cursor.width / 2 - (marca.x + marca.width / 2))).toBeLessThan(4);
  });

  test('volver a pulsar un evento después de mover el cursor a mano lo devuelve a su frame', async ({ page }) => {
    await conRevision(page);
    await page.keyboard.press('i');
    const evento = page.getByTestId('razonamiento-evento').nth(2);
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
    await page.getByTestId('razonamiento-evento').nth(2).click();
    await page.keyboard.press('Escape');
    await page.keyboard.press('i');
    await expect(frame(page)).toContainText('Frame 20 de 39');
    await expect(page.getByTestId('razonamiento-evento').nth(2)).toHaveAttribute('aria-pressed', 'false');
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
    expect(antes).toContain('Cambia la decisión en pista · clase final: Ataque · VER');

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
      await page.getByTestId('razonamiento-evento').nth(2).click();
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
    await page.getByTestId('razonamiento-evento').nth(1).click();
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

test.describe('UX01b · eventos en orden cronológico', () => {
  /** Orden esperado, calculado aparte del código de la app a partir de la fixture del Fog. */
  function ordenEsperado(estado: EstadoFixtureRazonamiento) {
    const fx = leerRazonamiento(estado);
    return fx.eventos!
      .filter(e => e.tipo !== 'tocado')
      .sort((a, b) => Number(!!b.censurado_inicio) - Number(!!a.censurado_inicio) || a.t_ms - b.t_ms)
      .map(e => (e.tipo === 'inicio_desplazamiento' ? 'acercamiento' : e.tirador === 'A' ? 'ROJ' : 'VER'));
  }
  const rotuloDeFila = (t: string) => (t.includes('acercamiento') ? 'acercamiento' : t.startsWith('ROJ') ? 'ROJ' : 'VER');

  for (const estado of ['respaldada', 'discordante', 'no_concluyente', 'censurado'] as const) {
    test(`${estado}: la lista va del evento más antiguo al más reciente y la barra sigue el mismo orden`, async ({ page }) => {
      await conRevision(page, { razonamiento: raz(estado) });
      await page.keyboard.press('i');
      const filas = await page.getByTestId('razonamiento-evento').allInnerTexts();
      expect(filas.map(rotuloDeFila)).toEqual(ordenEsperado(estado));
      // Las marcas con instante (no censuradas) salen en ese mismo orden.
      const fx = leerRazonamiento(estado);
      const sinCensurar = fx.eventos!.filter(e => e.tipo !== 'tocado' && !e.censurado_inicio)
        .sort((a, b) => a.t_ms - b.t_ms)
        .map(e => (e.tipo === 'inicio_desplazamiento' ? '↔' : e.tirador === 'A' ? 'ROJ' : 'VER'));
      await expect(page.getByTestId('etiqueta-evento')).toHaveText(sinCensurar);
    });
  }

  test('respaldada: -0,47 s, -0,43 s y -0,30 s, en ese orden', async ({ page }) => {
    await conRevision(page);
    await page.keyboard.press('i');
    await expect(page.getByTestId('razonamiento-evento-tiempo')).toHaveText(['-0,47 s del tocado', '-0,43 s del tocado', '-0,30 s del tocado']);
  });

  test('pulsar una fila lleva a su frame aunque el orden haya cambiado', async ({ page }) => {
    await conRevision(page);
    await page.keyboard.press('i');
    const filas = page.getByTestId('razonamiento-evento');
    await filas.nth(0).click(); // el acercamiento: frame 6
    await expect(frame(page)).toContainText('Frame 6 de 39');
    await expect(page.getByTestId('marca-evento').nth(0)).toHaveAttribute('aria-pressed', 'true');
  });
});

test.describe('UX01b · el tirador se nombra solo por el color', () => {
  // "A ·" o "B ·" como rótulo suelto (no el final de otra palabra): lo que mostraba "A · ROJ" y "B · VER".
  const ROTULO_VIEJO = /(^|[^\p{L}\d])[AB]\s·/u;

  /** Todo el texto visible del DOM más los `aria-label`, para no dejar rótulos viejos ocultos. */
  async function textoDelDom(page: Page): Promise<string> {
    return page.evaluate(() => {
      const labels = [...document.querySelectorAll('[aria-label]')].map(e => e.getAttribute('aria-label')).join('\n');
      return `${document.body.textContent}\n${labels}`;
    });
  }

  test('Revisión VAR (sugerencia, Paso 3 y resumen) y la vista abierta no muestran "A ·" ni "B ·"', async ({ page }) => {
    await conRevision(page);
    await page.getByTestId('modifica-si').click();
    await page.getByTestId('clase-RiposteB').click();
    await expect(page.getByTestId('resumen-decision')).toContainText('Riposte · VER');
    expect(await textoDelDom(page)).not.toMatch(ROTULO_VIEJO);
    await expect(page.getByTestId('fencer-label')).toHaveText('ROJ');
    await expect(page.getByTestId('sugerencia-decision')).toContainText('Sugerencia del sistema: Ataque · ROJ');

    await page.keyboard.press('i');
    await expect(page.getByTestId('trazos-lienzo')).toBeVisible();
    await page.getByTestId('razonamiento-evento').nth(1).click();
    expect(await textoDelDom(page)).not.toMatch(ROTULO_VIEJO);
    await expect(page.getByTestId('etiqueta-A')).toHaveText('ROJ');
    await expect(page.getByTestId('etiqueta-B')).toHaveText('VER');
    await expect(page.getByTestId('razonamiento-clase')).toHaveText('Ataque · ROJ');
    await expect(page.getByTestId('seccion-razonamiento')).toContainText('ROJ · Inicio de extensión del brazo');
    await expect(page.getByTestId('seccion-razonamiento')).toContainText('VER · Inicio de extensión del brazo');
    await expect(page.getByTestId('leyenda-ventana')).toBeVisible();
    await expect(page.getByTestId('vista-interpretacion')).not.toContainText('A/B');
    await expect(page.getByTestId('vista-interpretacion')).toContainText('inicio de extensión del brazo');
  });

  test('las letras de la barra son ROJ y VER, cada una con su color', async ({ page }) => {
    await conRevision(page);
    await page.keyboard.press('i');
    const etiquetas = page.getByTestId('etiqueta-evento');
    await expect(etiquetas).toHaveText(['↔', 'ROJ', 'VER']);
    const color = (i: number) => etiquetas.nth(i).evaluate(e => getComputedStyle(e).color);
    expect(await color(1)).not.toBe(await color(2)); // ROJ y VER no comparten color
  });

  test('el Historial (fila, detalle y vista) tampoco los muestra', async ({ page }) => {
    await mockApi(page, {
      revisiones: [{ id: REVISION_ID, abierta_en: '2026-10-05T15:00:00Z', disponible: true, clase: 'AttackA', confianza: 0.9, decision: 'cambiar', clase_final: 'RiposteB' }],
      detalles: { [REVISION_ID]: {
        id: REVISION_ID, abierta_en: '2026-10-05T15:00:00Z', cerrada_en: null,
        sugerencia: { disponible: true, motivo_no_disp: null, clase: 'AttackA', tirador: 'A', confianza: 0.9 },
        probabilidades: { AttackA: 0.9, RiposteB: 0.1 }, decision: 'cambiar', clase_final: 'RiposteB',
        registrado_en: '2026-10-05T15:01:00Z', auditoria_seq: 3, auditoria_hash: 'abc' } },
    });
    await configurarCombate(page);
    await mockPose(page, POSE);
    await mockRazonamiento(page, raz('respaldada'));
    await page.getByTestId('nav-history').click();
    await page.getByTestId('revision-row').click();
    await expect(page.getByTestId('revision-detalle')).toContainText('ATAQUE · ROJ · 90%');
    await expect(page.getByTestId('revision-row')).toContainText('RIPOSTE · VER');
    expect(await textoDelDom(page)).not.toMatch(ROTULO_VIEJO);
    await page.keyboard.press('i');
    await expect(page.getByTestId('trazos-lienzo')).toBeVisible();
    await expect(page.getByTestId('razonamiento-estado')).toBeVisible();
    expect(await textoDelDom(page)).not.toMatch(ROTULO_VIEJO);
  });

  test('la expresión detecta el rótulo viejo y no se deja engañar por otras palabras', () => {
    for (const malo of ['A · ROJ', 'B · VER', 'Ataque · A · ROJ', 'Tirador B · VER']) expect(malo).toMatch(ROTULO_VIEJO);
    for (const bueno of ['ROJ', 'VER', 'Ataque · ROJ', 'RIPOSTE · VER', 'Contraataque · VER', 'ATAQUE · ROJ · 90%']) expect(bueno).not.toMatch(ROTULO_VIEJO);
  });
});

test.describe('UX01b · criterio FIE sin repetir', () => {
  test('respaldada: la frase ya cita t.101.2-4 y no se repite la línea de criterio', async ({ page }) => {
    await conRevision(page);
    await page.keyboard.press('i');
    await expect(page.getByTestId('razonamiento-frases')).toContainText('t.101.2-4');
    await expect(page.getByTestId('razonamiento-criterio')).toHaveCount(0);
  });

  test('discordante: ninguna frase nombra el artículo, así que la línea de criterio se muestra', async ({ page }) => {
    await conRevision(page, { razonamiento: raz('discordante') });
    await page.keyboard.press('i');
    await expect(page.getByTestId('razonamiento-frases')).not.toContainText('t.101.2-4');
    await expect(page.getByTestId('razonamiento-criterio')).toContainText('Criterio FIE de referencia: t.101.2-4');
  });

  test('las frases del Fog se muestran sin tocar en ambos casos', async ({ page }) => {
    for (const estado of ['respaldada', 'discordante'] as const) {
      await conRevision(page, { razonamiento: raz(estado) });
      await page.keyboard.press('i');
      await expect(page.getByTestId('razonamiento-frase')).toHaveText(leerRazonamiento(estado).frases!);
      await page.reload();
    }
  });
});

test.describe('UX01b · esqueletos encuadrados con una sola escala', () => {
  /** Rectángulo (en px de pantalla) que cubre los dos esqueletos, y el del SVG que los contiene. */
  async function medidas(page: Page) {
    return page.evaluate(() => {
      const svg = document.querySelector('[data-testid="trazos-lienzo"]') as unknown as SVGSVGElement;
      const s = svg.getBoundingClientRect();
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const id of ['esqueleto-A', 'esqueleto-B']) {
        const g = document.querySelector(`[data-testid="${id}"]`);
        if (!g) continue;
        // Solo los keypoints y las aristas: las etiquetas y los ángulos van aparte.
        g.querySelectorAll('circle').forEach(c => {
          const b = c.getBoundingClientRect();
          x0 = Math.min(x0, b.left); x1 = Math.max(x1, b.right); y0 = Math.min(y0, b.top); y1 = Math.max(y1, b.bottom);
        });
      }
      return { svg: { x: s.left, y: s.top, w: s.width, h: s.height }, esq: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, viewBox: svg.getAttribute('viewBox') };
    });
  }

  for (const [nombre, width, height] of [['ancha', 1280, 800], ['angosta', 600, 900]] as const) {
    test.describe(`pantalla ${nombre}`, () => {
      test.use({ viewport: { width, height } });

      test('los esqueletos ocupan buena parte del lienzo y quedan dentro de él', async ({ page }) => {
        await conRevision(page);
        await page.keyboard.press('i');
        await expect(page.getByTestId('esqueleto-A')).toHaveCount(1);
        const m = await medidas(page);
        const alto = m.esq.h / m.svg.h;
        const ancho = m.esq.w / m.svg.w;
        // Cuánto se acercó la escena frente a mostrar el frame completo (el encuadre anterior).
        const [, , vw, vh] = m.viewBox!.split(' ').map(Number);
        const zoom = Math.min(m.svg.w / vw, m.svg.h / vh) / Math.min(m.svg.w / POSE.body.frame_w, m.svg.h / POSE.body.frame_h);
        console.log(`ENCUADRE ${nombre}: esqueletos = ${(alto * 100).toFixed(0)} % del alto y ${(ancho * 100).toFixed(0)} % del ancho del lienzo; antes ${(100 * alto / zoom).toFixed(0)} % y ${(100 * ancho / zoom).toFixed(0)} %; zoom ×${zoom.toFixed(2)}`);
        expect(zoom).toBeGreaterThan(1.2); // la ganancia depende de cuánto se muevan los tiradores en el clip
        expect(Math.max(alto, ancho)).toBeGreaterThan(0.45);
        expect(m.esq.x).toBeGreaterThanOrEqual(m.svg.x);
        expect(m.esq.x + m.esq.w).toBeLessThanOrEqual(m.svg.x + m.svg.w);
        expect(m.esq.y).toBeGreaterThanOrEqual(m.svg.y);
        expect(m.esq.y + m.esq.h).toBeLessThanOrEqual(m.svg.y + m.svg.h);
      });
    });
  }

  test('la escala es la misma en todos los frames: el viewBox no cambia al recorrer el clip', async ({ page }) => {
    await conRevision(page);
    await page.keyboard.press('i');
    const vb = () => page.getByTestId('trazos-lienzo').getAttribute('viewBox');
    const inicial = await vb();
    for (let k = 0; k < 6; k++) await page.keyboard.press('.');
    expect(await vb()).toBe(inicial);
    for (let k = 0; k < 30; k++) await page.keyboard.press(',');
    await expect(frame(page)).toContainText('Frame 0 de 39');
    expect(await vb()).toBe(inicial);
    await expect(page.getByTestId('trazos-lienzo')).toHaveAttribute('preserveAspectRatio', 'xMidYMid meet');
  });

  test('un keypoint no se mueve distinto en pantalla: la distancia entre tiradores se conserva', async ({ page }) => {
    await conRevision(page);
    await page.keyboard.press('i');
    // Escala uniforme: el cociente entre píxeles de pantalla y unidades del viewBox es igual en x y en y.
    const r = await page.evaluate(() => {
      const svg = document.querySelector('[data-testid="trazos-lienzo"]') as unknown as SVGSVGElement;
      const b = svg.getBoundingClientRect();
      const m = svg.getScreenCTM()!;
      return { a: m.a, d: m.d, w: b.width, h: b.height };
    });
    expect(Math.abs(r.a - r.d)).toBeLessThan(1e-6);
  });
});

test.describe('UX01b · ángulo del codo fuera del cuerpo', () => {
  /** Posiciones en unidades del viewBox (coordenadas locales del SVG). */
  async function geometria(page: Page, lado: 'A' | 'B') {
    const codoKp = POSE.body.tiradores![lado].brazo === 'zurdo' ? 7 : 8; // codo del brazo armado (WEAPON_KPT de Fog)
    return page.evaluate(([l, codoKp]) => {
      const q = (id: string) => document.querySelector(`[data-testid="${id}"]`) as unknown as SVGGraphicsElement | null;
      const fondo = q(`fondo-angulo-${l}`) as unknown as SVGRectElement | null;
      const texto = q(`angulo-${l}`);
      const pts = [5, 6, 11, 12].map(kp => q(`kp-${l}-${kp}`)).filter(Boolean)
        .map(c => ({ x: Number(c!.getAttribute('cx')), y: Number(c!.getAttribute('cy')) }));
      const codos = [codoKp].map(kp => q(`kp-${l}-${kp}`)).filter(Boolean)
        .map(c => ({ x: Number(c!.getAttribute('cx')), y: Number(c!.getAttribute('cy')) }));
      if (!fondo || !texto) return null;
      return {
        fondo: { x: Number(fondo.getAttribute('x')), y: Number(fondo.getAttribute('y')), w: Number(fondo.getAttribute('width')), h: Number(fondo.getAttribute('height')),
          relleno: fondo.getAttribute('fill'), opacidad: Number(fondo.getAttribute('fill-opacity')) },
        texto: { x: Number(texto.getAttribute('x')), y: Number(texto.getAttribute('y')) },
        torso: pts, codos,
      };
    }, [lado, codoKp] as const);
  }

  test('el ángulo va hacia afuera del cuerpo, del lado del codo, sobre un fondo semitransparente', async ({ page }) => {
    await conRevision(page);
    await page.keyboard.press('i');
    for (const lado of ['A', 'B'] as const) {
      const g = (await geometria(page, lado))!;
      expect(g, `ángulo ${lado}`).not.toBeNull();
      expect(g.fondo.relleno).toBe('#000000');
      expect(g.fondo.opacidad).toBeGreaterThan(0);
      expect(g.fondo.opacidad).toBeLessThan(1);
      // El texto está dentro del fondo.
      expect(g.texto.x).toBeGreaterThanOrEqual(g.fondo.x);
      expect(g.texto.y).toBeGreaterThan(g.fondo.y);
      expect(g.texto.y).toBeLessThan(g.fondo.y + g.fondo.h);
      // Del lado del codo respecto del centro del torso, y sin entrar en la franja del torso en x.
      const cx = g.torso.reduce((s, p) => s + p.x, 0) / g.torso.length;
      const codo = g.codos.reduce((a, b) => (Math.abs(a.x - cx) >= Math.abs(b.x - cx) ? a : b));
      const derecha = codo.x >= cx;
      const borde = derecha ? g.fondo.x : g.fondo.x + g.fondo.w;
      if (derecha) expect(borde).toBeGreaterThanOrEqual(Math.min(...g.codos.map(c => c.x)) - 1e-6);
      else expect(borde).toBeLessThanOrEqual(Math.max(...g.codos.map(c => c.x)) + 1e-6);
      const t0 = Math.min(...g.torso.map(p => p.x)); const t1 = Math.max(...g.torso.map(p => p.x));
      const solapa = g.fondo.x < t1 && g.fondo.x + g.fondo.w > t0;
      expect(solapa, `el fondo del ángulo ${lado} no debe cubrir el torso`).toBe(false);
    }
  });

  test('en cada frame el ángulo sigue del lado exterior y su valor es el que envía el Fog', async ({ page }) => {
    await conRevision(page);
    await page.keyboard.press('i');
    const esperado = (a: number) => `${a.toFixed(1).replace('.', ',')}°`;
    for (let k = 0; k < 5; k++) {
      const i = Number(/Frame (\d+) de/.exec(await frame(page).innerText())![1]);
      for (const lado of ['A', 'B'] as const) {
        const a = POSE.body.tiradores![lado].angulo_codo[i];
        if (a == null) continue;
        await expect(page.getByTestId(`angulo-${lado}`)).toHaveText(esperado(a));
        const g = (await geometria(page, lado))!;
        expect(g.fondo.opacidad).toBeLessThan(1);
        expect(g.fondo.w).toBeGreaterThan(0);
      }
      await page.keyboard.press('.');
    }
  });
});

test.describe('medición para la memoria: ver los trazos del evento 1, del 2 y volver a decidir', () => {
  test('después: 4 interacciones (antes, en main: 6)', async ({ page }) => {
    await conRevision(page);
    const pasos: string[] = [];
    await page.keyboard.press('i'); pasos.push('I abre la vista');
    await page.getByTestId('razonamiento-evento').nth(1).click(); pasos.push('clic evento 1');
    await expect(frame(page)).toContainText('Frame 7 de 39');
    await page.getByTestId('razonamiento-evento').nth(2).click(); pasos.push('clic evento 2');
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
      await page.getByTestId('razonamiento-evento').nth(2).click();
      await expect(frame(page)).toContainText('Frame 11 de 39');
      await page.screenshot({ path: `docs/evidencia/ux/interpretacion-${nombre}-${width}x${height}.png` });
    });
  }
});
