# Despliegue del frontend en Railway (DEPLOY06)

Un único contenedor nginx sirve el build estático de Expo en `/` y reenvía `/api/` al Fog
(túnel https), agregando `X-Proxy-Token` y la IP real del cliente. El navegador solo habla con
su propio origen, así que no necesita CORS. El acceso lo controla el login del Fog (JWT).

## Archivos

| Archivo | Función |
|---|---|
| `deploy/railway/Dockerfile` | Build de Expo con `EXPO_PUBLIC_FOG_URL=/api` y imagen nginx. |
| `deploy/railway/nginx.conf.template` | Servidor estático, proxy `/api/`, cabeceras de seguridad. |
| `deploy/railway/railway.json` | Builder `DOCKERFILE`, healthcheck `/healthz`. |

En el servicio de Railway, indicar la ruta del archivo de configuración
`/deploy/railway/railway.json` (Settings → Config-as-code). Railway marca config-as-code como
heredado hasta 2026-12-01; si se migra a Infrastructure as Code, conservar el Dockerfile y el
healthcheck. El contexto de build es la raíz del repo del frontend.

## Variables (Railway → Variables)

| Variable | Obligatoria | Descripción |
|---|---|---|
| `FOG_UPSTREAM` | sí | URL https del túnel de Fog, **sin barra final** (`https://xxxx.trycloudflare.com`). |
| `PROXY_SHARED_TOKEN` | sí | Mismo valor que `PROXY_SHARED_TOKEN` de Fog. Sin él Fog responde 403. |
| `CLIP_MAX_MB` | sí | Igual a `CLIP_MAX_MB` de Fog (entero; por defecto 200). Un clip mayor recibe 413. |
| `PORT` | no | Lo inyecta Railway; por defecto 8081. |

Se leen al arrancar (envsubst sobre `/etc/nginx/templates`): cambiarlas no exige reconstruir la
imagen, solo **redesplegar/reiniciar** el servicio.

## Cambiar la URL del túnel

1. Servicio → Variables → editar `FOG_UPSTREAM` con la URL nueva.
2. Redesplegar (Railway lo propone al guardar). nginx resuelve el host al arrancar.
3. Verificar (abajo).

## Verificar

```bash
URL=https://<dominio-railway>
curl -s  $URL/healthz                  # ok (contenedor vivo, no prueba el túnel)
curl -s  $URL/api/health               # {"fog":"ok",...}: prueba túnel + X-Proxy-Token
curl -sI $URL/ | grep -iE 'strict|content-security|x-content|referrer|permissions'
```

- `/api/health` con 403 → `PROXY_SHARED_TOKEN` distinto al de Fog. Con 502/504 → túnel caído o
  `FOG_UPSTREAM` desactualizado.
- En el navegador debe verse el login; con credenciales correctas, Revisión VAR.

## Cabeceras y CSP

Se envían `Strict-Transport-Security: max-age=31536000`, `X-Content-Type-Options: nosniff`,
`Referrer-Policy: no-referrer`, `Permissions-Policy: camera=(), microphone=()` y
`Content-Security-Policy: default-src 'self'; connect-src 'self'; img-src 'self' data: blob:;
media-src 'self' blob:; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'`.
Ajustes sobre la base pedida:

- `media-src 'self' blob:` — el reproductor del clip usa `URL.createObjectURL`; sin esto
  `default-src 'self'` bloquea el video.
- `style-src 'unsafe-inline'` — react-native-web inyecta `<style>` en tiempo de ejecución.
- No hizo falta `'unsafe-inline'` en scripts: el export carga un único `.js` externo.

IP del cliente: se usa `X-Real-IP` (la documenta Railway) y se envía a Fog como único valor de
`X-Forwarded-For`; un `X-Forwarded-For` enviado por el navegador se descarta. Fog toma la
última entrada para el bloqueo de login (5 fallos en 15 min). Sin `X-Real-IP` (ejecución local)
se usa la IP del socket.

## Prueba local del contenedor

```bash
docker build -f deploy/railway/Dockerfile -t sabre-front-railway .
docker run --rm -p 18080:8081 -e FOG_UPSTREAM=http://host.docker.internal:8001 \
  -e PROXY_SHARED_TOKEN=prueba -e CLIP_MAX_MB=200 sabre-front-railway
```

Resultado del 2026-10-08 con un Fog simulado que devuelve las cabeceras recibidas: `/` sirve
la app; `/healthz` responde `ok`; `/api/health` llega a `/health` con `X-Proxy-Token` propio
(el enviado por el cliente se reemplaza) y `X-Forwarded-For` = `X-Real-IP`; un clip de 2 MB con
`CLIP_MAX_MB=1` devuelve 413 con `{"detail": ...}`. **No se probó** el túnel https real
(`proxy_ssl_server_name on`): queda para la verificación en Railway.

## Auditoría de dependencias (`npm audit --omit=dev`)

Tras `npm audit fix` (sin `--force`) desaparece el crítico (`shell-quote`) y quedan
24 (7 moderadas, 17 altas). Todas son de la cadena de herramientas de build (expo CLI, metro,
`@react-native/community-cli-plugin`, `micromatch`, `postcss`, `node-forge`, etc.) y no se
incluyen en el bundle que sirve nginx. La única corrección que ofrece npm es `--force`, que
instala `expo@44` / `react-native@0.72` (retroceso de versiones mayores), por lo que no se
aplica. Se reevalúa al actualizar Expo.
