# ADR-007: Exchange Integration Approach

## Status
Proposed (зависит от DEC-003)

## Date
2026-04-29

## Context

Раздел 22.3 ТЗ: CCXT для MVP, native SDK для production-критичных операций.

## Decision

Слой packages/exchange с интерфейсом ExchangeAdapter:

- placeOrder, cancelOrder, getPosition, getBalance
- streamOrderUpdates, streamPositions, getFundingRate

Этапы:

- MVP 3 (paper trading) — ccxt-based adapter с sandbox или mock.
- MVP 4 (limited live) — native SDK выбранной биржи (после DEC-003).
- Для production-критичных операций (place/cancel order, withdraw, position close) — native SDK с retry, idempotency client-order-id, reconcile.

## Consequences

### Positive
- Изолируем биржевые особенности.
- Можно подключать новые биржи через interface.

### Negative
- Поддержка двух implementations (CCXT + native).

## Compliance / Security / Money impact

- **Money: Critical.** Order может быть выслан дважды — idempotency через client_order_id обязательна.

## Related

- DEC-003
- Раздел 11.3 ТЗ
