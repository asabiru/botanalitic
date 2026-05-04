# AI Finance

Telegram-бот для AI-аналитики финансовых инструментов с **реальными рыночными данными в реальном времени**, фундаментальными показателями, графиками, техническим анализом от **TradingView** (включая MOEX), новостями из **Investing.com** и **Bloomberg**, сентимент-анализом и реальной AI-аналитикой через **OpenAI GPT** и опциональной оплатой через **ЮKassa**.

## Статус проекта

**Текущий статус:** полнофункциональный MVP с real-time данными.

Проект:
- собирается и проходит typecheck
- получает котировки в реальном времени из Yahoo Finance, MOEX ISS, CoinGecko, ЦБ РФ
- строит графики цен и объёмов (QuickChart.io)
- получает техническую рекомендацию TradingView (Scanner API)
- агрегирует новости из Investing.com и Bloomberg RSS
- анализирует сентимент из X.com
- формирует полный аналитический отчёт с конкретными уровнями, pivot points, SMA, сценариями
- исследует конкурентов и генерирует предложения по улучшению (CompetitorAgent)
- управляет категориями акций и рекомендациями (StockAnalyticsAgent)
- поддерживает оплату через ЮKassa (опционально)

Подробный статус:
- [`docs/project-status.md`](docs/project-status.md)
- [`docs/developer-guide.md`](docs/developer-guide.md)
- [`docs/roadmap.md`](docs/roadmap.md) — план дальнейших действий

---

## Что уже реализовано

### Источники данных в реальном времени
| Провайдер | Тип данных | Инструменты |
|-----------|-----------|-------------|
| Yahoo Finance | Котировки, историч. данные | Нефть, газ, золото, серебро, акции США, EUR/USD |
| MOEX ISS | Котировки, историч. данные | Акции РФ, IMOEX, RGBI |
| CoinGecko | Котировки, историч. данные | 25+ криптовалют |
| ЦБ РФ | Курсы валют | USD/RUB, CNY/RUB |
| TradingView Scanner | Техническая сводка | Все инструменты (region-aware: russia/crypto/forex/global) |
| Investing.com RSS | Финансовые новости | По категориям (forex, commodities, stocks) |
| Bloomberg RSS | Мировые рынки | Общие рыночные новости |
| OpenAI GPT | AI-аналитика и сентимент | По всем инструментам (требует `OPENAI_API_KEY`) |
| X.com sentiment | Fallback-сентимент | Все инструменты (stub) |
| Stooq.com | Fallback-котировки | Включается при rate-limit Yahoo Finance |
| Агент конкурентов | Анализ рынка ботов | RSS-тренды, матрица фич, идеи |

### Telegram bot flow
- `/start` — приветствие и главное меню
- 📊 **Котировки (live)** — котировки в реальном времени с кнопкой обновления
- 📚 **Каталог аналитики** — полный аналитический отчёт с графиками
- 🤖 **Демо-аналитика** — бесплатный анализ на реальных данных
- 📂 **Категории акций** — рекомендации по категориям (дивидендные, роста, голубые фишки и др.)
- 🔍 **Анализ конкурентов** — исследование конкурентных сервисов и идеи для развития
- 💳 **Оплата** — через ЮKassa (если настроена) или прямая генерация
- `/admin` — админ-панель (анализ конкурентов, предложения, отчёты по категориям)

### Аналитический отчёт включает:
1. **Текущая котировка** — цена, изменение, диапазон дня, объём, изменение за неделю
2. **Ключевые уровни** — Pivot Points (R2, R1, S1, S2)
3. **Техническая сводка** — рекомендация TradingView (включая российские акции через `russia/scan`)
4. **Сентимент-анализ** — GPT-оценка тональности свежих новостных заголовков (fallback — эвристика по ключевым словам)
5. **Фундаментальные данные** — P/E (TTM/forward), EPS, дивидендная доходность, дивиденд на акцию, beta, 52w high/low, market cap
6. **Исторический анализ** — SMA(5/10/20/50), волатильность, тренд, Sharpe/Sortino, max drawdown, динамика объёмов
7. **Торговые сценарии** — GPT-тезис + три сценария + ключевые драйверы (fallback — уровни по Pivot Points)
8. **Риски** — GPT-список по инструменту (fallback — базовый список)
9. **Торговая идея** — вход, стоп-лосс, тейк-профит с динамическими уровнями от ATR(14): SL=1.5·ATR, TP1=2·ATR, TP2=3.5·ATR
10. **Новости** — последние 5 новостей с ссылками
11. **Графики** — график цены (close/high/low) и график объёмов за месяц

### Оплата
- ЮKassa — опциональная (работает без неё)
- создание заказа → ссылка на оплату → webhook → автоматическая доставка отчёта
- без ЮKassa: прямая генерация анализа без оплаты

### Backend
- Express HTTP server
- `GET /health`
- `POST /webhooks/yookassa`
- `GET /orders/:telegramUserId`

---

## Поддерживаемые инструменты

- 🇨🇳 Юань/Рубль (ЦБ РФ)
- 💵 Доллар/Рубль (ЦБ РФ)
- 🛢 Нефть Brent (Yahoo Finance)
- 🔵 Газ Henry Hub (Yahoo Finance)
- 🥇 Золото XAU (Yahoo Finance)
- 🥈 Серебро XAG (Yahoo Finance)
- 🇺🇸 Акции США (Yahoo Finance)
- 📈 Акции РФ (MOEX ISS)
- 🇷🇺 Индекс IMOEX (MOEX ISS)
- 🇷🇺 Индекс RGBI (MOEX ISS)
- ₿ Криптовалюты (CoinGecko)
- 🇪🇺 EUR/USD (Yahoo Finance)

---

## Архитектура проекта

```text
root/
  package.json
  README.md
  docs/
    developer-guide.md
    project-status.md
  services/
    telegram-bot/
      package.json
      tsconfig.json
      src/
        index.ts                 — главная точка входа, Telegram handlers
        config.ts                — env-переменные (zod-валидация)
        catalog.ts               — каталог инструментов и цены
        quotes.ts                — live-котировки (fetchLiveQuote, formatQuote)
        ai-analysis.ts           — генерация полного аналитического отчёта + графики
        app-context.ts           — singleton-сервисы
        server.ts                — Express HTTP + webhook
        yookassa.ts              — интеграция ЮKassa (опционально)
        session-store.ts         — сессии пользователей
        order-store.ts           — хранение заказов
        integrations/
          market-data.service.ts — главный сервис рыночных данных
          instrument-mapper.ts   — маппинг инструментов → провайдеры
          cache/
            market-cache.ts      — TTL-кэш для всех провайдеров
          market-data/
            provider.interface.ts — интерфейсы MarketQuote, HistoricalBar
            yahoo-finance.provider.ts  — Yahoo Finance API
            moex.provider.ts           — MOEX ISS API
            coingecko.provider.ts      — CoinGecko API
            cbr.provider.ts            — ЦБ РФ API
            tradingview.provider.ts    — TradingView Scanner API
            index.ts                   — фабрика провайдеров
          news/
            news.interface.ts          — интерфейс NewsItem
            rss-news.provider.ts       — общий RSS-парсер
            investing-rss.provider.ts  — Investing.com RSS
            bloomberg-rss.provider.ts  — Bloomberg RSS
          sentiment/
            x-sentiment.provider.ts    — X.com сентимент (stub)
          chart/
            chart-generator.ts         — генерация PNG-графиков (QuickChart.io)
          competitor/
            competitor.interface.ts     — типы для анализа конкурентов
            competitor-research.service.ts — сервис исследования конкурентов
            competitor-agent.ts         — агент конкурентной разведки
            competitor-suggestion-store.ts — хранилище предложений
          analytics/
            stock-category-store.ts     — хранилище категорий и рекомендаций
            stock-analytics-agent.ts    — агент аналитики акций
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

**Обязательно:**
- `TELEGRAM_BOT_TOKEN` — токен Telegram бота (получить у [@BotFather](https://t.me/BotFather))

**Рекомендуемо:**
- `ADMIN_CHAT_ID` — Telegram chat ID администратора (для `/admin` панели). Узнать ID: [@userinfobot](https://t.me/userinfobot)

**Опционально:**
- `YOOKASSA_SHOP_ID` — ID магазина ЮKassa (без неё бот работает в бесплатном режиме)
- `YOOKASSA_SECRET_KEY` — секретный ключ ЮKassa
- `YOOKASSA_RETURN_URL` — URL возврата после оплаты
- `OPENAI_API_KEY` — ключ OpenAI (для будущей AI-интеграции)
- `OPENAI_MODEL` — модель OpenAI (по умолчанию gpt-4o-mini)
- `PORT` — порт HTTP-сервера (по умолчанию 3000)

### 4. Запуск в dev-режиме
```bash
npm run dev
```

### 5. Проверка проекта
```bash
npm run typecheck
npm run build
```

---

## HTTP endpoints

### Healthcheck
```http
GET /health
```

### YooKassa webhook
```http
POST /webhooks/yookassa
```

### Orders by telegram user
```http
GET /orders/:telegramUserId
```

### Competitor Agent API
```http
GET  /api/competitors/report       — отчёт по конкурентам
POST /api/competitors/analyze       — запуск анализа + генерация предложений
GET  /api/suggestions                — список предложений (?status=new&priority=high)
PATCH /api/suggestions/:id          — обновить статус предложения
```

### Stock Analytics Agent API
```http
GET  /api/stock-categories           — категории акций (?instrumentId=ru-stocks)
GET  /api/stock-categories/:id       — категория с рекомендациями
POST /api/stock-categories           — создать категорию
POST /api/stock-categories/:id/recommendations  — добавить акцию
DELETE /api/stock-categories/:catId/recommendations/:ticker — удалить акцию
GET  /api/analytics/report           — полный отчёт по всем категориям
```

---

## Хранение секретов

Секреты **никогда** не коммитятся в репозиторий. Доступные способы хранения:

| Способ | Где | Назначение |
|--------|-----|-------------|
| **GitHub Secrets** | [Settings → Secrets → Actions](../../settings/secrets/actions) | CI/CD, GitHub Actions |
| **Devin Secrets** | [Devin Settings](https://app.devin.ai/settings/secrets) | Автодоступ в сессиях Devin AI |
| **`.env` файл** | `services/telegram-bot/.env` (в `.gitignore`) | Локальная разработка |

### Какие секреты нужно добавить

| Secret | Описание | Обязательно | Где взять |
|--------|----------|---------------|------------|
| `TELEGRAM_BOT_TOKEN` | Токен бота | Да | [@BotFather](https://t.me/BotFather) |
| `ADMIN_CHAT_ID` | Chat ID админа | Рекомендуемо | [@userinfobot](https://t.me/userinfobot) |
| `YOOKASSA_SHOP_ID` | ID магазина | Нет | [yookassa.ru](https://yookassa.ru) |
| `YOOKASSA_SECRET_KEY` | Ключ ЮKassa | Нет | [yookassa.ru](https://yookassa.ru) |
| `OPENAI_API_KEY` | Ключ OpenAI | Нет | [platform.openai.com](https://platform.openai.com/api-keys) |

---

## Карта хранения данных

### Файлы данных (рабочие файлы, не коммитятся)

| Файл | Содержимое | Создаётся |
|------|------------|-------------|
| `tmp/stock-categories.json` | Категории акций + рекомендации (10 кат, 20 рек) | Автоматически при первом запуске |
| `tmp/competitor-suggestions.json` | Предложения по улучшению продукта | После `POST /api/competitors/analyze` |
| `tmp/orders.json` | Заказы пользователей | При создании заказа |

### Конфигурация

| Файл | Назначение |
|------|-------------|
| `.env.example` | Шаблон переменных окружения (коммитится) |
| `.env` | Реальные значения (в `.gitignore`, НЕ коммитится) |
| `services/telegram-bot/src/config.ts` | Zod-валидация env-переменных |
| `services/telegram-bot/src/catalog.ts` | Каталог 12 финансовых инструментов |

### Кэш (в памяти, не персистентный)

| Тип данных | TTL | Описание |
|------------|-----|-------------|
| Котировки | 60 сек | Yahoo, MOEX, CoinGecko, ЦБ РФ |
| Историч. данные | 5 мин | Графики, SMA, волатильность |
| Новости | 15 мин | Investing.com, Bloomberg RSS |
| Сентимент | 10 мин | X.com (stub) |
| Тех. анализ | 2 мин | TradingView Scanner |
| Конкуренты | 24 часа | Отчёт CompetitorResearchService |

### Сессии пользователей (в памяти)

| Хранилище | Назначение |
|-------------|-------------|
| `SessionStore` | Текущая сессия пользователя (selectedInstrumentId, ticker, investorProfile) |
| `OrderStore` | Заказы + персистенция в `tmp/orders.json` |
| `CompetitorSuggestionStore` | Предложения по улучшению + персистенция в `tmp/competitor-suggestions.json` |
| `StockCategoryStore` | Категории акций + персистенция в `tmp/stock-categories.json` |
| `MarketCache` | TTL-кэш всех рыночных данных (только в памяти) |

### Документация

| Файл | Содержимое |
|------|-------------|
| [`docs/project-status.md`](docs/project-status.md) | Текущее состояние, что сделано / не сделано, результаты тестов |
| [`docs/developer-guide.md`](docs/developer-guide.md) | Архитектура, модули, как добавлять агентов/провайдеров |
| [`docs/roadmap.md`](docs/roadmap.md) | План дальнейшего развития (9 этапов) |
| `.env.example` | Шаблон переменных окружения |

---

## Важно

Аналитические материалы сопровождаются дисклеймером:

> Данный материал носит исключительно информационный характер и не является индивидуальной инвестиционной рекомендацией. Торговля на финансовых рынках связана с рисками потери капитала.

---

## Дальнейшее развитие

Полный план действий: [`docs/roadmap.md`](docs/roadmap.md)

---

© AI Finance | Powered by Yahoo Finance, MOEX ISS, CoinGecko, ЦБ РФ, TradingView, Investing.com, Bloomberg, X.com
