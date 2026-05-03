# Changelog

## [Unreleased]

### Added
- **Admin Telegram commands**: `/admin`, `/orders`, `/order <id>`, `/stats`, `/users`, `/resend <orderId>`, `/broadcast <text>`
- **Admin guard middleware** (`src/admin/admin-guard.ts`) — проверка ADMIN_CHAT_ID
- **HTTP Admin API** — защищённые endpoints:
  - `GET /admin/stats` — статистика (всего заказов, оплаченных, выручка, средний чек, уникальные пользователи)
  - `GET /admin/orders?page=1&limit=20` — список заказов с пагинацией
  - `GET /admin/orders/:id` — детали заказа
  - `POST /admin/orders/:id/resend` — перевыдача аналитики
- **HTTP Admin API key** — защита через header `X-Admin-Key` (env: `ADMIN_API_KEY`)
- **HTML Admin Dashboard** (`admin/index.html`) — Tailwind CSS, тёмная тема, карточки статистики, таблица заказов с фильтрами, пагинация, кнопка перевыдачи
- **Audit log** (`src/admin/audit-log.ts`) — логирование admin действий в `tmp/audit.log`
- `ADMIN_API_KEY` в `.env.example`
- Методы `listAll()` и `uniqueUserIds()` в `OrderStore`

### Changed
- Обновлена документация: `project-status.md`, `developer-guide.md`, `changelog.md`
- Обновлён `config.ts` — добавлена переменная `ADMIN_API_KEY`
