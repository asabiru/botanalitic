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

### Webhook reliability
Реализовано:
- верификация IP-адресов ЮKassa (whitelist)
- валидация тела webhook через zod-схему
- идемпотентная обработка (повторный webhook не вызывает повторную доставку)
- retry-логика отправки аналитики (3 попытки, exponential backoff)
- структурированное логирование webhook events
- уведомление админа через `ADMIN_CHAT_ID` при ошибках

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
Сделано:
- ✅ verify webhook source (IP whitelist + zod validation)
- ✅ идемпотентная обработка webhook
- ✅ retry-логика (3 попытки, exponential backoff)
- ✅ журнал payment events (structured JSON logging)
- ✅ статусы доставки аналитики (delivered/failed + admin notify)

### Priority 3 — Real AI analysis
Сделать:
- OpenAI / LLM integration
- prompt templates
- structured output
- нормализация ответа
- контроль длины ответа
- cost tracking

### Priority 4 — Data integrations
Сделать:
- market data provider layer
- news ingestion layer
- social sentiment layer
- legal-safe integration strategy
- abstraction над провайдерами

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