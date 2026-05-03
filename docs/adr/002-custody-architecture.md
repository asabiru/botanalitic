# ADR-002: Custody Architecture

## Status
Proposed

## Date
2026-04-29

## Context

Custody — модель хранения USDT клиентов. От нее зависит безопасность средств, операционная надежность, regulatory exposure и UX (скорость выводов).

## Options Considered

### Option A — Pooled custody (omnibus)
Все депозиты приходят на один или несколько hot wallet платформы, ledger разделяет балансы клиентов внутренне.

- **Pros:** простой operations, низкие сетевые fees, удобно для торговли.
- **Cons:** регуляторно сложнее (commingling), требует строжайшего ledger и proof-of-solvency.

### Option B — Per-client deposit address + pooled treasury
Каждому клиенту выдается уникальный deposit address (или memo/tag для TRC20), но средства автоматически сметаются в общий treasury wallet. Внутренний ledger ведет per-client balance.

- **Pros:** AML и attribution лучше, простая идентификация депозита, единый пул для торговли.
- **Cons:** sweep operations добавляют операционные fees и event flow.

### Option C — Fully segregated wallets (vault per client)
Каждому клиенту отдельный кошелек с собственным ключом.

- **Pros:** максимальная сегрегация средств.
- **Cons:** нереалистично операционно, дорого по gas, сложно для торговли.

### Option D — MPC / Threshold signature wallets
Использование Fireblocks / Copper / собственный MPC.

- **Pros:** institutional-grade security.
- **Cons:** дорого, сложно интегрировать на старте.

## Decision

**Option B (per-client deposit address + pooled treasury)** для MVP 1–4, с раздельными wallets для функций (раздел 49 ТЗ):

- deposit_collection_wallet — куда приходят депозиты
- treasury_wallet — операционная casна
- withdrawal_wallet — горячий кошелек для выводов
- fee_wallet — отделенный fee revenue
- cold_reserve_wallet — холодное хранение основной массы средств

После MVP 5 — оценить миграцию на MPC (Option D).

## Consequences

### Positive
- Каждый депозит четко идентифицируем.
- Treasury operations прозрачны и контролируемы.
- Hot/cold separation снижает риск компрометации.

### Negative
- Sweep workflows нужны (Temporal).
- Чуть выше сетевые fees.
- Cold-to-hot replenishment требует runbook.

## Compliance / Security / Money impact

- **Money: Critical.** Любая ошибка sweep flow = потеря средств.
- **Security: Critical.** Withdrawal wallet keys должны быть в изолированном signing service (раздел 21.1 ТЗ).
- **Compliance: High.** Per-client address упрощает KYC/AML attribution.

## Related

- ADR-008 (withdrawal signing architecture)
- Раздел 49 ТЗ (Treasury Operations)
- Раздел 50 ТЗ (Withdrawal Address Security)
