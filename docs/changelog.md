# Changelog

Все заметные изменения в проекте документируются в этом файле.

---

## 2025-05-03

### Девопс — DevOps Engineer
- Создан Dockerfile (multi-stage build)
- Создан docker-compose.yml для локальной разработки
- Настроен CI pipeline (.github/workflows/ci.yml)
- Настроен ESLint + Prettier
- Добавлены скрипты lint, format

### Призма — DB Architect
- Добавлен PostgreSQL + Prisma ORM
- Создана schema с моделями User, Order, Payment, Delivery
- Создан repository-слой
- Заменено файловое хранилище на БД
- Добавлен docker-compose.yml с PostgreSQL
- Обратная совместимость: файловый fallback при отсутствии DATABASE_URL

### Вебхук — Payment Engineer
- Добавлена верификация IP-адресов ЮKassa
- Реализована идемпотентная обработка webhook
- Добавлена retry-логика отправки аналитики
- Добавлено структурированное логирование webhook events
- Добавлена zod-валидация тела webhook
- Добавлено уведомление админа при ошибках

### Аналитик — AI Engineer
- Подключен OpenAI SDK
- Созданы prompt templates для каждого класса активов
- Реализован structured output (обзор, уровни, сценарии, риски, идея для клиента)
- Добавлен fallback на demo-генератор если нет API key
- Контроль max_tokens и error handling
- Disclaimer в каждом ответе

### Маркет — Market Data Engineer
- Создан слой интеграции с рыночными данными
- Yahoo Finance: акции США, commodities, FX
- MOEX ISS: акции РФ, IMOEX, RGBI
- CoinGecko: криптовалюты
- ЦБ РФ: курсы валют
- Investing.com RSS: новости рынков (4 фида по категориям)
- Bloomberg RSS: новости
- TradingView: технический анализ (strong_buy/buy/neutral/sell/strong_sell)
- X.com: sentiment (интерфейс готов, заглушка до получения API ключа)
- In-memory кэш с TTL (котировки 60с, история 5мин, новости 15мин)
- Маппинг инструментов на провайдеры
- MarketDataService с методом getMarketContext()
- Интеграция реальных данных в демо-аналитику (ai-analysis.ts)

# Changelog — AI Market View Bot

## [0.2.0] — 2025-05-03

### Добавлено

#### Система промокодов
- Новый модуль `src/promo/promo-store.ts` — хранилище промокодов с CRUD-операциями
- Хранение в памяти + файловая персистенция `tmp/promo-codes.json`
- Валидация: проверка срока действия, лимита использований, активности
- Предустановленные промокоды:
  - `LAUNCH100` — 30% скидка, первые 100 использований
  - `FRIEND20` — 20% скидка, без лимита (реферальный)
  - `FIRST` — 15% скидка на первый заказ, без лимита

#### Реферальная программа
- Новый модуль `src/promo/referral.ts` — реферальная система
- Генерация уникального реферального кода для каждого пользователя
- Команда `/referral` — показать свой код и ссылку
- При использовании реферального кода:
  - Новый клиент получает скидку 20%
  - Реферер получает уведомление в Telegram

#### Telegram bot flow
- Кнопка «🎁 Промокод» в главном меню
- Flow ввода промокода → валидация → показ скидки
- Поддержка реферальных кодов через flow промокодов
- При оплате: пересчёт цены с учётом промокода
- Отображение старой и новой цены: `Цена: ~~1990₽~~ → 1393₽ (скидка 30%)`

#### Admin-команды
- `/promo_list` — список всех промокодов
- `/promo_create <code> <discount%> <maxUses>` — создать промокод
- `/promo_deactivate <code>` — деактивировать промокод

### Изменено
- `session-store.ts` — добавлены поля `appliedPromoCode`, `referralCode`, `awaitingPromoInput`
- `order-store.ts` — добавлены поля `promoCode`, `discountPercent`, `originalAmountRub`
- `yookassa.ts` — поддержка пересчитанной цены через параметр `amountRub`
- `app-context.ts` — экспорт `promoStore` и `referralStore`
- `index.ts` — интеграция промокодов и реферальной программы во все flow

### Правила
- Промокод — один на заказ, нельзя совместить два
- Максимальная скидка — 50%
- AI, market data, webhook verification — не затронуты

---

## [0.1.0] — Initial MVP

- Telegram bot flow (каталог, выбор, оплата, выдача)
- Оплата через ЮKassa
- Webhook обработка
- Express HTTP server
- Хранение в памяти + файлы

# Changelog

## [Unreleased]

### Added
- **Admin Telegram commands**: `/admin`, `/orders`, `/order <id>`, `/stats`, `/users`, `/resend <orderId>`, `/broadcast <text>`
- **Admin guard middleware** (`src/admin/admin-guard.ts`) — проверка ADMIN_CHAT_ID
- **HTTP Admin API** — защищённые endpoints:
  - `GET /admin/stats` — статистика (всего заказов, оплаченных, выручка, средний чек, уникальные пользователи)
  - `GET /admin/orders?page=1&limit=20` — список заказов с пагинацией
  - `GET /admin/orders/:id` — детали заказа
  - `POST /admin/orders/:id/resend` — перевыдача аналитики
- **HTTP Admin API key** — защита через header `X-Admin-Key` (env: `ADMIN_API_KEY`)
- **HTML Admin Dashboard** (`admin/index.html`) — Tailwind CSS, тёмная тема, карточки статистики, таблица заказов с фильтрами, пагинация, кнопка перевыдачи
- **Audit log** (`src/admin/audit-log.ts`) — логирование admin действий в `tmp/audit.log`
- `ADMIN_API_KEY` в `.env.example`
- Методы `listAll()` и `uniqueUserIds()` в `OrderStore`

### Changed
- Обновлена документация: `project-status.md`, `developer-guide.md`, `changelog.md`
- Обновлён `config.ts` — добавлена переменная `ADMIN_API_KEY`

# Changelog

## [0.2.0] — 2025-05-03

### Added
- Vitest test framework (`vitest` + `@vitest/coverage-v8`)
- `vitest.config.ts` с покрытием и порогами
- Unit тесты:
  - `catalog.test.ts` — каталог (12 инструментов), `findInstrumentById`
  - `session-store.test.ts` — get, patch, clear
  - `order-store.test.ts` — create, update, getById, getByPaymentId, listByTelegramUserId
  - `ai-analysis.test.ts` — demo fallback, секции, disclaimer
  - `config.test.ts` — валидация env переменных (missing → error)
  - `yookassa.test.ts` — createPayment с моком axios
- Integration тесты:
  - `server.test.ts` — GET /health, POST /webhooks/yookassa (валидный/невалидный payload, идемпотентность), GET /orders/:telegramUserId
- CI pipeline: `.github/workflows/ci.yml` (build + test jobs)
- Скрипты: `test`, `test:watch`, `test:coverage`
- Coverage > 70% по всем метрикам

### Changed
- `docs/project-status.md` — обновлён Priority 6 (Quality)
- `docs/developer-guide.md` — добавлена секция тестирования

## [0.1.0] — Initial MVP

- Telegram bot flow
- YooKassa payment integration
- Express HTTP server
- In-memory storage

# Changelog

Все заметные изменения в проекте документируются в этом файле.

---

## [0.2.0] — 2025-05-03

### Добавлено

#### Юридический пакет документов
- `docs/legal/offer.md` — публичная оферта (предмет, порядок, оплата, ответственность, споры, реквизиты-шаблон)
- `docs/legal/privacy-policy.md` — политика конфиденциальности (152-ФЗ, Telegram ID, ЮKassa, права пользователя)
- `docs/legal/terms-of-service.md` — пользовательское соглашение (условия, оплата, возвраты, интеллектуальная собственность)
- `docs/legal/refund-policy.md` — политика возвратов (условия, сроки, порядок обращения)
- `docs/legal/disclaimer.md` — расширенный дисклеймер об инвестиционных рисках
- `docs/legal/pricing.md` — тарифы и описание услуг (полный каталог 1 490–2 490 ₽)

#### Интеграция с ботом
- `services/telegram-bot/src/legal/legal-texts.ts` — экспортируемые константы с короткими версиями юридических текстов, ссылками на документы и дисклеймером для аналитики
- Команда `/legal` в Telegram-боте
- Кнопка «Юридическая информация» в главном меню бота

#### Документация
- Секция «Юридическая информация» в `README.md`
- Обновлён Priority 8 (Legal) в `docs/project-status.md`
- Создан `docs/changelog.md`

---

## [0.1.0] — 2024-XX-XX

### Добавлено
- Первоначальный MVP: Telegram-бот, каталог инструментов, оплата через ЮKassa, webhook, автоматическая выдача аналитики
- Документация: README.md, developer-guide.md, project-status.md

# Changelog — AI Market View Bot

Все заметные изменения проекта документируются в этом файле.

---

## [0.3.0] — 2025-05-03

### Добавлено — Маркетинг и продвижение

**Маркетинговая стратегия:**
- `docs/marketing-strategy.md` — полная маркетинговая стратегия
- Целевая аудитория и сегменты
- Уникальное торговое предложение (УТП)
- Каналы продвижения (органические и платные)
- Воронка продаж
- KPI и метрики
- Реферальная программа и партнёрская программа

**Лендинг-страница:**
- `landing/index.html` — адаптивный лендинг с тёмной темой
- Tailwind CSS через CDN, mobile-first дизайн
- Hero, каталог инструментов, «Как это работает», тарифы, демо-аналитика, FAQ
- Disclaimer об инвестиционных рисках

**Контент-план:**
- `docs/content-plan.md` — план постов для Telegram-канала на 30 дней
- Рубрики: утренний обзор, идея дня, недельный прогноз, обучение, промо
- Шаблоны постов

**Готовые посты для Telegram-канала:**
- `marketing/telegram-posts/01-welcome.md` — приветственный пост
- `marketing/telegram-posts/02-product-launch.md` — анонс запуска бота
- `marketing/telegram-posts/03-how-it-works.md` — как пользоваться ботом
- `marketing/telegram-posts/04-demo-analysis.md` — пример аналитики золота
- `marketing/telegram-posts/05-promo-first-clients.md` — промо для первых 100 клиентов
- `marketing/telegram-posts/06-weekly-review-template.md` — шаблон еженедельного обзора
- `marketing/telegram-posts/07-referral-program.md` — реферальная программа

**SEO:**
- `docs/seo-copy.md` — описания для BotFather, каталогов, мета-теги, ключевые слова

---

## [0.2.0] — Предыдущие изменения

### Добавлено
- Telegram bot flow: /start, главное меню, каталог, выбор инструмента, ввод тикера, демо-анализ, оформление заказа
- Оплата через ЮKassa: создание ссылки, webhook, автоматическая доставка
- Express HTTP server с endpoints: /health, /webhooks/yookassa, /orders/:telegramUserId
- Каталог из 12 инструментов с ценами
- Документация: README.md, developer-guide.md, project-status.md

