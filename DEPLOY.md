# DEPLOY.md — Деплой на VPS: dev / stage / prod

> Один VPS, три окружения, три бота, автодеплой через GitHub Actions.
> Читать вместе с CLAUDE.md и PLAN.md.

---

## 1. СТРУКТУРА ОКРУЖЕНИЙ

| Окружение | Ветка | Домен API | Домен App | Бот |
|---|---|---|---|---|
| dev | `dev` | `api-dev.medina.garum.tech` | `app-dev.medina.garum.tech` | @YourAppDevBot |
| stage | `stage` | `api-stage.medina.garum.tech` | `app-stage.medina.garum.tech` | @YourAppStageBot |
| prod | `main` | `api.medina.garum.tech` | `app.medina.garum.tech` | @YourAppBot |

---

## 2. СТРУКТУРА ПАПОК НА VPS

```
/opt/cycle-calendar/
├── dev/
│   ├── docker-compose.yml
│   ├── .env
│   └── nginx/
├── stage/
│   ├── docker-compose.yml
│   ├── .env
│   └── nginx/
├── prod/
│   ├── docker-compose.yml
│   ├── .env
│   └── nginx/
└── nginx/
    ├── nginx.conf          ← главный конфиг
    └── conf.d/
        ├── dev.conf
        ├── stage.conf
        └── prod.conf
```

Создать структуру на VPS:
```bash
mkdir -p /opt/cycle-calendar/{dev,stage,prod,nginx/conf.d}
```

---

## 3. ПОДГОТОВКА VPS

### Установка зависимостей
```bash
# Docker
curl -fsSL https://get.docker.com | sh
usermod -aG docker $USER

# Docker Compose
apt-get install docker-compose-plugin

# Nginx
apt-get install nginx

# Certbot (SSL)
apt-get install certbot python3-certbot-nginx
```

### DNS-записи (у регистратора домена)
```
A  medina.garum.tech          → IP_VPS
A  app.medina.garum.tech      → IP_VPS
A  api.medina.garum.tech      → IP_VPS
A  app-stage.medina.garum.tech → IP_VPS
A  api-stage.medina.garum.tech → IP_VPS
A  app-dev.medina.garum.tech  → IP_VPS
A  api-dev.medina.garum.tech  → IP_VPS
```

### SSL-сертификаты
```bash
certbot --nginx -d medina.garum.tech \
  -d app.medina.garum.tech -d api.medina.garum.tech \
  -d app-stage.medina.garum.tech -d api-stage.medina.garum.tech \
  -d app-dev.medina.garum.tech -d api-dev.medina.garum.tech
```

Автообновление (уже настроено certbot, проверить):
```bash
systemctl status certbot.timer
```

---

## 4. NGINX КОНФИГИ

### /opt/cycle-calendar/nginx/nginx.conf
```nginx
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    sendfile      on;
    gzip          on;

    include /opt/cycle-calendar/nginx/conf.d/*.conf;
}
```

### /opt/cycle-calendar/nginx/conf.d/prod.conf
```nginx
# API — prod
server {
    listen 443 ssl;
    server_name api.medina.garum.tech;

    ssl_certificate     /etc/letsencrypt/live/medina.garum.tech/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/medina.garum.tech/privkey.pem;

    location / {
        proxy_pass         http://localhost:8083;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}

# App (фронтенд) — prod
server {
    listen 443 ssl;
    server_name app.medina.garum.tech;

    ssl_certificate     /etc/letsencrypt/live/medina.garum.tech/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/medina.garum.tech/privkey.pem;

    root /opt/cycle-calendar/prod/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}

# Редирект HTTP → HTTPS
server {
    listen 80;
    server_name api.medina.garum.tech app.medina.garum.tech;
    return 301 https://$host$request_uri;
}
```

### /opt/cycle-calendar/nginx/conf.d/stage.conf
```nginx
server {
    listen 443 ssl;
    server_name api-stage.medina.garum.tech;

    ssl_certificate     /etc/letsencrypt/live/medina.garum.tech/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/medina.garum.tech/privkey.pem;

    location / {
        proxy_pass http://localhost:8082;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    listen 443 ssl;
    server_name app-stage.medina.garum.tech;

    ssl_certificate     /etc/letsencrypt/live/medina.garum.tech/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/medina.garum.tech/privkey.pem;

    root /opt/cycle-calendar/stage/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}

server {
    listen 80;
    server_name api-stage.medina.garum.tech app-stage.medina.garum.tech;
    return 301 https://$host$request_uri;
}
```

### /opt/cycle-calendar/nginx/conf.d/dev.conf
```nginx
server {
    listen 443 ssl;
    server_name api-dev.medina.garum.tech;

    ssl_certificate     /etc/letsencrypt/live/medina.garum.tech/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/medina.garum.tech/privkey.pem;

    location / {
        proxy_pass http://localhost:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    listen 443 ssl;
    server_name app-dev.medina.garum.tech;

    ssl_certificate     /etc/letsencrypt/live/medina.garum.tech/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/medina.garum.tech/privkey.pem;

    root /opt/cycle-calendar/dev/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}

server {
    listen 80;
    server_name api-dev.medina.garum.tech app-dev.medina.garum.tech;
    return 301 https://$host$request_uri;
}
```

---

## 5. DOCKER COMPOSE

### /opt/cycle-calendar/prod/docker-compose.yml
```yaml
version: '3.8'

services:
  backend:
    image: ghcr.io/${GITHUB_ORG}/cycle-calendar-backend:latest
    restart: unless-stopped
    ports:
      - "8083:8080"
    env_file: .env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: cycle_calendar
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  postgres_data:
  redis_data:
```

### /opt/cycle-calendar/stage/docker-compose.yml
```yaml
version: '3.8'

services:
  backend:
    image: ghcr.io/${GITHUB_ORG}/cycle-calendar-backend:stage
    restart: unless-stopped
    ports:
      - "8082:8080"
    env_file: .env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: cycle_calendar_stage
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_stage_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis_stage_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  postgres_stage_data:
  redis_stage_data:
```

### /opt/cycle-calendar/dev/docker-compose.yml
```yaml
version: '3.8'

services:
  backend:
    image: ghcr.io/${GITHUB_ORG}/cycle-calendar-backend:dev
    restart: unless-stopped
    ports:
      - "8081:8080"
    env_file: .env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: cycle_calendar_dev
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_dev_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis_dev_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  postgres_dev_data:
  redis_dev_data:
```

---

## 6. ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ НА VPS

## 7. PRODUCTION ROUTING FOR medina.garum.tech

Для Telegram Mini App `https://medina.garum.tech/period/` нужно настроить nginx так, чтобы:
- `location = /period` редиректил на `/period/`
- `location /period/` проксировал на frontend period_bot
- `location /api/` проксировал на backend period_bot
- `location /oauth2callback` остался на текущем meal_bot
- корень `/` отдавал статическую заглушку или другой сайт

### Пример nginx-конфига для `medina.garum.tech`

```nginx
server {
    listen 80;
    server_name medina.garum.tech;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name medina.garum.tech;

    ssl_certificate /etc/letsencrypt/live/medina.garum.tech/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/medina.garum.tech/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    root /var/www/medina;
    index index.html;

    location = / {
        try_files /index.html =404;
    }

    location = /period {
        return 301 /period/;
    }

    location /period/ {
        proxy_pass http://127.0.0.1:5173/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8081/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /oauth2callback {
        proxy_pass http://127.0.0.1:8080/oauth2callback;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Примечания

- `WEBAPP_URL` в `.env` должен быть `https://medina.garum.tech/period/`.
- `period_bot` backend на VPS должен слушать `8081`.
- frontend period_bot должен быть собран и развернут как статический сайт `dist` с `base=/period/`.
- `meal_bot` callback остаётся на `8080`.

## 8. ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ НА VPS

Создать `.env` файлы вручную на сервере (не хранить в репозитории):

### /opt/cycle-calendar/prod/.env
```env
ENV=production
PORT=8080

BOT_TOKEN=token_от_prod_бота
WEBAPP_URL=https://medina.garum.tech/period/

DATABASE_URL=postgres://user:pass@postgres:5432/cycle_calendar
REDIS_URL=redis://redis:6379

JWT_SECRET=длинная_случайная_строка_для_прода

DB_USER=cycle_user
DB_PASSWORD=сильный_пароль_для_прода
```

### /opt/cycle-calendar/stage/.env
```env
ENV=staging
PORT=8080

BOT_TOKEN=token_от_stage_бота
WEBAPP_URL=https://stage.medina.garum.tech/period/

DATABASE_URL=postgres://user:pass@postgres:5432/cycle_calendar_stage
REDIS_URL=redis://redis:6379

JWT_SECRET=строка_для_стейджа

DB_USER=cycle_user
DB_PASSWORD=пароль_для_стейджа
```

### /opt/cycle-calendar/dev/.env
```env
ENV=development
PORT=8080

BOT_TOKEN=token_от_dev_бота
WEBAPP_URL=https://dev.medina.garum.tech/period/

DATABASE_URL=postgres://user:pass@postgres:5432/cycle_calendar_dev
REDIS_URL=redis://redis:6379

JWT_SECRET=строка_для_дева

DB_USER=cycle_user
DB_PASSWORD=пароль_для_дева
```

---

## 7. DOCKERFILE

### backend/Dockerfile
```dockerfile
# Сборка
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o server ./cmd/server

# Финальный образ
FROM alpine:3.19
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=builder /app/server .
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/internal/recommendations/data.json ./internal/recommendations/data.json
EXPOSE 8080
CMD ["./server"]
```

### frontend/Dockerfile
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

---

## 8. GITHUB ACTIONS

### Настройка секретов в GitHub
```
Settings → Secrets and variables → Actions → New repository secret

VPS_HOST          = IP адрес VPS
VPS_USER          = имя пользователя (например deploy)
VPS_SSH_KEY       = приватный SSH ключ
GITHUB_TOKEN      = автоматически доступен
```

### .github/workflows/deploy-dev.yml
```yaml
name: Deploy Dev

on:
  push:
    branches: [dev]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push backend
        uses: docker/build-push-action@v5
        with:
          context: ./backend
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-backend:dev

      - name: Build and push frontend
        uses: docker/build-push-action@v5
        with:
          context: ./frontend
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-frontend:dev
          build-args: |
            VITE_API_URL=https://api-dev.medina.garum.tech

      - name: Deploy to VPS
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /opt/cycle-calendar/dev
            docker compose pull
            docker compose up -d
            docker system prune -f
            
            # Копировать фронтенд из контейнера
            docker run --rm \
              -v /opt/cycle-calendar/dev/frontend:/output \
              ghcr.io/${{ github.repository }}-frontend:dev \
              sh -c "cp -r /usr/share/nginx/html/. /output/dist/"
            
            nginx -s reload
```

### .github/workflows/deploy-stage.yml
```yaml
name: Deploy Stage

on:
  push:
    branches: [stage]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push backend
        uses: docker/build-push-action@v5
        with:
          context: ./backend
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-backend:stage

      - name: Build and push frontend
        uses: docker/build-push-action@v5
        with:
          context: ./frontend
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-frontend:stage
          build-args: |
            VITE_API_URL=https://api-stage.medina.garum.tech

      - name: Deploy to VPS
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /opt/cycle-calendar/stage
            docker compose pull
            docker compose up -d
            docker system prune -f
            
            docker run --rm \
              -v /opt/cycle-calendar/stage/frontend:/output \
              ghcr.io/${{ github.repository }}-frontend:stage \
              sh -c "cp -r /usr/share/nginx/html/. /output/dist/"
            
            nginx -s reload
```

### .github/workflows/deploy-prod.yml
```yaml
name: Deploy Prod

on:
  push:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: '1.22'
      - name: Run tests
        run: |
          cd backend
          go test ./...

  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push backend
        uses: docker/build-push-action@v5
        with:
          context: ./backend
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-backend:latest
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-backend:${{ github.sha }}

      - name: Build and push frontend
        uses: docker/build-push-action@v5
        with:
          context: ./frontend
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-frontend:latest
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-frontend:${{ github.sha }}
          build-args: |
        VITE_API_URL=https://api.medina.garum.tech
            docker compose pull
            docker compose up -d
            docker system prune -f
            
            docker run --rm \
              -v /opt/cycle-calendar/prod/frontend:/output \
              ghcr.io/${{ github.repository }}-frontend:latest \
              sh -c "cp -r /usr/share/nginx/html/. /output/dist/"
            
            nginx -s reload
```

---

## 9. НАСТРОЙКА WEBHOOK ДЛЯ КАЖДОГО БОТА

После первого деплоя установить webhook для каждого окружения:

```bash
# Prod
curl "https://api.telegram.org/bot{PROD_BOT_TOKEN}/setWebhook" \
  -d "url=https://api.medina.garum.tech/bot/webhook"

# Stage
curl "https://api.telegram.org/bot{STAGE_BOT_TOKEN}/setWebhook" \
  -d "url=https://api-stage.medina.garum.tech/bot/webhook"

# Dev
curl "https://api.telegram.org/bot{DEV_BOT_TOKEN}/setWebhook" \
  -d "url=https://api-dev.medina.garum.tech/bot/webhook"
```

Проверить:
```bash
curl "https://api.telegram.org/bot{TOKEN}/getWebhookInfo"
```

---

## 10. SSH-ДОСТУП ДЛЯ GITHUB ACTIONS

Создать отдельного пользователя для деплоя (не root):

```bash
# На VPS
useradd -m -s /bin/bash deploy
usermod -aG docker deploy

# Создать SSH-ключ локально
ssh-keygen -t ed25519 -C "github-actions-deploy" -f deploy_key

# Добавить публичный ключ на VPS
su - deploy
mkdir -p ~/.ssh
echo "ПУБЛИЧНЫЙ_КЛЮЧ" >> ~/.ssh/authorized_keys
chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys

# Приватный ключ → в GitHub Secrets как VPS_SSH_KEY
```

Права на папку деплоя:
```bash
chown -R deploy:deploy /opt/cycle-calendar
```

---

## 11. ВЕТКИ И GITFLOW

```
main   ← продакшн, защищённая ветка
  ↑
stage  ← тестирование перед релизом
  ↑
dev    ← активная разработка

feature/xxx → dev    (через PR)
hotfix/xxx  → main + stage + dev
```

Правило: **никогда не пушить напрямую в main**. Только через PR из stage после проверки.

---

## 12. МОНИТОРИНГ И ЛОГИ

### Просмотр логов
```bash
# Prod бэкенд
cd /opt/cycle-calendar/prod && docker compose logs -f backend

# Stage
cd /opt/cycle-calendar/stage && docker compose logs -f backend

# Все сервисы
docker compose logs -f
```

### Перезапуск
```bash
cd /opt/cycle-calendar/prod
docker compose restart backend
```

### Статус контейнеров
```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### Простой healthcheck (добавить в cron на VPS)
```bash
# crontab -e
*/5 * * * * curl -sf https://api.medina.garum.tech/health || \
  cd /opt/cycle-calendar/prod && docker compose restart backend
```

---

## 14. СВЯЗАННЫЕ ДОКУМЕНТЫ

| Документ | Содержание |
|---|---|
| `CLAUDE.md` | Полное техническое задание: стек, архитектура, БД, API, алгоритмы |
| `PLAN.md` | Пошаговый план разработки с чекбоксами и проверками |
| `DEPLOY.md` | Этот файл. Инструкция деплоя на VPS |

```
[ ] Зарегистрированы 3 бота: dev, stage, prod
[ ] DNS-записи созданы и распространились (проверить: dig api.medina.garum.tech)
[ ] SSL-сертификаты получены через certbot
[ ] Созданы .env файлы для каждого окружения на VPS
[ ] SSH-ключ добавлен в GitHub Secrets
[ ] docker compose up в каждой папке — контейнеры запустились
[ ] Nginx запущен и проксирует запросы
[ ] Webhook установлен для каждого бота
[ ] curl https://api.medina.garum.tech/health → {"status":"ok"}
[ ] Написать боту /start → Mini App открывается
[ ] Пуш в dev → GitHub Actions задеплоил автоматически
```
