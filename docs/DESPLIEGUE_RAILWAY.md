# Despliegue del frontend en Railway (DEPLOY06, DEPLOY11)

Un contenedor nginx sirve el build estático de Expo. **No hay `/api`, ni reenviador, ni Tailscale** (DEPLOY11): el navegador de cada usuario habla con su propio Fog (`http://localhost:<puerto>` o `https://...`), que se escribe en el campo "Nodo Fog" del login, y ese Fog sale por HTTPS hacia Cloud. El diseño anterior (proxy `/api` hacia un solo Fog por la tailnet) se retiró de `main` y se conserva en la rama `historico/tailnet`.

## Archivos

| Archivo | Función |
|---|---|
| `deploy/railway/Dockerfile` | Build de Expo (sin `EXPO_PUBLIC_FOG_URL`) e imagen nginx. |
| `deploy/railway/nginx.conf.template` | Servidor estático, `/healthz` y cabeceras de seguridad con la CSP. |
| `deploy/railway/validar-origenes.sh` | Valida `FOG_ORIGENES_EXTRA` antes de arrancar nginx. |
| `deploy/railway/probar_estatico.sh` | Prueba la imagen con `nginx:alpine`: `/healthz`, ausencia de `/api`, CSP y validación de orígenes. |
| Variable `RAILWAY_DOCKERFILE_PATH=deploy/railway/Dockerfile` | Selecciona el Dockerfile. Healthcheck `/healthz` y reintentos (máximo 3 ante fallo) se fijan en el panel del servicio. |

El contexto de build es la raíz de este repo. Los proyectos nuevos de Railway ignoran `railway.json`.

## Variables

| Variable | Valor |
|---|---|
| `PORT` | la asigna Railway (8081 por defecto) |
| `FOG_ORIGENES_EXTRA` | opcional: orígenes `https://` de Fog remotos, separados por espacios. Sin comodín ni rutas; un valor inválido impide arrancar el contenedor |

## CSP

`default-src 'self'; connect-src 'self' http://localhost:* http://127.0.0.1:* <FOG_ORIGENES_EXTRA>; img-src 'self' data: blob:; media-src 'self' blob:; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'`. Sin comodín `https:`.

## Verificación

```bash
sh deploy/railway/probar_estatico.sh        # debe terminar en OK
curl -s https://<dominio>/healthz            # ok
```

Despliegue completo, tokens de nodo y operación: `backend/docs/manuales/DESPLIEGUE_REMOTO.md`.
