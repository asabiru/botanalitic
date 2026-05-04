# Project Status — AI Finance

## 1. Текущее состояние

**Статус: полнофункциональный MVP с real-time данными и агентной системой**

Проект:
- собирается и проходит typecheck
- получает котировки в реальном времени из 4 провайдеров
- строит графики цен и объёмов
- формирует полный аналитический отчёт с конкретными торговыми рекомендациями
- агрегирует новости из 3 источников
- поддерживает техническую сводку TradingView
- исследует конкурентов и генерирует идеи для развития
- управляет категориями акций и рекомендациями
- работает с оплатой ЮKassa (опционально)

---

## 2. Что реализовано

### Источники данных (real-time)
- **Yahoo Finance** — нефть, газ, золото, серебро, акции США, EUR/USD
- **MOEX ISS** — акции РФ, индекс Мосбиржи (IMOEX), RGBI
- **CoinGecko** — 25+ криптовалют (BTC, ETH, SOL, TON и др.)
- **ЦБ РФ** — курсы USD/RUB, CNY/RUB
- **TradingView Scanner** — техническая рекомендация (buy/sell/neutral)
  - region-aware: MOEX/RUS → `russia/scan`, BINANCE/BYBIT → `crypto/scan`, FX → `forex/scan`, остальное → `global/scan`
  - fallback на `global/scan`, если регион не вернул данных
- **Investing.com RSS** — новости по категориям (forex, commodities, stocks)
- **Bloomberg RSS** — мировые рыночные новости
- **OpenAI GPT** — реальный AI-анализ + сентимент по новостным заголовкам (когда задан `OPENAI_API_KEY`)
- **X.com sentiment** — stub, оставлен как fallback на случай отсутствия OpenAI/новостей
- **Stooq.com** — fallback-провайдер котировок при rate-limit (HTTP 429) от Yahoo Finance
- **Агент конкурентов** — анализ 7 конкурентов, матрица фич, идеи из RSS-трендов
- **Агент аналитики акций** — 10 категорий, 20 seed-рекомендаций, CRUD через REST API

### Telegram Bot
- `/start` — приветствие и главное меню
- 📊 Котировки (live) — реальные данные + кнопка обновления
- 📚 Каталог аналитики — 12 инструментов
- 📂 Категории акций — выбор рынка (РФ/США/крипто) → категория → карточка с акциями
- 🤖 Демо-аналитика — полный отчёт на реальных данных
- 💳 Оплата — ЮKassa или прямая генерация
- 🔍 Анализ конкурентов — исследование конкурентных сервисов, матрица фич, идеи для развития
- 🧾 Мои заявки — история заказов
- ℹ️ О сервисе — описание источников данных
- `/admin` — панель администратора (отчёт по конкурентам, предложения, запуск анализа, отчёт по категориям). Доступ ограничен `ADMIN_CHAT_ID`

### Аналитический отчёт
Полный отчёт (в заголовке явно указано, использован ли GPT или детерминированный шаблон):
1. Текущая котировка с Pivot Points (R2, R1, S1, S2)
2. Техническая сводка TradingView (рекомендация + индекс)
3. Сентимент-анализ (OpenAI по новостным заголовкам, fallback — эвристика)
3.5. Фундаментальные данные: P/E (TTM/forward), EPS, дивидендная доходность, дивиденд на акцию, beta, 52w high/low, market cap
4. Исторический анализ (SMA 5/10/20/50, волатильность, тренд, объёмы, Sharpe, Sortino)
5. Торговые сценарии (GPT-тезис + 3 сценария + ключевые драйверы; fallback — уровни по Pivot Points)
6. Риски (GPT индивидуально по инструменту; fallback — базовый список)
7. Торговая идея с динамическими уровнями от ATR(14): SL=1.5·ATR, TP1=2·ATR, TP2=3.5·ATR — больше НЕ фиксированные ±3/5%
8. Последние новости с ссылками

### Графики
- График цены (close/high/low) за месяц — линейный
- График объёмов торгов — столбчатый (зелёный/красный)
- Генерация через QuickChart.io (Chart.js → PNG)

### Кэширование
- Котировки: 60 сек
- Историч. данные: 5 мин
- Новости: 15 мин
- Сентимент: 10 мин
- Тех. анализ: 2 мин

### Оплата (ЮKassa)
- Опциональная — бот работает и без неё
- Создание заказа → ссылка на оплату → webhook → доставка отчёта
- `isConfigured` проверка наличия ключей

### Backend
- Express HTTP server
- `GET /health`
- `POST /webhooks/yookassa`
- `GET /orders/:telegramUserId`

### REST API — CompetitorAgent
- `GET /api/competitors/report` — отчёт по конкурентам (7 конкурентов, матрица фич, идеи)
- `POST /api/competitors/analyze` — запуск полного анализа + генерация предложений
- `GET /api/suggestions` — список предложений (фильтры: `status`, `priority`)
- `PATCH /api/suggestions/:id` — обновить статус предложения (new → accepted → implemented / rejected)

### REST API — StockAnalyticsAgent
- `GET /api/stock-categories` — все категории (фильтр: `instrumentId`)
- `GET /api/stock-categories/:id` — категория с рекомендациями
- `POST /api/stock-categories` — создать категорию
- `POST /api/stock-categories/:id/recommendations` — добавить акцию
- `DELETE /api/stock-categories/:catId/recommendations/:ticker` — удалить акцию
- `GET /api/analytics/report` — полный отчёт по всем категориям

---

## 3. Проверено

- `npm install` — OK
- `npm run typecheck` — OK
- `npm run build` — OK
- Тестирование провайдеров: **45/45 тестов пройдено** (04.05.2026)
- REST API тестирование: **24/24 тестов пройдено** (04.05.2026)
  - Stock categories: CRUD, фильтрация по instrumentId, seed-данные (10 категорий, 20 рекомендаций)
  - Competitor agent: анализ конкурентов, генерация предложений, обновление статусов
  - Валидация ошибок: 404, 400 коды для невалидных запросов
  - Persistence: JSON-файлы корректно создаются и сохраняются
- Бот стартует, подключается к Telegram, health endpoint OK
- Все провайдеры работают: Yahoo Finance, MOEX, CoinGecko, ЦБ РФ, TradingView
- Графики генерируются корректно (PNG, ~120KB + ~63KB)

---

## 4. Что осталось сделать

Полный план: [`docs/roadmap.md`](roadmap.md)

### Реализовано (в текущем PR)
- CompetitorAgent — агент конкурентной разведки (15 конкурентов, feature matrix)
- StockAnalyticsAgent — 21 категория, 152 seed-рекомендации
- REST API для обоих агентов (10 эндпоинтов)
- Telegram UI: единый flow «Аналитика», `/admin` панель
- 🔔 Алерты по ценам: `/alert ТИКЕР above|below ЦЕНА`, polling 60с, 80+ тикеров
- ☀️ Утренний дайджест: рассылка в 08:00 МСК, 7 ключевых рынков, `/digest on|off|preview`
- 📅 Экономический календарь: ForexFactory feed, `/calendar today|high|week|<страна>`, фильтр по инструменту
- 📊 Sharpe / Sortino ratio, max drawdown, годовая доходность в аналитическом отчёте
- Мульти-таймфрейм SMA (5/10/20/50) с краткосрочным/среднесрочным/долгосрочным трендами
- Данные хранятся в JSON-файлах (`tmp/competitor-suggestions.json`, `tmp/stock-categories.json`, `tmp/price-alerts.json`, `tmp/digest-subscribers.json`)

### Добавлено в этом PR (real-AI-and-data-fixes)
- **Real OpenAI аналитика** — `OpenAIAnalyzer` отправляет в GPT весь market context (котировка + SMA + ATR + история + новости + фундаменталка) и получает structured JSON-инсайт (тезис, сценарии, драйверы, риски, уровни, горизонт, confidence). Детерминированный шаблон остаётся как fallback, когда `OPENAI_API_KEY` не задан или GPT недоступен.
- **Сентимент на реальных новостях** — `OpenAINewsSentimentProvider` оценивает тональность свежих заголовков через GPT и возвращает score/label. Гетеристический кейворд-анализ — fallback. X.com stub оставлен как опциональный путь, когда появится реальный X API.
- **TradingView для MOEX работает** — сканер роутится на `russia/scan` для российских тикеров (с преобразованием `MOEX:SBER` → `RUS:SBER`, потому что russia/scan индексирует именно этот префикс), `crypto/scan` для Binance/Bybit и т.д., с fallback на `global/scan`. Smoke-test (`scripts/smoke-test.ts`) подтверждает: AAPL → NASDAQ:AAPL → buy, SBER → RUS:SBER → neutral, GOLD → GC=F → sell.
- **Yahoo Finance retry** — экспоненциальный backoff на 429/5xx (4 попытки, 0.5–8 сек) + Stooq.com как провайдер последнего шанса.
- **Фундаментали** — `getFundamentals(symbol)` через `quoteSummary` Yahoo (модули `summaryDetail`, `defaultKeyStatistics`, `price`); рендер раздела 3.5 в отчёте.
- **Динамические торговые уровни** — entry/SL/TP рассчитываются от ATR(14) и волатильности — больше нет фиксированных ±2%/+3%/+5% для всех инструментов.

### Не реализовано / осталось сделать

### Приоритет 1 — X.com / Twitter sentiment
- Реальный сентимент напрямую из X.com (сейчас GPT анализирует только новостные RSS-фиды)
- Требует X API key (Essential / Basic) или альтернативы: Nitter mirror, scrapers
- Агрегация по выборке (top tweets/replies/quotes) → score, сравнение с новостным сентиментом

### Приоритет 2 — Persistence (PostgreSQL + Prisma)
- Заменить in-memory + JSON-файлы на БД для orders, sessions, alerts, digest subscribers, analysis_history
- Миграции, repositories
- История анализов пользователя (`/history`)

### Приоритет 3 — Cost / observability для OpenAI
- Журнал GPT-вызовов (instrument, model, prompt_tokens, completion_tokens, latency)
- Лимит USD в день / на пользователя
- Метрики: % live vs fallback, доля ошибок GPT

### Приоритет 4 — Скринер инструментов
- Поиск по фильтрам (P/E, объём, сектор, dividend yield, beta)
- Фильтрация акций по категориям и параметрам
- TradingView screener-style API

### Приоритет 5 — Улучшение визуализации
- SMA-линии (5/10/20/50) поверх графика цены
- Bollinger Bands
- Candlestick (свечной) график как альтернатива линейному
- Sparkline в карточке котировки

### Приоритет 6 — Docker и deploy
- Dockerfile + docker-compose (бот + Postgres)
- CI/CD pipeline (typecheck, build, lint, test) — `.github/workflows`
- Мониторинг (Sentry / Prometheus + Grafana)
- Structured JSON-логи

### Приоритет 7 — Миграция yahoo-finance2 API
- `historical()` → `chart()` API (сейчас deprecation warning подавлен через `suppressNotices`)
- Покрытие всех Yahoo-инструментов

### Приоритет 8 — Тесты
- Unit-тесты для провайдеров (vitest)
- Integration-тесты для `MarketDataService`, `OpenAIAnalyzer`, `OpenAINewsSentimentProvider` (mock GPT)
- E2E-тест Telegram-флоу через bot-tester

---

## 5. Технологический стек

- **Runtime:** Node.js 20+
- **Язык:** TypeScript
- **Telegram:** Telegraf
- **HTTP:** Express
- **Валидация:** Zod
- **Данные:** Yahoo Finance (+ Stooq fallback), MOEX ISS, CoinGecko, ЦБ РФ, TradingView (региональные сканеры), RSS
- **AI:** OpenAI GPT (по умолчанию `gpt-4o-mini`) для аналитики и сентимента
- **Графики:** QuickChart.io (Chart.js)
- **Оплата:** ЮKassa API (опционально)
- **Хранение данных агентов:** JSON-файлы (tmp/)
