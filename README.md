# AI Finance

Telegram-бот для AI-аналитики финансовых инструментов с интеграцией **OpenAI**, реальными рыночными данными, сентимент-анализом с **X.com** и опциональной оплатой через **ЮKassa**.

## Статус проекта

**Текущий статус:** полнофункциональный MVP

Проект:
- собирается и проходит typecheck / lint без ошибок и warning'ов
- покрыт 65 unit/integration тестами (Vitest)
- запускается локально и в Docker
- поддерживает каталог из 12 финансовых инструментов
- интегрирован с OpenAI для генерации аналитики (с demo-fallback)
- собирает реальные рыночные данные (Yahoo Finance, MOEX, CoinGecko, ЦБ РФ, TradingView, RSS-новости)
- принимает оплату через ЮKassa с надёжной обработкой webhook
- имеет админ-панель (Telegram + HTTP + HTML dashboard)
- поддерживает промокоды и реферальную программу
- содержит полный юридический пакет документов

Подробный статус: [`docs/project-status.md`](docs/project-status.md)

---

## Что реализовано

### Telegram bot flow
- `/start` — приветствие и главное меню
- каталог аналитики (12 инструментов)
- выбор инструмента и ввод тикера
- демо-аналитика (бесплатная) и полная аналитика (платная)
- оформление заказа и оплата
- просмотр заявок пользователя
- промокоды и реферальная программа (`/referral`)
- юридическая информация (`/legal`)

### AI-аналитика
- OpenAI SDK с prompt templates по классам активов
- Structured output: обзор рынка, ключевые уровни, сценарии, риски, идея
- Контроль `max_tokens` (настраивается через `OPENAI_MAX_TOKENS`)
- Fallback на demo-генератор если `OPENAI_API_KEY` не задан
- Дисклеймер в каждом ответе

### Рыночные данные
- **Yahoo Finance** — акции США, commodities, FX
- **MOEX ISS** — акции РФ (TQBR), IMOEX, RGBI
- **CoinGecko** — криптовалюты
- **ЦБ РФ** — курсы валют (USD/RUB, CNY/RUB, EUR/RUB)
- **TradingView** — техническая сводка
- **Investing.com / Bloomberg RSS** — новости
- In-memory кэш с TTL

### Оплата (ЮKassa)
- Создание заказа и ссылки на оплату
- Webhook endpoint с IP whitelist и zod-валидацией
- Идемпотентная обработка (повторный webhook не дублирует)
- Retry-логика (3 попытки, exponential backoff)
- Автоматическая отправка аналитики после оплаты
- Уведомление админа при ошибках

### Промокоды и реферальная программа
- Предустановленные коды: `LAUNCH100`, `FRIEND20`, `FIRST`
- CRUD для промокодов (admin)
- Валидация: срок, лимит, активность
- Реферальная система с генерацией кода и скидкой

### Админ-панель
- Telegram-команды: `/admin`, `/orders`, `/order`, `/stats`, `/users`, `/resend`, `/broadcast`
- HTTP API: `GET /admin/stats`, `GET /admin/orders`, `POST /admin/orders/:id/resend`
- HTML dashboard (Tailwind CSS, тёмная тема)
- Audit log

### Backend (Express HTTP)
- `GET /health`
- `POST /webhooks/yookassa`
- `GET /orders/:telegramUserId`
- Admin API (защищён X-Admin-Key)

### Хранение данных
- **PostgreSQL + Prisma ORM** — основное хранилище (модели: User, Order, Payment, Delivery)
- Файловый fallback — если `DATABASE_URL` не задан, работает с `tmp/orders.json`
- In-memory session store

### Инфраструктура
- Dockerfile (multi-stage, Node.js 20 Alpine)
- docker-compose.yml (PostgreSQL 16 + telegram-bot)
- GitHub Actions CI (lint, typecheck, build, test)
- ESLint + Prettier
- 65 unit/integration тестов (Vitest)

### Юридический пакет
- Публичная оферта, политика конфиденциальности, пользовательское соглашение
- Политика возвратов, дисклеймер, тарифы
- Команда `/legal` и кнопка в главном меню

### Маркетинг
- Лендинг: [`landing/index.html`](landing/index.html)
- Маркетинговая стратегия: [`docs/marketing-strategy.md`](docs/marketing-strategy.md)
- Контент-план: [`docs/content-plan.md`](docs/content-plan.md)
- 7 готовых постов: [`marketing/telegram-posts/`](marketing/telegram-posts/)
- SEO: [`docs/seo-copy.md`](docs/seo-copy.md)

---

## Поддерживаемые инструменты

| Инструмент | Цена | Провайдер данных |
|---|---|---|
| 🇨🇳 Юань/Рубль | 1 490 ₽ | ЦБ РФ |
| 💵 Доллар/Рубль | 1 490 ₽ | ЦБ РФ |
| 🛢 Нефть | 1 790 ₽ | Yahoo Finance |
| 🔵 Газ | 1 790 ₽ | Yahoo Finance |
| 🥇 Золото | 1 990 ₽ | Yahoo Finance |
| 🥈 Серебро | 1 990 ₽ | Yahoo Finance |
| 🇺🇸 Акции США | 2 490 ₽ | Yahoo Finance |
| 📈 Акции РФ | 1 990 ₽ | MOEX ISS |
| 🇷🇺 Индекс Мосбиржи | 1 790 ₽ | MOEX ISS |
| 🇷🇺 Индекс RGBI | 1 790 ₽ | MOEX ISS |
| ₿ Криптовалюты | 2 490 ₽ | CoinGecko |
| 🇪🇺 Евро/Доллар | 1 490 ₽ | Yahoo Finance |

---

## Архитектура проекта

```text
root/
  package.json
  docker-compose.yml
  eslint.config.mjs
  .prettierrc
  .github/workflows/ci.yml
  landing/
    index.html
    styles.css
  admin/
    index.html
  marketing/
    telegram-posts/
  docs/
    developer-guide.md
    project-status.md
    changelog.md
    marketing-strategy.md
    content-plan.md
    seo-copy.md
    team-agents.md
    universal-ai-prompt.md
    legal/
      offer.md, privacy-policy.md, terms-of-service.md,
      refund-policy.md, disclaimer.md, pricing.md
  services/
    telegram-bot/
      Dockerfile
      package.json
      tsconfig.json
      vitest.config.ts
      prisma/
        schema.prisma
      src/
        index.ts                  — точка входа, Telegram-сценарии
        config.ts                 — env-конфигурация (zod)
        catalog.ts                — каталог инструментов
        server.ts                 — Express HTTP, webhook, admin API
        app-context.ts            — DI / singletons
        yookassa.ts               — интеграция ЮKassa
        session-store.ts          — сессии пользователей
        order-store.ts            — хранилище заказов (file)
        order-store-interface.ts  — абстракция IOrderStore
        ai-analysis.ts            — сервис AI-аналитики
        ai/
          openai-client.ts        — фабрика OpenAI клиента
          prompt-templates.ts     — шаблоны промптов
        admin/
          admin-guard.ts          — middleware проверки админа
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
          legal-texts.ts          — тексты для бота
        middleware/
          webhook-validation.ts   — IP whitelist + zod
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

## Быстрый старт

### 1. Установить зависимости
```bash
npm install
```

### 2. Создать `.env`
```bash
cp .env.example .env
```

### 3. Заполнить переменные окружения

Обязательно:
- `TELEGRAM_BOT_TOKEN`
- `YOOKASSA_SHOP_ID`
- `YOOKASSA_SECRET_KEY`

Опционально:
- `DATABASE_URL` — PostgreSQL (без него работает файловый fallback)
- `OPENAI_API_KEY` — OpenAI (без него используется demo-генератор)
- `OPENAI_MODEL` — модель (по умолчанию `gpt-4o-mini`)
- `OPENAI_MAX_TOKENS` — лимит токенов (по умолчанию 2000)
- `ADMIN_CHAT_ID` — Telegram ID администратора
- `ADMIN_API_KEY` — ключ для HTTP admin API

### 4. Генерация Prisma Client (при использовании PostgreSQL)
```bash
cd services/telegram-bot && npx prisma generate
```

### 5. Запуск в dev-режиме
```bash
npm run dev
```

### 6. Запуск через Docker
```bash
docker-compose up -d
```

### 7. Проверка проекта
```bash
npm run typecheck
npm run build
npm run lint
npm test
```

---

## HTTP endpoints

| Метод | Путь | Описание |
|---|---|---|
| `GET` | `/health` | Healthcheck |
| `POST` | `/webhooks/yookassa` | Webhook ЮKassa |
| `GET` | `/orders/:telegramUserId` | Заказы пользователя |
| `GET` | `/admin/stats` | Статистика (admin) |
| `GET` | `/admin/orders` | Список заказов (admin) |
| `GET` | `/admin/orders/:id` | Детали заказа (admin) |
| `POST` | `/admin/orders/:id/resend` | Перевыдача аналитики (admin) |
| `GET` | `/admin/dashboard` | HTML dashboard (admin) |

---

## Юридическая информация

Полный юридический пакет в [`docs/legal/`](docs/legal/):

| Документ | Файл |
|---|---|
| Публичная оферта | [`docs/legal/offer.md`](docs/legal/offer.md) |
| Политика конфиденциальности | [`docs/legal/privacy-policy.md`](docs/legal/privacy-policy.md) |
| Пользовательское соглашение | [`docs/legal/terms-of-service.md`](docs/legal/terms-of-service.md) |
| Политика возвратов | [`docs/legal/refund-policy.md`](docs/legal/refund-policy.md) |
| Дисклеймер | [`docs/legal/disclaimer.md`](docs/legal/disclaimer.md) |
| Тарифы | [`docs/legal/pricing.md`](docs/legal/pricing.md) |

> Реквизиты ИП/ООО в документах оставлены как шаблон для заполнения владельцем.

---

## Команда AI-агентов

Проект разрабатывается командой из 10 специализированных AI-агентов:

| # | Имя | Роль |
|---|-----|------|
| 1 | **Призма** | PostgreSQL + Prisma ORM |
| 2 | **Вебхук** | Надёжность платежей ЮKassa |
| 3 | **Аналитик** | OpenAI интеграция |
| 4 | **Девопс** | Docker, CI/CD, ESLint |
| 5 | **Маркет** | Real-time рыночные данные |
| 6 | **Маркетолог** | Маркетинг и продвижение |
| 7 | **Тестер** | Unit/Integration тесты |
| 8 | **Админ** | Админ-панель |
| 9 | **Юрист** | Юридический пакет |
| 10 | **Промо** | Промокоды и реферальная программа |

Подробнее:
- [`docs/team-agents.md`](docs/team-agents.md) — описание команды
- [`docs/universal-ai-prompt.md`](docs/universal-ai-prompt.md) — промпт для запуска проекта в любом AI

---

## Что осталось сделать

- [ ] Redis / очередь задач
- [ ] Cost tracking для AI-запросов
- [ ] X.com sentiment API (интерфейс готов, нужен ключ)
- [ ] E2E тесты
- [ ] Production config и process manager
- [ ] Мониторинг и алерты
- [ ] Подписочная модель
- [ ] Заполнить реквизиты ИП/ООО в юридических документах

---

## Важно

Аналитические материалы должны сопровождаться дисклеймером:

> Информация носит ознакомительный характер и не является индивидуальной инвестиционной рекомендацией.
