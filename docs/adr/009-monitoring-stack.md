# ADR-009: Monitoring and Alerting Stack

## Status
Proposed

## Date
2026-04-29

## Context

Раздел 23.8 ТЗ: Prometheus, Grafana, Loki/ELK, Sentry.

## Decision

- **Metrics:** Prometheus + Grafana (self-host для MVP, Grafana Cloud — option).
- **Logs:** Loki (cheaper than ELK для MVP).
- **Errors:** Sentry (self-host или SaaS).
- **Tracing:** OpenTelemetry, Tempo / Jaeger (для correlation ID, раздел 58.3 ТЗ).
- **Alerting:** Alertmanager, PagerDuty / Opsgenie / Telegram bot.

Обязательные SLI:

- Withdrawal queue depth и age
- Reconciliation status (last successful run)
- Bot session health (last heartbeat per session)
- Risk events (rate, severity)
- Ledger consistency check (sum debit = credit per day)
- API latency (P50/P95/P99)
- Exchange API health (success rate)
- Blockchain watcher lag (blocks behind tip)

## Consequences

### Positive
- Покрытие всех критических операций.
- Open-source stack.

### Negative
- Operational overhead на self-host.

## Related

- Раздел 21.2, 23.8 ТЗ
- Incident Response Agent (раздел 26.20)
