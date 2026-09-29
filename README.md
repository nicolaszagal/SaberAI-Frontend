# SaberAI-Frontend

Interfaz web (Expo / React Native web, TypeScript) de SABRE.AI. Muestra la **sugerencia** del sistema para un tocado de sable; la decisión final es siempre del árbitro. Pantallas de la Validación 1: Inicio, Revisión VAR, Historial y Configuración del combate.

## Comandos

```bash
npm install
npx expo start --web     # servidor de desarrollo (puerto 8081 por defecto)
npx tsc --noEmit         # tipos
npx playwright test      # pruebas E2E
```

## Pruebas E2E: puerto configurable (`E2E_PORT`)

`playwright.config.ts` levanta la app con `expo start --web` y usa ese mismo puerto como `baseURL`. Por defecto es `8081`; se cambia con la variable de entorno `E2E_PORT`:

```bash
E2E_PORT=8091 npx playwright test
```

Conviene fijarla cuando el 8081 está ocupado. Como el servidor se reutiliza si ya responde (`reuseExistingServer`), un contenedor o proceso ajeno en ese puerto hace que las pruebas corran contra otra versión de la app.

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
