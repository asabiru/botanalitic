# API Specification

> Раздел 20 ТЗ. Финал — после DEC-004 (NestJS / Fastify).

Все endpoints под /api/v1.

---

## Auth

```
POST /auth/register
POST /auth/login
POST /auth/logout
POST /auth/refresh
POST /auth/2fa/enable
POST /auth/2fa/verify
POST /auth/2fa/disable
POST /auth/password/reset/request
POST /auth/password/reset/confirm
```

Ответ: tokens (access + refresh), user profile.

---

## Client

```
GET  /client/dashboard         — aggregated overview
GET  /client/balance           — balances per asset / per category
GET  /client/equity-snapshots  — daily snapshots
GET  /client/positions         — open positions
GET  /client/trades            — trade history (paginated)
GET  /client/orders            — order history
GET  /client/reports           — list available reports (PDF/CSV)
GET  /client/reports/:id/download
POST /client/risk-profile      — update risk profile (within tier limits)
POST /client/accept-document   — accept risk disclosure / agreement
POST /client/suitability       — submit suitability questionnaire
GET  /client/notifications
POST /client/notifications/preferences
```

---

## Deposits

```
POST /deposits/address          — generate or retrieve client deposit address
GET  /deposits                  — list of own deposits
GET  /deposits/:id              — deposit details
POST /deposits/webhook/blockchain  — internal webhook от blockchain-watcher
```

---

## Withdrawals

```
POST /withdrawals               — create withdrawal request
GET  /withdrawals               — list of own withdrawals
GET  /withdrawals/:id           — details
POST /withdrawals/:id/cancel    — cancel (только до approved)

# Allowlist
GET  /withdrawals/allowlist
POST /withdrawals/allowlist     — add address (cooling-off начинается)
DELETE /withdrawals/allowlist/:id — remove address (audit log)
```

---

## Bot

```
POST /bot/start                 — start bot session (после pre-flight checks)
POST /bot/pause
POST /bot/stop                  — Stop Trading flow
GET  /bot/status                — current session status
GET  /bot/sessions              — history
GET  /bot/sessions/:id          — session details + metrics
```

---

## Strategies

```
GET  /strategies                — list of available strategies (active/live)
GET  /strategies/:id            — details + historical metrics
POST /strategies/:id/select     — select for current bot
```

---

## Signals

```
GET  /signals                   — list (для подписчиков)
GET  /signals/:id               — details
POST /signals/webhook/tradingview  — internal/external webhook
```

---

## Subscriptions (signal-only)

```
GET  /subscriptions/plans
POST /subscriptions             — start subscription
GET  /subscriptions/current
POST /subscriptions/cancel
GET  /subscriptions/invoices
```

---

## Support

```
GET  /support/tickets
POST /support/tickets
GET  /support/tickets/:id
POST /support/tickets/:id/messages
```

---

## Admin

```
# Clients
GET  /admin/clients
GET  /admin/clients/:id
POST /admin/clients/:id/freeze
POST /admin/clients/:id/unfreeze
GET  /admin/clients/:id/risk-events

# Withdrawals
GET  /admin/withdrawals
POST /admin/withdrawals/:id/approve   — step-up 2FA required
POST /admin/withdrawals/:id/reject    — step-up 2FA + reason
POST /admin/withdrawals/:id/escalate  — to compliance

# Ledger
GET  /admin/ledger/accounts
GET  /admin/ledger/entries
POST /admin/ledger/adjustments        — manual adjustment, dual approval

# Audit / events
GET  /admin/audit-logs
GET  /admin/risk-events
GET  /admin/system-events
GET  /admin/admin-actions

# Strategies
POST /admin/strategies
PATCH /admin/strategies/:id
POST /admin/strategies/:id/activate
POST /admin/strategies/:id/pause
POST /admin/strategies/:id/promote-version

# Signals
POST /admin/signals/manual
POST /admin/signals/sources

# Bot ops
POST /admin/bot/clients/:id/stop      — stop client bot
POST /admin/emergency-stop            — platform-wide

# Reconciliation
GET  /admin/reconciliation/runs
GET  /admin/reconciliation/errors
POST /admin/reconciliation/run        — trigger manual

# Fees
GET  /admin/fees/schedules
POST /admin/fees/schedules
PATCH /admin/fees/schedules/:id

# Settings / feature flags
GET  /admin/settings
PATCH /admin/settings
```

---

## Compliance

```
GET  /compliance/clients
GET  /compliance/clients/:id
POST /compliance/clients/:id/notes
POST /compliance/clients/:id/risk-level
POST /compliance/clients/:id/freeze
POST /compliance/clients/:id/aml-review
GET  /compliance/exports/clients      — export для регулятора
```

---

## Webhooks (external -> us)

```
POST /webhooks/blockchain/:network    — от blockchain RPC (signed)
POST /webhooks/exchange/:exchange     — от exchange streams
POST /webhooks/kyc-provider           — от KYC provider
POST /webhooks/aml-provider           — от AML provider
POST /webhooks/payment-provider       — от Stripe и подобных
```

Все signed (HMAC) + IP allowlist + idempotency на provider event id.

---

## Health / observability

```
GET  /health
GET  /health/live
GET  /health/ready
GET  /metrics                   — Prometheus
```

---

## Common conventions

- `correlation_id` header passed through.
- All money fields: string decimal (избегаем JSON number precision).
- All timestamps: RFC3339 с TZ.
- All amounts: positive (direction в отдельном поле где applicable).
- Pagination: cursor-based.
- Errors: RFC 7807 problem+json или внутренний format с code/message/details.
- Idempotency-Key header для money endpoints.

---

## Authentication

- Bearer JWT (access token, ~15min).
- Refresh token rotation.
- Session-bound; revocation via Redis blacklist.

## Authorization

- RBAC через decorators / middleware (см. docs/security.md).
- Per-resource ownership checks (client может видеть только свои deposits etc).

## Rate limiting

- 100 req/min per IP default.
- Sensitive endpoints (login, withdraw, KYC submit): tighter.
- 429 with Retry-After header.

---

## Open decisions

- DEC-004: NestJS vs Fastify (влияет на decorator style).
- GraphQL vs REST? — текущая рекомендация: REST для простоты + WebSocket для realtime updates.
- API versioning policy.
