# Changelog

## [0.2.0] — 2025-05-03

### Added
- Vitest test framework (`vitest` + `@vitest/coverage-v8`)
- `vitest.config.ts` с покрытием и порогами
- Unit тесты:
  - `catalog.test.ts` — каталог (12 инструментов), `findInstrumentById`
  - `session-store.test.ts` — get, patch, clear
  - `order-store.test.ts` — create, update, getById, getByPaymentId, listByTelegramUserId
  - `ai-analysis.test.ts` — demo fallback, секции, disclaimer
  - `config.test.ts` — валидация env переменных (missing → error)
  - `yookassa.test.ts` — createPayment с моком axios
- Integration тесты:
  - `server.test.ts` — GET /health, POST /webhooks/yookassa (валидный/невалидный payload, идемпотентность), GET /orders/:telegramUserId
- CI pipeline: `.github/workflows/ci.yml` (build + test jobs)
- Скрипты: `test`, `test:watch`, `test:coverage`
- Coverage > 70% по всем метрикам

### Changed
- `docs/project-status.md` — обновлён Priority 6 (Quality)
- `docs/developer-guide.md` — добавлена секция тестирования

## [0.1.0] — Initial MVP

- Telegram bot flow
- YooKassa payment integration
- Express HTTP server
- In-memory storage
