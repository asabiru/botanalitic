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

