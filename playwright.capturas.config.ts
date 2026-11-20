import { defineConfig, devices } from '@playwright/test';

/**
 * Configuración solo para las capturas del manual (e2e/capturas-manual.spec.ts). No levanta Expo ni
 * usa `globalSetup`: las capturas se toman sobre la interfaz ya servida (por defecto la de Docker, la
 * que ve un revisor), en `CAPTURAS_URL`. Las pruebas E2E normales siguen con `playwright.config.ts`.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: 'capturas-manual.spec.ts',
  timeout: 240_000,
  use: {
    baseURL: process.env.CAPTURAS_URL ?? 'http://localhost:8081',
    viewport: { width: 1280, height: 800 },
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
