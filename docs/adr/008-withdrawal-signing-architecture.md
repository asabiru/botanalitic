# ADR-008: Withdrawal Signing Architecture

## Status
Proposed

## Date
2026-04-29

## Context

Раздел 9.4 + 21.1 ТЗ: private keys не должны храниться в основном приложении, signing service должен быть изолирован, hot/cold wallet separation.

## Options Considered

### Option A — Self-hosted signing service + KMS
Отдельный сервис services/signing, ключи в AWS KMS / GCP KMS / HashiCorp Vault.

- **Pros:** контроль, разумная стоимость, audit trail.
- **Cons:** ответственность за key management.

### Option B — MPC provider (Fireblocks / Copper / BitGo)
- **Pros:** institutional-grade, insurance.
- **Cons:** дорого ($60k+/year), vendor lock-in.

### Option C — Hardware HSM (YubiHSM / Ledger Vault)
- **Pros:** highest security.
- **Cons:** сложная operations, dual-control обязателен.

## Decision

**Option A (Self-hosted signing service + KMS) для MVP 1–4. Migration path к MPC (Option B) после MVP 5.**

Архитектура:

- API Gateway не имеет прямого доступа к ключам.
- Signing service за mTLS, sidecar.
- Ключи только в KMS, не дампятся в логи.
- Каждое подписание требует ledger entry в approved статусе.
- Cold wallet ключи offline, отдельная процедура.

## Consequences

### Positive
- Минимизация blast radius.
- Compliance-ready audit trail.

### Negative
- Дополнительный сервис в инфраструктуре.
- Нужны runbooks для key rotation и DR.

## Compliance / Security / Money impact

- **Security: Critical.**
- **Money: Critical.**

## Related

- ADR-002 (Custody architecture)
- Раздел 9.4, 21.1 ТЗ
