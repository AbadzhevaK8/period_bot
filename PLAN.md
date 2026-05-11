# PLAN.md — План реализации: Умный календарь цикла

> Этот документ — пошаговый план для агентной разработки.
> Читать вместе с CLAUDE.md.
> Каждый этап — самостоятельная единица работы с чётким результатом и проверкой.

---

## ПРАВИЛА РАБОТЫ С ПЛАНОМ

- Выполняй задачи строго по порядку внутри этапа
- Не переходи к следующему этапу пока не пройдена проверка текущего
- Каждая задача заканчивается конкретным артефактом (файл, эндпоинт, экран)
- Если задача заблокирована — опиши блокер и жди инструкций
- Помечай выполненные задачи: `[ ]` → `[x]`

---

## ЭТАП 01 — ФУНДАМЕНТ
**Цель:** Бот запускается, Mini App открывается, авторизация работает  
**Оценка:** 2 недели  

### 01.1 Инфраструктура и окружение

- [ ] **Создать репозиторий**
  - Структура монорепо: `/backend`, `/frontend`
  - `.gitignore` для Go и Node
  - `README.md` с инструкцией запуска
  - Ветки: `main`, `stage`, `dev`

- [ ] **Подготовить VPS**
  - Выполнить инструкцию DEPLOY.md секции 2–3
  - Установить Docker, Nginx, Certbot
  - Создать структуру папок `/opt/cycle-calendar/{dev,stage,prod}`
  - Получить SSL-сертификаты
  - Настроить DNS-записи для всех поддоменов

- [ ] **Зарегистрировать три бота**
  - @YourAppDevBot → BOT_TOKEN_DEV
  - @YourAppStageBot → BOT_TOKEN_STAGE
  - @YourAppBot → BOT_TOKEN_PROD

- [ ] **Docker Compose для локальной разработки**
  - Сервис `postgres` (PostgreSQL 16)
  - Сервис `redis` (Redis 7)
  - Сервис `backend` (Go, hot reload через `air`)
  - Файл: `docker-compose.yml`
  - Проверка: `docker compose up` поднимает все сервисы без ошибок

- [ ] **Переменные окружения**
  - Файл `.env.example` со всеми переменными из CLAUDE.md секция 15
  - Файл `.env` (в .gitignore)
  - Создать `.env` файлы на VPS для каждого окружения (DEPLOY.md секция 6)
  - Go: загрузка через `github.com/joho/godotenv`

- [ ] **GitHub Actions**
  - Добавить секреты: VPS_HOST, VPS_USER, VPS_SSH_KEY
  - Скопировать workflow файлы из DEPLOY.md секция 8
  - Проверка: пуш в `dev` → автодеплой срабатывает

### 01.2 Бэкенд — базовая структура

- [ ] **Инициализация Go-модуля**
  - `go mod init github.com/{org}/cycle-calendar`
  - Структура папок согласно CLAUDE.md секция 14
  - Зависимости: `go get github.com/gofiber/fiber/v2 gopkg.in/telebot.v3 github.com/jackc/pgx/v5 github.com/redis/go-redis/v9`

- [ ] **Конфиг**
  - Файл `config/config.go`
  - Структура `Config` со всеми env-переменными
  - Функция `Load() (*Config, error)`

- [ ] **Подключение к PostgreSQL**
  - Файл `internal/db/postgres.go`
  - Функция `NewPool(dsn string) (*pgxpool.Pool, error)`
  - Проверка: пинг БД при старте, ошибка если недоступна

- [ ] **Подключение к Redis**
  - Файл `internal/db/redis.go`
  - Функция `NewClient(url string) (*redis.Client, error)`

- [ ] **HTTP-сервер (Fiber)**
  - Файл `cmd/server/main.go`
  - Запуск сервера на `PORT` из конфига
  - Роут `GET /health` → `{ status: "ok" }`
  - Проверка: `curl localhost:8080/health` возвращает 200

### 01.3 Telegram Bot

- [ ] **Регистрация бота**
  - Создать бота через @BotFather
  - Получить `BOT_TOKEN`
  - Установить команды: `/start`, `/help`
  - Установить описание бота

- [ ] **Инициализация бота в коде**
  - Файл `internal/bot/bot.go`
  - Подключение telebot v3
  - Обработчик `/start` → отправляет приветственное сообщение с кнопкой «Открыть приложение»
  - Кнопка типа `WebApp` с URL Mini App

- [ ] **Webhook vs Polling**
  - Dev-окружение: Long Polling
  - Prod: Webhook (настроить после деплоя)

### 01.4 База данных — первые миграции

- [ ] **Установить golang-migrate**
  - `go get github.com/golang-migrate/migrate/v4`
  - CLI: `brew install golang-migrate` или бинарник

- [ ] **Миграция 001: users**
  - Файл `migrations/001_create_users.up.sql`
  - Таблица `users` согласно CLAUDE.md секция 4
  - Файл `migrations/001_create_users.down.sql`

- [ ] **Миграция 002: cycle_entries**
  - Файл `migrations/002_create_cycle_entries.up.sql`

- [ ] **Запуск миграций при старте**
  - В `main.go` — автоматический прогон новых миграций
  - Проверка: таблицы создаются при первом запуске

### 01.5 Авторизация через Telegram

- [ ] **Валидация initData**
  - Файл `internal/auth/telegram.go`
  - Функция `ValidateInitData(initData, botToken string) (*TelegramUser, error)`
  - Алгоритм: парсинг query string → HMAC-SHA256 с ключом `WebAppData` → сравнение hash
  - Unit-тесты с реальными и поддельными данными

- [ ] **Эндпоинт авторизации**
  - `POST /api/auth/telegram`
  - Body: `{ initData: string }`
  - Логика: валидация → upsert user в БД → вернуть JWT
  - Response: `{ token: string, user: { id, firstName, username } }`

- [ ] **JWT middleware**
  - Файл `internal/auth/middleware.go`
  - Проверка Bearer-токена в заголовке
  - Добавление `userID` в Fiber context
  - Применить ко всем `/api/*` кроме `/api/auth/*` и `/health`

### 01.6 Фронтенд — заготовка Mini App

- [ ] **Инициализация проекта**
  - `npm create vite@latest frontend -- --template react-ts`
  - Установить: `@twa-dev/sdk @telegram-apps/telegram-ui`
  - Настроить `vite.config.ts` для деплоя

- [ ] **Инициализация Telegram SDK**
  - Файл `src/main.tsx`
  - `WebApp.ready()` при старте
  - `WebApp.expand()` — развернуть на полный экран

- [ ] **Базовый роутинг**
  - Установить `react-router-dom`
  - Роуты согласно CLAUDE.md секция 11
  - Редирект: если нет токена → `/onboarding`, если есть → `/calendar`

- [ ] **API клиент**
  - Файл `src/api/client.ts`
  - Axios или fetch с базовым URL и JWT-заголовком
  - Хук `useAuth` — авторизация через initData при старте

- [ ] **Деплой фронтенда**
  - GitHub Pages или Vercel
  - URL прописать в `WEBAPP_URL` и в настройках бота

### ✅ Проверка этапа 01
```
1. docker compose up — все сервисы запущены
2. curl localhost:8080/health → {"status":"ok"}
3. Написать боту /start → получить кнопку «Открыть приложение»
4. Тапнуть кнопку → Mini App открывается в Telegram
5. POST /api/auth/telegram с валидным initData → получить JWT
6. POST /api/auth/telegram с невалидным initData → 401
```

---

## ЭТАП 02 — АЛГОРИТМ ФАЗ
**Цель:** Можно ввести данные цикла и получить фазы на любой диапазон дат  
**Оценка:** 2 недели  

### 02.1 Модель данных

- [ ] **Миграция 003: cycle_entries (финальная)**
  - Таблица согласно CLAUDE.md секция 4
  - Индекс: `(user_id, period_start DESC)`

- [ ] **Go-структуры**
  - Файл `internal/models/cycle.go`
  - Структуры: `CycleEntry`, `Phase`, `DayInfo`

### 02.2 Алгоритм фаз

- [ ] **Реализация алгоритма**
  - Файл `internal/cycle/algorithm.go`
  - Функция `GetPhaseForDate(date time.Time, entry CycleEntry) Phase`
  - Функция `GetCalendar(from, to time.Time, entry CycleEntry) []DayInfo`
  - Логика согласно CLAUDE.md секция 5

- [ ] **Unit-тесты алгоритма** ← ОБЯЗАТЕЛЬНО
  - Файл `internal/cycle/algorithm_test.go`
  - Тест: день 1 → менструация
  - Тест: день 14 → овуляция
  - Тест: день 28 → лютеиновая
  - Тест: переход через границу цикла (день 29 при цикле 28 = день 1 следующего)
  - Тест: нестандартная длина цикла (21 день, 35 дней)
  - Тест: нестандартная длина менструации (3 дня, 7 дней)
  - Все тесты зелёные: `go test ./internal/cycle/...`

### 02.3 API цикла

- [ ] **Репозиторий цикла**
  - Файл `internal/cycle/repository.go`
  - `SaveCycleEntry(ctx, userID, entry) error`
  - `GetLatestEntry(ctx, userID) (*CycleEntry, error)`

- [ ] **POST /api/cycle**
  - Body: `{ periodStart: "YYYY-MM-DD", cycleLength: int, periodLength: int }`
  - Валидация: cycleLength 21–40, periodLength 2–10
  - Upsert последней записи
  - Инвалидировать кэш Redis для этого пользователя

- [ ] **GET /api/cycle**
  - Вернуть последнюю запись пользователя
  - 404 если записей нет

### 02.4 API календаря

- [ ] **GET /api/calendar**
  - Query params: `from=YYYY-MM-DD&to=YYYY-MM-DD`
  - Максимальный диапазон: 90 дней
  - Response: массив `DayInfo` с полями: `date`, `dayOfCycle`, `phase`, `color`, `energy`
  - 400 если нет данных цикла

- [ ] **Кэш в Redis**
  - Ключ: `calendar:{userID}:{year}:{month}`
  - TTL: 24 часа
  - Кэшировать ответ после первого расчёта
  - Инвалидировать при `POST /api/cycle`

### ✅ Проверка этапа 02
```
1. go test ./internal/cycle/... → все тесты зелёные
2. POST /api/cycle → 200
3. GET /api/calendar?from=2025-01-01&to=2025-01-31 → массив 31 дня с фазами
4. Повторный GET → ответ из Redis (проверить по времени ответа)
5. POST /api/cycle (новые данные) → GET /api/calendar → новые фазы (кэш сброшен)
6. GET /api/calendar без данных цикла → 400
```

---

## ЭТАП 03 — ОНБОРДИНГ И КАЛЕНДАРЬ
**Цель:** Пользователь проходит онбординг и видит свой календарь с рекомендациями  
**Оценка:** 2 недели  

### 03.1 База рекомендаций

- [ ] **JSON с рекомендациями**
  - Файл `internal/recommendations/data.json`
  - Структура: фаза → категория (work/sport/social) → массив строк
  - Минимум 3 рекомендации на каждую комбинацию фаза × категория
  - Содержание согласно CLAUDE.md секция 8

- [ ] **Загрузка рекомендаций**
  - Файл `internal/recommendations/service.go`
  - `GetRecommendations(phase string) Recommendations`
  - Загружать JSON при старте приложения (embed)

- [ ] **GET /api/day/:date**
  - Response: `{ date, dayOfCycle, phase, color, energy, forecast, recommendations }`
  - `forecast` — массив иконок/меток прогноза (energy_low, mood_irritable, ...)
  - `recommendations` — объект `{ work: [], sport: [], social: [] }`

- [ ] **GET /api/day/:date/recommendations**
  - Только блок рекомендаций
  - Используется для быстрого обновления без перезагрузки всей карточки

### 03.2 Фронтенд — онбординг

- [ ] **Экран S1: Приветствие**
  - Компонент `src/pages/Onboarding/Welcome.tsx`
  - Логотип, tagline, кнопка «Начать», ссылка «Войти»

- [ ] **Экран S2: Слайды**
  - Компонент `src/pages/Onboarding/Slides.tsx`
  - 3 слайда со свайпом
  - Индикатор прогресса
  - Кнопка «Пропустить»

- [ ] **Экран S3: Авторизация**
  - Компонент `src/pages/Onboarding/Auth.tsx`
  - Автоматическая авторизация через `WebApp.initData`
  - Показать лоадер пока идёт запрос
  - При ошибке — сообщение и кнопка повторить

- [ ] **Экран S4: Данные цикла**
  - Компонент `src/pages/Onboarding/CycleSetup.tsx`
  - Датапикер для даты последней менструации
  - Слайдер длины цикла (21–40, дефолт 28)
  - POST /api/cycle при нажатии «Далее»

- [ ] **Экран S5: Первые симптомы**
  - Компонент `src/pages/Onboarding/SymptomsSetup.tsx`
  - Два вопроса с мультиселектом
  - POST /api/symptoms при сохранении
  - Кнопка «Пропустить»

- [ ] **Экран S6: Готово**
  - Компонент `src/pages/Onboarding/Ready.tsx`
  - Анимация заполнения календаря
  - Баннер сегодняшнего дня (GET /api/day/today)
  - CTA «Открыть календарь» → `/calendar`

### 03.3 Фронтенд — главный экран

- [ ] **Компонент календаря**
  - `src/components/Calendar/MonthGrid.tsx`
  - Сетка 7×6
  - Каждый день: цвет фазы как фон, номер дня
  - Сегодня: выделен кружком
  - Прошедшие с симптомами: маленькая точка
  - Будущие: opacity 0.6
  - Тап на день → открыть карточку

- [ ] **Навигация по месяцам**
  - Стрелки влево/вправо
  - GET /api/calendar при смене месяца
  - Кэшировать загруженные месяцы в React Query

- [ ] **Главный экран**
  - `src/pages/Calendar/index.tsx`
  - Шапка: имя пользователя + текущая фаза
  - Компонент `MonthGrid`
  - Баннер снизу: карточка сегодня (свёрнутая)

### 03.4 Фронтенд — карточка дня

- [ ] **Компонент карточки дня**
  - `src/pages/Calendar/DayCard.tsx`
  - Открывается как bottom sheet или отдельный экран
  - Блок фазы: цвет, название, описание
  - Блок прогноза: иконки самочувствия
  - Блок рекомендаций: табы work/sport/social
  - Кнопка «Как ты себя чувствуешь?» (только для сегодня и прошлых дней)
  - Для будущих дней: плашка «Прогноз»

### ✅ Проверка этапа 03
```
1. Новый пользователь открывает Mini App → попадает на онбординг
2. Проходит все шаги → видит календарь с цветами фаз
3. Тапает на сегодня → карточка с фазой и рекомендациями
4. Тапает на будущий день → карточка с плашкой «Прогноз»
5. GET /api/day/today → правильная фаза и рекомендации
6. Повторное открытие приложения → сразу на /calendar (онбординг не повторяется)
```

---

## ЭТАП 04 — СИМПТОМЫ И ПЕРСОНАЛИЗАЦИЯ
**Цель:** Пользователь отмечает симптомы и получает персональные инсайты  
**Оценка:** 2 недели  

### 04.1 API симптомов

- [ ] **Миграция 004: symptom_logs**
  - Таблица согласно CLAUDE.md секция 4

- [ ] **Репозиторий симптомов**
  - `SaveSymptomLog(ctx, userID, log) error`
  - `GetSymptomLog(ctx, userID, date) (*SymptomLog, error)`
  - `GetSymptomHistory(ctx, userID, from, to) ([]SymptomLog, error)`

- [ ] **POST /api/symptoms**
  - Body: `{ date, energy, mood[], body[], note }`
  - Upsert (обновить если уже есть за эту дату)
  - После сохранения → запустить анализ паттернов асинхронно

- [ ] **GET /api/symptoms/:date**
  - Вернуть отметку за дату
  - 404 если нет

### 04.2 Алгоритм паттернов

- [ ] **Логика поиска паттернов**
  - Файл `internal/cycle/patterns.go`
  - Функция `FindPatterns(ctx, userID) ([]Pattern, error)`
  - Алгоритм:
    1. Взять symptom_logs за последние 3 цикла
    2. Сгруппировать по фазе
    3. Найти симптомы которые встречаются в одной фазе 2+ раза
    4. Вернуть как паттерны с описанием

- [ ] **Структура Pattern**
  ```go
  type Pattern struct {
      Phase       string
      Symptom     string   // "irritable", "low_energy", ...
      Occurrences int
      Message     string   // человекочитаемое описание
  }
  ```

- [ ] **GET /api/insights**
  - Вернуть список паттернов пользователя
  - Кэшировать в Redis с TTL 6 часов
  - Инвалидировать при новом symptom_log

### 04.3 Фронтенд — отметка симптомов

- [ ] **Экран отметки симптомов**
  - `src/pages/Symptoms/index.tsx`
  - Секция «Энергия»: 5 кнопок-иконок
  - Секция «Настроение»: мультиселект карточек
  - Секция «Тело»: мультиселект карточек
  - Секция «Заметка»: текстовое поле (опционально)
  - Всё на одном скролл-экране
  - POST /api/symptoms при «Сохранить»

- [ ] **Предзаполнение**
  - GET /api/symptoms/:date при открытии
  - Если уже есть данные — заполнить форму
  - Кнопка «Изменить» вместо «Сохранить»

- [ ] **Экран инсайта**
  - `src/components/InsightBanner.tsx`
  - Показывается после сохранения симптомов
  - GET /api/insights → если есть новый паттерн → показать баннер
  - Если паттерна нет → нейтральное «Записано»

- [ ] **Точки в календаре**
  - Обновить `MonthGrid` — показывать точку на днях с symptom_log
  - GET /api/symptoms?from=&to= при загрузке месяца

### ✅ Проверка этапа 04
```
1. Тап «Как ты себя чувствуешь?» → экран отметки открывается
2. Заполнить и сохранить → «Записано»
3. Открыть тот же день снова → данные предзаполнены
4. В календаре — точка на отмеченных днях
5. После 2+ циклов с одинаковым симптомом → GET /api/insights возвращает паттерн
6. После сохранения симптома → инсайт показывается если есть
```

---

## ЭТАП 05 — УВЕДОМЛЕНИЯ
**Цель:** Ежедневные напоминания работают, кнопка открывает нужный экран  
**Оценка:** 1 неделя  

### 05.1 API настроек

- [ ] **Миграция 005: notification_settings**
  - Таблица согласно CLAUDE.md секция 4
  - Создавать запись с дефолтами при регистрации пользователя

- [ ] **PUT /api/settings/notifications**
  - Body: `{ enabled: bool, notifyTime: "HH:MM", timezone: string }`
  - Валидация формата времени и timezone

- [ ] **GET /api/settings/notifications**
  - Вернуть текущие настройки

### 05.2 Крон-задача

- [ ] **Инициализация gocron**
  - Файл `internal/notifications/scheduler.go`
  - Задача каждые 15 минут: `sendDailyReminders()`

- [ ] **Функция отправки напоминаний**
  - Получить пользователей у которых `notify_time` в текущем 15-минутном окне
  - Учитывать timezone каждого пользователя
  - Для каждого: получить текущую фазу → сформировать сообщение → отправить через Bot API

- [ ] **Шаблоны сообщений**
  - Файл `internal/notifications/templates.go`
  - `DailyReminder(phase Phase, dayOfCycle int) BotMessage`
  - `EventReminder(event UserEvent, phase Phase) BotMessage`
  - Deep link кнопки: `tgapp://resolve?domain={BOT}&appname=app&startapp=symptom_{date}`

- [ ] **Обработка ошибок отправки**
  - Если пользователь заблокировал бота → пометить `enabled=false` в настройках
  - Логировать ошибки, не падать весь планировщик

### 05.3 Фронтенд — настройки уведомлений

- [ ] **Экран настроек уведомлений**
  - `src/pages/Profile/Notifications.tsx`
  - Тогл «Включить напоминания»
  - Тайм-пикер «Время напоминания»
  - Автоопределение timezone через `Intl.DateTimeFormat`
  - PUT /api/settings/notifications при изменении

- [ ] **Обработка deep link при открытии**
  - Файл `src/utils/deeplink.ts`
  - Парсить `WebApp.initDataUnsafe.start_param`
  - `symptom_{date}` → открыть экран отметки симптомов для этой даты
  - `day_{date}` → открыть карточку дня

### ✅ Проверка этапа 05
```
1. PUT /api/settings/notifications → настройки сохранены
2. Дождаться времени уведомления → сообщение в Telegram
3. Тап «Отметить» в уведомлении → Mini App открывается на экране симптомов
4. Если пользователь блокирует бота → enabled=false в БД
5. Timezone: пользователь в UTC+3, время 09:00 → сообщение приходит в 09:00 по его времени
```

---

## ЭТАП 06 — МОНЕТИЗАЦИЯ И ЗАПУСК
**Цель:** Продукт готов к публичному запуску с рабочей монетизацией  
**Оценка:** 2 недели  

### 06.1 Подписка

- [ ] **Миграция 006: subscriptions**
  - Таблица согласно CLAUDE.md секция 4
  - При регистрации пользователя → создать запись `plan=free, trial_ends_at=NOW()+14days`

- [ ] **Middleware проверки доступа**
  - Файл `internal/auth/subscription.go`
  - `RequirePro()` middleware для Fiber
  - Логика: `plan=pro` OR `trial_ends_at > NOW()` → пропустить
  - Иначе → 402 с телом `{ error: "subscription_required", trialExpired: bool }`

- [ ] **Применить middleware к платным эндпоинтам**
  - GET /api/insights → RequirePro
  - POST /api/events → RequirePro
  - POST /api/best-days → RequirePro

- [ ] **GET /api/subscription**
  - Вернуть: `{ plan, trialEndsAt, expiresAt, daysLeft }`

### 06.2 Telegram Payments

- [ ] **Выбор платёжного провайдера**
  - Если аудитория СНГ: ЮKassa
  - Если глобально: Stripe
  - Подключить провайдера в настройках бота через @BotFather

- [ ] **Эндпоинт создания инвойса**
  - `POST /api/subscription/invoice`
  - Body: `{ plan: "monthly" | "yearly" }`
  - Отправить `sendInvoice` через Bot API
  - Response: `{ invoiceLink: string }`

- [ ] **Webhook оплаты**
  - `POST /api/payments/webhook`
  - Обработать `pre_checkout_query` → ответить `answerPreCheckoutQuery`
  - Обработать `successful_payment` → обновить подписку в БД

- [ ] **Напоминания об окончании триала**
  - Крон-задача: каждый день в 10:00
  - Найти пользователей у которых `trial_ends_at` через 3 дня → отправить напоминание
  - Найти у которых `trial_ends_at` через 1 день → отправить напоминание
  - Найти у которых `trial_ends_at` вчера → отправить сообщение о переходе на Free

### 06.3 Фронтенд — платный контент

- [ ] **Пейволл-компонент**
  - `src/components/Paywall.tsx`
  - Показывается при 402 от сервера
  - Описание Pro-функций
  - Кнопки «Попробовать бесплатно» (если триал не использован) / «Оформить подписку»

- [ ] **Экран подписки**
  - `src/pages/Profile/Subscription.tsx`
  - Текущий план + дней осталось
  - Карточки тарифов: месяц / год
  - POST /api/subscription/invoice → открыть Telegram invoice

- [ ] **Обработка успешной оплаты**
  - Слушать `WebApp.onEvent('invoiceClosed')` 
  - При `status=paid` → обновить данные подписки → убрать пейволл

### 06.4 Деплой

- [ ] **Dockerfile для бэкенда**
  - Скопировать из DEPLOY.md секция 7
  - Многоэтапная сборка: builder → alpine

- [ ] **Dockerfile для фронтенда**
  - Скопировать из DEPLOY.md секция 7
  - Принимает `VITE_API_URL` как build arg

- [ ] **Docker Compose для prod**
  - Скопировать из DEPLOY.md секция 5
  - Порт 8083, отдельные volumes

- [ ] **Nginx конфиг для prod**
  - Скопировать из DEPLOY.md секция 4
  - Проксирование API, отдача статики фронтенда

- [ ] **Деплой prod окружения**
  - Пуш в `main` → GitHub Actions собирает образы → деплоит на VPS
  - Проверить: `curl https://api.medina.garum.tech/health`

- [ ] **Настройка webhook prod-бота**
  - Выполнить команду из DEPLOY.md секция 9
  - Проверить: `getWebhookInfo` возвращает правильный URL

### ✅ Проверка этапа 06
```
1. Новый пользователь → онбординг → триал активен (14 дней)
2. GET /api/insights → работает (триал)
3. Триал истёк → GET /api/insights → 402
4. Оплата (тест) → подписка активна → GET /api/insights → работает
5. Бот присылает напоминание за 3 дня до конца триала
6. Пуш в main → GitHub Actions → автодеплой на prod VPS
7. curl https://api.medina.garum.tech/health → {"status":"ok"}
8. Написать prod-боту /start → Mini App открывается
9. Полный сценарий онбординга на реальном устройстве (iOS + Android)
```

---

## ЭТАП 07 — ПОСЛЕ MVP (v1.1)

> Эти задачи не входят в MVP. Реализовывать только после валидации продукта.

### Планировщик событий
- [ ] Миграция: `user_events`
- [ ] POST/GET/DELETE /api/events
- [ ] Алгоритм подбора лучшего дня (CLAUDE.md секция 7)
- [ ] Экраны планирования в Mini App
- [ ] Напоминание за день до события с контекстом фазы

### Статистика и история
- [ ] GET /api/stats — средние показатели по фазам
- [ ] Экран «Моя история» — графики энергии и настроения

### HRV-модуль
- [ ] Интеграция Happitech SDK во фронтенд
- [ ] POST /api/hrv — сохранить измерение
- [ ] Учёт HRV в персонализации рекомендаций

### Улучшение алгоритма
- [ ] Учёт реальных данных о начале менструации для уточнения прогноза
- [ ] Персонализация длины фаз на основе истории

---

## ИНДЕКС ФАЙЛОВ

| Файл | Этап | Описание |
|---|---|---|
| `docker-compose.yml` | 01 | Локальное окружение |
| `config/config.go` | 01 | Конфигурация |
| `internal/auth/telegram.go` | 01 | Валидация initData |
| `internal/auth/middleware.go` | 01 | JWT middleware |
| `internal/db/postgres.go` | 01 | Подключение PostgreSQL |
| `internal/db/redis.go` | 01 | Подключение Redis |
| `internal/bot/bot.go` | 01 | Telegram Bot |
| `internal/cycle/algorithm.go` | 02 | Алгоритм фаз ← ядро |
| `internal/cycle/algorithm_test.go` | 02 | Тесты алгоритма ← обязательно |
| `internal/cycle/repository.go` | 02 | БД: циклы |
| `internal/recommendations/data.json` | 03 | База рекомендаций |
| `internal/recommendations/service.go` | 03 | Сервис рекомендаций |
| `internal/cycle/patterns.go` | 04 | Алгоритм паттернов |
| `internal/notifications/scheduler.go` | 05 | Крон уведомлений |
| `internal/notifications/templates.go` | 05 | Шаблоны сообщений |
| `internal/auth/subscription.go` | 06 | Middleware подписки |
| `src/pages/Onboarding/` | 03 | Экраны онбординга |
| `src/pages/Calendar/` | 03 | Календарь и карточка дня |
| `src/pages/Symptoms/` | 04 | Отметка симптомов |
| `src/components/InsightBanner.tsx` | 04 | Инсайт после симптомов |
| `src/pages/Profile/Notifications.tsx` | 05 | Настройки уведомлений |
| `src/utils/deeplink.ts` | 05 | Обработка deep links |
| `src/components/Paywall.tsx` | 06 | Пейволл |
| `src/pages/Profile/Subscription.tsx` | 06 | Экран подписки |

---

## СВЯЗАННЫЕ ДОКУМЕНТЫ

| Документ | Содержание |
|---|---|
| `CLAUDE.md` | Полное техническое задание: стек, архитектура, БД, API, алгоритмы |
| `PLAN.md` | Этот файл. Пошаговый план с чекбоксами и проверками |
| `DEPLOY.md` | Инструкция деплоя: VPS, Nginx, Docker Compose, GitHub Actions |

```
01 (Фундамент)
 └── 02 (Алгоритм фаз)
      └── 03 (Онбординг и календарь)
           ├── 04 (Симптомы) ──── можно параллельно с 05
           └── 05 (Уведомления) ─ можно параллельно с 04
                └── 06 (Монетизация и запуск)
                     └── 07 (После MVP)
```

Этапы 04 и 05 можно вести параллельно если разделить фронтенд и бэкенд.
