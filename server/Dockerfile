FROM node:22-alpine

# better-sqlite3 için native build araçları
RUN apk add --no-cache python3 make g++ sqlite-dev

WORKDIR /app

# Önce bağımlılıkları kopyala ve kur (cache için)
COPY package*.json ./
RUN npm install --include=optional

# Kaynak kodları kopyala
COPY . .

EXPOSE 5000

CMD ["node", "server.js"]
