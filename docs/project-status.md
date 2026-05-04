# Project Status — AI Market View Bot

Этот документ нужен для GitHub, чтобы сразу понимать:
- что уже реализовано
- в каком состоянии проект сейчас
- какие ограничения есть
- что делать дальше по приоритетам

---

## 1. Текущее состояние проекта

Статус: **рабочий MVP+**

Проект уже:
- собирается
- проходит typecheck
- запускается локально
- имеет Telegram bot flow
- имеет payment flow через ЮKassa
- имеет webhook endpoint
- имеет базовую автоматическую выдачу аналитики
- имеет документацию для продолжения разработки

---

## 2. Что уже сделано

### Telegram bot
Реализовано:
- `/start`
- главное меню
- каталог аналитики
- выбор инструмента
- ввод тикера
- демо-анализ
- сценарий покупки
- просмотр списка заявок
- ввод и применение промокодов
- реферальная программа (`/referral`)
- admin-команды для промокодов

### Каталог инструментов
Поддерживаются:
- 🇨🇳 Юань/Рубль
- 💵 Доллар/Рубль
- 🛢 Нефть
- 🔵 Газ
- 🥇 Золото
- 🥈 Серебро
- 🇺🇸 Акции США
- 📈 Акции РФ
- 🇷🇺 Индекс Мосбиржи
- 🇷🇺 Индекс RGBI
- ₿ Криптовалюты
- 🇪🇺 Евро/Доллар

### Оплата
Реализовано:
- создание заказа до оплаты
- создание ссылки на оплату через ЮKassa
- передача `orderId` в metadata
- webhook endpoint для `payment.succeeded`
- автоматическая отправка аналитики после оплаты

### Backend
Реализовано:
- Express HTTP server
- `GET /health`
- `POST /webhooks/yookassa`
- `GET /orders/:telegramUserId`
- `GET /admin/stats` (protected)
- `GET /admin/orders` (protected, pagination)
- `GET /admin/orders/:id` (protected)
- `POST /admin/orders/:id/resend` (protected)

### Промокоды и реферальная программа
Реализовано:
- хранилище промокодов (`promo-store.ts`)
- CRUD: create, getByCode, use, deactivate, list
- валидация: срок, лимит, активность
- предустановленные коды: LAUNCH100, FRIEND20, FIRST
- реферальная система (`referral.ts`)
- генерация реферального кода
- команда `/referral`
- скидка новому клиенту + уведомление рефереру
- admin-команды: `/promo_list`, `/promo_create`, `/promo_deactivate`
- интеграция с оплатой: пересчёт цены, отображение скидки

### Хранение данных
Реализовано:
- пользовательская сессия в памяти
- заказы в памяти (file fallback через `tmp/orders.json`)
- **PostgreSQL + Prisma ORM** (основное хранилище при наличии `DATABASE_URL`)

### PostgreSQL + Prisma (Data Persistence)
Реализовано:
- Prisma schema с моделями: `User`, `Order`, `Payment`, `Delivery`
- docker-compose.yml с PostgreSQL 16 (порт 5433)
- Repository-слой: `order.repository.ts`, `user.repository.ts`
- Абстракция `IOrderStore` для совместимости файлового и DB-хранилища
- Обратная совместимость: если `DATABASE_URL` не задан, используется файловый fallback
- Условная инициализация `PrismaClient` в `app-context.ts`
- Все операции с хранилищем заказов — async-совместимы

### DevOps / Инфраструктура
Реализовано:
- `Dockerfile` для telegram-bot (multi-stage: build + production, Node.js 20 Alpine)
- `docker-compose.yml` — PostgreSQL 16 + telegram-bot, volumes, healthcheck
- GitHub Actions CI pipeline (`.github/workflows/ci.yml`) — lint, typecheck, build
- ESLint (flat config) с `typescript-eslint`
- Prettier (printWidth: 120, singleQuote: false, semi: true)
- npm-скрипты `lint`, `lint:fix`, `format` в root и telegram-bot
- `DATABASE_URL` добавлен в `.env.example`

### Webhook reliability
Реализовано:
- верификация IP-адресов ЮKassa (whitelist)
- валидация тела webhook через zod-схему
- идемпотентная обработка (повторный webhook не вызывает повторную доставку)
- retry-логика отправки аналитики (3 попытки, exponential backoff)
- структурированное логирование webhook events
- уведомление админа через `ADMIN_CHAT_ID` при ошибках

### Real AI integration
Реализовано:
- OpenAI SDK подключен (`openai` npm package)
- `src/ai/openai-client.ts` — фабрика OpenAI клиента из конфига
- `src/ai/prompt-templates.ts` — шаблоны промптов для каждого класса активов
- structured output: обзор рынка, ключевые уровни, сценарии (позитивный/нейтральный/негативный), риски, идея для клиента
- fallback на demo-генератор если `OPENAI_API_KEY` не задан
- контроль `max_tokens` (по умолчанию 2000, настраивается через `OPENAI_MAX_TOKENS`)
- error handling: при ошибке OpenAI возвращается demo-ответ
- disclaimer в каждом ответе

### Market Data Integrations
Реализовано:
- модульная архитектура провайдеров данных (`src/integrations/`)
- **Yahoo Finance** — акции США, commodities (нефть, газ, золото, серебро), FX (EUR/USD)
- **MOEX ISS** — акции РФ (TQBR), индекс Мосбиржи (IMOEX), индекс RGBI
- **CoinGecko** — криптовалюты (бесплатный API)
- **ЦБ РФ** — официальные курсы валют (USD/RUB, CNY/RUB, EUR/RUB)
- **TradingView** — техническая сводка (strong_buy/buy/neutral/sell/strong_sell)
- **Investing.com RSS** — новости по 4 категориям (общие, форекс, commodities, акции)
- **Bloomberg RSS** — рыночные новости
- **X.com sentiment** — интерфейс готов, заглушка до получения API ключа
- in-memory кэш с TTL (котировки 60с, история 5мин, новости 15мин)
- маппинг всех инструментов каталога на провайдеры
- сервис агрегации `MarketDataService` с методом `getMarketContext()`
- интеграция реальных данных в демо-аналитику

- заказы в памяти
- сохранение заказов в `tmp/orders.json`
- сохранение промокодов в `tmp/promo-codes.json`
- сохранение реферальных данных в `tmp/referrals.json`


### Документация
Подготовлено:
- `README.md`
- `docs/developer-guide.md`
- `docs/project-status.md`
- `docs/changelog.md`

---

## 3. Что проверено

Проверено локально:
- `npm install`
- `npm run typecheck`
- `npm run build`
- `npm run test`
- `npm run test:coverage`

Статус:
- typecheck ✅
- build ✅
- tests ✅ (65 тестов, coverage > 70%)

---

## 4. Ограничения текущей версии

Это **не финальный production-ready продукт**.

### Ограничения:
- ~~нет PostgreSQL~~ — реализовано
- ~~нет Prisma~~ — реализовано
- нет Redis / queue
- нет полноценной идемпотентности webhook
- нет проверки подлинности webhook ЮKassa
- нет реального AI pipeline
- нет реальной агрегации данных из market/news/social providers
- ~~нет админки~~ — реализована (Telegram + HTTP + HTML dashboard)
- нет мониторинга и алертов
- нет Docker/deploy-контура
- нет юридического пакета документов

---

## 5. Что осталось сделать

Ниже — список задач по приоритету.

### Priority 1 — Data persistence ✅
Сделано:
- ~~PostgreSQL~~ — добавлен через docker-compose.yml
- ~~Prisma schema~~ — создана с моделями User, Order, Payment, Delivery
- ~~migrations~~ — поддержка через `npx prisma migrate dev`
- ~~repositories~~ — order.repository.ts, user.repository.ts
- ~~заменить file storage на DB~~ — реализовано с обратной совместимостью

### Priority 2 — Payment reliability
Сделано:
- ✅ verify webhook source (IP whitelist + zod validation)
- ✅ идемпотентная обработка webhook
- ✅ retry-логика (3 попытки, exponential backoff)
- ✅ журнал payment events (structured JSON logging)
- ✅ статусы доставки аналитики (delivered/failed + admin notify)

### Priority 3 — Real AI analysis
Сделано:
- ✅ OpenAI / LLM integration
- ✅ prompt templates
- ✅ structured output
- ✅ нормализация ответа
- ✅ контроль длины ответа
Осталось:
- cost tracking

### Priority 4 — Data integrations
Выполнено:
- ✅ market data provider layer (Yahoo Finance, MOEX ISS, CoinGecko, CBR)
- ✅ news ingestion layer (RSS: Investing.com, Bloomberg)
- ✅ social sentiment layer (X.com — интерфейс готов, заглушка)
- ✅ legal-safe integration strategy (только бесплатные API без ключей)
- ✅ abstraction над провайдерами (MarketDataProvider interface, фабрика)
- ✅ TradingView technical analysis
- ✅ in-memory cache с TTL
- ✅ instrument mapper

### Priority 5 — Operations ✅
Реализовано:
- Telegram admin commands (`/admin`, `/orders`, `/order`, `/stats`, `/users`, `/resend`, `/broadcast`)
- admin guard middleware (ADMIN_CHAT_ID)
- HTTP admin API (`GET /admin/stats`, `GET /admin/orders`, `GET /admin/orders/:id`, `POST /admin/orders/:id/resend`)
- HTTP admin API key protection (X-Admin-Key header, ADMIN_API_KEY env)
- HTML admin dashboard (Tailwind CSS, тёмная тема, карточки статистики, таблица заказов, пагинация, кнопка перевыдачи)
- audit log (tmp/audit.log)

### Priority 6 — Quality
Сделать:
- unit tests
- integration tests
- webhook tests
- ~~CI pipeline~~ ✅ done
- ~~lint / formatting policy~~ ✅ done

### Priority 6 — Quality ✅ (частично)
Сделано:
- unit tests (catalog, session-store, order-store, ai-analysis, config, yookassa)
- integration tests (server: health, webhook, orders)
- CI pipeline (GitHub Actions: build + test)
- coverage > 70%

Осталось:
- lint / formatting policy
- e2e tests


### Priority 7 — Deployment
Сделать:
- ~~Docker~~ ✅ done
- ~~environment profiles~~ ✅ done (docker-compose + .env.example)
- production config
- process manager
- monitoring
- alerts

### Priority 8 — Legal/commercial layer
Сделать:
- оферта
- disclaimer
- privacy policy
- тарифы
- подписки
- политика возвратов

---

## 6. Рекомендуемый порядок разработки

Лучший порядок дальнейшей работы:

1. PostgreSQL + Prisma
2. webhook reliability
3. real AI pipeline
4. data provider integrations
5. operator/admin tools
6. tests
7. deploy & monitoring
8. legal/commercial docs

---

## 7. Что уже можно считать хорошим результатом

Уже сейчас проект годится как:
- хорошая стартовая база
- MVP для пилота
- foundation для дальнейшей команды разработки
- репозиторий, который можно выкладывать на GitHub и развивать дальше

---

## 8. Что можно сделать сразу после публикации на GitHub

Сразу следующим этапом можно:
1. создать issues по roadmap
2. завести milestones
3. выделить задачи на backend / payments / AI / infra
4. настроить branch strategy
5. начать переход с file storage на PostgreSQL