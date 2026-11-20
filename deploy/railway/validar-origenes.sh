#!/bin/sh
# Valida FOG_ORIGENES_EXTRA antes de generar la configuración de nginx (DEPLOY11).
# Cada entrada debe ser un origen https:// sin comodín, sin ruta y sin usuario; si no, el contenedor
# no arranca (así un valor mal escrito no abre la CSP a más de lo previsto).
set -eu
set -f  # sin expansión de comodines: un "*" se valida como texto
for origen in ${FOG_ORIGENES_EXTRA:-}; do
    printf '%s' "$origen" | LC_ALL=C grep -Eq '^https://[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?(:[0-9]{1,5})?$' || {
        echo "FOG_ORIGENES_EXTRA: '$origen' no es un origen https://host[:puerto] válido (sin comodines ni rutas)." >&2
        exit 1
    }
done
