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
    changelog.md
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
        promo/
          promo-store.ts
          referral.ts
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

#### `promo/promo-store.ts`
Хранилище промокодов:
- CRUD: create, getByCode, use, deactivate, list
- Валидация: срок действия, лимит использований, активность
- Хранение в памяти + `tmp/promo-codes.json`
- Предустановленные коды: LAUNCH100 (30%), FRIEND20 (20%), FIRST (15%)
- Максимальная скидка: 50%

#### `promo/referral.ts`
Реферальная система:
- Генерация уникального реферального кода для пользователя
- Применение реферального кода (скидка 20% новому клиенту)
- Уведомление реферера о привлечении нового пользователя
- Хранение: кто привёл кого

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

Важно: некоторые источники имеют ограничения по лицензии, scraping и условиям использования.

Безопасный путь:
- использовать официальные API там, где они есть
- не нарушать ToS сайтов
- разделить:
  - market data provider
  - news provider
  - social sentiment provider

Рекомендуемая структура:
```text
src/
  integrations/
    news/
    market-data/
    sentiment/
```

---

## 9. Промокоды и реферальная программа

### Как работают промокоды
1. Пользователь нажимает «🎁 Промокод» в главном меню
2. Вводит промокод текстом
3. Бот проверяет: существование, срок, лимит, активность
4. При успехе — код сохраняется в сессии
5. При оплате — цена пересчитывается с учётом скидки
6. Промокод используется один раз на заказ

### Предустановленные промокоды
| Код | Скидка | Лимит |
|-----|--------|-------|
| LAUNCH100 | 30% | 100 использований |
| FRIEND20 | 20% | Безлимит |
| FIRST | 15% | Безлимит |

### Реферальная программа
- Команда `/referral` показывает реферальный код и ссылку
- При вводе реферального кода новый пользователь получает скидку 20% (FRIEND20)
- Реферер получает уведомление в Telegram

### Admin-команды
- `/promo_list` — список всех промокодов (только для ADMIN_CHAT_ID)
- `/promo_create <code> <discount%> <maxUses>` — создать промокод
- `/promo_deactivate <code>` — деактивировать промокод

### Правила
- Один промокод на заказ
- Нельзя совместить два промокода
- Скидка не более 50%
- Промокод не влияет на AI pipeline, market data, webhook verification

---

## 10. Что важно не сломать

При доработках следи за инвариантами:

- заказ должен создаваться до платежа
- payment metadata должна содержать `orderId`
- webhook должен быть идемпотентным
- анализ нельзя отправлять до подтверждения оплаты
- аналитика должна содержать disclaimer
- нужно избегать обещаний гарантированной доходности

---

## 11. Как публиковать на GitHub

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

## 12. Что я бы делал следующим коммитом

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

## 13. Идеальный target state проекта

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

## 14. Если будешь продолжать сам

Лучший практический путь:
1. сначала БД
2. потом webhook-надежность
3. потом AI pipeline
4. потом data providers
5. потом админка и операционный контур

Именно в таком порядке проект будет расти наиболее устойчиво.