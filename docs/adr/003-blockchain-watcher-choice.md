# ADR-003: Blockchain Watcher Implementation

## Status
Proposed (зависит от DEC-002 — выбор сети USDT)

## Date
2026-04-29

## Context

Blockchain watcher отслеживает входящие/исходящие транзакции, подтверждения, реорганизации. Раздел 8.2 ТЗ описывает поток депозита.

## Options Considered

### Option A — Self-hosted node + custom watcher
Полный TRON/ETH node + сервис на services/blockchain-watcher.

- **Pros:** независимость, нет rate limits, лучший privacy.
- **Cons:** высокий operational cost (особенно ETH archive nodes), сложно поддерживать.

### Option B — Public RPC + custom watcher
Используем QuickNode / Alchemy / Ankr / TronGrid как RPC, watcher свой.

- **Pros:** быстрый старт, низкая стоимость на MVP.
- **Cons:** rate limits, downtime провайдера, lock-in.

### Option C — Готовый сервис (Tatum / Blockdaemon)
Outsource весь watcher.

- **Pros:** минимум разработки.
- **Cons:** vendor lock-in, дорого, regulatory exposure.

## Decision

**Option B (Public RPC + custom watcher).** Стартуем с TronGrid (если DEC-002 = TRC20) или Alchemy (если ERC20). После MVP 3 рассмотреть переход на self-hosted node.

## Consequences

### Positive
- Быстрый старт MVP 2.
- Низкие operational costs.

### Negative
- Зависимость от провайдера — нужен fallback.
- Рейт-лимиты могут стать узким местом.

## Compliance / Security / Money impact

- **Money: High.** Ошибка watcher = пропуск депозита или двойное зачисление.
- **Mitigation:** требуется N подтверждений, idempotency на tx_hash, reconciliation с RPC.

## Related

- DEC-002
- Раздел 8 ТЗ
