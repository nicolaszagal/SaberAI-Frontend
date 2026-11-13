#!/bin/sh
# Prueba del entrypoint del frontend en Railway (DEPLOY09): sin TS_AUTHKEY o sin
# PROXY_SHARED_TOKEN debe salir con error que nombre la variable, antes de arrancar tailscaled.
# Uso, desde SaberAISoftware/: sh deploy/railway/probar_entrypoint.sh
set -eu
cd "$(dirname "$0")"
E=./tailscale-entrypoint.sh

fallo() { # nombre salida_esperada_en_stderr, resto: entorno
    nombre=$1; shift
    if salida=$(env -i PATH="$PATH" "$@" sh "$E" true 2>&1); then
        echo "FALLA: arrancó sin $nombre" >&2; exit 1
    fi
    case "$salida" in
        *"$nombre"*) echo "OK: sin $nombre sale con error" ;;
        *) echo "FALLA: el error no nombra $nombre: $salida" >&2; exit 1 ;;
    esac
}

fallo PROXY_SHARED_TOKEN TS_AUTHKEY=x
fallo TS_AUTHKEY PROXY_SHARED_TOKEN=x
