# ADR-005: Temporal vs BullMQ Responsibility Split

## Status
Proposed

## Date
2026-04-29

## Context

Раздел 23.4 ТЗ предписывает Temporal для критических процессов и BullMQ для некритичных. Нужно зафиксировать разделение.

## Decision

### Temporal Workflows (durable, with compensation)

Раздел 23.4 ТЗ:

- DepositProcessingWorkflow
- WithdrawalApprovalWorkflow
- WithdrawalSendingWorkflow
- StopTradingWorkflow
- EmergencyShutdownWorkflow
- ReconciliationWorkflow
- FeeCalculationWorkflow
- KycReviewWorkflow
- BotSessionLifecycleWorkflow

### BullMQ Jobs

- Email/notification dispatch
- Report generation (PDF/CSV)
- Signal ingestion (raw signal parsing)
- Cache warming
- Cleanup tasks
- Webhook dispatching

## Consequences

### Positive
- Critical money workflows — deterministic, с compensation, retry semantics.
- Operational bus (notifications, reports) — легкий, быстрый.

### Negative
- Две системы очередей нужно поддерживать.
- Temporal имеет операционную сложность.

## Compliance / Security / Money impact

- **Money: Critical.** Все money-impacting workflow обязательно через Temporal.

## Related

- ADR-004
- Раздел 23.4 ТЗ
