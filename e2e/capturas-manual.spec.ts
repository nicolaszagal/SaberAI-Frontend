import { test, expect, type Page } from '@playwright/test';

/**
 * Capturas del manual de usuario contra el sistema real: Fog, Cloud, Redis y PostgreSQL
 * levantados, sin API simulada. Recorre una sesión completa con tres revisiones (mantener,
 * cambiar y anular, cada una con su pregunta y su resumen) y guarda las 15 imágenes del
 * manual. Todas se regeneran juntas para que muestren el mismo evento. Solo corre con
 * `CAPTURAS=1 SISTEMA_REAL=1 npx playwright test e2e/capturas-manual.spec.ts`.
 * Usa Google Chrome (`channel: 'chrome'`) porque el Chromium de Playwright no reproduce H.264.
 *
 * Variables obligatorias (sin ellas las rutas y nombres quedan vacíos y la prueba falla):
 *   EVENTO_NOMBRE       evento que ya existe en la base (scripts/crear_sesion_validacion.py).
 *   ARBITRO_NOMBRE      árbitro que ya existe en la base; se reutiliza, no se crea otro.
 *   CLIP_1              ruta absoluta del clip de la revisión 1 (el árbitro elige la sugerida).
 *   CLIP_2              ruta absoluta del clip de la revisión 2 (el árbitro elige otra clase).
 *   CLIP_SIN_TIRADORES  ruta absoluta de un video sin tiradores ("Clasificación no disponible").
 *   CLIP_1_T_MS         instante del tocado del CLIP_1, en ms: primer fotograma con luz de
 *                       dataset/labels/luz_annotations.csv dividido por los fps (criterio de
 *                       backend/docs/evidencia/prueba_humo_Q02.md).
 *   CLIP_2_T_MS         ídem para CLIP_2.
 *   CAPTURAS_DIR        carpeta de salida (ruta absoluta), p. ej. backend/docs/manuales/img.
 * Además, E2E_PORT (puerto del frontend de la prueba) y EXPO_PUBLIC_FOG_URL (Fog de la
 * prueba). Procedimiento completo: GUIA_INSTALACION.md, "Regenerar capturas".
 */
test.skip(!process.env.CAPTURAS || !process.env.SISTEMA_REAL, 'Definir CAPTURAS=1 y SISTEMA_REAL=1');

const DIR = process.env.CAPTURAS_DIR ?? 'capturas/DOC01';
const EVENTO_NOMBRE = process.env.EVENTO_NOMBRE ?? '';
const ARBITRO_NOMBRE = process.env.ARBITRO_NOMBRE ?? '';
const CLIP_1 = process.env.CLIP_1 ?? '';
const CLIP_2 = process.env.CLIP_2 ?? '';
const CLIP_SIN_TIRADORES = process.env.CLIP_SIN_TIRADORES ?? '';
const CLIP_1_T_MS = Number(process.env.CLIP_1_T_MS ?? 0);
const CLIP_2_T_MS = Number(process.env.CLIP_2_T_MS ?? 0);

test.use({ viewport: { width: 1280, height: 800 }, channel: 'chrome' });

const foto = (page: Page, nombre: string, fullPage = false) =>
  page.screenshot({ path: `${DIR}/${nombre}.png`, fullPage });

/** Elige el clip, lleva el reproductor al instante `tMs`, marca las luces y el tocado. */
async function prepararClip(page: Page, ruta: string, tMs: number, luces: { a: boolean; b: boolean }) {
  await page.getByTestId('file-input').setInputFiles(ruta);
  await page.getByTestId('video-player').waitFor();
  await page.waitForFunction(() => {
    const v = document.querySelector('[data-testid="video-player"]') as HTMLVideoElement | null;
    return !!v && v.readyState >= 1;
  });
  await page.evaluate(ms => {
    const v = document.querySelector('[data-testid="video-player"]') as HTMLVideoElement;
    v.currentTime = ms / 1000;
  }, tMs);
  await page.waitForFunction(ms => {
    const v = document.querySelector('[data-testid="video-player"]') as HTMLVideoElement;
    return Math.abs(v.currentTime * 1000 - ms) < 50 && !v.seeking;
  }, tMs);
  // Las luces se conservan al cambiar de clip: se fija el estado deseado, no se alterna a ciegas.
  for (const [id, deseada] of [['luz-a-btn', luces.a], ['luz-b-btn', luces.b]] as const) {
    const activa = (await page.getByTestId(id).innerText()).includes('●');
    if (activa !== deseada) await page.getByTestId(id).click();
  }
  await page.getByTestId('marcar-tocado-btn').click();
}

test('sesión completa del manual de usuario', async ({ page }) => {
  test.setTimeout(240_000);

  // Inicio sin combate y estado del sistema.
  await page.goto('/');
  // Oculta la insignia de herramientas de desarrollo de Expo (no es parte de la interfaz).
  await page.addStyleTag({ content: 'body > div:not(#root) { display: none !important; }' });
  await expect(page.getByTestId('health-indicator')).toContainText('Conectado');
  await foto(page, '01-inicio-sin-combate');

  // Revisión VAR sin combate activo.
  await page.getByTestId('nav-live').click();
  await page.getByTestId('sin-combate').waitFor();
  await foto(page, '02-revision-sin-combate');

  // Configurar el combate (CU-01).
  await page.getByTestId('nav-config').click();
  await page.locator('[data-testid^="evento-"]').filter({ hasText: EVENTO_NOMBRE }).first().click();
  await page.getByTestId('pista').fill('P1');
  await page.locator('[data-testid^="arbitro-"]').filter({ hasText: ARBITRO_NOMBRE }).first().click();
  await page.getByTestId('tirador-a-alias').fill('Rojo');
  await page.getByTestId('tirador-a-brazo-right').click();
  await page.getByTestId('tirador-b-alias').fill('Verde');
  await page.getByTestId('tirador-b-brazo-right').click();
  await foto(page, '03-combate-formulario', true);
  await page.getByTestId('crear-combate-btn').click();
  await expect(page.getByTestId('combate-activo')).toBeVisible();
  await foto(page, '04-combate-activo');

  // Revisión 1: la sugerencia coincide y el árbitro mantiene.
  await page.getByTestId('nav-live').click();
  await page.getByTestId('analizar-btn').waitFor();
  await prepararClip(page, CLIP_1, CLIP_1_T_MS, { a: true, b: false });
  await foto(page, '05-revision-clip-listo');
  await page.getByTestId('analizar-btn').click();
  await page.getByTestId('status-analyzing').waitFor();
  await page.waitForTimeout(1200);
  await foto(page, '06-revision-analizando');
  await page.getByTestId('status-done').waitFor({ timeout: 90_000 });
  await foto(page, '07-revision-sugerencia');
  await page.locator('[data-testid^="clase-"]').filter({ hasText: 'Sugerencia del sistema' }).click();
  await page.getByTestId('cambia-no').click();
  await page.getByTestId('resumen-decision').waitFor();
  await page.getByTestId('veredicto-enviar').click();
  await page.getByTestId('veredicto-confirmado').waitFor();
  await foto(page, '08-revision-veredicto-registrado');

  // Revisión 2: el árbitro cambia la clase final.
  await prepararClip(page, CLIP_2, CLIP_2_T_MS, { a: true, b: true });
  await page.getByTestId('analizar-btn').click();
  await page.getByTestId('status-done').waitFor({ timeout: 90_000 });
  await page.getByTestId('selector-clase').waitFor();
  await page.getByTestId('clase-AttackA').click();
  await page.getByTestId('cambia-si').click();
  await page.getByTestId('resumen-decision').waitFor();
  await page.getByTestId('veredicto-enviar').scrollIntoViewIfNeeded();
  await foto(page, '09-revision-selector-clase');
  await page.getByTestId('veredicto-enviar').click();
  await page.getByTestId('veredicto-confirmado').waitFor();

  // Revisión 3: sin tiradores detectables, "Clasificación no disponible"; el árbitro anula.
  await prepararClip(page, CLIP_SIN_TIRADORES, 0, { a: true, b: false });
  await page.getByTestId('analizar-btn').click();
  await page.getByTestId('no-disponible').waitFor({ timeout: 90_000 });
  await foto(page, '10-revision-no-disponible');
  await page.getByTestId('veredicto-anular').click();
  await page.getByTestId('veredicto-enviar').click();
  await page.getByTestId('veredicto-confirmado').waitFor();

  // Historial y detalle.
  await page.getByTestId('nav-history').click();
  await expect(page.getByTestId('revision-row')).toHaveCount(3);
  await foto(page, '11-historial');
  await page.getByTestId('revision-row').nth(1).click();
  await page.getByTestId('revision-detalle').waitFor();
  await foto(page, '12-historial-detalle', true);

  // Exportar evidencia (descarga resumen-<evento_id>.json).
  const descarga = page.waitForEvent('download');
  await page.getByTestId('exportar-evidencia-btn').click();
  await descarga;
  await page.getByTestId('exportar-ok').waitFor();
  await foto(page, '13-historial-exportado');

  // Inicio con el resumen de la sesión.
  await page.getByTestId('nav-dashboard').click();
  await page.getByTestId('resumen-sesion').waitFor();
  await foto(page, '14-inicio-con-resumen');

  // Finalizar el combate.
  await page.getByTestId('finalizar-combate-btn').click();
  await expect(page.getByTestId('combate-activo')).toHaveCount(0);
  await foto(page, '15-combate-finalizado');
});
