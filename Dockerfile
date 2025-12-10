# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Копирование package.json и package-lock.json (если есть)
COPY package.json ./
COPY package-lock.json* ./

# Установка зависимостей
RUN npm ci

# Копирование исходников
COPY . .

# Сборка проекта
RUN npm run build

# Stage 2: Production
FROM nginx:alpine

# Копирование собранных файлов из builder
COPY --from=builder /app/docs /usr/share/nginx/html

# Создание конфигурации nginx для порта 8080
RUN echo 'server { \
    listen 8080; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Открываем порт
EXPOSE 8080

# Nginx запускается автоматически
