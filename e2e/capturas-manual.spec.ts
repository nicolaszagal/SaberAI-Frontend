import { test, expect, type Page } from '@playwright/test';

/**
 * Capturas del manual de usuario contra el sistema real: Fog, Cloud, Redis y PostgreSQL
 * levantados, sin API simulada. Recorre una sesión completa con tres revisiones (mantener,
 * cambiar y anular, cada una con su pregunta y su resumen) y guarda las 13 imágenes del
 * manual. Todas se regeneran juntas para que muestren el mismo evento. Solo corre con
 * `CAPTURAS=1 SISTEMA_REAL=1 npx playwright test -c playwright.capturas.config.ts` (la configuración
 * `playwright.capturas.config.ts` no levanta Expo: usa la interfaz ya servida en `CAPTURAS_URL`, por defecto
 * la de Docker en http://localhost:8081, la misma que ve un revisor).
 * Usa Google Chrome (`channel: 'chrome'`) porque el Chromium de Playwright no reproduce H.264.
 *
 * Variables obligatorias (sin ellas las rutas quedan vacías y la prueba falla):
 *   SABRE_USUARIO       usuario maestro de Fog (el AUTH_USER de su .env).
 *   SABRE_PASSWORD      su contraseña (la que escribió al instalar; no se imprime ni se guarda).
 *   CLIP_1              ruta absoluta del clip de la revisión 1 (el árbitro elige la sugerida).
 *   CLIP_2              ruta absoluta del clip de la revisión 2 (el árbitro elige otra clase).
 *   CLIP_SIN_TIRADORES  ruta absoluta de un video sin tiradores ("Clasificación no disponible").
 *   CLIP_1_T_MS         instante del tocado del CLIP_1, en ms: primer fotograma con luz de
 *                       dataset/labels/luz_annotations.csv dividido por los fps (criterio de
 *                       backend/docs/evidencia/prueba_humo_Q02.md).
 *   CLIP_2_T_MS         ídem para CLIP_2 (luz A).
 *   CAPTURAS_DIR        carpeta de salida (ruta absoluta), p. ej. backend/docs/manuales/img.
 * Opcionales:
 *   EVENTO_NOMBRE       evento de la sesión; por defecto "Evento de prueba" (precargado por la
 *                       migración 0005). No se crea ninguno.
 *   ARBITRO_NOMBRE      árbitro del combate; por defecto "Árbitro de prueba" (precargado).
 *   CLIP_2_T_B_MS       instante de la luz B del CLIP_2; por defecto, el mismo de la luz A.
 * Además, E2E_PORT (puerto del frontend de la prueba) y EXPO_PUBLIC_FOG_URL (Fog de la
 * prueba). Con el stack de la guía levantado, Fog está en http://localhost:8001.
 */
test.skip(!process.env.CAPTURAS || !process.env.SISTEMA_REAL, 'Definir CAPTURAS=1 y SISTEMA_REAL=1');

const DIR = process.env.CAPTURAS_DIR ?? 'capturas/DOC01';
const EVENTO_NOMBRE = process.env.EVENTO_NOMBRE ?? 'Evento de prueba';
const ARBITRO_NOMBRE = process.env.ARBITRO_NOMBRE ?? 'Árbitro de prueba';
const CLIP_1 = process.env.CLIP_1 ?? '';
const CLIP_2 = process.env.CLIP_2 ?? '';
const CLIP_SIN_TIRADORES = process.env.CLIP_SIN_TIRADORES ?? '';
const CLIP_1_T_MS = Number(process.env.CLIP_1_T_MS ?? 0);
const CLIP_2_T_MS = Number(process.env.CLIP_2_T_MS ?? 0);
const CLIP_2_T_B_MS = Number(process.env.CLIP_2_T_B_MS ?? CLIP_2_T_MS);
const USUARIO = process.env.SABRE_USUARIO ?? '';
const PASSWORD = process.env.SABRE_PASSWORD ?? '';

test.use({ viewport: { width: 1280, height: 800 }, channel: 'chrome' });

const foto = (page: Page, nombre: string, fullPage = false) =>
  page.screenshot({ path: `${DIR}/${nombre}.png`, fullPage });

/** Lleva el reproductor al instante `ms` y espera a que termine de buscar. */
async function irAlInstante(page: Page, ms: number) {
  await page.evaluate(t => {
    const v = document.querySelector('[data-testid="video-player"]') as HTMLVideoElement;
    v.currentTime = t / 1000;
  }, ms);
  await page.waitForFunction(t => {
    const v = document.querySelector('[data-testid="video-player"]') as HTMLVideoElement;
    return Math.abs(v.currentTime * 1000 - t) < 50 && !v.seeking;
  }, ms);
}

/**
 * Elige el clip y marca cada luz en su propio instante (ms); `null` deja la luz sin marcar.
 * Las luces se reinician al elegir otro clip.
 */
async function prepararClip(page: Page, ruta: string, luces: { a: number | null; b: number | null }) {
  await page.getByTestId('file-input').setInputFiles(ruta);
  await page.getByTestId('video-player').waitFor();
  await page.waitForFunction(() => {
    const v = document.querySelector('[data-testid="video-player"]') as HTMLVideoElement | null;
    return !!v && v.readyState >= 1;
  });
  for (const [lado, ms] of [['a', luces.a], ['b', luces.b]] as const) {
    if (ms === null) continue;
    await irAlInstante(page, ms);
    await page.getByTestId(`marcar-luz-${lado}-btn`).click();
  }
}

test('sesión completa del manual de usuario', async ({ page }) => {
  test.setTimeout(240_000);

  // Sin sesión, la app muestra solo el inicio de sesión.
  await page.goto('/');
  // Oculta el video: los clips son de competencia y sus derechos de imagen no son del autor, así que ninguna captura muestra
  // fotogramas de atletas (el reproductor queda en blanco; los trazos de pose sí se muestran, sobre negro).
  await page.addStyleTag({ content: 'video { opacity: 0 !important; }' });
  await page.getByTestId('login-btn').waitFor();
  await foto(page, '00-login');
  await page.getByTestId('login-usuario').fill(USUARIO);
  await page.getByTestId('login-password').fill(PASSWORD);
  await page.getByTestId('login-btn').click();
  await expect(page.getByTestId('health-indicator')).toContainText('Conectado');
  await page.getByTestId('sin-combate').waitFor();
  await foto(page, '01-revision-sin-combate');

  // Configurar el combate (CU-01).
  await page.getByTestId('nav-config').click();
  await page.getByTestId('crear-combate-btn').waitFor();
  // El evento "Validación 1", el árbitro único y la pista "P1" vienen preseleccionados (V01);
  // los alias son opcionales y quedan vacíos. Solo se cambia el evento y se elige el brazo armado.
  await page.locator('[data-testid^="evento-"]').filter({ hasText: EVENTO_NOMBRE }).first().click();
  await page.locator('[data-testid^="arbitro-"]').filter({ hasText: ARBITRO_NOMBRE }).first().click();
  await page.getByTestId('tirador-a-brazo-right').click();
  await page.getByTestId('tirador-b-brazo-right').click();
  await foto(page, '02-combate-formulario', true);
  await page.getByTestId('crear-combate-btn').click();
  await expect(page.getByTestId('combate-activo')).toBeVisible();
  await foto(page, '03-combate-activo');

  // Revisión 1: la sugerencia coincide y el árbitro mantiene.
  await page.getByTestId('nav-live').click();
  await page.getByTestId('analizar-btn').waitFor();
  await prepararClip(page, CLIP_1, { a: CLIP_1_T_MS, b: null });
  await foto(page, '04-revision-clip-listo');
  await page.getByTestId('analizar-btn').click();
  await page.getByTestId('status-analyzing').waitFor();
  await page.waitForTimeout(1200);
  await foto(page, '05-revision-analizando');
  await page.getByTestId('status-done').waitFor({ timeout: 90_000 });
  await foto(page, '06-revision-sugerencia');
  // Interpretación: trazos de pose y razonamiento (UX01).
  await page.getByTestId('ver-interpretacion-btn').click();
  await page.getByTestId('trazos-lienzo').waitFor({ timeout: 30_000 });
  await page.getByTestId('razonamiento-estado').waitFor({ timeout: 30_000 });
  await foto(page, '06b-interpretacion');
  await page.keyboard.press('Escape');
  await page.getByTestId('vista-interpretacion').waitFor({ state: 'hidden' });
  await page.getByTestId('modifica-no').click();
  await page.getByTestId('resumen-decision').waitFor();
  await page.getByTestId('veredicto-enviar').click();
  await page.getByTestId('veredicto-confirmado').waitFor();
  await foto(page, '07-revision-veredicto-registrado');

  // Revisión 2: el árbitro cambia la clase final.
  await prepararClip(page, CLIP_2, { a: CLIP_2_T_MS, b: CLIP_2_T_B_MS });
  await page.getByTestId('analizar-btn').click();
  await page.getByTestId('status-done').waitFor({ timeout: 90_000 });
  await page.getByTestId('modifica-si').click();
  await page.getByTestId('selector-clase').waitFor();
  await page.getByTestId('clase-AttackA').click();
  await page.getByTestId('resumen-decision').waitFor();
  await page.getByTestId('veredicto-enviar').scrollIntoViewIfNeeded();
  await foto(page, '08-revision-selector-clase');
  await page.getByTestId('veredicto-enviar').click();
  await page.getByTestId('veredicto-confirmado').waitFor();

  // Revisión 3: sin tiradores detectables, "Clasificación no disponible"; el árbitro anula.
  await prepararClip(page, CLIP_SIN_TIRADORES, { a: 0, b: null });
  await page.getByTestId('analizar-btn').click();
  await page.getByTestId('no-disponible').waitFor({ timeout: 90_000 });
  await foto(page, '09-revision-no-disponible');
  await page.getByTestId('veredicto-anular').click();
  await page.getByTestId('veredicto-enviar').click();
  await page.getByTestId('veredicto-confirmado').waitFor();

  // Historial y detalle.
  await page.getByTestId('nav-history').click();
  await expect(page.getByTestId('revision-row')).toHaveCount(3);
  await page.getByTestId('resumen-sesion').waitFor();
  await foto(page, '10-historial');
  await page.getByTestId('revision-row').nth(1).click();
  await page.getByTestId('revision-detalle').waitFor();
  await foto(page, '11-historial-detalle', true);

  // Exportar evidencia (descarga resumen-<evento_id>.json).
  const descarga = page.waitForEvent('download');
  await page.getByTestId('exportar-evidencia-btn').click();
  await descarga;
  await page.getByTestId('exportar-ok').waitFor();
  await foto(page, '12-historial-exportado');

  // Cerrar la sesión de validación (D-22, D-26): respaldo verificado y, solo si pasa, borrado de los clips.
  await page.getByTestId('nav-config').click();
  await page.getByTestId('cerrar-validacion-btn').click();
  await page.getByTestId('cerrar-validacion-confirmacion').waitFor();
  await foto(page, '12b-cerrar-sesion-confirmacion');
  await page.getByTestId('cerrar-validacion-confirmar').click();
  await page.getByTestId('cerrar-validacion-ok').waitFor({ timeout: 120_000 });
  await foto(page, '12c-cerrar-sesion-ok');

  // Cerrar la sesión limpia el combate activo: la revisión vuelve a pedir configurarlo.
  await page.getByTestId('nav-live').click();
  await page.getByTestId('sin-combate').waitFor();
  await foto(page, '13-sesion-cerrada');
});
