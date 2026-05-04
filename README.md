# AI Finance

Telegram-бот для AI-аналитики финансовых инструментов с **реальными рыночными данными в реальном времени**, графиками, техническим анализом от **TradingView**, новостями из **Investing.com** и **Bloomberg**, сентимент-анализом с **X.com** и опциональной оплатой через **ЮKassa**.

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
- исследует конкурентов и генерирует отчёт с идеями для развития
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
| TradingView Scanner | Техническая сводка | Все инструменты |
| Investing.com RSS | Финансовые новости | По категориям (forex, commodities, stocks) |
| Bloomberg RSS | Мировые рынки | Общие рыночные новости |
| X.com | Сентимент-анализ | Все инструменты (stub, требует API key) |
| Агент конкурентов | Анализ рынка ботов | RSS-тренды, матрица фич, идеи |

### Telegram bot flow
- `/start` — приветствие и главное меню
- 📊 **Котировки (live)** — котировки в реальном времени с кнопкой обновления
- 📚 **Каталог аналитики** — полный аналитический отчёт с графиками
- 🤖 **Демо-аналитика** — бесплатный анализ на реальных данных
- 🔍 **Анализ конкурентов** — исследование конкурентных сервисов и идеи для развития
- 💳 **Оплата** — через ЮKassa (если настроена) или прямая генерация

### Аналитический отчёт включает:
1. **Текущая котировка** — цена, изменение, диапазон дня, объём, изменение за неделю
2. **Ключевые уровни** — Pivot Points (R2, R1, S1, S2)
3. **Техническая сводка** — рекомендация TradingView с индексом
4. **Сентимент-анализ** — тональность рынка из X.com
5. **Исторический анализ** — SMA(5/20), волатильность, тренд, динамика объёмов
6. **Торговые сценарии** — позитивный, нейтральный, негативный с конкретными уровнями
7. **Риски** — ключевые факторы риска
8. **Торговая идея** — точка входа, стоп-лосс, тейк-профит, горизонт
9. **Новости** — последние 5 новостей с ссылками
10. **Графики** — график цены (close/high/low) и график объёмов за месяц

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
            competitor-research.service.ts — агент исследования конкурентов
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
- `TELEGRAM_BOT_TOKEN` — токен Telegram бота

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

## Кэширование данных

Все рыночные данные кэшируются для оптимизации:

| Тип данных | TTL |
|-----------|-----|
| Котировки | 60 сек |
| Историч. данные | 5 мин |
| Новости | 15 мин |
| Сентимент | 10 мин |
| Тех. анализ | 2 мин |
| Исследование конкурентов | 24 часа |

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

---

## Важно

Аналитические материалы сопровождаются дисклеймером:

> Данный материал носит исключительно информационный характер и не является индивидуальной инвестиционной рекомендацией. Торговля на финансовых рынках связана с рисками потери капитала.

---

## Дальнейшее развитие

Полный план действий: [`docs/roadmap.md`](docs/roadmap.md)

---

© AI Finance | Powered by Yahoo Finance, MOEX ISS, CoinGecko, ЦБ РФ, TradingView, Investing.com, Bloomberg, X.com
