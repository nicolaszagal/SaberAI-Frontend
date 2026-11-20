import { defineConfig, devices } from '@playwright/test';

/**
 * Prueba por navegador del modo remoto (DEPLOY11): el frontend servido por HTTPS contra un Fog en
 * http://localhost. No levanta nada: necesita (1) el frontend por HTTPS (certificado de prueba) en
 * E2E_NAV_URL, (2) un Fog real en http://localhost:8001 con CORS_ORIGINS que incluya ese origen y
 * (3) E2E_NAV_USER / E2E_NAV_PASSWORD. Ver e2e-navegadores/LEEME.md.
 *
 *   E2E_NAV_URL=https://localhost:8443 E2E_NAV_USER=... E2E_NAV_PASSWORD=... \
 *     npx playwright test -c playwright.navegadores.config.ts
 */
export default defineConfig({
  testDir: './e2e-navegadores',
  timeout: 60_000,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_NAV_URL ?? 'https://localhost:8443',
    ignoreHTTPSErrors: true, // certificado de prueba autofirmado
    viewport: { width: 1280, height: 800 },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
