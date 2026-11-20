# Imagen del frontend para Railway (DEPLOY11): estática: solo build de Expo + nginx.
# Sin /api, sin reenviador y sin Tailscale: el navegador de cada usuario habla con SU Fog
# (http://localhost:<puerto> u otra dirección https://) y el Fog sale por HTTPS hacia Cloud.
# El nodo Fog no se fija al construir: se escribe en el login (ver src/infrastructure/config.ts).
# Contexto de build: la raíz del repo del frontend.
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Sin EXPO_PUBLIC_FOG_URL a propósito: el valor inicial del campo "Nodo Fog" es http://localhost:8001.
ENV CI=1
ENV EXPO_NO_TELEMETRY=1

RUN npx expo export --platform web --output-dir dist

FROM nginx:alpine

# La plantilla se procesa al arrancar con envsubst (PORT y FOG_ORIGENES_EXTRA salen del entorno).
COPY deploy/railway/nginx.conf.template /etc/nginx/templates/default.conf.template
# Se ejecuta antes del envsubst (orden alfabético de /docker-entrypoint.d/): aborta si FOG_ORIGENES_EXTRA no es válida.
COPY deploy/railway/validar-origenes.sh /docker-entrypoint.d/15-validar-origenes.sh
RUN chmod +x /docker-entrypoint.d/15-validar-origenes.sh
COPY --from=build /app/dist /usr/share/nginx/html

# Railway inyecta PORT; 8081 por defecto.
ENV PORT=8081
# Orígenes https:// adicionales a los que el navegador puede conectarse (Fog remotos), separados por espacios.
# Vacío por defecto: solo localhost y 127.0.0.1. No se admite comodín.
ENV FOG_ORIGENES_EXTRA=

EXPOSE 8081
