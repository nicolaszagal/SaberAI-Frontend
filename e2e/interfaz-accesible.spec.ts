import { test, expect, type Page } from '@playwright/test';
import { mockApi, configurarCombate, mockClip, analizarClip, CLIP_OK } from './helpers';

const FIXTURE = 'e2e/fixtures/dummy.mp4';
const RUTAS = ['/', '/live', '/history', '/config'];

/** Tamaños de letra (px) y altos de controles medidos sobre el DOM visible. */
async function medir(page: Page) {
  return page.evaluate(() => {
    const visible = (el: Element) => {
      const r = (el as HTMLElement).getBoundingClientRect();
      const cs = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
    };
    const chicos: string[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const txt = (n.textContent ?? '').trim();
      const el = n.parentElement;
      if (!txt || !el || !visible(el) || el.closest('video, script, style')) continue;
      const px = parseFloat(getComputedStyle(el).fontSize);
      if (px < 12) chicos.push(`${px}px «${txt.slice(0, 30)}»`);
    }
    const bajos: string[] = [];
    document.querySelectorAll('[role="button"], button, input:not([type=file])').forEach(el => {
      if (!visible(el) || el.closest('video')) return;
      const h = (el as HTMLElement).getBoundingClientRect().height;
      if (h < 43.5) bajos.push(`${Math.round(h)}px «${(el.textContent ?? el.getAttribute('placeholder') ?? '').slice(0, 30)}»`);
    });
    const mayusculasChicas: string[] = [];
    document.querySelectorAll('*').forEach(el => {
      if (!visible(el) || !el.childNodes.length) return;
      const cs = getComputedStyle(el);
      const propio = Array.from(el.childNodes).some(c => c.nodeType === 3 && (c.textContent ?? '').trim());
      if (propio && cs.textTransform === 'uppercase' && parseFloat(cs.fontSize) < 14) mayusculasChicas.push(el.textContent ?? '');
    });
    return { chicos, bajos, mayusculasChicas };
  });
}

for (const tema of ['claro', 'oscuro'] as const) {
  for (const ruta of RUTAS) {
    test(`${ruta} · tema ${tema}: letras ≥ 12 px, controles ≥ 44 px, sin mayúsculas pequeñas`, async ({ page }) => {
      await mockApi(page);
      await page.goto(ruta);
      if (tema === 'oscuro') await page.getByTestId('theme-toggle').click();
      await page.waitForTimeout(300);
      const m = await medir(page);
      expect(m.chicos, 'texto menor a 12 px').toEqual([]);
      expect(m.bajos, 'controles menores a 44 px').toEqual([]);
      expect(m.mayusculasChicas, 'mayúsculas pequeñas decorativas').toEqual([]);
    });
  }
}

test('los tiradores se rotulan con texto: "A · ROJ" y "B · VER"', async ({ page }) => {
  await mockApi(page);
  await page.goto('/live');
  await expect(page.getByTestId('marcar-luz-a-btn')).toContainText('A · ROJ');
  await expect(page.getByTestId('marcar-luz-b-btn')).toContainText('B · VER');
  await page.goto('/config');
  await expect(page.getByText('Tirador A · ROJ')).toBeVisible();
  await expect(page.getByText('Tirador B · VER')).toBeVisible();
});

test('el resultado rotula el lado con texto y la salida como sugerencia', async ({ page }) => {
  await mockClip(page, { ...CLIP_OK, fencer: 'VER', action: 'RiposteB', confidence: 0.61 });
  await mockApi(page);
  await configurarCombate(page);
  await page.getByTestId('nav-live').click();
  await analizarClip(page);
  await expect(page.getByTestId('paso-sugerencia')).toContainText('Sugerencia del sistema');
  await expect(page.getByTestId('paso-sugerencia')).toContainText('B · VER');
  await expect(page.getByTestId('paso-sugerencia')).not.toContainText('PUNTO PARA');
});

test('los botones principales muestran su atajo de teclado', async ({ page }) => {
  await mockApi(page);
  await page.goto('/live');
  await expect(page.getByTestId('select-clip-btn')).toContainText('S');
  await expect(page.getByTestId('analizar-btn')).toContainText('Intro');
  await page.goto('/config');
  await expect(page.getByTestId('crear-combate-btn')).toContainText('Ctrl+Intro');
});

test('el atajo S abre el selector de clip aunque el foco esté en un botón', async ({ page }) => {
  await mockApi(page);
  await page.goto('/');
  await page.getByTestId('nav-live').click();
  await expect(page.getByTestId('select-clip-btn')).toBeVisible();
  const chooser = page.waitForEvent('filechooser');
  await page.keyboard.press('s');
  await chooser;
});

test('el atajo Intro analiza el clip cargado', async ({ page }) => {
  let posts = 0;
  await page.route('**/matches/*/clip', route => {
    posts++;
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(CLIP_OK) });
  });
  await mockApi(page);
  await configurarCombate(page);
  await page.getByTestId('nav-live').click();
  await page.getByTestId('file-input').setInputFiles(FIXTURE);
  await expect(page.getByTestId('filename-display')).toContainText('dummy.mp4');
  await page.getByTestId('marcar-luz-a-btn').click();
  await expect(page.getByTestId('analizar-btn')).not.toHaveAttribute('aria-disabled', 'true');
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('status-done')).toBeVisible();
  expect(posts).toBe(1);
});

test.describe('estados con mensaje y acción siguiente', () => {
  test('historial: error con Reintentar que vuelve a consultar', async ({ page }) => {
    await mockApi(page);
    let ok = false;
    await configurarCombate(page);
    await page.route(/\/revisiones(\?.*)?$/, route => ok
      ? route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      : route.fulfill({ status: 500, contentType: 'text/plain', body: 'falla' }));
    await page.getByTestId('nav-history').click();
    await expect(page.getByTestId('historial-error')).toContainText('No se pudo cargar el historial');
    ok = true;
    await page.getByTestId('historial-error').getByRole('button', { name: /Reintentar/ }).click();
    await expect(page.getByTestId('historial-vacio')).toContainText('Sin revisiones registradas');
    await expect(page.getByTestId('historial-vacio').getByRole('button', { name: /Ir a Revisión VAR/ })).toBeVisible();
  });

  test('historial: cargando', async ({ page }) => {
    await mockApi(page);
    await configurarCombate(page);
    await page.route(/\/revisiones(\?.*)?$/, async route => {
      await new Promise(r => setTimeout(r, 1500));
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });
    await page.getByTestId('nav-history').click();
    await expect(page.getByTestId('historial-cargando')).toContainText('Cargando');
  });

  test('revisión VAR sin combate: explica y lleva a configurar', async ({ page }) => {
    await mockApi(page);
    await page.goto('/live');
    const aviso = page.getByTestId('sin-combate');
    await expect(aviso).toContainText('No hay combate activo');
    await aviso.getByRole('button', { name: /Configurar combate/ }).click();
    await expect(page.getByTestId('crear-combate-btn')).toBeVisible();
  });

  test('revisión VAR: error de análisis con Reintentar', async ({ page }) => {
    let intento = 0;
    await page.route('**/matches/*/clip', route => ++intento === 1
      ? route.fulfill({ status: 500, contentType: 'text/plain', body: 'falla' })
      : route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(CLIP_OK) }));
    await mockApi(page);
    await configurarCombate(page);
    await page.getByTestId('nav-live').click();
    await analizarClip(page);
    await expect(page.getByTestId('status-error')).toContainText('no se pudo analizar el clip');
    await page.getByTestId('status-error').getByRole('button', { name: /Reintentar/ }).click();
    await expect(page.getByTestId('status-done')).toBeVisible();
  });

  test('combate: catálogo caído con Reintentar', async ({ page }) => {
    await mockApi(page);
    let ok = false;
    await page.route('**/eventos', route => ok
      ? route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      : route.fulfill({ status: 500, contentType: 'text/plain', body: 'falla' }));
    await page.goto('/config');
    await expect(page.getByTestId('catalogo-error')).toContainText('No se pudo cargar el catálogo');
    ok = true;
    await page.getByTestId('catalogo-error').getByRole('button', { name: /Reintentar/ }).click();
    await expect(page.getByTestId('catalogo-vacio')).toContainText('No hay eventos registrados');
  });
});
