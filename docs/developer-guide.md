# Developer Guide — AI Market View Bot

Это руководство нужно, чтобы ты мог сам продолжать разработку проекта без привязки ко мне.

---

## 1. Что это за проект

**AI Market View Bot** — Telegram-бот для продажи аналитики по финансовым инструментам.

### MVP уже покрывает:
- выбор инструмента
- ввод тикера
- создание заказа
- ссылка на оплату через ЮKassa
- webhook-подтверждение оплаты
- автоматическую отправку аналитики после оплаты
- просмотр заявок клиента

---

## 2. Текущая архитектура

```text
root/
  package.json
  .env.example
  README.md
  docs/
    developer-guide.md
  services/
    telegram-bot/
      package.json
      tsconfig.json
      src/
        index.ts
        config.ts
        catalog.ts
        ai-analysis.ts
        yookassa.ts
        session-store.ts
        order-store.ts
        app-context.ts
        server.ts
```

### Назначение модулей

#### `index.ts`
Главная точка входа:
- запускает Telegram-бота
- поднимает HTTP-сервер
- содержит пользовательские сценарии

#### `config.ts`
Проверяет и читает env-переменные.

#### `catalog.ts`
Каталог инструментов, цены, тексты категорий.

#### `ai-analysis.ts`
Сейчас это демо-генератор аналитики.  
В будущем сюда нужно подключить реальный AI pipeline.

#### `yookassa.ts`
Интеграция создания платежа через ЮKassa API.

#### `session-store.ts`
Пользовательская сессия в памяти:
- выбранный инструмент
- тикер
- профиль
- последний payment id

#### `order-store.ts`
Хранилище заказов.
Сейчас:
- хранит заказы в памяти
- дополнительно сохраняет их в `tmp/orders.json`

#### `server.ts`
Express HTTP API:
- healthcheck
- webhook ЮKassa
- список заказов пользователя

#### `app-context.ts`
Общие singleton-экземпляры сервисов и хранилищ.

---

## 3. Как запускать локально

### Установка
```bash
npm install
```

### Настройка env
```bash
copy .env.example .env
```

Заполни минимум:

- `TELEGRAM_BOT_TOKEN`
- `YOOKASSA_SHOP_ID`
- `YOOKASSA_SECRET_KEY`
- `YOOKASSA_RETURN_URL`
- `PORT`

### Запуск разработки
```bash
npm run dev
```

### Проверка типов
```bash
npm run typecheck
```

### Сборка
```bash
npm run build
```

---

## 4. Что нужно сделать в первую очередь дальше

### Приоритет 1 — База данных
Сейчас заказы лежат в `tmp/orders.json`, это временное решение.

Нужно заменить на:
- PostgreSQL
- Prisma ORM

Минимальные таблицы:
- users
- orders
- payments
- deliveries

---

## 5. Как лучше развивать проект

### Этап 1 — Persistence
Сделать:
- Prisma schema
- миграции
- репозитории
- отказ от `order-store.ts` на файлах

### Этап 2 — Реальный AI
Сделать:
- модуль `market-data/`
- модуль `prompt-builder/`
- модуль `analysis-runner/`
- провайдер LLM (OpenAI / Claude / локальные модели)
- шаблоны аналитики по классам активов

### Этап 3 — Надёжность
Сделать:
- очередь задач
- retry на доставку аналитики
- идемпотентность webhook
- логирование
- алерты
- аудит действий

### Этап 4 — Коммерческий контур
Сделать:
- оферту
- privacy policy
- disclaimer
- тарифы
- подписки
- историю покупок
- админ-раздел

---

## 6. Как менять каталог инструментов

Редактируй файл:

```text
services/telegram-bot/src/catalog.ts
```

Там можно:
- менять список рынков
- менять цены
- менять описания
- менять promptHint для AI

---

## 7. Как подключить реальный OpenAI

Сейчас `ai-analysis.ts` возвращает демо-текст.

Чтобы подключить реальную модель:
1. установить официальный SDK
2. создать `OpenAiAnalysisService`
3. вынести prompt templates
4. подключить market data context
5. валидировать и сокращать ответ
6. логировать стоимость генерации

---

## 8. Как подключить сбор данных

### Текущая реализация

Слой интеграции с рыночными данными уже реализован в `src/integrations/`:

```text
src/integrations/
  market-data/
    provider.interface.ts    — общий интерфейс MarketDataProvider
    yahoo-finance.provider.ts — Yahoo Finance (акции США, commodities, FX)
    moex.provider.ts          — MOEX ISS (акции РФ, IMOEX, RGBI)
    coingecko.provider.ts     — CoinGecko (криптовалюты)
    cbr.provider.ts           — ЦБ РФ (курсы валют)
    tradingview.provider.ts   — TradingView (технический анализ)
    index.ts                  — фабрика провайдеров
  news/
    news.interface.ts         — интерфейс NewsProvider
    rss-news.provider.ts      — общий RSS-парсер
    investing-rss.provider.ts — Investing.com (4 RSS-фида)
    bloomberg-rss.provider.ts — Bloomberg RSS
  sentiment/
    x-sentiment.provider.ts   — X.com (заглушка, нужен API ключ)
  cache/
    market-cache.ts           — in-memory кэш с TTL
  instrument-mapper.ts        — маппинг instrumentId → провайдер + символ
  market-data.service.ts      — агрегирующий сервис MarketDataService
```

### Маппинг инструментов

Файл `instrument-mapper.ts` связывает `instrumentId` из `catalog.ts` с провайдерами:

| instrumentId | Провайдер | Символ по умолчанию |
|---|---|---|
| cny-rub | CBR | CNY |
| usd-rub | CBR | USD |
| oil | Yahoo Finance | BZ=F |
| gas | Yahoo Finance | NG=F |
| gold | Yahoo Finance | GC=F |
| silver | Yahoo Finance | SI=F |
| us-stocks | Yahoo Finance | (тикер клиента) |
| ru-stocks | MOEX | (тикер клиента) |
| imoex | MOEX | IMOEX |
| rgbi | MOEX | RGBITR |
| crypto | CoinGecko | (тикер клиента) |
| eur-usd | Yahoo Finance | EURUSD=X |

### Как добавить нового провайдера

1. Создай файл в `src/integrations/market-data/` реализующий `MarketDataProvider`
2. Добавь тип провайдера в `ProviderType` в `instrument-mapper.ts`
3. Зарегистрируй в фабрике `market-data/index.ts`
4. Добавь маппинг в `instrument-mapper.ts`
5. При необходимости обнови `MarketDataService`

### Как добавить новый источник новостей

1. Создай файл в `src/integrations/news/` реализующий `NewsProvider`
2. Подключи в `MarketDataService.aggregateNews()`

### Кэширование

Все провайдеры используют общий `MarketCache` с TTL:
- Котировки: 60 секунд
- Исторические данные: 5 минут
- Новости: 15 минут
- Sentiment: 10 минут
- Технический анализ: 2 минуты

### Важно
- Используются только бесплатные API без ключей
- Все провайдеры gracefully fallback при недоступности API (возвращают `null` / `[]`)
- Не нарушай ToS источников

---

## 9. Что важно не сломать

При доработках следи за инвариантами:

- заказ должен создаваться до платежа
- payment metadata должна содержать `orderId`
- webhook должен быть идемпотентным
- анализ нельзя отправлять до подтверждения оплаты
- аналитика должна содержать disclaimer
- нужно избегать обещаний гарантированной доходности

---

## 10. Как публиковать на GitHub

### Инициализация
```bash
git init
git add .
git commit -m "feat: initial AI Market View bot MVP"
```

### Создание репозитория
Либо через GitHub UI, либо через `gh` CLI.

### Подключение remote
```bash
git remote add origin https://github.com/USERNAME/REPOSITORY.git
git branch -M main
git push -u origin main
```

---

## 11. Что я бы делал следующим коммитом

Рекомендую следующую последовательность:

### Коммит 1
`feat: add prisma and postgres persistence`

### Коммит 2
`feat: add verified yookassa webhook processing`

### Коммит 3
`feat: add real ai analysis pipeline`

### Коммит 4
`feat: add admin tools and operator workflow`

---

## 12. Идеальный target state проекта

Если доводить до сильной production-версии, то нужно:

- PostgreSQL
- Prisma
- Redis
- job queue
- webhook verification
- полноценный AI pipeline
- abstraction над data providers
- аналитика с шаблонами по типу актива
- операторский кабинет
- логирование и мониторинг
- unit/integration tests
- Docker setup
- deploy pipeline
- юридические документы

---

## 13. Если будешь продолжать сам

Лучший практический путь:
1. сначала БД
2. потом webhook-надежность
3. потом AI pipeline
4. потом data providers
5. потом админка и операционный контур

Именно в таком порядке проект будет расти наиболее устойчиво.