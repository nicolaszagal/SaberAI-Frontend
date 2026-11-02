import { test, expect, type Page } from '@playwright/test';
import {
  mockApi, configurarCombate, mockClip, analizarClip, mockPose, mockRazonamiento, leerPose, leerRazonamiento,
  REVISION_ID, type EstadoFixtureRazonamiento,
} from './helpers';

const POSE = { body: leerPose('pose_real') };
const NOTA = 'Los eventos se miden sobre la pose y el artículo FIE es la referencia de la clase sugerida. La decisión es del árbitro.';

/** Texto de una insignia por estado, tal como lo pide el diseño. */
const INSIGNIA: Record<string, string> = {
  respaldada: 'Respaldada por la pose',
  discordante: 'Evidencia discordante',
  no_concluyente: 'No concluyente',
  insuficiente: 'Evidencia insuficiente',
};

const respuesta = (estado: EstadoFixtureRazonamiento) => ({ body: leerRazonamiento(estado) });

async function conRevision(page: Page) {
  await mockClip(page);
  await analizarClip(page);
  await expect(page.getByTestId('status-done')).toBeVisible();
}

async function abrir(page: Page) {
  await page.getByTestId('ver-razonamiento-btn').click();
  await expect(page.getByTestId('modal-razonamiento')).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await mockApi(page);
  await configurarCombate(page);
  await page.getByTestId('nav-live').click();
});

test.describe('apertura y carga bajo demanda', () => {
  test('sin revisión el botón está deshabilitado y el atajo J no abre nada', async ({ page }) => {
    await expect(page.getByTestId('ver-razonamiento-btn')).toHaveAttribute('aria-disabled', 'true');
    await page.keyboard.press('j');
    await expect(page.getByTestId('modal-razonamiento')).toHaveCount(0);
  });

  test('con revisión pide el razonamiento una sola vez, aunque se reabra', async ({ page }) => {
    const raz = await mockRazonamiento(page, respuesta('respaldada'));
    await conRevision(page);
    await expect(page.getByTestId('ver-razonamiento-btn')).not.toHaveAttribute('aria-disabled', 'true');
    expect(raz.peticiones()).toBe(0); // bajo demanda: nada se pide al analizar
    await abrir(page);
    await expect(page.getByTestId('razonamiento-estado')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('modal-razonamiento')).toHaveCount(0);
    await abrir(page);
    await expect(page.getByTestId('razonamiento-estado')).toBeVisible();
    expect(raz.peticiones()).toBe(1);
  });

  test('el atajo J abre el modal', async ({ page }) => {
    await mockRazonamiento(page, respuesta('respaldada'));
    await conRevision(page);
    await page.keyboard.press('j');
    await expect(page.getByTestId('modal-razonamiento')).toBeVisible();
  });

  test('mientras carga muestra el estado de carga', async ({ page }) => {
    await page.route('**/revisiones/*/razonamiento', async route => {
      await new Promise(r => setTimeout(r, 600));
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(leerRazonamiento('respaldada')) });
    });
    await conRevision(page);
    await abrir(page);
    await expect(page.getByTestId('razonamiento-cargando')).toBeVisible();
    await expect(page.getByTestId('razonamiento-estado')).toBeVisible();
  });
});

test.describe('estados', () => {
  for (const estado of ['respaldada', 'discordante', 'no_concluyente', 'insuficiente'] as const) {
    test(`${estado}: insignia con texto, frases tal como llegan, criterio FIE y nota`, async ({ page }) => {
      const fx = leerRazonamiento(estado);
      await mockRazonamiento(page, { body: fx });
      await conRevision(page);
      await abrir(page);
      await expect(page.getByTestId('razonamiento-estado')).toHaveText(INSIGNIA[estado]);
      // Las frases se muestran exactamente como llegan: sin reescribir ni completar.
      await expect(page.getByTestId('razonamiento-frase')).toHaveText(fx.frases!);
      await expect(page.getByTestId('razonamiento-criterio')).toContainText(`Criterio FIE de referencia: ${fx.criterio_fie!.articulo}`);
      await expect(page.getByTestId('razonamiento-nota')).toHaveText(NOTA);
    });
  }

  test('orden: sugerencia, insignia, frases, criterio, eventos y nota', async ({ page }) => {
    await mockRazonamiento(page, respuesta('respaldada'));
    await conRevision(page);
    await abrir(page);
    const ids = ['razonamiento-sugerencia', 'razonamiento-estado', 'razonamiento-frases', 'razonamiento-criterio', 'razonamiento-evento', 'razonamiento-nota'];
    const y = await Promise.all(ids.map(async id => (await page.getByTestId(id).first().boundingBox())!.y));
    expect([...y].sort((a, b) => a - b)).toEqual(y);
  });

  test('la sugerencia lleva clase, tirador y confianza en %', async ({ page }) => {
    await mockRazonamiento(page, respuesta('respaldada'));
    await conRevision(page);
    await abrir(page);
    await expect(page.getByTestId('razonamiento-clase')).toHaveText('Ataque · A · ROJ');
    await expect(page.getByTestId('razonamiento-confianza')).toHaveText('74%');
  });

  test('no_registrado: dice que la revisión es anterior al registro', async ({ page }) => {
    await mockRazonamiento(page, respuesta('no_registrado'));
    await conRevision(page);
    await abrir(page);
    await expect(page.getByTestId('razonamiento-no-registrado')).toHaveText('Esta revisión es anterior al registro de razonamiento.');
    await expect(page.getByTestId('razonamiento-estado')).toHaveCount(0);
    await expect(page.getByTestId('razonamiento-evento')).toHaveCount(0);
  });

  test('no_calculado: dice que no se pudo calcular, distinto de no_registrado', async ({ page }) => {
    await mockRazonamiento(page, respuesta('no_calculado'));
    await conRevision(page);
    await abrir(page);
    await expect(page.getByTestId('razonamiento-no-calculado')).toHaveText('No se pudo calcular el razonamiento de esta sugerencia.');
    await expect(page.getByTestId('razonamiento-no-registrado')).toHaveCount(0);
  });

  test('no_disponible: muestra el motivo como en el Paso 2', async ({ page }) => {
    await mockRazonamiento(page, respuesta('no_disponible'));
    await conRevision(page);
    await abrir(page);
    await expect(page.getByTestId('razonamiento-no-disponible')).toContainText('Clasificación no disponible');
    await expect(page.getByTestId('razonamiento-motivo')).toHaveText('No se pudo detectar a ambos tiradores en el clip.');
  });
});

test.describe('eventos y trazos', () => {
  test('lista tirador, tipo y tiempo relativo al tocado, sin inventar el tocado como evento', async ({ page }) => {
    await mockRazonamiento(page, respuesta('respaldada'));
    await conRevision(page);
    await abrir(page);
    const evento = page.getByTestId('razonamiento-evento');
    await expect(evento).toHaveCount(3); // extensión A, extensión B y acercamiento; el tocado es la referencia
    await expect(evento.nth(0)).toContainText('A · ROJ · Inicio de extensión del brazo');
    await expect(evento.nth(0).getByTestId('razonamiento-evento-tiempo')).toHaveText('-0,43 s del tocado');
    await expect(evento.nth(1)).toContainText('B · VER · Inicio de extensión del brazo');
    await expect(evento.nth(2)).toContainText('Inicio del acercamiento (ambos tiradores)');
  });

  test('"Ver en trazos" abre el modal de trazos en el frame del evento', async ({ page }) => {
    await mockRazonamiento(page, respuesta('respaldada'));
    await mockPose(page, POSE);
    await conRevision(page);
    await abrir(page);
    await page.getByTestId('ver-en-trazos').nth(1).click(); // B: frame 11
    await expect(page.getByTestId('modal-trazos')).toBeVisible();
    await expect(page.getByTestId('modal-razonamiento')).toHaveCount(0);
    await expect(page.getByTestId('trazos-frame')).toContainText('Frame 11 de 39');
    await expect(page.getByTestId('trazos-tiempo')).toHaveText('-0,30 s');
  });

  test('un evento censurado dice "antes del inicio del clip", sin tiempo, y abre en el primer frame', async ({ page }) => {
    await mockRazonamiento(page, respuesta('censurado'));
    await mockPose(page, POSE);
    await conRevision(page);
    await abrir(page);
    const evento = page.getByTestId('razonamiento-evento');
    await expect(evento.nth(0).getByTestId('razonamiento-evento-tiempo')).toHaveText('antes del inicio del clip');
    await expect(evento.nth(0)).not.toContainText('del tocado');
    await expect(evento.nth(2).getByTestId('razonamiento-evento-tiempo')).toHaveText('antes del inicio del clip'); // acercamiento
    await evento.nth(0).getByTestId('ver-en-trazos').click();
    await expect(page.getByTestId('trazos-frame')).toContainText('Frame 0 de 39');
  });

  test('con el razonamiento en caché la barra de trazos marca los eventos y la ventana de atención', async ({ page }) => {
    const fx = leerRazonamiento('respaldada');
    await mockRazonamiento(page, { body: fx });
    await mockPose(page, POSE);
    await conRevision(page);
    await abrir(page);
    await page.keyboard.press('Escape');
    await page.keyboard.press('t');
    await expect(page.getByTestId('modal-trazos')).toBeVisible();
    await expect(page.getByTestId('ventana-atencion')).toBeVisible();
    await expect(page.getByTestId('marca-evento')).toHaveCount(3);
    await expect(page.getByTestId('etiqueta-evento')).toHaveText(['A', 'B', '↔']);
    await expect(page.getByTestId('leyenda-ventana')).toContainText('Ventana de atención del modelo');
  });

  test('los eventos censurados no se marcan en la barra (no hay instante exacto)', async ({ page }) => {
    await mockRazonamiento(page, respuesta('censurado'));
    await mockPose(page, POSE);
    await conRevision(page);
    await abrir(page);
    await page.keyboard.press('Escape');
    await page.keyboard.press('t');
    await expect(page.getByTestId('marca-evento')).toHaveCount(1); // solo B
    await expect(page.getByTestId('etiqueta-evento')).toHaveText(['B']);
  });

  test('sin el razonamiento en caché los trazos no lo piden ni marcan nada', async ({ page }) => {
    const raz = await mockRazonamiento(page, respuesta('respaldada'));
    await mockPose(page, POSE);
    await conRevision(page);
    await page.keyboard.press('t');
    await expect(page.getByTestId('trazos-lienzo')).toBeVisible();
    await expect(page.getByTestId('marca-evento')).toHaveCount(0);
    await expect(page.getByTestId('ventana-atencion')).toHaveCount(0);
    expect(raz.peticiones()).toBe(0);
  });
});

test.describe('errores por código', () => {
  test('un 409 con codigo sin_clasificacion y un detail cualquiera muestra el mensaje correcto', async ({ page }) => {
    await mockRazonamiento(page, { status: 409, body: { detail: 'texto cualquiera', codigo: 'sin_clasificacion' } });
    await conRevision(page);
    await abrir(page);
    await expect(page.getByTestId('razonamiento-409')).toContainText('aún no tiene una clasificación registrada');
  });

  test('un 409 con la palabra "clasificación" en detail pero otro código no usa ese mensaje', async ({ page }) => {
    await mockRazonamiento(page, { status: 409, body: { detail: 'la revisión aún no tiene una clasificación registrada', codigo: 'otro' } });
    await conRevision(page);
    await abrir(page);
    await expect(page.getByTestId('razonamiento-409')).toHaveCount(0);
    await expect(page.getByTestId('razonamiento-error')).toBeVisible();
  });

  test('un error del Fog se puede reintentar', async ({ page }) => {
    const raz = await mockRazonamiento(page, { status: 500, body: { detail: 'falla' } }, respuesta('respaldada'));
    await conRevision(page);
    await abrir(page);
    await expect(page.getByTestId('razonamiento-error')).toContainText('No se pudo cargar el razonamiento');
    await page.getByTestId('razonamiento-error').getByRole('button', { name: /Reintentar/ }).click();
    await expect(page.getByTestId('razonamiento-estado')).toBeVisible();
    expect(raz.peticiones()).toBe(2);
  });
});

test.describe('la decisión es del árbitro (RNF-01, P-008)', () => {
  test('Esc cierra el modal y la elección del árbitro sigue igual', async ({ page }) => {
    await mockRazonamiento(page, respuesta('discordante'));
    await conRevision(page);
    await page.getByTestId('modifica-no').click();
    await expect(page.getByTestId('resumen-decision')).toBeVisible();
    await abrir(page);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('modal-razonamiento')).toHaveCount(0);
    // Si ese Esc hubiera llegado a "Borrar elección", el resumen habría desaparecido.
    await expect(page.getByTestId('resumen-decision')).toBeVisible();
    await expect(page.getByTestId('veredicto-enviar')).not.toHaveAttribute('aria-disabled', 'true');
  });

  test('con el modal abierto los atajos de fondo no actúan', async ({ page }) => {
    await mockRazonamiento(page, respuesta('respaldada'));
    await conRevision(page);
    await abrir(page);
    await page.keyboard.press('a'); // "Anular la acción"
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('veredicto-anular')).not.toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('resumen-decision')).toHaveCount(0);
  });

  test('el veredicto sigue a ≤ 2 interacciones con el razonamiento cargado', async ({ page }) => {
    await mockRazonamiento(page, respuesta('respaldada'));
    await conRevision(page);
    await abrir(page);
    await page.keyboard.press('Escape');
    // Interacción 1: elegir. Interacción 2: confirmar.
    await page.getByTestId('modifica-no').click();
    await expect(page.getByTestId('veredicto-enviar')).not.toHaveAttribute('aria-disabled', 'true');
  });
});

test.describe('contraste de las insignias', () => {
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
    test(`${estado}: el texto de la insignia tiene contraste AA en el tema claro y el oscuro`, async ({ page }) => {
      await mockRazonamiento(page, respuesta(estado));
      await conRevision(page);
      for (const tema of ['actual', 'alterno']) {
        if (tema === 'alterno') await page.getByTestId('theme-toggle').click();
        await abrir(page);
        const { texto, fondo } = await page.getByTestId('razonamiento-estado').evaluate(el => ({
          texto: getComputedStyle(el.firstElementChild as Element).color,
          fondo: getComputedStyle(el).backgroundColor,
        }));
        expect(contraste(texto, fondo), `${estado} (${tema})`).toBeGreaterThanOrEqual(4.5);
        await page.keyboard.press('Escape');
        await expect(page.getByTestId('modal-razonamiento')).toHaveCount(0);
      }
    });
  }
});

test.describe('historial (CU-12)', () => {
  test('el detalle de una revisión tiene "Ver razonamiento" y lo abre', async ({ page }) => {
    await mockApi(page, {
      revisiones: [{ id: REVISION_ID, abierta_en: '2026-10-05T15:00:00Z', disponible: true, clase: 'AttackA',
        confianza: 0.9, decision: null, clase_final: null }],
      detalles: { [REVISION_ID]: {
        id: REVISION_ID, abierta_en: '2026-10-05T15:00:00Z', cerrada_en: null,
        sugerencia: { disponible: true, motivo_no_disp: null, clase: 'AttackA', tirador: 'A', confianza: 0.9 },
        probabilidades: null, decision: null, clase_final: null, registrado_en: null, auditoria_seq: null, auditoria_hash: null } },
    });
    const raz = await mockRazonamiento(page, respuesta('respaldada'));
    await mockPose(page, POSE);
    await page.getByTestId('nav-history').click();
    await page.getByTestId('revision-row').click();
    await expect(page.getByTestId('revision-detalle')).toBeVisible();
    expect(raz.peticiones()).toBe(0);
    await page.getByTestId('ver-razonamiento-btn').click();
    await expect(page.getByTestId('razonamiento-estado')).toHaveText(INSIGNIA.respaldada);
    expect(raz.peticiones()).toBe(1);
    await page.getByTestId('ver-en-trazos').first().click();
    await expect(page.getByTestId('trazos-frame')).toContainText('Frame 7 de 39'); // A: frame 7
  });
});
