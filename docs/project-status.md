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

### Хранение данных
Сейчас есть:
- пользовательская сессия в памяти
- заказы в памяти
- сохранение заказов в `tmp/orders.json`

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

Статус:
- typecheck ✅
- build ✅

---

## 4. Ограничения текущей версии

Это **не финальный production-ready продукт**.

### Ограничения:
- нет PostgreSQL
- нет Prisma
- нет Redis / queue
- нет полноценной идемпотентности webhook
- нет проверки подлинности webhook ЮKassa
- нет реального AI pipeline
- нет реальной агрегации данных из market/news/social providers
- нет админки
- нет мониторинга и алертов
- нет тестов
- нет Docker/deploy-контура
- нет юридического пакета документов

---

## 5. Что осталось сделать

Ниже — список задач по приоритету.

### Priority 1 — Data persistence
Сделать:
- PostgreSQL
- Prisma schema
- migrations
- repositories
- заменить file storage на DB

### Priority 2 — Payment reliability
Сделать:
- verify webhook source
- идемпотентная обработка webhook
- retry-логика
- журнал payment events
- статусы доставки аналитики

### Priority 3 — Real AI analysis
Сделать:
- OpenAI / LLM integration
- prompt templates
- structured output
- нормализация ответа
- контроль длины ответа
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

### Priority 5 — Operations
Сделать:
- operator/admin mode
- просмотр заказов
- ручная перевыдача аналитики
- лог действий
- история платежей

### Priority 6 — Quality
Сделать:
- unit tests
- integration tests
- webhook tests
- CI pipeline
- lint / formatting policy

### Priority 7 — Deployment
Сделать:
- Docker
- environment profiles
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