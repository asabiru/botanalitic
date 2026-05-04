# Project Status — AI Market View Bot

Этот документ описывает текущее состояние проекта, что реализовано, какие ограничения есть и что делать дальше.

---

## 1. Текущее состояние проекта

Статус: **полнофункциональный MVP**

Проект:
- собирается и проходит typecheck / lint без ошибок и warning'ов
- покрыт 65 unit/integration тестами (Vitest)
- запускается локально и в Docker
- имеет Telegram bot flow с полным циклом покупки
- имеет payment flow через ЮKassa с надёжной webhook-обработкой
- генерирует AI-аналитику через OpenAI (с demo-fallback)
- собирает реальные рыночные данные из 7 провайдеров
- имеет админ-панель (Telegram + HTTP + HTML dashboard)
- поддерживает промокоды и реферальную программу
- содержит полный юридический пакет документов
- имеет маркетинговый пакет (лендинг, стратегия, контент-план, посты)

---

## 2. Что реализовано

### Telegram bot
- `/start`, главное меню
- каталог аналитики (12 инструментов)
- выбор инструмента и ввод тикера
- демо-аналитика (бесплатная)
- сценарий покупки с оплатой через ЮKassa
- просмотр списка заявок
- ввод и применение промокодов
- реферальная программа (`/referral`)
- юридическая информация (`/legal`)
- admin-команды для управления

### Каталог инструментов (12 шт.)
🇨🇳 Юань/Рубль, 💵 Доллар/Рубль, 🛢 Нефть, 🔵 Газ, 🥇 Золото, 🥈 Серебро, 🇺🇸 Акции США, 📈 Акции РФ, 🇷🇺 Индекс Мосбиржи, 🇷🇺 Индекс RGBI, ₿ Криптовалюты, 🇪🇺 Евро/Доллар

### Оплата (ЮKassa)
- Создание заказа до оплаты
- Создание ссылки на оплату через ЮKassa API
- Передача `orderId` в metadata
- Webhook endpoint с IP whitelist + zod-валидацией
- Идемпотентная обработка webhook с TTL
- Retry-логика (3 попытки, exponential backoff)
- Структурированное логирование webhook events
- Уведомление админа при ошибках (`ADMIN_CHAT_ID`)
- Автоматическая отправка аналитики после оплаты

### AI-аналитика (OpenAI)
- OpenAI SDK (`openai` npm package)
- `src/ai/openai-client.ts` — фабрика клиента
- `src/ai/prompt-templates.ts` — шаблоны по классам активов
- Structured output: обзор рынка, ключевые уровни, сценарии, риски, идея
- Fallback на demo-генератор если `OPENAI_API_KEY` не задан
- Контроль `max_tokens` (по умолчанию 2000, `OPENAI_MAX_TOKENS`)
- Дисклеймер в каждом ответе

### Рыночные данные (7 провайдеров)
- **Yahoo Finance** — акции США, commodities (нефть, газ, золото, серебро), FX (EUR/USD)
- **MOEX ISS** — акции РФ (TQBR), индекс Мосбиржи (IMOEX), индекс RGBI
- **CoinGecko** — криптовалюты (бесплатный API)
- **ЦБ РФ** — официальные курсы валют (USD/RUB, CNY/RUB, EUR/RUB)
- **TradingView** — техническая сводка (strong_buy/buy/neutral/sell/strong_sell)
- **Investing.com RSS** — новости (4 категории)
- **Bloomberg RSS** — рыночные новости
- **X.com sentiment** — интерфейс готов, заглушка до получения API ключа
- In-memory кэш с TTL (котировки 60с, история 5мин, новости 15мин)
- Маппинг инструментов на провайдеры + агрегатор `MarketDataService`

### Промокоды и реферальная программа
- `promo-store.ts` — CRUD (create, getByCode, use, deactivate, list)
- Валидация: срок, лимит, активность
- Предустановленные коды: `LAUNCH100`, `FRIEND20`, `FIRST`
- `referral.ts` — генерация кода, `/referral`, скидка + уведомление
- Admin-команды: `/promo_list`, `/promo_create`, `/promo_deactivate`
- Интеграция с оплатой: пересчёт цены, отображение скидки

### Админ-панель
- Telegram-команды: `/admin`, `/orders`, `/order <id>`, `/stats`, `/users`, `/resend <id>`, `/broadcast <text>`
- Admin guard middleware (`ADMIN_CHAT_ID`)
- HTTP API: `GET /admin/stats`, `GET /admin/orders`, `GET /admin/orders/:id`, `POST /admin/orders/:id/resend`
- API key protection (`X-Admin-Key` header, `ADMIN_API_KEY` env)
- HTML dashboard (`admin/index.html`) — Tailwind CSS, тёмная тема
- Audit log (`tmp/audit.log`)

### PostgreSQL + Prisma (Data Persistence)
- Prisma schema: `User`, `Order`, `Payment`, `Delivery`
- docker-compose.yml с PostgreSQL 16
- Repository-слой: `order.repository.ts`, `user.repository.ts`
- Абстракция `IOrderStore`
- Обратная совместимость: без `DATABASE_URL` — файловый fallback
- Все операции async-совместимы

### DevOps / Инфраструктура
- Dockerfile (multi-stage: build + production, Node.js 20 Alpine)
- docker-compose.yml — PostgreSQL 16 + telegram-bot
- GitHub Actions CI (lint, typecheck, build, test)
- ESLint (flat config) + Prettier
- npm-скрипты: `lint`, `lint:fix`, `format`, `test`, `test:coverage`

### Юридический пакет
- Публичная оферта (`docs/legal/offer.md`)
- Политика конфиденциальности (`docs/legal/privacy-policy.md`)
- Пользовательское соглашение (`docs/legal/terms-of-service.md`)
- Политика возвратов (`docs/legal/refund-policy.md`)
- Дисклеймер (`docs/legal/disclaimer.md`)
- Тарифы (`docs/legal/pricing.md`)
- Команда `/legal` и кнопка в главном меню
- Константы для дисклеймера (`src/legal/legal-texts.ts`)

### Маркетинг
- `docs/marketing-strategy.md` — стратегия, УТП, воронка, KPI
- `landing/index.html` — адаптивный лендинг (Tailwind CSS, тёмная тема)
- `docs/content-plan.md` — план на 30 дней
- `marketing/telegram-posts/` — 7 готовых постов
- `docs/seo-copy.md` — SEO-описания, мета-теги

### Тесты
- 7 test suites, 65 тестов (Vitest)
- Unit: catalog, session-store, order-store, ai-analysis, config, yookassa
- Integration: server (health, webhook, orders)
- CI pipeline (GitHub Actions: lint + typecheck + build + test)

### Документация
- `README.md`
- `docs/developer-guide.md`
- `docs/project-status.md`
- `docs/changelog.md`
- `docs/team-agents.md`
- `docs/universal-ai-prompt.md`

---

## 3. Что проверено

- `npm install` — OK
- `npm run typecheck` — 0 ошибок
- `npm run build` — OK
- `npm run lint` — 0 ошибок, 0 warning'ов
- `npm test` — 65/65 тестов

---

## 4. Что осталось сделать

### Высокий приоритет
- [ ] Redis / очередь задач для надёжной обработки
- [ ] Cost tracking для AI-запросов (OpenAI usage)
- [ ] X.com sentiment API (интерфейс готов, нужен API ключ)
- [ ] E2E тесты

### Средний приоритет
- [ ] Production config и process manager
- [ ] Мониторинг и алерты
- [ ] Увеличение test coverage (сейчас покрыты core-модули)

### Низкий приоритет
- [ ] Подписочная модель (рекуррентные платежи)
- [ ] Заполнить реквизиты ИП/ООО в юридических документах
- [ ] CDN для лендинга
