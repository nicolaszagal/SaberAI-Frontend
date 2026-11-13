#!/bin/sh
# Une el contenedor a la tailnet (DEPLOY09) y luego arranca nginx.
# Requiere TS_AUTHKEY: clave efímera de Tailscale etiquetada tag:frontend, cargada como variable
# sealed. Abre un único reenviador, 127.0.0.1:18001 -> $TS_MAC_HOST:8001 (Fog). La política de la
# tailnet solo deja a tag:frontend llegar a ese puerto. Nunca se imprime la clave.
set -eu

[ -n "${TS_AUTHKEY:-}" ] || { echo "Falta TS_AUTHKEY (clave de Tailscale con tag:frontend)." >&2; exit 1; }
SOCK=/tmp/tailscaled.sock

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
