# Developer Guide — AI Market View Bot

Руководство для продолжения разработки проекта.

---

## 1. Что это за проект

**AI Market View Bot** — Telegram-бот для продажи AI-аналитики по финансовым инструментам.

Реализовано:
- каталог из 12 инструментов (валюты, сырьё, акции, индексы, крипто)
- оплата через ЮKassa с надёжной обработкой webhook
- AI-аналитика через OpenAI (с demo-fallback)
- сбор рыночных данных из 7 провайдеров
- промокоды и реферальная программа
- админ-панель (Telegram + HTTP + HTML dashboard)
- PostgreSQL + Prisma ORM (с файловым fallback)
- 65 unit/integration тестов

---

## 2. Архитектура проекта

```text
services/telegram-bot/src/
  index.ts                  — точка входа, Telegram bot handlers
  config.ts                 — env-переменные (zod валидация)
  catalog.ts                — каталог инструментов, цены, описания
  server.ts                 — Express HTTP, webhook, admin API
  app-context.ts            — DI, singleton'ы сервисов
  yookassa.ts               — интеграция ЮKassa
  session-store.ts          — in-memory сессии пользователей
  order-store.ts            — хранилище заказов (файловый fallback)
  order-store-interface.ts  — абстракция IOrderStore
  ai-analysis.ts            — сервис AI-аналитики
  ai/
    openai-client.ts        — фабрика OpenAI клиента
    prompt-templates.ts     — шаблоны промптов по классам активов
  admin/
    admin-guard.ts          — middleware проверки ADMIN_CHAT_ID
    admin-handlers.ts       — обработчики admin-команд
    audit-log.ts            — журнал действий
  integrations/
    market-data.service.ts  — агрегатор рыночных данных
    instrument-mapper.ts    — маппинг инструментов на провайдеры
    cache/market-cache.ts   — in-memory кэш с TTL
    market-data/            — провайдеры (Yahoo, MOEX, CoinGecko, CBR, TradingView)
    news/                   — RSS-новости (Investing.com, Bloomberg)
    sentiment/              — X.com sentiment (интерфейс)
  legal/
    legal-texts.ts          — тексты для /legal команды
  middleware/
    webhook-validation.ts   — IP whitelist + zod-валидация
  promo/
    promo-store.ts          — промокоды
    referral.ts             — реферальная система
  repositories/
    order.repository.ts     — Prisma OrderRepository
    user.repository.ts      — Prisma UserRepository
    index.ts
  utils/
    logger.ts               — структурированное логирование
  __tests__/                — 7 test suites, 65 тестов
```

---

## 3. Как запускать локально

### Установка
```bash
npm install
```

### Настройка env
```bash
cp .env.example .env
```

Обязательные переменные:
- `TELEGRAM_BOT_TOKEN`
- `YOOKASSA_SHOP_ID`
- `YOOKASSA_SECRET_KEY`

Опциональные:
- `DATABASE_URL` — PostgreSQL (без него работает файловый fallback)
- `OPENAI_API_KEY` — OpenAI (без него используется demo-генератор)
- `OPENAI_MODEL` — модель (по умолчанию `gpt-4o-mini`)
- `OPENAI_MAX_TOKENS` — лимит токенов (по умолчанию 2000)
- `ADMIN_CHAT_ID` — Telegram ID администратора
- `ADMIN_API_KEY` — ключ для HTTP admin API
- `LOG_LEVEL` — уровень логирования (`debug`, `info`, `warn`, `error`)

### Запуск
```bash
npm run dev
```

### Проверка проекта
```bash
npm run typecheck
npm run build
npm run lint
npm test
```

---

## 4. Docker

### Docker Compose
```bash
cp .env.example .env
# Заполни обязательные переменные

docker compose up -d           # PostgreSQL + telegram-bot
docker compose logs -f telegram-bot  # логи
docker compose down            # остановить
```

PostgreSQL доступен на порту `5433` (host) → `5432` (container).

Credentials для локальной разработки:
- user: `botanalitic`
- password: `botanalitic`
- database: `botanalitic`
- `DATABASE_URL=postgresql://botanalitic:botanalitic@localhost:5433/botanalitic`

### Сборка Docker-образа вручную
```bash
docker build -f services/telegram-bot/Dockerfile -t telegram-bot .
```

---

## 5. Тестирование

### Запуск тестов
```bash
npm run test
npm run test:watch     # watch-режим
npm run test:coverage  # с покрытием
```

### Структура тестов

| Файл | Тип | Что покрывает |
|------|-----|---------------|
| `catalog.test.ts` | unit | Каталог инструментов, `findInstrumentById` |
| `session-store.test.ts` | unit | `SessionStore`: get, patch, clear |
| `order-store.test.ts` | unit | `OrderStore`: create, update, getById, getByPaymentId, listByTelegramUserId |
| `ai-analysis.test.ts` | unit | `AiAnalysisService`: формат, секции, disclaimer |
| `config.test.ts` | unit | Валидация env переменных через zod |
| `yookassa.test.ts` | unit | `YooKassaService`: createPayment с моком axios |
| `server.test.ts` | integration | HTTP endpoints: /health, /webhooks/yookassa, /orders/:id |

### Принципы
- Все внешние сервисы (Telegram API, YooKassa API, OpenAI) замокированы
- Тесты работают без `.env` и без внешних зависимостей
- CI: GitHub Actions запускает lint + typecheck + build + test при push/PR в main

---

## 6. Webhook flow

### Как работает обработка webhook ЮKassa

1. ЮKassa отправляет `POST /webhooks/yookassa` при изменении статуса платежа
2. **IP whitelist** — `validateWebhookIp` проверяет IP-адрес ЮKassa
3. **Zod validation** — `validateWebhookBody` валидирует тело запроса
4. **Идемпотентность** — если `paymentId` уже обработан, возвращается `200 OK`
5. **Обработка** — находится заказ, генерируется аналитика, отправляется в Telegram
6. **Retry** — при ошибке до 3 попыток с exponential backoff
7. **Admin notify** — при ошибке уведомление в `ADMIN_CHAT_ID`
8. **Logging** — JSON-формат (timestamp, event, paymentId, status)

```text
Request → validateWebhookIp → validateWebhookBody → handler
         (403 if bad IP)      (400 if bad body)     (business logic)
```

### Тестирование webhook локально

1. Запусти бот: `npm run dev`
2. Пробрось порт через ngrok:
   ```bash
   ngrok http 3000
   ```
3. Укажи URL в настройках ЮKassa: `https://xxxx.ngrok.io/webhooks/yookassa`
4. Для ручного теста:
   ```bash
   curl -X POST http://localhost:3000/webhooks/yookassa \
     -H "Content-Type: application/json" \
     -d '{
       "event": "payment.succeeded",
       "object": {
         "id": "test-payment-123",
         "status": "succeeded",
         "metadata": {
           "orderId": "your-order-id",
           "telegramUserId": "123456789"
         }
       }
     }'
   ```
5. IP whitelist пропускает `127.0.0.1` и приватные сети в dev-режиме

---

## 7. Prisma и PostgreSQL

### Генерация Prisma Client
```bash
cd services/telegram-bot
npx prisma generate
```

### Миграции
```bash
cd services/telegram-bot
npx prisma migrate dev --name <migration_name>  # dev
npx prisma migrate deploy                        # production
npx prisma studio                                 # GUI для БД
```

### Модели (schema.prisma)
- **User** — telegram-пользователи (telegramId BigInt unique)
- **Order** — заказы на аналитику
- **Payment** — платежи ЮKassa
- **Delivery** — статусы доставки

### Архитектура хранения
```text
app-context.ts
  ├─ DATABASE_URL задан? → PrismaClient + PrismaOrderRepository
  └─ DATABASE_URL нет?   → OrderStore (файловый tmp/orders.json)
```

Интерфейс `IOrderStore` абстрагирует оба варианта. Все вызовы async-совместимы.

---

## 8. OpenAI аналитика

### Архитектура
```text
ai/
  openai-client.ts    — фабрика OpenAI клиента
  prompt-templates.ts — системный промпт + шаблон запроса + disclaimer
ai-analysis.ts        — основной сервис
```

### Как работает
1. `openai-client.ts` создаёт клиент из `OPENAI_API_KEY`. Если ключ не задан — `null`.
2. `prompt-templates.ts` — системный промпт, `buildUserPrompt()` по классу актива, `DISCLAIMER`.
3. `AiAnalysisService`:
   - Есть OpenAI клиент → Chat Completions API
   - Нет клиента или ошибка → demo-генератор
   - Ответ: обзор рынка, ключевые уровни, сценарии, риски, идея + disclaimer

---

## 9. Рыночные данные

### Провайдеры

| instrumentId | Провайдер | Символ по умолчанию |
|---|---|---|
| cny-rub | CBR | CNY |
| usd-rub | CBR | USD |
| oil | Yahoo Finance | BZ=F |
| gas | Yahoo Finance | NG=F |
| gold | Yahoo Finance | GC=F |
| silver | Yahoo Finance | SI=F |
| us-stocks | Yahoo Finance | (тикер клиента) |
| ru-stocks | MOEX | (тикер клиента) |
| imoex | MOEX | IMOEX |
| rgbi | MOEX | RGBITR |
| crypto | CoinGecko | (тикер клиента) |
| eur-usd | Yahoo Finance | EURUSD=X |

### Кэширование (MarketCache)
- Котировки: 60 сек
- Исторические данные: 5 мин
- Новости: 15 мин
- Sentiment: 10 мин
- Технический анализ: 2 мин

### Как добавить нового провайдера
1. Реализуй `MarketDataProvider` в `src/integrations/market-data/`
2. Добавь тип в `ProviderType` в `instrument-mapper.ts`
3. Зарегистрируй в фабрике `market-data/index.ts`
4. Добавь маппинг в `instrument-mapper.ts`

---

## 10. Промокоды и реферальная программа

### Промокоды
- CRUD: create, getByCode, use, deactivate, list
- Валидация: срок, лимит, активность
- Максимальная скидка: 50%
- Один промокод на заказ

Предустановленные:

| Код | Скидка | Лимит |
|-----|--------|-------|
| LAUNCH100 | 30% | 100 |
| FRIEND20 | 20% | Безлимит |
| FIRST | 15% | Безлимит |

### Реферальная программа
- `/referral` — код и ссылка
- Новый пользователь получает скидку 20% (FRIEND20)
- Реферер получает уведомление

### Admin-команды
- `/promo_list`, `/promo_create <code> <discount%> <maxUses>`, `/promo_deactivate <code>`

---

## 11. Админ-панель

### Telegram-команды (только для ADMIN_CHAT_ID)

| Команда | Описание |
|---------|----------|
| `/admin` | Меню админа |
| `/orders` | Последние 20 заказов |
| `/order <id>` | Детали заказа |
| `/stats` | Статистика |
| `/users` | Количество пользователей |
| `/resend <orderId>` | Перевыдача аналитики |
| `/broadcast <text>` | Рассылка всем |

### HTTP Admin API (X-Admin-Key)
```
GET  /admin/stats
GET  /admin/orders?page=1&limit=20&status=paid
GET  /admin/orders/:id
POST /admin/orders/:id/resend
GET  /admin/dashboard  → HTML dashboard
```

### Audit log
Все действия логируются в `tmp/audit.log`:
```
[ISO timestamp] actor=<userId|api> action=<action_name> <details>
```

---

## 12. Линтинг и форматирование

### ESLint
```bash
npm run lint       # проверка
npm run lint:fix   # автоисправление
```
Конфигурация: `eslint.config.mjs` (flat config), `typescript-eslint`.

### Prettier
```bash
npm run format
```
Конфигурация: `.prettierrc` — `printWidth: 120`, `singleQuote: false`, `semi: true`.

---

## 13. Как менять каталог инструментов

Файл: `services/telegram-bot/src/catalog.ts`

Можно менять:
- список инструментов
- цены
- описания
- `promptHint` для AI
- маппинг на провайдеры данных (в `instrument-mapper.ts`)

---

## 14. Инварианты проекта

При доработках следи за:
- заказ создаётся **до** платежа
- payment metadata содержит `orderId`
- webhook **идемпотентен**
- аналитика не отправляется до подтверждения оплаты
- аналитика содержит **disclaimer**
- нет обещаний гарантированной доходности
- промокод не влияет на AI pipeline, market data, webhook verification

---

## 15. Что осталось сделать

Рекомендуемый порядок:

1. **Redis / очередь задач** — для надёжной обработки и отложенных задач
2. **Cost tracking** — логирование стоимости OpenAI запросов
3. **X.com sentiment API** — интерфейс готов, нужен API ключ
4. **E2E тесты** — Playwright или аналог
5. **Production config** — process manager, мониторинг, алерты
6. **Подписочная модель** — рекуррентные платежи
