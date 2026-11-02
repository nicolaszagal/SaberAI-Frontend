import { defineConfig, devices } from '@playwright/test';

/**
 * Puerto del servidor web de las pruebas E2E (variable E2E_PORT, por defecto 8099). No es el 8081
 * porque el túnel SSH al despliegue remoto suele ocuparlo.
 */
const PORT = Number(process.env.E2E_PORT ?? 8099);
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  globalSetup: './e2e/globalSetup.ts',
  use: {
    baseURL: BASE_URL,
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command: `npx expo start --web --port ${PORT}`,
    url: BASE_URL,
    // Solo con E2E_REUSE=1 se reutiliza un servidor ya levantado; por defecto un puerto ocupado
    // hace fallar la corrida en vez de probar contra lo que haya escuchando. `globalSetup`
    // verifica además que lo servido sea el Expo local.
    reuseExistingServer: process.env.E2E_REUSE === '1',
    timeout: 120_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
