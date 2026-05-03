# ADR-001: Ledger Engine Selection

## Status
Proposed (awaits Founder approval — DEC-006)

## Date
2026-04-29

## Context

Раздел 23.3 ТЗ требует ADR-001 для выбора ledger engine. Ledger — критический модуль системы (раздел 7 ТЗ): каждое движение средств клиента должно иметь ledger entry, без ledger нельзя менять баланс клиента, ledger должен быть auditable и reconcilable.

Ключевые требования к ledger engine:

1. **Double-entry accounting** — debit/credit балансы сходятся.
2. **Idempotency** — повторные события не создают двойной записи.
3. **Append-only** — нельзя удалять/мутировать entries (audit hash).
4. **Высокая надежность** — не теряем транзакции даже при сбоях.
5. **Reconciliation-friendly** — легко сверять с blockchain и биржей.
6. **Performance** — тысячи entries в секунду на пике (массовые обновления PnL/funding).
7. **Масштабируемость** — несколько миллионов клиентов в перспективе.

## Options Considered

### Option A — Собственный ledger на PostgreSQL

Самописная двойная запись поверх PostgreSQL: таблицы `ledger_accounts`, `ledger_entries`, `ledger_transactions`, materialized view для balance, constraint на сумму debit = credit per transaction.

- **Pros:**
  - Полный контроль над схемой и инвариантами.
  - Простой stack — только PostgreSQL, который и так нужен.
  - Легко подружить с Prisma/Drizzle.
  - Прозрачно для аудита: всё видно в SQL.
  - Минимум third-party зависимостей.
- **Cons:**
  - Высокая ответственность: любая ошибка = деньги клиентов.
  - Нужно самому писать reconciliation, idempotency, performance optimizations.
  - Нет готовых отчетов и tooling.
  - Риск изобретения велосипеда.

### Option B — Midaz (Lerian)

Open-source ledger от Lerian, написан на Go, поддерживает мульти-asset, hierarchical accounts, REST + gRPC API.

- **Pros:**
  - Production-ready double-entry ledger out of the box.
  - Hierarchical accounts удобно для client/platform/fee separation.
  - Active maintenance.
  - REST + gRPC API.
- **Cons:**
  - Дополнительный сервис в инфраструктуре.
  - Меньше community вокруг продукта.
  - Меньше документации.
  - Lock-in риск, если проект остановит развитие.

### Option C — Summa Ledger

Open-source ledger, ориентирован на crypto/fintech use cases.

- **Pros:**
  - Создан под crypto-сценарии.
  - Built-in audit trails.
- **Cons:**
  - Меньшая зрелость, чем Midaz.
  - Mixed maturity репозиториев.
  - Меньше production references.

### Option D — Ledgito Core

Open-source double-entry ledger.

- **Pros:**
  - Standalone сервис.
- **Cons:**
  - Низкая maturity.
  - Малое community.
  - Риск abandoned project.

### Option E — Коммерческие платформы (Modern Treasury / Increase / Tigerbeetle)

- **Modern Treasury / Increase** — SaaS, не для crypto-custody, не подходят для self-custody USDT.
- **TigerBeetle** — open-source, написан на Zig, экстремально быстрый double-entry ledger, специально для financial transactions.

#### Option E.1 — TigerBeetle
- **Pros:**
  - Специально создан для double-entry с производительностью 1M+ tx/sec.
  - Strict consistency, deterministic execution.
  - Active development.
- **Cons:**
  - Молодой проект (в production с 2023).
  - Zig-стек — непривычно для команды.
  - Интеграция через клиентские библиотеки, schema очень специфичная (фиксированные поля).
  - Сложнее для ad-hoc запросов и BI.

## Decision

**Рекомендация: Option A (собственный ledger на PostgreSQL) для MVP 0–3, с интерфейсной изоляцией, чтобы можно было заменить движок позднее.**

Обоснование:

1. MVP 1–2 запускаются с малыми объемами и без real-money trading — performance не блокер.
2. PostgreSQL уже есть в стеке (раздел 22.2 ТЗ).
3. Полный контроль критичен для compliance и аудита на ранних стадиях.
4. Через `packages/ledger/` создаём LedgerService интерфейс — реализация может быть заменена.
5. Параллельно (P2) — proof-of-concept на TigerBeetle / Midaz, чтобы валидировать переход после MVP 3.

**Founder approval required:** да (DEC-006).

## Consequences

### Positive
- Минимум зависимостей.
- Полная аудитория и трассируемость.
- Готовность к compliance-проверкам.
- Команда понимает каждую строчку логики.

### Negative
- Команда должна сама писать tests, reconciliation, performance optimizations.
- При росте объемов потребуется миграция (запланировать как RFC после MVP 3).

### Neutral
- Выбор не блокирует другие архитектурные решения.

## Compliance / Security / Money impact

- **Money impact: Critical.** Ошибка в ledger = ошибка в балансе клиента.
- **Audit:** Каждый entry должен иметь `audit_hash` (раздел 7.4 ТЗ).
- **Idempotency:** Каждый entry должен иметь `idempotency_key` (раздел 7.4 ТЗ).

## Related

- DEC-006 в `docs/decision-board.md`
- `docs/ledger-model.md`
- Раздел 7 ТЗ
