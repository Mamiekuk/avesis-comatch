FROM node:22-alpine AS frontend-builder

# Frontend bağımlılıkları için
WORKDIR /frontend
COPY client/package*.json ./
RUN npm install

# Frontend kaynak kodlarını kopyala ve derle
COPY client/ ./
ARG VITE_API_BASE=/api
ENV VITE_API_BASE=$VITE_API_BASE
RUN npm run build

# ---

FROM node:22-alpine AS backend

# better-sqlite3 için native build araçları
RUN apk add --no-cache python3 make g++ sqlite-dev

WORKDIR /app

# Backend bağımlılıkları
COPY server/package*.json ./
RUN npm install --include=optional

# Backend kaynak kodları
COPY server/ ./

# Frontend build'ini backend'in public klasörüne kopyala
COPY --from=frontend-builder /frontend/dist ./public

EXPOSE 5000

CMD ["node", "server.js"]
