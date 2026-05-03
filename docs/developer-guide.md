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
  services/
    telegram-bot/
      package.json
      tsconfig.json
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
        app-context.ts
        server.ts
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

## 4. Что нужно сделать в первую очередь дальше

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

## 7. OpenAI интеграция (реализовано)

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