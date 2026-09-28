FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV CI=1
ENV EXPO_NO_TELEMETRY=1

EXPOSE 8081

CMD ["npx", "expo", "start", "--web", "--port", "8081"]
