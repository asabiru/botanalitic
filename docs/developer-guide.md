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
  README.md
  docs/
    developer-guide.md
    project-status.md
    changelog.md
  services/
    telegram-bot/
      package.json
      tsconfig.json
      src/
        index.ts
        config.ts
        catalog.ts
        ai-analysis.ts
        yookassa.ts
        session-store.ts
        order-store.ts
        app-context.ts
        server.ts
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
Сейчас это демо-генератор аналитики.  
В будущем сюда нужно подключить реальный AI pipeline.

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

## 5. Что нужно сделать в первую очередь дальше

### Приоритет 1 — База данных
Сейчас заказы лежат в `tmp/orders.json`, это временное решение.

Нужно заменить на:
- PostgreSQL
- Prisma ORM

Минимальные таблицы:
- users
- orders
- payments
- deliveries

---

## 5. Как лучше развивать проект

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

## 6. Как менять каталог инструментов

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

## 7. Как подключить реальный OpenAI

Сейчас `ai-analysis.ts` возвращает демо-текст.

Чтобы подключить реальную модель:
1. установить официальный SDK
2. создать `OpenAiAnalysisService`
3. вынести prompt templates
4. подключить market data context
5. валидировать и сокращать ответ
6. логировать стоимость генерации

---

## 8. Как подключить сбор данных

Важно: некоторые источники имеют ограничения по лицензии, scraping и условиям использования.

Безопасный путь:
- использовать официальные API там, где они есть
- не нарушать ToS сайтов
- разделить:
  - market data provider
  - news provider
  - social sentiment provider

Рекомендуемая структура:
```text
src/
  integrations/
    news/
    market-data/
    sentiment/
```

---

## 9. Что важно не сломать

При доработках следи за инвариантами:

- заказ должен создаваться до платежа
- payment metadata должна содержать `orderId`
- webhook должен быть идемпотентным
- анализ нельзя отправлять до подтверждения оплаты
- аналитика должна содержать disclaimer
- нужно избегать обещаний гарантированной доходности

---

## 10. Как публиковать на GitHub

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

## 11. Что я бы делал следующим коммитом

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

## 12. Идеальный target state проекта

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

## 13. Если будешь продолжать сам

Лучший практический путь:
1. сначала БД
2. потом webhook-надежность
3. потом AI pipeline
4. потом data providers
5. потом админка и операционный контур

Именно в таком порядке проект будет расти наиболее устойчиво.