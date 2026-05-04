# Developer Guide — AI Market View Bot

Это руководство нужно, чтобы ты мог сам продолжать разработку проекта без привязки ко мне.

---

## 1. Что это за проект

**AI Market View Bot** — Telegram-бот для продажи аналитики по финансовым инструментам.

### MVP уже покрывает:
- выбор инструмента
- ввод тикера
- создание заказа
- ссылка на оплату через ЮKassa
- webhook-подтверждение оплаты
- автоматическую отправку аналитики после оплаты
- просмотр заявок клиента

---

## 2. Текущая архитектура

```text
root/
  package.json
  .env.example
  docker-compose.yml
  README.md
  docs/
    developer-guide.md
    project-status.md
    changelog.md
  services/
    telegram-bot/
      package.json
      tsconfig.json
      prisma/
        schema.prisma
      src/
        index.ts
        config.ts
        catalog.ts
        ai-analysis.ts
        ai/
          openai-client.ts
          prompt-templates.ts
        yookassa.ts
        session-store.ts
        order-store.ts
        order-store-interface.ts
        app-context.ts
        server.ts
        repositories/
          index.ts
          order.repository.ts
          user.repository.ts
        middleware/
          webhook-validation.ts
        utils/
          logger.ts
```

### Назначение модулей

#### `index.ts`
Главная точка входа:
- запускает Telegram-бота
- поднимает HTTP-сервер
- содержит пользовательские сценарии

#### `config.ts`
Проверяет и читает env-переменные.

#### `catalog.ts`
Каталог инструментов, цены, тексты категорий.

#### `ai-analysis.ts`
Сервис генерации аналитики. Использует OpenAI API если задан `OPENAI_API_KEY`, иначе возвращает demo-ответ.

#### `ai/openai-client.ts`
Фабрика для создания OpenAI клиента из конфигурации.

#### `ai/prompt-templates.ts`
Шаблоны промптов для AI: системный промпт, построитель пользовательского запроса, disclaimer.

#### `yookassa.ts`
Интеграция создания платежа через ЮKassa API.

#### `session-store.ts`
Пользовательская сессия в памяти:
- выбранный инструмент
- тикер
- профиль
- последний payment id

#### `order-store.ts`
Хранилище заказов.
Сейчас:
- хранит заказы в памяти
- дополнительно сохраняет их в `tmp/orders.json`

#### `server.ts`
Express HTTP API:
- healthcheck
- webhook ЮKassa
- список заказов пользователя

#### `app-context.ts`
Общие singleton-экземпляры сервисов и хранилищ.

---

## 3. Как запускать локально

### Установка
```bash
npm install
```

### Настройка env
```bash
copy .env.example .env
```

Заполни минимум:

- `TELEGRAM_BOT_TOKEN`
- `YOOKASSA_SHOP_ID`
- `YOOKASSA_SECRET_KEY`
- `YOOKASSA_RETURN_URL`
- `PORT`

### Запуск разработки
```bash
npm run dev
```

### Проверка типов
```bash
npm run typecheck
```

### Сборка
```bash
npm run build
```

---

## 4. Webhook flow

### Как работает обработка webhook ЮKassa

1. ЮKassa отправляет `POST /webhooks/yookassa` при изменении статуса платежа
2. **IP whitelist** — проверяется, что запрос пришёл с IP-адреса ЮKassa (middleware `validateWebhookIp`)
3. **Zod validation** — тело запроса валидируется по схеме `yooKassaWebhookSchema` (middleware `validateWebhookBody`)
4. **Идемпотентность** — если `paymentId` уже обработан (in-memory set или заказ в статусе `paid`/`delivered`), возвращается `200 OK` без повторной обработки
5. **Обработка** — находится заказ, генерируется аналитика, отправляется в Telegram
6. **Retry** — при ошибке отправки в Telegram повторяется до 3 раз с exponential backoff (1s, 2s)
7. **Admin notify** — при любой ошибке обработки отправляется уведомление в `ADMIN_CHAT_ID`
8. **Logging** — все события журналируются в JSON-формате (timestamp, event, paymentId, status)

### Архитектура middleware

```text
Request → validateWebhookIp → validateWebhookBody → handler
         (403 if bad IP)      (400 if bad body)     (business logic)
```

### Файлы

| Файл | Назначение |
|------|-----------|
| `src/middleware/webhook-validation.ts` | IP whitelist + zod schema |
| `src/utils/logger.ts` | Structured JSON logger |
| `src/server.ts` | HTTP handler с retry, idempotency, admin notify |

### Как тестировать webhook локально

1. Запусти бот: `npm run dev`
2. Используй [ngrok](https://ngrok.com/) или аналог для проброса порта:
   ```bash
   ngrok http 3000
   ```
3. Укажи полученный URL в настройках webhook ЮKassa: `https://xxxx.ngrok.io/webhooks/yookassa`
4. Для ручного тестирования отправь curl:
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

### Переменные окружения для webhook

| Переменная | Описание |
|-----------|----------|
| `ADMIN_CHAT_ID` | Telegram chat ID для уведомлений об ошибках |
| `LOG_LEVEL` | Уровень логирования: `debug`, `info`, `warn`, `error` |

---

## 5. Docker

### Запуск через Docker Compose

```bash
# Создай .env файл
cp .env.example .env
# Заполни обязательные переменные

# Поднять PostgreSQL + telegram-bot
docker compose up -d

# Посмотреть логи
docker compose logs -f telegram-bot

# Остановить
docker compose down
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

## 5. CI/CD

GitHub Actions CI запускается автоматически:
- на push в `main`
- на pull request в `main`

### Jobs:
1. **Lint** — `npm run lint` (ESLint)
2. **Typecheck** — `npm run typecheck` (tsc --noEmit)
3. **Build** — `npm run build` (tsc) — запускается после typecheck

Конфигурация: `.github/workflows/ci.yml`

---

## 6. Линтинг и форматирование

### ESLint

```bash
# Проверка
npm run lint

# Автоисправление
npm run lint:fix
```

Конфигурация: `eslint.config.js` (flat config)
- `typescript-eslint` для TypeScript
- `no-explicit-any` — warning
- `no-unused-vars` — warning (с игнорированием `_`-префиксов)

### Prettier

```bash
# Форматирование всех файлов
npm run format
```

Конфигурация: `.prettierrc`
- `printWidth: 120`
- `singleQuote: false`
- `semi: true`

---

## 7. Работа с Prisma и PostgreSQL

### Запуск PostgreSQL

Для локальной разработки используется Docker:

```bash
docker-compose up -d
```

PostgreSQL будет доступен на порте **5433** (чтобы не конфликтовать с локальным PostgreSQL).

### Настройка DATABASE_URL

В `.env` добавь:

```
DATABASE_URL=postgresql://botanalitic:botanalitic@localhost:5433/botanalitic
```

Если `DATABASE_URL` не задан — бот автоматически использует файловый fallback (`tmp/orders.json`).

### Генерация Prisma Client

```bash
cd services/telegram-bot
npx prisma generate
```

Клиент генерируется из `services/telegram-bot/prisma/schema.prisma`.

### Создание и применение миграций

```bash
cd services/telegram-bot
npx prisma migrate dev --name <migration_name>
```

Для production:
```bash
npx prisma migrate deploy
```

### Просмотр базы данных

```bash
cd services/telegram-bot
npx prisma studio
```

Откроется веб-интерфейс для просмотра и редактирования данных.

### Prisma schema

Модели описаны в `services/telegram-bot/prisma/schema.prisma`:

- **User** — telegram-пользователи (telegramId BigInt unique)
- **Order** — заказы на аналитику
- **Payment** — платежи ЮKassa
- **Delivery** — статусы доставки аналитики

### Архитектура хранения

```text
app-context.ts
  ├─ DATABASE_URL задан? → PrismaClient + PrismaOrderRepository
  └─ DATABASE_URL нет?   → OrderStore (файловый tmp/orders.json)
```

Интерфейс `IOrderStore` абстрагирует оба варианта. Все вызовы в `index.ts` и `server.ts` используют `await`.

---

## 8. Как лучше развивать проект

### Этап 1 — Persistence
Сделать:
- Prisma schema
- миграции
- репозитории
- отказ от `order-store.ts` на файлах

### Этап 2 — Реальный AI
Сделать:
- модуль `market-data/`
- модуль `prompt-builder/`
- модуль `analysis-runner/`
- провайдер LLM (OpenAI / Claude / локальные модели)
- шаблоны аналитики по классам активов

### Этап 3 — Надёжность
Сделать:
- очередь задач
- retry на доставку аналитики
- идемпотентность webhook
- логирование
- алерты
- аудит действий

### Этап 4 — Коммерческий контур
Сделать:
- оферту
- privacy policy
- disclaimer
- тарифы
- подписки
- историю покупок
- админ-раздел

---

## 9. Как менять каталог инструментов

Редактируй файл:

```text
services/telegram-bot/src/catalog.ts
```

Там можно:
- менять список рынков
- менять цены
- менять описания
- менять promptHint для AI

---

## 10. OpenAI интеграция (реализовано)

OpenAI API подключен и работает в production-режиме.

### Архитектура

```text
src/
  ai/
    openai-client.ts    — фабрика OpenAI клиента
    prompt-templates.ts — системный промпт + шаблон пользовательского запроса
  ai-analysis.ts        — основной сервис анализа
```

### Как работает

1. `openai-client.ts` создаёт OpenAI клиент из `config.OPENAI_API_KEY`
2. Если ключ не задан или пустой — возвращает `null`, и сервис использует demo-генератор
3. `prompt-templates.ts` содержит:
   - `SYSTEM_PROMPT` — системный промпт для роли аналитика
   - `buildUserPrompt()` — строит запрос на основе `InstrumentCategory`, тикера и профиля
   - `DISCLAIMER` — обязательный disclaimer в конце каждого ответа
4. `ai-analysis.ts` (`AiAnalysisService`):
   - Принимает OpenAI клиент, модель и max_tokens через конструктор
   - Если есть OpenAI клиент → вызывает Chat Completions API
   - Если нет или ошибка → fallback на demo-генератор
   - Ответ содержит 5 секций: обзор рынка, ключевые уровни, сценарии, риски, идея

### Переменные окружения

| Переменная | Обязательная | По умолчанию | Описание |
|---|---|---|---|
| `OPENAI_API_KEY` | Нет | — | API ключ OpenAI. Без него используется demo-генератор |
| `OPENAI_MODEL` | Нет | `gpt-4o-mini` | Модель OpenAI для генерации |
| `OPENAI_MAX_TOKENS` | Нет | `2000` | Максимум токенов в ответе |

### Что осталось сделать
- Подключить market data context (реальные котировки, новости) в промпт
- Логирование стоимости генерации (cost tracking)
- Кэширование ответов

---

## 11. Как подключить сбор данных

### Текущая реализация

Слой интеграции с рыночными данными уже реализован в `src/integrations/`:

```text
src/integrations/
  market-data/
    provider.interface.ts    — общий интерфейс MarketDataProvider
    yahoo-finance.provider.ts — Yahoo Finance (акции США, commodities, FX)
    moex.provider.ts          — MOEX ISS (акции РФ, IMOEX, RGBI)
    coingecko.provider.ts     — CoinGecko (криптовалюты)
    cbr.provider.ts           — ЦБ РФ (курсы валют)
    tradingview.provider.ts   — TradingView (технический анализ)
    index.ts                  — фабрика провайдеров
  news/
    news.interface.ts         — интерфейс NewsProvider
    rss-news.provider.ts      — общий RSS-парсер
    investing-rss.provider.ts — Investing.com (4 RSS-фида)
    bloomberg-rss.provider.ts — Bloomberg RSS
  sentiment/
    x-sentiment.provider.ts   — X.com (заглушка, нужен API ключ)
  cache/
    market-cache.ts           — in-memory кэш с TTL
  instrument-mapper.ts        — маппинг instrumentId → провайдер + символ
  market-data.service.ts      — агрегирующий сервис MarketDataService
```

### Маппинг инструментов

Файл `instrument-mapper.ts` связывает `instrumentId` из `catalog.ts` с провайдерами:

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

### Как добавить нового провайдера

1. Создай файл в `src/integrations/market-data/` реализующий `MarketDataProvider`
2. Добавь тип провайдера в `ProviderType` в `instrument-mapper.ts`
3. Зарегистрируй в фабрике `market-data/index.ts`
4. Добавь маппинг в `instrument-mapper.ts`
5. При необходимости обнови `MarketDataService`

### Как добавить новый источник новостей

1. Создай файл в `src/integrations/news/` реализующий `NewsProvider`
2. Подключи в `MarketDataService.aggregateNews()`

### Кэширование

Все провайдеры используют общий `MarketCache` с TTL:
- Котировки: 60 секунд
- Исторические данные: 5 минут
- Новости: 15 минут
- Sentiment: 10 минут
- Технический анализ: 2 минуты

### Важно
- Используются только бесплатные API без ключей
- Все провайдеры gracefully fallback при недоступности API (возвращают `null` / `[]`)
- Не нарушай ToS источников

---

## 12. Что важно не сломать

При доработках следи за инвариантами:

- заказ должен создаваться до платежа
- payment metadata должна содержать `orderId`
- webhook должен быть идемпотентным
- анализ нельзя отправлять до подтверждения оплаты
- аналитика должна содержать disclaimer
- нужно избегать обещаний гарантированной доходности

---

## 13. Как публиковать на GitHub

### Инициализация
```bash
git init
git add .
git commit -m "feat: initial AI Market View bot MVP"
```

### Создание репозитория
Либо через GitHub UI, либо через `gh` CLI.

### Подключение remote
```bash
git remote add origin https://github.com/USERNAME/REPOSITORY.git
git branch -M main
git push -u origin main
```

---

## 14. Что я бы делал следующим коммитом

Рекомендую следующую последовательность:

### Коммит 1
`feat: add prisma and postgres persistence`

### Коммит 2
`feat: add verified yookassa webhook processing`

### Коммит 3
`feat: add real ai analysis pipeline`

### Коммит 4
`feat: add admin tools and operator workflow`

---

## 15. Идеальный target state проекта

Если доводить до сильной production-версии, то нужно:

- PostgreSQL
- Prisma
- Redis
- job queue
- webhook verification
- полноценный AI pipeline
- abstraction над data providers
- аналитика с шаблонами по типу актива
- операторский кабинет
- логирование и мониторинг
- unit/integration tests
- Docker setup
- deploy pipeline
- юридические документы

---

## 16. Если будешь продолжать сам

Лучший практический путь:
1. сначала БД
2. потом webhook-надежность
3. потом AI pipeline
4. потом data providers
5. потом админка и операционный контур

Именно в таком порядке проект будет расти наиболее устойчиво.