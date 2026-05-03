# Service Map

> Дополнение к docs/architecture.md. Раздел 26.3 ТЗ.

---

## Services overview

| Service | Lang | Owner | Public? | Notes |
|---------|------|-------|---------|-------|
| apps/web | TS / Next.js | Frontend | yes | Client + admin UIs |
| services/api | TS / NestJS or Fastify (DEC-004) | Backend | yes | REST + WS |
| services/temporal-worker | TS | Backend | no | Critical money workflows |
| services/worker | TS | Backend | no | BullMQ jobs |
| services/trading | TS | Trading | no | Bot orchestration |
| services/risk | TS | Risk | no | Pre-trade checks, kill switch |
| services/execution | TS | Trading | no | Order placement, retry |
| services/blockchain-watcher | TS | Custody | no | Detect deposits/withdrawals |
| services/reconciliation | TS | Custody | no | Daily reconciliation |
| services/compliance | TS | Compliance | no | KYC/AML adapters |
| services/signing | TS / Rust (TBD) | Security | no | Isolated signing service |

---

## Inter-service contracts

### API → temporal-worker
- Start workflows via Temporal client.
- Workflows: Deposit*, Withdrawal*, StopTrading*, Reconciliation*, Fee*, KycReview*.

### temporal-worker → other services
- Activity calls.
- Idempotent.

### blockchain-watcher → API
- Internal webhook on detected/confirmed tx.
- Signed (HMAC).

### trading → risk
- Synchronous pre-trade check call.
- Risk service has authority to reject.

### trading → execution
- Order request after risk approved.
- Async update via stream.

### execution → exchange
- Native SDK (production) or CCXT (paper / fallback).
- Idempotency через client_order_id.

### API → signing
- mTLS only.
- Request includes ledger_entry_id; signing verifies status=approved.

### compliance → external providers
- Through pluggable adapter.
- Fallback chain.

---

## Data ownership

| Service | Owns tables |
|---------|-------------|
| api | users, clients, sessions, support_tickets |
| ledger package | ledger_*, client_balances, high_water_marks |
| custody | deposits, withdrawals, wallets |
| trading | bot_sessions, strategies, orders, trades, positions |
| risk | risk_events |
| signals | signals_raw, signals_parsed, trade_ideas |
| compliance | kyc_*, aml_*, sanction_*, restricted_countries |
| reconciliation | reconciliation_runs, reconciliation_errors |
| audit | audit_logs, admin_actions, system_events |

Cross-service writes — через published events / Temporal activities, не direct DB access.

---

## Deployment

- Каждый service — отдельный container.
- Kubernetes deployment (или Docker Compose в dev / lightweight prod).
- Horizontal scaling per service.
- Signing service в отдельном strict-isolated namespace (production).

---

## Open

- DEC-004 (NestJS vs Fastify).
- Точный контрактный formal interface для services (gRPC / REST internal / message-based) — TBD ADR.
