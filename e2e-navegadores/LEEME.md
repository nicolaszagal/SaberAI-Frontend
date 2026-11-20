# Prueba por navegador del modo remoto (DEPLOY11)

Comprueba qué ve el usuario en Chromium, Firefox y WebKit cuando el frontend, servido por **HTTPS**, habla con su
Fog en `http://localhost:8001`. No se ejecuta con `npx playwright test` (que corre `e2e/`): necesita servicios
reales y por eso tiene su propia configuración.

1. Exporte el frontend y sírvalo por HTTPS con un certificado de prueba y la CSP de `deploy/railway/nginx.estatico.conf.template`.
2. Levante un Fog en `http://localhost:8001` con `CORS_ORIGINS=https://localhost:8443` (y `CLOUD_TRANSPORTE=http`).
3. Corra:

```bash
npx playwright install chromium firefox webkit
E2E_NAV_URL=https://localhost:8443 E2E_NAV_USER=<usuario> E2E_NAV_PASSWORD=<clave> \
  npx playwright test -c playwright.navegadores.config.ts
```

Las anotaciones de cada prueba (`probar`, `login`, `bloqueos`) quedan en el reporte. Resultados y lo que significan
para el usuario: `backend/docs/manuales/GUIA_EJECUCION.md`, modo B.
