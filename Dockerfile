# Frontend web de SABRE.AI: build estático de producción (export web de Expo)
# servido por nginx. Sin servidor de desarrollo.
#
# EXPO_PUBLIC_FOG_URL se incrusta en el bundle durante el build (Metro inlinea
# las variables EXPO_PUBLIC_*): para cambiarla hay que reconstruir la imagen.
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG EXPO_PUBLIC_FOG_URL=http://localhost:8001
ENV EXPO_PUBLIC_FOG_URL=${EXPO_PUBLIC_FOG_URL}
ENV CI=1
ENV EXPO_NO_TELEMETRY=1

RUN npx expo export --platform web --output-dir dist

FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8081
