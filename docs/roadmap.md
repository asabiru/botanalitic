# AI Finance — Roadmap

План дальнейшего развития проекта. Отделяет уже сделанное от того, что осталось, чтобы было видно, на каком этапе находится продукт.

Дата актуализации: 04.05.2026

---

## 1. Текущее состояние

**Статус: полнофункциональный MVP с real-time данными, агентами и реальной AI-аналитикой.**

Что есть:
- 12 финансовых инструментов: рублёвые пары (USD/RUB, CNY/RUB), сырьё (нефть, газ, золото, серебро), акции США/РФ, индексы IMOEX/RGBI, EUR/USD, 25+ криптовалют.
- 5 источников котировок с приоритетом (Yahoo + Stooq fallback, MOEX ISS, CoinGecko, ЦБ РФ) + region-aware TradingView Scanner (russia/crypto/forex/global).
- Реальная AI-аналитика через OpenAI GPT (тезис, сценарии, драйверы, риски, уровни, confidence) с детерминированным fallback.
- Сентимент новостных заголовков через GPT с ключевой эвристикой как fallback.
- Динамические торговые уровни от ATR(14): SL = 1.5·ATR, TP1 = 2·ATR, TP2 = 3.5·ATR.
- Фундаменталка через Yahoo `quoteSummary`: P/E (TTM/forward), EPS, dividend yield, dividend rate, beta, 52w high/low, market cap.
- Risk-adjusted метрики: Sharpe, Sortino, max drawdown, годовая доходность.
- Алерты по уровням цены (`/alert`, polling 60с), утренний дайджест (08:00 МСК), экономический календарь (`/calendar`).
- CompetitorAgent + StockAnalyticsAgent с REST API и `/admin` панелью.
- Опциональная оплата через ЮKassa.

Полный список и статус: [`project-status.md`](project-status.md).

---

## 2. Что уже сделано (закрытые этапы)

### ✓ Этап 1 — OpenAI интеграция
**Статус: реализовано.** `OpenAIAnalyzer` отправляет market context (котировка, SMA, ATR, история, новости, фундаменталка) в GPT и получает structured JSON-инсайт. Шаблонный текст работает как fallback.

### ✓ Этап 2 — Сентимент по новостям
**Статус: реализовано.** `OpenAINewsSentimentProvider` оценивает тональность заголовков через GPT. Ключевая эвристика на RU/EN — fallback. X.com stub оставлен на случай реального X API.

### ✓ Этап 3 — TradingView для MOEX
**Статус: реализовано.** Сканер роутится в `russia/scan` для MOEX/RUS (с преобразованием `MOEX:SBER` → `RUS:SBER`, иначе russia/scan возвращает 0), `crypto/scan` для Binance/Bybit/OKX/Coinbase/Kraken/Bitstamp, `forex/scan` для FX/FX_IDC/OANDA, иначе — `global/scan` с fallback. Покрытие подтверждено smoke-test'ом (`scripts/smoke-test.ts`).

### ✓ Этап 4 — Yahoo Finance reliability
**Статус: реализовано.** `withRetry()` с экспоненциальным backoff и jitter (4 попытки, 0.5–8 с) на 429/502/503/504 + сетевые ошибки. После исчерпания retry — fallback на Stooq.com (CSV).

### ✓ Этап 5 — Фундаментальные данные
**Статус: реализовано.** Раздел 3.5 отчёта показывает P/E, EPS, dividends, beta, 52w high/low, market cap.

### ✓ Этап 6 — Динамические торговые уровни
**Статус: реализовано.** `computeTradingLevels()` считает SL/TP от ATR(14), а не фиксированными ±%. AI-уровни от GPT принимаются, если разумны.

### ✓ Этап 7 — Алерты, дайджест, календарь
**Статус: реализовано.** `/alert ТИКЕР above|below ЦЕНА` с polling 60с, утренний дайджест в 08:00 МСК (`/digest on|off|preview`), экономический календарь ForexFactory (`/calendar`).

### ✓ Этап 8 — Risk-adjusted метрики и мульти-таймфрейм
**Статус: реализовано.** Sharpe, Sortino, max drawdown, годовая доходность, SMA(5/10/20/50) с трендами.

### ✓ Этап 9 — Агенты и REST API
**Статус: реализовано.** CompetitorAgent (анализ 7+ конкурентов, матрица фич, идеи) и StockAnalyticsAgent (10 категорий, 20 рекомендаций) с REST API и `/admin` панелью.

---

## 3. Приоритетный план дальнейших улучшений

Этапы упорядочены по соотношению **польза / усилие** на текущем состоянии продукта.

### Этап A — Реальный X / Twitter sentiment (1 неделя)
**Цель:** добавить отдельный канал сентимента по социальным сетям рядом с GPT-сентиментом по новостям.

- [ ] Получить X API key (Essential / Basic) или настроить Nitter / scraper
- [ ] Реализовать `XSentimentProvider` поверх API: поиск по тикеру/ключевым словам инструмента, top tweets за 24 ч
- [ ] Анализ тональности (через тот же `OpenAINewsSentimentProvider` или отдельный prompt)
- [ ] Агрегация в один итоговый score с весами `news_sentiment` vs `social_sentiment`
- [ ] Кэш 10 мин, метрики coverage

### Этап B — Persistence (PostgreSQL + Prisma) (1–2 недели)
**Цель:** убрать зависимость от файлов в `tmp/` и in-memory, дать историю анализа.

- [ ] Поднять Postgres + Prisma schema (`User`, `Order`, `Payment`, `AnalysisHistory`, `PriceAlert`, `DigestSubscriber`, `Suggestion`, `StockCategory`, `StockRecommendation`)
- [ ] Миграции, seed-данные для категорий/рекомендаций
- [ ] Repository-слой для каждого store, замена in-memory + JSON-файлов
- [ ] Команда `/history` — последние 10 анализов пользователя

### Этап C — Cost & observability для OpenAI (3–5 дней)
**Цель:** контроль расходов на GPT и видимость качества.

- [ ] Журнал GPT-вызовов (instrument, model, prompt_tokens, completion_tokens, latency, success/fallback)
- [ ] Дневной USD-лимит на пользователя и глобальный
- [ ] Метрики `live_rate`, `fallback_rate`, `gpt_error_rate` с экспортом в Prometheus или в `/admin`
- [ ] Алерт админу при выходе за лимит

### Этап D — Улучшение визуализации (1 неделя)
**Цель:** более информативные графики прямо в отчёте.

- [ ] SMA(5/10/20/50) поверх графика цены
- [ ] Bollinger Bands
- [ ] Candlestick (свечной) график как альтернатива линейному
- [ ] Sparkline в карточке live-котировки
- [ ] Inline кнопка «Открыть в TradingView» (web view) для интерактива

### Этап E — Скринер инструментов (1–1.5 недели)
**Цель:** поиск интересных активов по параметрам, а не только из каталога.

- [ ] Скринер: фильтры P/E, market cap, dividend yield, sector, beta, 52w-position
- [ ] REST `GET /api/screener?market=us&pe<=15&div>=3`
- [ ] Telegram UI: «📈 Скринер» → выбор фильтров → топ 10 акций

### Этап F — Миграция yahoo-finance2 (0.5 недели)
**Цель:** убрать deprecation warnings.

- [ ] Заменить `historical()` на `chart()` API
- [ ] Покрытие всех Yahoo-инструментов (нефть, газ, металлы, акции США, EUR/USD)
- [ ] Регрессия графиков

### Этап G — Качество кода и CI (1–2 недели)
**Цель:** надёжность изменений.

- [ ] Unit-тесты провайдеров (vitest) с моками HTTP-клиентов
- [ ] Integration-тесты `MarketDataService`, `OpenAIAnalyzer`, `OpenAINewsSentimentProvider` (mock GPT)
- [ ] E2E-тест Telegram-флоу
- [ ] GitHub Actions CI (typecheck, build, lint, test)
- [ ] ESLint + Prettier
- [ ] Pre-commit hooks (`pre-commit`, `lint-staged`)

### Этап H — Production deployment (1 неделя)
**Цель:** деплой в прод.

- [ ] Dockerfile (multi-stage) + docker-compose (бот + Postgres + reverse proxy)
- [ ] Profiles: dev / staging / production
- [ ] Process supervisor (PM2 / systemd)
- [ ] Sentry для ошибок, Prometheus + Grafana для метрик
- [ ] Structured JSON-логи (`pino`)
- [ ] Backup стратегия Postgres

### Этап I — Коммерческий контур (2–3 недели)
**Цель:** монетизация.

- [ ] Тарифы Free / Pro / Premium (лимиты на анализ, алерты, AI-вызовы)
- [ ] Оферта, политика конфиденциальности, дисклеймер по инвестициям
- [ ] Реферальная программа
- [ ] Расширенная админ-панель: статистика, управление пользователями, ручные подарки
- [ ] Аналитика использования (Mixpanel / собственная)

---

## 4. Quick wins (можно сделать в любой момент без архитектурных изменений)

1. **RSI и MACD в отчёт** — считать из `historicalBars` рядом с SMA.
2. **Поддержка нескольких языков** — EN/RU переключение в отчёте и UI.
3. **Кнопка «Поделиться»** — forward-friendly формат отчёта (без HTML inline-кнопок).
4. **Inline mode** — `@aifinanceint_bot AAPL` прямо в чате другого диалога.
5. **Группировка новостей** — по релевантности и тональности, а не только по дате.
6. **Уровни Фибоначчи** — добавить в раздел «Ключевые уровни» вместе с Pivot Points.
7. **Сравнение инструментов** — «📊 Сравнить» две акции/два индекса по доходности и рискам.
8. **Команда `/explain`** — объяснить термин (P/E, Sharpe, ATR) на русском с примером.

---

## 5. Технические долги

Стоит закрыть отдельно от продуктового roadmap:

1. **`yahoo-finance2` deprecated `historical()`** — мигрировать на `chart()` (сейчас warning подавлен).
2. **In-memory MarketCache** — пересоздаётся при рестарте бота, до Postgres-этапа можно завести Redis.
3. **`tmp/*.json` хранилища** — теряются при перезапуске контейнера без volume; нужен либо volume, либо БД (см. этап B).
4. **`OpenAIAnalyzer` prompt** — вынести в отдельный файл `prompts/`, версионировать, A/B-тестировать.
5. **`X.com` stub** — либо реализовать, либо удалить, чтобы не запутывать (см. этап A).
6. **Тесты отсутствуют** — нет ни одного unit-теста, регрессии ловим только глазами (см. этап G).

---

## 6. Видение на 3–6 месяцев

Долгосрочные направления, которые меняют продукт качественно (а не точечно):

- **Портфельный режим** — пользователь подгружает портфель (CSV или вручную), бот считает совокупный P&L, корреляции, рекомендации по ребалансировке.
- **Backtesting торговых идей** — кнопка «📈 Бэктест» под каждой торговой идеей: на исторических данных проверяем, насколько часто срабатывали такие конфигурации.
- **Авто-рекомендации** — на основе истории запросов и watchlist пользователя бот сам присылает уведомления о смене картины.
- **Web-кабинет** — Next.js dashboard с графиками TradingView, историей анализа, настройками алертов и подписки. Бот остаётся как mobile-first интерфейс.
- **Pluggable LLM-провайдер** — поддержка не только OpenAI, но и Anthropic / Yandex GPT / DeepSeek для приватных деплоев и российского рынка.
- **Voice-режим** — голосовая выжимка отчёта в Telegram (TTS), удобно слушать утром.

---

> Этот документ обновляется при каждом крупном изменении набора возможностей. Если что-то добавили, но не отметили в roadmap, считайте это техдолгом — добавьте в раздел 5 или 4.
