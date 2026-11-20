# SaberAI-Frontend

Interfaz web (Expo / React Native web, TypeScript) de SABRE.AI. Muestra la **sugerencia** del sistema para un tocado de sable; la decisión final es siempre del árbitro. Pantallas: inicio de sesión, Revisión VAR (pantalla por defecto), Historial y Combate.

## Para instalar y usar el sistema completo

Este repositorio es solo la interfaz. La instalación, la ejecución y el manual de usuario están en el repositorio del backend (`SaberAITesis`), carpeta `docs/manuales/`:

- `GUIA_INSTALACION.md`: requisitos e instalación.
- `GUIA_EJECUCION.md`: cómo arrancar y usar el sistema (el modo A construye este frontend con Docker, sin Node).
- `MANUAL_USUARIO.md`: uso de la interfaz, con capturas.
- `GUIA_DESARROLLO.md`: pruebas, arquitectura y convenciones (incluye Playwright).

La interfaz habla solo con Fog (la API del backend). Su dirección sale de `EXPO_PUBLIC_FOG_URL` (`http://localhost:8001` por defecto, ver `src/infrastructure/config.ts`).

## Comandos

```bash
npm install
npx expo start --web     # servidor de desarrollo (puerto 8081 por defecto)
npx tsc --noEmit         # tipos
npx playwright test      # pruebas E2E
```

## Pruebas E2E: nunca contra el despliegue

`playwright.config.ts` levanta el Expo local con `expo start --web` en el puerto **8099** (no en el 8081, que el túnel SSH al despliegue suele ocupar) y lo usa como `baseURL`. Se cambia con `E2E_PORT`:

```bash
E2E_PORT=8091 npx playwright test
```

- Si el puerto ya está ocupado, la corrida **falla** en vez de probar contra lo que haya escuchando. Solo con `E2E_REUSE=1` se reutiliza un Expo local ya levantado (`E2E_REUSE=1 npx playwright test`).
- `e2e/globalSetup.ts` aborta si la página servida no es el Expo local (responde el nginx del contenedor o una exportación estática en lugar del servidor de desarrollo). Su lógica está en `e2e/servidorLocal.ts` y se prueba en `e2e/servidor-local.spec.ts`.

## Sistema visual

Los tokens están en `src/presentation/theme/`:

- `tokens.ts`: escala tipográfica 12 / 14 / 16 / 20 / 28 px, espaciado base de 4 px (`space(n)`), radios y alto mínimo de control (44 px).
- `colors.ts`: colores del tema claro y oscuro. Todo color de texto cumple contraste AA (4.5:1); lo verifica `e2e/contraste.spec.ts`.
- `fencer.ts`: el tirador A va en rojo y el B en verde, siempre con texto (`A · ROJ`, `B · VER`); el color nunca es el único indicador.

Botones y estados comunes: `components/Button.tsx` (mínimo 44 px, atajo visible), `components/StateMessage.tsx` (vacío, cargando y error con la acción siguiente) y `hooks/useShortcut.ts` (atajos de teclado en web).

## Capturas de pantalla

```bash
CAPTURAS=1 E2E_PORT=8091 npx playwright test e2e/capturas.spec.ts
```

Genera `capturas/U02/<1280x800|1024x768>/` en tema claro y oscuro.
