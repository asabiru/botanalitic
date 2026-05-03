# Changelog — AI Market View Bot

Все заметные изменения проекта документируются в этом файле.

---

## [0.3.0] — 2025-05-03

### Добавлено — Маркетинг и продвижение

**Маркетинговая стратегия:**
- `docs/marketing-strategy.md` — полная маркетинговая стратегия
- Целевая аудитория и сегменты
- Уникальное торговое предложение (УТП)
- Каналы продвижения (органические и платные)
- Воронка продаж
- KPI и метрики
- Реферальная программа и партнёрская программа

**Лендинг-страница:**
- `landing/index.html` — адаптивный лендинг с тёмной темой
- Tailwind CSS через CDN, mobile-first дизайн
- Hero, каталог инструментов, «Как это работает», тарифы, демо-аналитика, FAQ
- Disclaimer об инвестиционных рисках

**Контент-план:**
- `docs/content-plan.md` — план постов для Telegram-канала на 30 дней
- Рубрики: утренний обзор, идея дня, недельный прогноз, обучение, промо
- Шаблоны постов

**Готовые посты для Telegram-канала:**
- `marketing/telegram-posts/01-welcome.md` — приветственный пост
- `marketing/telegram-posts/02-product-launch.md` — анонс запуска бота
- `marketing/telegram-posts/03-how-it-works.md` — как пользоваться ботом
- `marketing/telegram-posts/04-demo-analysis.md` — пример аналитики золота
- `marketing/telegram-posts/05-promo-first-clients.md` — промо для первых 100 клиентов
- `marketing/telegram-posts/06-weekly-review-template.md` — шаблон еженедельного обзора
- `marketing/telegram-posts/07-referral-program.md` — реферальная программа

**SEO:**
- `docs/seo-copy.md` — описания для BotFather, каталогов, мета-теги, ключевые слова

---

## [0.2.0] — Предыдущие изменения

### Добавлено
- Telegram bot flow: /start, главное меню, каталог, выбор инструмента, ввод тикера, демо-анализ, оформление заказа
- Оплата через ЮKassa: создание ссылки, webhook, автоматическая доставка
- Express HTTP server с endpoints: /health, /webhooks/yookassa, /orders/:telegramUserId
- Каталог из 12 инструментов с ценами
- Документация: README.md, developer-guide.md, project-status.md
