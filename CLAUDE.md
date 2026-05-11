# CLAUDE.md — Умный календарь менструального цикла

> Этот документ — полное техническое задание для агентной разработки.
> Читай его целиком перед началом любой задачи.

---

## 1. ОПИСАНИЕ ПРОЕКТА

**Название:** Умный календарь менструального цикла  
**Платформа:** Telegram Mini App  
**Тип:** Персональный трекер цикла с прогнозом самочувствия и рекомендациями  

**Суть продукта:**  
Приложение разбивает менструальный цикл на 4 фазы и накладывает их на календарь. Каждая фаза имеет характеристики энергии, настроения и самочувствия. На основе фазы и личных данных пользователя приложение даёт рекомендации: когда лучше проводить важные встречи, заниматься спортом, отдыхать. Пользователь отмечает симптомы ежедневно — алгоритм адаптируется под неё со временем.

**Ключевое отличие от конкурентов (Flo, Clue):**  
Не просто предсказание менструации — а инструмент планирования жизни через понимание своего цикла.

---

## 2. СТЕК ТЕХНОЛОГИЙ

### Фронтенд
| Технология | Роль | Версия |
|---|---|---|
| React | UI фреймворк | 18+ |
| TypeScript | типизация | 5+ |
| Vite | сборщик | latest |
| @twa-dev/sdk | Telegram Mini App SDK | latest |
| @telegram-apps/telegram-ui | компоненты в стиле Telegram | latest |
| Zustand | стейт-менеджмент | latest |
| React Query (TanStack) | запросы к API, кэш | latest |

### Бэкенд
| Технология | Роль | Версия |
|---|---|---|
| Go | язык | 1.22+ |
| Fiber | HTTP-фреймворк | v2 |
| telebot | Telegram Bot API | v3 |
| pgx | PostgreSQL драйвер | v5 |
| golang-migrate | миграции БД | latest |
| go-co-op/gocron | крон-задачи (уведомления) | v2 |
| Redis (go-redis) | кэш фаз, сессии | v9 |

### Инфраструктура
| Технология | Роль |
|---|---|
| Docker + Docker Compose | локальная разработка и деплой |
| PostgreSQL 16 | основная БД |
| Redis 7 | кэш |
| VPS + Nginx | хостинг (три окружения: dev / stage / prod) |
| GitHub Actions | CI/CD (автодеплой по веткам) |
| Certbot | SSL-сертификаты (Let's Encrypt) |
| GHCR (GitHub Container Registry) | хранение Docker-образов |

---

## 3. АРХИТЕКТУРА

```
┌─────────────────────────────────────────────────────┐
│                     КЛИЕНТ                          │
│  Telegram Bot          Mini App        Payments     │
│  (уведомления,         (React +        (подписка,   │
│   команды)             TypeScript)      триал)      │
└──────────────────────────┬──────────────────────────┘
                           │ HTTPS / REST
┌──────────────────────────▼──────────────────────────┐
│                     БЭКЕНД (Go)                     │
│                                                     │
│  API Gateway        Алгоритм фаз    Рекомендации    │
│  (auth, rate limit) (расчёт +       (правила +      │
│                      персонализация) паттерны)      │
│                                                     │
│  Уведомления                        HRV-модуль      │
│  (gocron +                          (v2.0,          │
│   Bot API)                           Happitech SDK) │
└──────────────────────────┬──────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────┐
│                   ХРАНИЛИЩЕ                         │
│  PostgreSQL             Redis                       │
│  (users, cycles,        (кэш фаз,                   │
│   symptoms, events)      сессии)                    │
└─────────────────────────────────────────────────────┘
```

### Авторизация
Telegram передаёт `initData` при открытии Mini App. Бэкенд валидирует HMAC-подпись используя `BOT_TOKEN`. Никаких паролей, никакой регистрации — пользователь уже авторизован в Telegram.

```go
// Пример валидации initData
func validateTelegramData(initData, botToken string) (bool, error) {
    // Парсим initData, вычисляем HMAC-SHA256
    // Ключ = HMAC-SHA256("WebAppData", botToken)
    // Сравниваем с hash из initData
}
```

---

## 4. СХЕМА БАЗЫ ДАННЫХ

### users
```sql
CREATE TABLE users (
    id          BIGINT PRIMARY KEY,          -- telegram_user_id
    username    TEXT,
    first_name  TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### cycle_entries
```sql
CREATE TABLE cycle_entries (
    id              SERIAL PRIMARY KEY,
    user_id         BIGINT REFERENCES users(id),
    period_start    DATE NOT NULL,           -- дата начала менструации
    cycle_length    INT DEFAULT 28,          -- длина цикла в днях
    period_length   INT DEFAULT 5,           -- длина менструации в днях
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### symptom_logs
```sql
CREATE TABLE symptom_logs (
    id          SERIAL PRIMARY KEY,
    user_id     BIGINT REFERENCES users(id),
    log_date    DATE NOT NULL,
    energy      INT CHECK (energy BETWEEN 1 AND 5),
    mood        TEXT[],                      -- ['calm', 'irritable', 'happy', ...]
    body        TEXT[],                      -- ['cramps', 'bloating', 'headache', ...]
    note        TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, log_date)
);
```

### user_events
```sql
CREATE TABLE user_events (
    id              SERIAL PRIMARY KEY,
    user_id         BIGINT REFERENCES users(id),
    event_date      DATE NOT NULL,
    title           TEXT NOT NULL,
    event_time      TIME,
    remind_day_before BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### notification_settings
```sql
CREATE TABLE notification_settings (
    user_id         BIGINT PRIMARY KEY REFERENCES users(id),
    enabled         BOOLEAN DEFAULT TRUE,
    notify_time     TIME DEFAULT '09:00',
    timezone        TEXT DEFAULT 'Europe/Moscow'
);
```

### subscriptions
```sql
CREATE TABLE subscriptions (
    id              SERIAL PRIMARY KEY,
    user_id         BIGINT REFERENCES users(id),
    plan            TEXT DEFAULT 'free',     -- 'free', 'pro'
    trial_ends_at   TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. АЛГОРИТМ ФАЗ ЦИКЛА

### Четыре фазы

| Фаза | Дни цикла | Цвет (hex) | Характеристика |
|---|---|---|---|
| Менструация | 1 – period_length | `#C1440E` | Низкая энергия, интроверсия, отдых |
| Фолликулярная | period_length+1 – 13 | `#2E7D32` | Растущая энергия, оптимизм, старт |
| Овуляция | 14 – 16 | `#F59E0B` | Пик энергии, харизма, коммуникация |
| Лютеиновая | 17 – cycle_length | `#6B21A8` | Спадающая энергия, детали, завершение |

### Логика расчёта
```go
type Phase struct {
    Name        string
    DayOfCycle  int
    Color       string
    Energy      string   // "low" | "rising" | "peak" | "falling"
}

func GetPhaseForDate(date time.Time, entry CycleEntry) Phase {
    dayOfCycle := int(date.Sub(entry.PeriodStart).Hours()/24) % entry.CycleLength + 1

    switch {
    case dayOfCycle <= entry.PeriodLength:
        return Phase{Name: "menstruation", DayOfCycle: dayOfCycle, ...}
    case dayOfCycle <= 13:
        return Phase{Name: "follicular", DayOfCycle: dayOfCycle, ...}
    case dayOfCycle <= 16:
        return Phase{Name: "ovulation", DayOfCycle: dayOfCycle, ...}
    default:
        return Phase{Name: "luteal", DayOfCycle: dayOfCycle, ...}
    }
}
```

### Кэширование
- Рассчитанный календарь кэшируется в Redis на 24 часа
- Ключ: `calendar:{user_id}:{year}:{month}`
- Инвалидация: при изменении `cycle_entries`

---

## 6. API ЭНДПОИНТЫ

### Авторизация
```
POST /api/auth/telegram
Body: { initData: string }
Response: { token: string, user: User }
```

### Цикл
```
POST   /api/cycle          — сохранить данные цикла
GET    /api/cycle          — получить текущие данные цикла
```

### Календарь
```
GET /api/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD
Response: [{ date, dayOfCycle, phase, color, forecast }]
```

### День
```
GET /api/day/:date                    — фаза + прогноз + рекомендации
GET /api/day/:date/recommendations    — только рекомендации
```

### Симптомы
```
POST /api/symptoms           — сохранить отметку дня
GET  /api/symptoms/:date     — получить отметку
GET  /api/symptoms?from=&to= — история
```

### Паттерны (инсайты)
```
GET /api/insights            — персональные паттерны пользователя
```

### События
```
POST   /api/events           — создать событие
GET    /api/events?from=&to= — список событий
DELETE /api/events/:id       — удалить
```

### Подбор лучшего дня
```
POST /api/best-days
Body: { eventType: string, from: date, to: date }
Response: [{ date, score, phase, reason }]
```

### Настройки уведомлений
```
PUT /api/settings/notifications
Body: { enabled: bool, notifyTime: "HH:MM", timezone: string }
```

---

## 7. ТИПЫ СОБЫТИЙ ДЛЯ ПОДБОРА ДНЯ

```go
var EventTypePhaseScore = map[string]map[string]int{
    "important_meeting": {
        "follicular": 3,
        "ovulation":  3,
        "luteal":     2,
        "menstruation": 1,
    },
    "intense_workout": {
        "follicular": 3,
        "ovulation":  3,
        "luteal":     2,
        "menstruation": 1,
    },
    "difficult_conversation": {
        "follicular": 3,
        "ovulation":  2,
        "luteal":     1,
        "menstruation": 1,
    },
    "social_event": {
        "ovulation":  3,
        "follicular": 3,
        "luteal":     2,
        "menstruation": 1,
    },
    "rest_day": {
        "menstruation": 3,
        "luteal":     3,
        "follicular": 1,
        "ovulation":  1,
    },
    "travel": {
        "follicular": 3,
        "ovulation":  3,
        "luteal":     2,
        "menstruation": 1,
    },
}
```

---

## 8. РЕКОМЕНДАЦИИ

Рекомендации хранятся как статические данные (JSON или таблица в БД).  
Структура на фазу:

```json
{
  "follicular": {
    "work": [
      "Лучшее время для собеседований и важных встреч",
      "Начинай новые проекты — энергия на старте",
      "Отличное время для обучения и освоения нового"
    ],
    "sport": [
      "Можно давать нагрузку — тело готово",
      "Силовые тренировки и кардио",
      "Пробуй новые виды активности"
    ],
    "social": [
      "Ты открыта и коммуникабельна",
      "Хорошее время для нетворкинга",
      "Планируй социальные события"
    ]
  }
}
```

Персонализация: если пользователь отмечал низкую энергию в фолликулярной фазе 2+ цикла подряд — понижать рекомендации для высокой нагрузки для этой конкретной пользователи.

---

## 9. УВЕДОМЛЕНИЯ

### Механика
- `gocron` запускает задачу каждые 15 минут
- Выбирает пользователей у которых `notify_time` совпадает с текущим временем (с учётом timezone)
- Отправляет сообщение через Telegram Bot API

### Шаблоны сообщений
```
День {N} · {Фаза}
Как ты себя чувствуешь сегодня?

[Отметить] [Позже]
```

```
Завтра: {название события}
Ты будешь в {фазе} — {краткое описание фазы}.
```

### Deep links
Кнопки в уведомлениях открывают конкретный экран Mini App:
```
https://t.me/{BOT_NAME}/app?startapp=symptom_{date}
https://t.me/{BOT_NAME}/app?startapp=day_{date}
```

---

## 10. ПОЛЬЗОВАТЕЛЬСКИЕ СЦЕНАРИИ

### Сценарий 1: Онбординг (первый запуск)
```
S1. Приветствие
    → Логотип, tagline «Твой цикл — твоё расписание», кнопка «Начать»

S2. Ценностное предложение
    → 3 слайда: цикл как 4 версии / календарь с фазами / прогноз точнее с отметками
    → Можно пропустить

S3. Регистрация
    → Авторизация через Telegram (валидация initData)
    → Объяснение: данные хранятся на сервере, доступны с любого устройства

S4. Данные о цикле
    → Дата последней менструации (датапикер)
    → Длина цикла (слайдер 21–40, дефолт 28)
    → Подсказка: «Не знаешь точно? Поставь примерное»

S5. Первые симптомы (для персонализации с первого дня)
    → «Как ты себя чувствуешь в начале цикла?» — мультиселект
    → «Что замечаешь в середине цикла?» — мультиселект
    → Можно пропустить

S6. Готово — первый календарь
    → Анимация заполнения календаря цветами
    → Баннер сегодняшнего дня с фазой и рекомендациями
    → CTA «Открыть календарь»
```

### Сценарий 2: Ежедневное использование
```
S1. Пуш-уведомление (9:00 или время пользователя)
    → «День N · Фаза» + кнопка «Отметить»
    → Тап открывает сразу экран отметки

S2. Главный экран — календарь
    → Месяц с цветами фаз
    → Прошедшие дни с симптомами — точка
    → Тап на день → карточка

S3. Карточка дня
    → Фаза + описание
    → Прогноз самочувствия (иконки)
    → Рекомендации по работе / спорту / общению
    → Кнопка «Как ты себя чувствуешь?»

S4. Отметка симптомов
    → Энергия (1–5)
    → Настроение (мультиселект)
    → Тело (мультиселект)
    → Заметка (опционально)
    → Всё на одном экране без шагов

S5. Инсайт после сохранения
    → Если паттерн найден: «Ты отмечаешь X в дни Y уже 2 цикла подряд»
    → Если нет: нейтральное подтверждение
```

### Сценарий 3: Планирование событий
```
S1. Главный экран — будущие дни окрашены в цвет фазы (чуть прозрачнее)
    → Тап на день → карточка будущего дня
    → Или кнопка «Найти лучший день»

S2. Карточка будущего дня
    → Плашка «Прогноз»
    → Фаза, прогноз, рекомендации
    → Кнопка «Запланировать событие»

S3. Найти лучший день
    → Выбор типа события (important_meeting / intense_workout / ...)
    → Выбор диапазона дат
    → Список дней отсортированных по score

S4. Добавление события
    → Название, время (опц), напоминание (тогл)
    → CTA «Сохранить»

S5. Событие в календаре
    → Иконка 📌 на дне в календаре
    → В карточке дня — блок «Твои события»
```

---

## 11. ЭКРАНЫ И НАВИГАЦИЯ

### Структура Mini App
```
/ (root)
├── /onboarding          — только для новых пользователей
│   ├── /slides
│   ├── /auth
│   ├── /cycle-setup
│   ├── /symptoms-setup
│   └── /ready
│
├── /calendar            — главный экран (таб 1)
│   └── /day/:date       — карточка дня
│       └── /symptoms    — отметка симптомов
│
├── /plan                — планирование (таб 2)
│   └── /best-days       — подбор лучшего дня
│
└── /profile             — профиль (таб 3)
    ├── /settings
    ├── /notifications
    └── /subscription
```

### Цвета фаз (использовать везде консистентно)
```
Менструация:   #C1440E  (фон: #FFF0EB)
Фолликулярная: #2E7D32  (фон: #F0FFF1)
Овуляция:      #F59E0B  (фон: #FFFBEB)
Лютеиновая:    #6B21A8  (фон: #FAF0FF)
```

---

## 12. МОНЕТИЗАЦИЯ

### Уровни доступа

| Функция | Free | Pro |
|---|---|---|
| Календарь с фазами | ✓ | ✓ |
| Карточка дня | ✓ | ✓ |
| Базовые рекомендации | ✓ | ✓ |
| Отметка симптомов | ✓ | ✓ |
| Персональные инсайты и паттерны | — | ✓ |
| Планировщик событий | — | ✓ |
| Подбор лучшего дня | — | ✓ |
| История и статистика | — | ✓ |

### Триал
- 14 дней Pro бесплатно при регистрации
- Напоминание за 3 дня и за 1 день до окончания
- После триала — автоматически Free, без принудительной блокировки

### Telegram Payments
- Платёжный провайдер: Stripe или ЮKassa
- Инвойсы через Bot API (`sendInvoice`)
- Цены: месяц / год (год со скидкой)

---

## 13. ПЛАН РАЗРАБОТКИ MVP

### Этап 01 — Фундамент (недели 1–2)
- [ ] Регистрация бота через @BotFather
- [ ] Go-проект: структура папок, Fiber, telebot
- [ ] PostgreSQL в Docker, первые миграции
- [ ] Авторизация через Telegram (валидация initData)
- [ ] Заготовка Mini App: Vite + React + TypeScript + @twa-dev/sdk
- **Результат:** бот запускается, Mini App открывается, авторизация работает

### Этап 02 — Алгоритм фаз (недели 3–4)
- [ ] Миграции: cycle_entries
- [ ] Функция расчёта фаз (покрыть тестами)
- [ ] POST /api/cycle — сохранить данные цикла
- [ ] GET /api/calendar — вернуть массив дней с фазами
- [ ] Кэш в Redis
- **Результат:** можно ввести данные и получить фазы на любой диапазон дат

### Этап 03 — Онбординг и календарь (недели 5–6)
- [ ] Экраны онбординга (слайды → цикл → симптомы → календарь)
- [ ] Главный экран — сетка месяца с цветами фаз
- [ ] Карточка дня (фаза + прогноз + рекомендации)
- [ ] База рекомендаций (JSON, 3–5 рекомендаций на фазу)
- [ ] GET /api/day/:date/recommendations
- **Результат:** пользователь видит свой календарь с рекомендациями

### Этап 04 — Симптомы и персонализация (недели 7–8)
- [ ] Миграции: symptom_logs
- [ ] POST/GET /api/symptoms
- [ ] Экран отметки симптомов
- [ ] Алгоритм поиска паттернов (2+ цикла → инсайт)
- [ ] Экран инсайта после сохранения
- **Результат:** пользователь отмечает симптомы и получает персональные инсайты

### Этап 05 — Уведомления (неделя 9)
- [ ] Миграции: notification_settings
- [ ] PUT /api/settings/notifications
- [ ] gocron: задача каждые 15 минут
- [ ] Шаблоны сообщений с deep links
- **Результат:** ежедневные напоминания работают

### Этап 06 — Монетизация и запуск (недели 10–11)
- [ ] Миграции: subscriptions
- [ ] Telegram Payments (Stripe/ЮKassa)
- [ ] Middleware проверки подписки
- [ ] Триальный период (14 дней)
- [ ] Финальное тестирование
- [ ] Деплой на VPS (prod окружение), webhook для бота
- **Результат:** продукт готов к запуску

---

## 14. СТРУКТУРА ПАПОК

### Бэкенд (Go)
```
/
├── cmd/
│   └── server/
│       └── main.go
├── internal/
│   ├── auth/            — валидация Telegram initData
│   ├── bot/             — обработчики Telegram Bot
│   ├── api/             — HTTP-хендлеры (Fiber)
│   ├── cycle/           — алгоритм фаз (core logic)
│   ├── recommendations/ — движок рекомендаций
│   ├── notifications/   — крон-задачи уведомлений
│   ├── models/          — структуры данных
│   └── db/              — PostgreSQL, Redis клиенты
├── migrations/          — SQL-миграции
├── config/              — конфиг из env
└── docker-compose.yml
```

### Фронтенд (React)
```
src/
├── pages/
│   ├── Onboarding/
│   ├── Calendar/
│   ├── DayCard/
│   ├── Symptoms/
│   ├── Plan/
│   └── Profile/
├── components/          — переиспользуемые компоненты
├── store/               — Zustand stores
├── api/                 — React Query хуки
├── utils/
│   └── phases.ts        — константы фаз, цвета
└── types/               — TypeScript типы
```

---

## 15. ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ

> Полные конфиги для каждого окружения — в DEPLOY.md секция 6.

```env
# Telegram
BOT_TOKEN=
WEBAPP_URL=

# Database
DATABASE_URL=postgres://user:pass@localhost:5432/cycle_calendar
REDIS_URL=redis://localhost:6379

# App
PORT=8080
ENV=development   # development | staging | production
JWT_SECRET=

# Payments (этап 06)
STRIPE_KEY=
YUKASSA_KEY=
```

### Окружения и ветки
| Окружение | Ветка | API | App | Бот |
|---|---|---|---|---|
| dev | `dev` | api-dev.medina.garum.tech | app-dev.medina.garum.tech | @YourAppDevBot |
| stage | `stage` | api-stage.medina.garum.tech | app-stage.medina.garum.tech | @YourAppStageBot |
| prod | `main` | api.medina.garum.tech | app.medina.garum.tech | @YourAppBot |

---

## 16. ВАЖНЫЕ ОГРАНИЧЕНИЯ И РЕШЕНИЯ

**Деплой — три окружения на одном VPS**
Dev / stage / prod — три отдельных Docker Compose, три бота, три поддомена. Подробная инструкция в DEPLOY.md.

**Фронтенд — SPA, не SSR**
Telegram Mini App — клиентское приложение. Nginx отдаёт статику (`dist`), Go-бэкенд отвечает только JSON. Никакого серверного рендеринга.

**Авторизация без паролей**  
Использовать только валидацию Telegram initData. Не изобретать собственную авторизацию.

**Алгоритм фаз — покрыть тестами обязательно**  
Это ядро продукта. Ошибка в расчёте фаз ломает всё. Unit-тесты на `GetPhaseForDate` — обязательны перед деплоем.

**Будущие дни в календаре**  
Визуально отличать прогноз от факта: прошедшие дни — полная непрозрачность, будущие — opacity 0.6.

**Уведомления через Bot API**  
Не использовать сторонние push-сервисы. Только Telegram Bot API — бесплатно и надёжно.

**HRV-модуль (v2.0)**  
Не включать в MVP. Измерение через камеру + фонарик (PPG, палец). SDK: Happitech. Зарезервировать эндпоинт `/api/hrv` и модуль в структуре папок, но не реализовывать.

**Redis в MVP опционален**  
Если усложняет разработку — убрать из MVP. Добавить когда появится реальная нагрузка.

---

## 17. ОПРЕДЕЛЕНИЯ ТЕРМИНОВ

| Термин | Определение |
|---|---|
| Цикл | Период от первого дня менструации до первого дня следующей |
| День цикла | Порядковый номер дня внутри цикла, начиная с 1 |
| Фаза | Один из 4 периодов цикла с характерными свойствами |
| Симптом | Ежедневная отметка энергии, настроения и физического состояния |
| Паттерн | Повторяющийся симптом в одинаковой фазе за 2+ цикла |
| Инсайт | Персональное наблюдение о паттерне, показанное пользователю |
| initData | Данные от Telegram при открытии Mini App, содержат user_id и подпись |
| PPG | Фотоплетизмография — измерение пульса/HRV через камеру + фонарик (палец) |
| HRV | Heart Rate Variability — вариабельность сердечного ритма, биомаркер восстановления |
| SPA | Single Page Application — фронтенд рендерится на клиенте, сервер отдаёт только статику |

---

## 18. СВЯЗАННЫЕ ДОКУМЕНТЫ

| Документ | Содержание |
|---|---|
| `CLAUDE.md` | Этот файл. Полное техническое задание |
| `PLAN.md` | Пошаговый план разработки с чекбоксами и проверками |
| `DEPLOY.md` | Инструкция деплоя: VPS, Nginx, Docker Compose, GitHub Actions |
