# AI Market View Bot

Telegram-бот для продажи аналитики по финансовым инструментам с оплатой через **ЮKassa** и базовой автоматической выдачей результата после подтверждения оплаты.

## Статус проекта

**Текущий статус:** рабочий MVP+.

Проект уже:
- собирается
- проходит typecheck
- запускается локально
- поддерживает каталог инструментов
- умеет создавать оплату через ЮKassa
- умеет принимать webhook подтверждения оплаты
- умеет отправлять результат пользователю в Telegram
- подготовлен для дальнейшего развития

Подробный статус смотри в:
- [`docs/project-status.md`](docs/project-status.md)
- [`docs/developer-guide.md`](docs/developer-guide.md)

---

## Что уже реализовано

### Telegram bot flow
- `/start`
- главное меню
- каталог аналитики
- выбор инструмента
- ввод тикера
- демо-анализ
- оформление заказа
- просмотр заявок пользователя

### Оплата
- создание заказа до оплаты
- создание ссылки ЮKassa
- привязка `orderId` к payment metadata
- webhook `payment.succeeded`
- автоматическая отправка аналитики после оплаты

### Backend
- Express HTTP server
- `GET /health`
- `POST /webhooks/yookassa`
- `GET /orders/:telegramUserId`

### Хранение
- user session store в памяти
- order store в памяти
- сохранение заказов в `tmp/orders.json`

---

## Поддерживаемые инструменты

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

---

## Архитектура проекта

```text
root/
  package.json
  package-lock.json
  .env.example
  README.md
  docs/
    developer-guide.md
    project-status.md
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

---

## Быстрый старт

### 1. Установить зависимости
```bash
npm install
```

### 2. Создать `.env`
```bash
copy .env.example .env
```

### 3. Заполнить переменные окружения
Обязательно:
- `TELEGRAM_BOT_TOKEN`
- `YOOKASSA_SHOP_ID`
- `YOOKASSA_SECRET_KEY`
- `YOOKASSA_RETURN_URL`
- `PORT`

Опционально:
- `OPENAI_API_KEY`
- `OPENAI_MODEL`

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

---

## Маркетинг

- **Лендинг:** [`landing/index.html`](landing/index.html) — адаптивный лендинг с тёмной темой (Tailwind CSS)
- **Маркетинговая стратегия:** [`docs/marketing-strategy.md`](docs/marketing-strategy.md) — ЦА, УТП, каналы, воронка, KPI, реферальная программа
- **Контент-план:** [`docs/content-plan.md`](docs/content-plan.md) — план постов для Telegram-канала на 30 дней
- **Готовые посты:** [`marketing/telegram-posts/`](marketing/telegram-posts/) — 7 постов для Telegram-канала
- **SEO:** [`docs/seo-copy.md`](docs/seo-copy.md) — описания для BotFather, каталогов, мета-теги
- **Changelog:** [`docs/changelog.md`](docs/changelog.md)

---

## Ограничения текущей версии

Сейчас это **не production-ready финальная версия**.

Пока не реализовано:
- PostgreSQL
- Prisma
- полноценная webhook verification
- queue/retry механизм
- real AI pipeline
- data provider integrations
- tests
- Docker/deploy pipeline
- admin/operator tools
- legal docs package

---

## Что делать дальше

Рекомендуемый порядок:
1. PostgreSQL + Prisma
2. webhook reliability
3. real AI integration
4. market/news/social providers
5. admin tools
6. tests
7. deploy & monitoring
8. legal/commercial layer

Подробно:
- [`docs/project-status.md`](docs/project-status.md)
- [`docs/developer-guide.md`](docs/developer-guide.md)

---

## Важно

Аналитические материалы должны сопровождаться дисклеймером:

> Информация носит ознакомительный характер и не является индивидуальной инвестиционной рекомендацией.