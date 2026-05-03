# ADR-004: Trading Engine Architecture

## Status
Proposed

## Date
2026-04-29

## Context

Раздел 11 ТЗ описывает Bot Engine, Strategy Engine, Execution Engine. Раздел 22.3 ТЗ предлагает CCXT для MVP, native exchange SDK для production-критичных операций, и отдельные сервисы execution и risk.

## Options Considered

### Option A — Monolith trading service
Один services/trading с bot+strategy+execution.

- **Pros:** простота старта.
- **Cons:** трудно масштабировать, single point of failure.

### Option B — Разделенные сервисы
- services/trading — bot orchestration, strategy execution
- services/execution — order placement, retry logic, idempotency
- services/risk — pre-trade checks, drawdown monitor, kill switch

- **Pros:** independent scaling, четкие границы ответственности, легче тестировать.
- **Cons:** больше operational complexity.

### Option C — Готовые фреймворки (Freqtrade / Hummingbot / Jesse)
Использовать готовый бот.

- **Pros:** быстрый старт, готовые стратегии.
- **Cons:** только для research/backtesting (раздел 23.2 ТЗ).

## Decision

**Option B (разделенные сервисы).** Соответствует разделу 22.3 ТЗ.

CCXT — на MVP 3–4 для paper и limited trading. Native SDK биржи — после выбора биржи (DEC-003) для production.

Risk service ОБЯЗАТЕЛЬНО изолирован — никакой order не уходит без riskService.preTradeCheck() approval (раздел 11.4 ТЗ).

## Consequences

### Positive
- Risk service можно остановить независимо (kill switch).
- Execution имеет свою retry policy и idempotency.
- Можно деплоить независимо.

### Negative
- Сложнее observability — нужна correlation ID (раздел 58.3 ТЗ).
- Больше moving parts в инфраструктуре.

## Compliance / Security / Money impact

- **Money: Critical.**
- **Trading: Critical.** Бот не может торговать без risk approval.

## Related

- ADR-005 (Temporal vs BullMQ)
- ADR-007 (Exchange Integration)
- Разделы 11, 12 ТЗ
