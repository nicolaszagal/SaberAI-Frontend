#!/bin/sh
# Prueba del proxy nginx de Railway (DEPLOY07): el contenedor debe arrancar y
# responder /healthz aunque el túnel de Fog no exista, y /api/ debe fallar solo
# en la petición (502/504), no al arrancar.
# Uso, desde SaberAISoftware/: sh deploy/railway/probar_nginx.sh
set -eu
cd "$(dirname "$0")/../.."
NOMBRE=sabre-nginx-prueba
docker rm -f $NOMBRE >/dev/null 2>&1 || true
docker run -d --name $NOMBRE -p 127.0.0.1:18099:8099 \
    -e PORT=8099 -e CLIP_MAX_MB=200 -e PROXY_SHARED_TOKEN=prueba \
    -e FOG_UPSTREAM=https://tunel-que-no-existe.trycloudflare.com \
    -v "$PWD/deploy/railway/nginx.conf.template:/etc/nginx/templates/default.conf.template:ro" \
    nginx:alpine >/dev/null
trap 'docker rm -f $NOMBRE >/dev/null 2>&1' EXIT
sleep 3
health=$(curl -s -m 5 -o /dev/null -w "%{http_code}" http://127.0.0.1:18099/healthz || true)
api=$(curl -s -m 15 -o /dev/null -w "%{http_code}" http://127.0.0.1:18099/api/eventos || true)
echo "healthz=$health api=$api"
[ "$health" = "200" ] || { echo "FALLA: el contenedor no arrancó sin túnel" >&2; docker logs $NOMBRE 2>&1 | tail -3 >&2; exit 1; }
case "$api" in 502|503|504) ;; *) echo "FALLA: /api/ debía responder 502/503/504 sin túnel (fue $api)" >&2; exit 1 ;; esac
echo "OK"
