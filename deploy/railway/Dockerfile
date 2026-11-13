# Contenedor único para Railway (DEPLOY06): build estático de Expo (mismo origen,
# EXPO_PUBLIC_FOG_URL=/api) servido por nginx, que además reenvía /api/ al Fog.
# Contexto de build: la raíz del repo del frontend.
# DEPLOY09: Tailscale fijo en la versión probada en la Parte 0 (solo los binarios).
ARG TS_VERSION=1.104.4
FROM tailscale/tailscale:v${TS_VERSION} AS tailscale

FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV EXPO_PUBLIC_FOG_URL=/api
ENV CI=1
ENV EXPO_NO_TELEMETRY=1

RUN npx expo export --platform web --output-dir dist

FROM nginx:alpine

# socat: reenviador local hacia Fog (mac:8001) por la tailnet, en modo userspace (sin NET_ADMIN).
RUN apk add --no-cache socat
COPY --from=tailscale /usr/local/bin/tailscaled /usr/local/bin/tailscale /usr/local/bin/
COPY deploy/railway/tailscale-entrypoint.sh /usr/local/bin/sabre-tailscale-entrypoint.sh

# La plantilla se procesa al arrancar con envsubst: FOG_UPSTREAM, PROXY_SHARED_TOKEN,
# CLIP_MAX_MB y PORT se leen del entorno sin reconstruir la imagen.
COPY deploy/railway/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

# Railway inyecta PORT; 8081 por defecto. CLIP_MAX_MB debe igualar el de Fog.
ENV PORT=8081
ENV CLIP_MAX_MB=200
# Fog se alcanza por el reenviador local de la tailnet; ya no hay URL pública que cambiar.
ENV FOG_UPSTREAM=http://127.0.0.1:18001

ENTRYPOINT ["sh", "/usr/local/bin/sabre-tailscale-entrypoint.sh"]
CMD ["/docker-entrypoint.sh", "nginx", "-g", "daemon off;"]

EXPOSE 8081
