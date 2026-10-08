# Contenedor único para Railway (DEPLOY06): build estático de Expo (mismo origen,
# EXPO_PUBLIC_FOG_URL=/api) servido por nginx, que además reenvía /api/ al Fog.
# Contexto de build: la raíz del repo del frontend.
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

# La plantilla se procesa al arrancar con envsubst: FOG_UPSTREAM, PROXY_SHARED_TOKEN,
# CLIP_MAX_MB y PORT se leen del entorno sin reconstruir la imagen.
COPY deploy/railway/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

# Railway inyecta PORT; 8081 por defecto. CLIP_MAX_MB debe igualar el de Fog.
ENV PORT=8081
ENV CLIP_MAX_MB=200

EXPOSE 8081
