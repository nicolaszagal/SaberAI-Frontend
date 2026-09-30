import { test, type Page } from '@playwright/test';
import { mockApi, configurarCombate, mockClip, analizarClip, CLIP_OK, EVENTO_ID } from './helpers';

/**
 * Capturas de cada pantalla para adjuntar al PR (U02). Solo corren con
 * `CAPTURAS=1 npx playwright test e2e/capturas.spec.ts`; salen a capturas/U02/.
 */
test.skip(!process.env.CAPTURAS, 'Definir CAPTURAS=1 para generar las capturas');

const TAMANOS = [
  { nombre: '1280x800', width: 1280, height: 800 },
  { nombre: '1024x768', width: 1024, height: 768 },
];
const TEMAS = ['claro', 'oscuro'] as const;
const FIXTURE = 'e2e/fixtures/dummy.mp4';
const REVISION = {
  id: 'r1', combate_id: 'c1', abierta_en: '2026-10-01T15:00:00Z', cerrada_en: null,
  disponible: true, clase: 'RiposteB', confianza: 0.74, decision: null, clase_final: null,
};
const VEREDICTO = { ...CLIP_OK, has_luz_A: false, has_luz_B: true, fencer: 'VER', action: 'RiposteB', confidence: 0.74 };

async function aTema(page: Page, tema: 'claro' | 'oscuro') {
  if (tema === 'oscuro') await page.getByTestId('theme-toggle').click();
}

for (const t of TAMANOS) {
  for (const tema of TEMAS) {
    const base = (n: string) => `capturas/U02/${t.nombre}/${n}-${tema}.png`;
    test.describe(`${t.nombre} · ${tema}`, () => {
      test.use({ viewport: { width: t.width, height: t.height } });

      test('combate, historial', async ({ page }) => {
        await mockApi(page, { revisiones: [REVISION] });
        await page.goto('/');
        await aTema(page, tema);
        await page.getByTestId('nav-history').click();
        await page.getByTestId('revision-row').waitFor();
        await page.screenshot({ path: base('04-historial') });
        await page.getByTestId('nav-config').click();
        await page.getByTestId(`evento-${EVENTO_ID}`).waitFor();
        await page.screenshot({ path: base('03-combate-formulario'), fullPage: true });
      });

      test('revisión VAR sin combate y estados vacío', async ({ page }) => {
        await mockApi(page);
        await page.goto('/live');
        await aTema(page, tema);
        await page.getByTestId('sin-combate').waitFor();
        await page.screenshot({ path: base('02a-revision-sin-combate') });
        await page.getByTestId('nav-history').click();
        await page.getByTestId('historial-vacio').waitFor();
        await page.screenshot({ path: base('04b-historial-vacio') });
      });

      test('revisión VAR con sugerencia', async ({ page }) => {
        await mockClip(page, VEREDICTO);
        await mockApi(page);
        await configurarCombate(page);
        await aTema(page, tema);
        await page.getByTestId('nav-live').click();
        await page.getByTestId('analizar-btn').waitFor();
        await page.screenshot({ path: base('02b-revision-lista') });
        await analizarClip(page, FIXTURE);
        await page.getByTestId('status-done').waitFor();
        await page.screenshot({ path: base('02c-revision-con-sugerencia') });
      });

      test('revisión VAR con error', async ({ page }) => {
        await mockClip(page, { detail: 'falla' }, 500);
        await mockApi(page);
        await configurarCombate(page);
        await aTema(page, tema);
        await page.getByTestId('nav-live').click();
        await analizarClip(page, FIXTURE);
        await page.getByTestId('status-error').waitFor();
        await page.screenshot({ path: base('02d-revision-error') });
      });
    });
  }
}
