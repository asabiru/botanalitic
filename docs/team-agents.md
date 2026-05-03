# Команда AI-агентов — AI Market View Bot

Проект разрабатывается командой из **6 специализированных AI-агентов**, каждый из которых отвечает за свою область. Агенты работают параллельно, создают отдельные PR и ведут отчёты в документации.

---

## Состав команды

### 1. Призма — DB Architect
**Макрос:** `!prisma_agent`  
**Зона ответственности:** база данных и persistence

Что делает:
- PostgreSQL + Prisma ORM
- Schema: User, Order, Payment, Delivery
- Repository-слой (order.repository.ts, user.repository.ts)
- Docker-compose с PostgreSQL для локальной разработки
- Миграции
- Замена файлового хранилища (tmp/orders.json) на БД
- Обратная совместимость: fallback на файлы если DATABASE_URL не задан

**Файлы:**
- `services/telegram-bot/prisma/schema.prisma`
- `services/telegram-bot/src/repositories/`
- `docker-compose.yml`

---

### 2. Вебхук — Payment Engineer
**Макрос:** `!webhook_agent`  
**Зона ответственности:** надёжность платежей ЮKassa

Что делает:
- Верификация IP-адресов ЮKassa (whitelist)
- Идемпотентная обработка webhook
- Retry-логика при отправке аналитики
- Структурированное логирование webhook events
- Zod-валидация тела webhook
- Уведомление админа через ADMIN_CHAT_ID при ошибках

**Файлы:**
- `services/telegram-bot/src/server.ts`
- `services/telegram-bot/src/middleware/webhook-validation.ts`
- `services/telegram-bot/src/utils/logger.ts`

---

### 3. Аналитик — AI Engineer
**Макрос:** `!ai_agent`  
**Зона ответственности:** AI-аналитика через OpenAI

Что делает:
- OpenAI SDK интеграция
- Prompt templates для каждого класса активов
- Structured output (обзор, уровни, сценарии, риски, идея)
- Fallback на demo-генератор если нет OPENAI_API_KEY
- Контроль max_tokens (2000)
- Error handling с автоматическим fallback
- Disclaimer в каждом ответе
- Разбивка длинных сообщений по 4096 символов (лимит Telegram)

**Файлы:**
- `services/telegram-bot/src/ai-analysis.ts`
- `services/telegram-bot/src/ai/openai-client.ts`
- `services/telegram-bot/src/ai/prompt-templates.ts`

---

### 4. Девопс — DevOps Engineer
**Макрос:** `!devops_agent`  
**Зона ответственности:** инфраструктура, CI/CD, качество кода

Что делает:
- Dockerfile (multi-stage build)
- Docker-compose для локальной разработки
- GitHub Actions CI pipeline (lint, typecheck, build)
- ESLint (flat config) + Prettier
- npm scripts: lint, lint:fix, format
- Документация по инфраструктуре

**Файлы:**
- `Dockerfile`
- `docker-compose.yml`
- `.github/workflows/ci.yml`
- `eslint.config.js`
- `.prettierrc`

---

### 5. Маркет — Market Data Engineer
**Макрос:** `!market_agent`  
**Зона ответственности:** реальные рыночные данные в реальном времени

Что делает:
- Модульная архитектура провайдеров данных
- Yahoo Finance: акции США, commodities (нефть, газ, золото, серебро), FX (EUR/USD)
- MOEX ISS API: акции РФ, индекс Мосбиржи (IMOEX), RGBI
- CoinGecko: криптовалюты
- ЦБ РФ: курсы валют (USD/RUB, CNY/RUB, EUR/RUB)
- Investing.com RSS: новости рынков
- Bloomberg RSS: финансовые новости
- TradingView: технический анализ
- X.com: sentiment analysis (интерфейс)
- In-memory кэш с TTL (котировки: 60 сек, новости: 15 мин)
- Маппинг инструментов каталога на символы провайдеров
- Агрегация данных в MarketContext для AI-промптов

**Файлы:**
- `services/telegram-bot/src/integrations/market-data/`
- `services/telegram-bot/src/integrations/news/`
- `services/telegram-bot/src/integrations/sentiment/`
- `services/telegram-bot/src/integrations/cache/`
- `services/telegram-bot/src/integrations/instrument-mapper.ts`
- `services/telegram-bot/src/integrations/market-data.service.ts`

---

### 6. Маркетолог — Marketing & Growth
**Макрос:** `!marketing_agent`  
**Зона ответственности:** маркетинг и продвижение

Что делает:
- Маркетинговая стратегия (целевая аудитория, УТП, каналы, воронка, KPI)
- HTML лендинг-страница (Tailwind CSS, тёмная тема, адаптивный)
- Контент-план на 30 дней для Telegram-канала
- 7 готовых промо-постов
- SEO-копирайтинг (описания, мета-теги, ключевые слова)
- Реферальная программа

**Файлы:**
- `landing/index.html`
- `docs/marketing-strategy.md`
- `docs/content-plan.md`
- `docs/seo-copy.md`
- `marketing/telegram-posts/`

---

## Как работает команда

### Принципы
1. **Параллельная работа** — все агенты работают одновременно
2. **Изоляция зон** — каждый агент работает только со своими файлами
3. **Отдельные PR** — каждый агент создаёт свой Pull Request
4. **Документация** — каждый агент обновляет docs/ с отчётом о проделанной работе
5. **Координатор** — главный агент мониторит прогресс и координирует

### Запуск агента
Для запуска любого агента используй его макрос:
- `!prisma_agent` — запустит Призму
- `!webhook_agent` — запустит Вебхук
- `!ai_agent` — запустит Аналитика
- `!devops_agent` — запустит Девопса
- `!market_agent` — запустит Маркет
- `!marketing_agent` — запустит Маркетолога

### Зависимости между агентами
```
Призма (БД) ─────────────────┐
Вебхук (платежи) ────────────┤
Аналитик (AI) ───────────────┼──→ Интеграция → Тестирование → Деплой
Маркет (данные) ─────────────┤
Девопс (инфраструктура) ─────┤
Маркетолог (продвижение) ────┘
```

### Порядок мержа PR
Рекомендуемый порядок:
1. **Девопс** (CI/CD, линтинг — базовая инфраструктура)
2. **Призма** (БД — от неё зависят другие)
3. **Вебхук** (надёжность платежей)
4. **Аналитик** (AI интеграция)
5. **Маркет** (данные в реальном времени)
6. **Маркетолог** (маркетинг — независим от кода)

---

## Добавление нового агента

Чтобы добавить нового агента в команду:

1. Создай playbook с макросом `!agent_name`
2. Опиши зону ответственности и файлы
3. Укажи ограничения (какие файлы НЕ трогать)
4. Добавь требования к документации
5. Запусти child session с playbook_id
6. Обнови этот документ
