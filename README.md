# period_bot

Умный календарь менструального цикла.

## Запуск локально

1. Скопируйте `.env.example` в `.env` и заполните переменные.
2. Запустите Docker Compose:
   ```bash
   docker compose up --build
   ```
3. Backend будет доступен на `http://localhost:8080`.

## Структура

- `backend/` — Go-сервер, API и Telegram Bot
- `frontend/` — React Mini App

## Основные команды

- `docker compose up --build`
- `cd backend && go test ./...`
- `cd frontend && npm install && npm run dev`
