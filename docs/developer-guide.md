# Developer Guide — AI Finance

Руководство для продолжения разработки проекта.

---

## 1. Что это за проект

**AI Finance** — Telegram-бот для AI-аналитики финансовых инструментов с данными в реальном времени.

### Ключевые возможности:
- 12 финансовых инструментов (валюты, сырьё, акции, индексы, крипто)
- Котировки в реальном времени из Yahoo Finance, MOEX ISS, CoinGecko, ЦБ РФ
- Технический анализ от TradingView Scanner API
- Новости из Investing.com и Bloomberg RSS
- Сентимент-анализ из X.com (stub)
- Генерация PNG-графиков цен и объёмов через QuickChart.io
- Полный аналитический отчёт с Pivot Points, SMA, торговыми сценариями
- Опциональная оплата через ЮKassa

---

## 2. Архитектура

```text
root/
  package.json                    — workspaces, scripts
  services/
    telegram-bot/
      package.json                — зависимости бота
      tsconfig.json
      src/
        index.ts                  — Telegram handlers, меню, котировки
        config.ts                 — env-переменные (zod)
        catalog.ts                — каталог инструментов
        quotes.ts                 — live-котировки (fetchLiveQuote)
        ai-analysis.ts            — полный аналитический отчёт + графики
        app-context.ts            — singleton-сервисы
        server.ts                 — Express HTTP + webhook
        yookassa.ts               — ЮKassa (опционально)
        session-store.ts          — сессии в памяти
        order-store.ts            — заказы в памяти + файл

        integrations/
          market-data.service.ts  — главный сервис: объединяет все провайдеры
          instrument-mapper.ts    — маппинг инструмент → провайдер + символы
          cache/
            market-cache.ts       — TTL-кэш (60с котировки, 5м история, 15м новости)
          market-data/
            provider.interface.ts — MarketQuote, HistoricalBar, TechnicalSummary
            yahoo-finance.provider.ts
            moex.provider.ts
            coingecko.provider.ts
            cbr.provider.ts
            tradingview.provider.ts
            index.ts              — фабрика провайдеров
          news/
            news.interface.ts     — NewsItem
            rss-news.provider.ts
            investing-rss.provider.ts
            bloomberg-rss.provider.ts
          sentiment/
            x-sentiment.provider.ts
          chart/
            chart-generator.ts    — QuickChart.io (price + volume charts)
          competitor/
            competitor.interface.ts     — типы для анализа конкурентов
            competitor-research.service.ts — сервис исследования конкурентов
            competitor-agent.ts           — агент: анализ + хранилище предложений
            competitor-suggestion-store.ts — хранилище предложений (JSON)
          analytics/
            stock-category-store.ts       — хранилище категорий и рекомендаций (JSON)
            stock-analytics-agent.ts      — агент аналитики акций
```

### Назначение модулей

#### `quotes.ts`
Модуль live-котировок. Функция `fetchLiveQuote()` получает MarketContext из MarketDataService и конвертирует в InstrumentQuote с ценой, изменением, объёмом, недельным изменением и технической рекомендацией.

#### `ai-analysis.ts`
Генерирует полный аналитический отчёт (`AnalysisResult`):
- `text` — HTML-форматированный текст с 8 разделами
- `charts` — массив PNG-буферов (график цены + график объёмов)

Разделы отчёта:
1. Текущая котировка + Pivot Points
2. Техническая сводка TradingView
3. Сентимент X.com
4. Исторический анализ (SMA, волатильность)
5. Торговые сценарии с уровнями
6. Риски
7. Торговая идея (вход, стоп, тейк)
8. Последние новости

#### `integrations/market-data.service.ts`
Центральный сервис `MarketDataService`. Метод `getMarketContext(instrumentId, ticker?)` параллельно загружает:
- котировку (провайдер по маппингу)
- историческую линейку за месяц
- новости (RSS из 3 источников, дедупликация)
- техническую сводку TradingView
- сентимент X.com

#### `integrations/instrument-mapper.ts`
Маппинг 12 инструментов на провайдеры:
- Какой провайдер использовать (yahoo, moex, coingecko, cbr)
- Символ по умолчанию
- Нужен ли тикер от пользователя
- Ключевые слова для поиска новостей
- Символ и биржа TradingView

#### `integrations/chart/chart-generator.ts`
Генерация PNG-графиков через QuickChart.io API:
- `generatePriceChart()` — линейный график close/high/low
- `generateVolumeChart()` — столбчатый график объёмов (зелёный/красный)

#### `integrations/competitor/competitor-research.service.ts`
Агент-исследователь конкурентов. Класс `CompetitorResearchService`:
- `generateReport()` — генерирует полный отчёт: профили конкурентов, матрица фич, идеи для развития
- `formatReportHTML()` — форматирует отчёт в Telegram HTML
- `scanTrends()` — парсит RSS-ленты крипто/финтех новостей и выделяет тренды
- Анализирует 7 конкурентов: StockChangeAlertBot, FinamTradeBot, Trader.dev, Trojan Bot, Maestro Bot, TradingView, Investing.com
- Строит матрицу фич (что есть у конкурентов, чего нет у нас)
- Генерирует идеи с приоритетами (high/medium/low) и категориями (feature/ux/monetization/marketing/data)
- Кэширование: 24 часа

---

## 3. Как запускать локально

### Установка
```bash
npm install
```

### Настройка env
```bash
cp .env.example .env
```

Минимум:
- `TELEGRAM_BOT_TOKEN`

Опционально:
- `ADMIN_CHAT_ID` — Telegram chat ID администратора (для доступа к `/admin`)
- `YOOKASSA_SHOP_ID` / `YOOKASSA_SECRET_KEY` — для оплаты
- `OPENAI_API_KEY` — для будущей AI-интеграции
- `PORT` — порт HTTP-сервера

### Запуск
```bash
npm run dev
```

### Проверка
```bash
npm run typecheck
npm run build
```

---

## 4. Как добавить новый инструмент

1. Добавить запись в `catalog.ts` (название, описание, цена, promptHint)
2. Добавить маппинг в `integrations/instrument-mapper.ts` (провайдер, символ, ключевые слова)
3. Добавить мета в `quotes.ts` → `INSTRUMENT_META` (тикер для отображения, валюта, единицы)

---

## 5. Как добавить нового провайдера данных

1. Создать файл в `integrations/market-data/` с реализацией `MarketDataProvider`
2. Добавить тип в `ProviderType` в `instrument-mapper.ts`
3. Зарегистрировать в фабрике `integrations/market-data/index.ts`
4. Добавить маппинг инструментов в `instrument-mapper.ts`

---

## 6. Как работает кэширование

Класс `MarketCache` в `cache/market-cache.ts`:
- In-memory Map с TTL
- Каждый провайдер проверяет кэш перед HTTP-запросом
- TTL: котировки 60с, история 5м, новости 15м, сентимент 10м, тех. анализ 2м

---

## 7. Как работают графики

- Используется сервис [QuickChart.io](https://quickchart.io/) — бесплатный, без API key
- Отправляем POST с Chart.js конфигурацией, получаем PNG
- Два типа: линейный график цены (close/high/low) и столбчатый график объёмов
- Графики отправляются как фото в Telegram (`replyWithPhoto`)

---

## 8. Как устроена ЮKassa

- Опциональна — если `YOOKASSA_SHOP_ID` и `YOOKASSA_SECRET_KEY` не заданы, бот работает в бесплатном режиме
- `yooKassaService.isConfigured` проверяет наличие ключей
- Без ЮKassa: нажатие «Оплатить» сразу генерирует анализ
- С ЮKassa: создаётся ссылка на оплату → webhook → автоматическая доставка

---

## 9. Что важно не сломать

- заказ создаётся до платежа
- payment metadata содержит `orderId`
- webhook идемпотентен
- анализ содержит disclaimer
- графики генерируются из реальных исторических данных
- котировки кэшируются для оптимизации

---

## 10. Агенты

### CompetitorAgent
Объединяет `CompetitorResearchService` и `CompetitorSuggestionStore`.

- `runFullAnalysis()` — генерирует отчёт по конкурентам + автоматически создаёт предложения
- Категории предложений: pricing, feature, ux, content, marketing, monetization, data
- Статусы: new → accepted → implemented / rejected
- Хранение: `tmp/competitor-suggestions.json`

### StockAnalyticsAgent
Управляет категориями акций и рекомендациями.

- 10 seed-категорий: дивидендные, роста, голубые фишки, недооценённые, tech, аристократы, Layer 1, DeFi, мемкоины, рост США
- 20 seed-рекомендаций: SBER, LKOH, GMKN, OZON, POSI, GAZP, ROSN, MTSS, AAPL, NVDA, MSFT, JNJ, KO, TSLA, ETH, SOL, UNI, AAVE, DOGE, PEPE
- Инструменты: ru-stocks, us-stocks, crypto
- Хранение: `tmp/stock-categories.json`

### Как добавить нового агента
1. Создать Store (хранилище) в `integrations/<имя>/` по аналогии с `StockCategoryStore`
2. Создать Agent (бизнес-логика) по аналогии с `StockAnalyticsAgent`
3. Зарегистрировать в `app-context.ts`
4. Добавить REST API эндпоинты в `server.ts`
5. Добавить Telegram UI в `index.ts`

---

## 11. Дальнейшее развитие

Полный план с 9 этапами: [`docs/roadmap.md`](roadmap.md)

Краткий обзор приоритетов:
1. **OpenAI интеграция** — генерация аналитики через GPT
2. **X.com Sentiment API** — реальный сентимент вместо stub
3. **Persistence** — PostgreSQL + Prisma
4. **Подписки и алерты** — утренний/вечерний обзор, алерты по уровням
5. **Улучшение графиков** — SMA, Bollinger, свечи
6. **Миграция yahoo-finance2** — `historical()` → `chart()`
7. **Качество кода** — тесты, CI/CD, ESLint
8. **Production deployment** — Docker, мониторинг
9. **Коммерческий контур** — тарифы, реферальная программа, админ-панель
