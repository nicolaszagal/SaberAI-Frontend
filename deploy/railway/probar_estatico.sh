#!/bin/sh
# Prueba de la imagen estática de Railway (DEPLOY11), con nginx:alpine y los archivos de deploy/railway/.
# Comprueba: /healthz, que no exista /api, la CSP (loopback sí, comodín https: no, FOG_ORIGENES_EXTRA solo
# https) y que un valor inválido de FOG_ORIGENES_EXTRA impida arrancar.
# Uso, desde SaberAISoftware/: sh deploy/railway/probar_estatico.sh
set -eu
cd "$(dirname "$0")/../.."
NOMBRE=sabre-estatico-prueba
HTML=$(mktemp -d "$PWD/.estatico.XXXXXX")  # dentro del repo: Colima solo comparte /Users
echo '<!doctype html><title>sabre</title>' > "$HTML/index.html"
trap 'docker rm -f $NOMBRE >/dev/null 2>&1; rm -rf "$HTML"' EXIT

arrancar() { # arrancar <FOG_ORIGENES_EXTRA>
    docker rm -f $NOMBRE >/dev/null 2>&1 || true
    docker run -d --name $NOMBRE -p 127.0.0.1:18098:8098 -e PORT=8098 -e "FOG_ORIGENES_EXTRA=$1" \
        -v "$PWD/deploy/railway/nginx.estatico.conf.template:/etc/nginx/templates/default.conf.template:ro" \
        -v "$PWD/deploy/railway/validar-origenes.sh:/docker-entrypoint.d/15-validar-origenes.sh:ro" \
        -v "$HTML:/usr/share/nginx/html:ro" nginx:alpine >/dev/null
    sleep 3
}

arrancar ""
[ "$(curl -s -m 5 -o /dev/null -w '%{http_code}' http://127.0.0.1:18098/healthz)" = 200 ] || { echo "FALLA: /healthz" >&2; exit 1; }
api=$(curl -s -m 5 http://127.0.0.1:18098/api/eventos)
case "$api" in *"<title>sabre</title>"*) ;; *) echo "FALLA: /api/ no debe reenviarse a ningún lado (devolvió: $api)" >&2; exit 1 ;; esac
csp=$(curl -s -m 5 -D - -o /dev/null http://127.0.0.1:18098/ | tr -d '\r' | sed -n 's/^[Cc]ontent-[Ss]ecurity-[Pp]olicy: //p')
case "$csp" in *"connect-src 'self' http://localhost:* http://127.0.0.1:* ;"*) ;; *) echo "FALLA: connect-src inesperado: $csp" >&2; exit 1 ;; esac
case "$csp" in *" https: "*|*" https:;"*|*"*.*"*) echo "FALLA: la CSP tiene un comodín: $csp" >&2; exit 1 ;; esac

arrancar "https://fog-sede.ejemplo.com https://otro.ejemplo.com:8443"
csp=$(curl -s -m 5 -D - -o /dev/null http://127.0.0.1:18098/ | tr -d '\r' | sed -n 's/^[Cc]ontent-[Ss]ecurity-[Pp]olicy: //p')
case "$csp" in *"http://127.0.0.1:* https://fog-sede.ejemplo.com https://otro.ejemplo.com:8443;"*) ;; *) echo "FALLA: orígenes extra no aparecen: $csp" >&2; exit 1 ;; esac

for malo in "https://*.ejemplo.com" "http://fog.ejemplo.com" "https:" "https://fog.ejemplo.com/ruta" "*"; do
    arrancar "$malo"
    estado=$(docker inspect -f '{{.State.Status}}' $NOMBRE)
    [ "$estado" = exited ] || { echo "FALLA: FOG_ORIGENES_EXTRA='$malo' debía impedir el arranque (estado $estado)" >&2; exit 1; }
done
echo OK
