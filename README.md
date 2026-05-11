# period_bot

Умный календарь менструального цикла.

## Запуск локально

1. Скопируйте `.env.example` в `.env` и заполните переменные.
2. Запустите Docker Compose:
   ```bash
   docker compose up --build
   ```
3. Backend будет доступен на `http://localhost:8081`.

Если на одном хосте уже работает другой бот на `8080`, period_bot использует `8081`.

### Локальная разработка
- `location = /period` перенаправляет на `/period/`
- `location /period/` проксирует на `http://127.0.0.1:5173/` (Vite frontend)
- `location /api/` проксирует на `http://127.0.0.1:8081/api/` (backend)
- `location /oauth2callback` оставляется на `http://127.0.0.1:8080/oauth2callback` для meal_bot
- Vite dev-server настроен проксировать `/api` на `http://127.0.0.1:8081`

### Production
- Соберите `frontend` через `npm run build`
- Разверните `frontend/dist` в `nginx` под `base=/period/`
- Используйте `period_bot/nginx-prod-example.conf` для `https://medina.garum.tech/period/`
- Backend продолжает слушать `8081` и обрабатывает API на `/api/*`

> Пример nginx-конфига для разработки: `period_bot/nginx-proxy-example.conf`.
> Пример nginx-конфига для продакшена: `period_bot/nginx-prod-example.conf`.
>
> `period_bot` backend — на `8081`, meal_bot остаётся на `8080`.
>
## Структура

- `backend/` — Go-сервер, API и Telegram Bot
- `frontend/` — React Mini App

## Основные команды

- `docker compose up --build`
- `cd backend && go test ./...`
- `cd frontend && npm install && npm run dev`
