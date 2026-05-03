# Counterparty Risk Policy

> Раздел 53 ТЗ + Counterparty Risk Agent (раздел 26.19).

---

## 1. Принцип

Платформа учитывает не только риск клиента, но и риск внешних контрагентов: бирж, blockchain RPC провайдеров, AML/KYC провайдеров, signing services.

---

## 2. Venue-level controls (раздел 53.1)

### Exchange concentration
- Cap per exchange: max X% от total custody на одной бирже (default 50%, требует DEC).
- Active monitoring per exchange:
  - API health (success rate, latency)
  - Withdrawal status (enabled / disabled)
  - Order placement health
  - Funding rates anomalies

### Exchange health states
- HEALTHY — все нормально.
- DEGRADED — повышенная latency или error rate; throttle new positions.
- UNHEALTHY — withdrawals disabled или persistent API errors; pause new orders, prepare close-out.
- CRITICAL — exchange недоступна > X minutes; emergency procedures.

### Counterparty risk score per exchange/provider

Факторы:
- License и регуляторный статус.
- Proof of reserves публикация.
- История инцидентов (hacks, withdrawal freezes).
- Liquidity (depth).
- Track record.
- Public ownership.

Score обновляется quarterly.

---

## 3. Exposure caps

Default cap policy (требует DEC):

- Single exchange: ≤50% total custody.
- Multiple exchanges если total ≥ X USDT.
- Single AML provider не блокирует — fallback chain доступен.
- Single RPC провайдер: fallback на second provider.

---

## 4. Operational workflows (раздел 53.2)

Manual "reduce exposure" workflow триггерится при:

- ухудшении состояния биржи (HEALTHY -> DEGRADED -> UNHEALTHY)
- росте операционного риска
- проблемах с выводом с биржи
- сбоях API (sustained > 30 минут)
- регуляторных рисках по контрагенту (новости, расследования)

Workflow:
1. Pause new orders на проблемной бирже.
2. Reduce open exposure (close partial positions if rules allow).
3. Initiate withdrawal с биржи на treasury wallet.
4. Notify Founder + admin.
5. Full audit trail.

---

## 5. Founder approval required (раздел 53)

- Exchange caps.
- Onboarding новой биржи.
- Failover rules для real-money trading.

---

## 6. Provider dependencies

| Провайдер | Тип | Fallback strategy |
|-----------|-----|-------------------|
| Exchange | Trading | Multiple exchanges; reduce-exposure workflow |
| Blockchain RPC | Critical | Primary + secondary; auto-switch |
| AML Provider | Compliance | Pluggable adapter; fallback to manual review |
| KYC Provider | Compliance | Backup provider; manual review |
| KMS | Security | Multi-region keys; cold backup |
| Email/SMS | Notifications | Multiple providers (degraded but works) |

---

## 7. Exchange scorecards (TBD после DEC-003)

Для каждой биржи поддерживать scorecard:

```
- Name
- Regulatory licenses
- Insurance / proof of reserves
- Historical uptime
- Withdrawal time average
- Recent incidents
- Liquidity per pair
- Counterparty score (1-10)
- Max recommended exposure %
- Last review date
```

---

## 8. Venue failover rules (TBD)

- При CRITICAL state биржи: automatic close + withdraw triggered if config allows.
- При DEGRADED: reduce new orders, increase margin buffer.
- При regulatory issue: founder + compliance immediate review.

---

## 9. Tests

- Simulated exchange outage -> system reduces exposure корректно.
- AML provider down -> fallback path активируется без блокировки legitimate flow.
- Reconciliation mismatch с exchange -> proper alerting.
