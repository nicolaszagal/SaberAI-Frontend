#!/bin/sh
# Une el contenedor a la tailnet (DEPLOY09) y luego arranca nginx.
# Requiere TS_AUTHKEY: clave efímera de Tailscale etiquetada tag:frontend, cargada como variable
# sealed. Abre un único reenviador, 127.0.0.1:18001 -> $TS_MAC_HOST:8001 (Fog). La política de la
# tailnet solo deja a tag:frontend llegar a ese puerto. Nunca se imprime la clave.
set -eu

[ -n "${TS_AUTHKEY:-}" ] || { echo "Falta TS_AUTHKEY (clave de Tailscale con tag:frontend)." >&2; exit 1; }
# Sin el token nginx enviaría X-Proxy-Token vacío y Fog respondería 403 a todo: se niega a arrancar.
[ -n "${PROXY_SHARED_TOKEN:-}" ] || { echo "Falta PROXY_SHARED_TOKEN (el mismo valor que en Fog)." >&2; exit 1; }
SOCK=/tmp/tailscaled.sock
# Con el MTU por defecto (1280) los paquetes completos Mac -> Railway no llegan (medido el 13/11/2026:
# respuestas de hasta 1000 bytes pasan, de 1300 en adelante se pierden y el handshake TLS expira).
# Un MTU menor hace que el contenedor anuncie un MSS menor. Medido: con 1100 llegan 3000 bytes.
export TS_DEBUG_MTU="${TS_DEBUG_MTU:-1100}"

tailscaled --tun=userspace-networking --statedir=/tmp/ts --socket="$SOCK" >/tmp/tailscaled.log 2>&1 &
n=0
until [ -S "$SOCK" ]; do
    n=$((n + 1))
    [ "$n" -lt 50 ] || { echo "tailscaled no arrancó" >&2; exit 1; }
    sleep 0.2
done
tailscale --socket="$SOCK" up --auth-key="$TS_AUTHKEY" --hostname="${TS_HOSTNAME:-sabre-frontend}" \
    --accept-dns=true --accept-routes=false >/dev/null
unset TS_AUTHKEY

socat "TCP-LISTEN:18001,bind=127.0.0.1,fork,reuseaddr" \
    "EXEC:tailscale --socket=$SOCK nc ${TS_MAC_HOST:-sabre-mac} 8001" &
echo "tailnet lista: $(tailscale --socket="$SOCK" ip -4)"
exec "$@"
