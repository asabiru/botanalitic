# Event Flow

> Дополнение к docs/architecture.md. Раздел 26.3 ТЗ.

---

## 1. Domain events (published from services)

### Custody / Ledger
- DepositDetected
- DepositConfirmed
- DepositCredited
- WithdrawalRequested
- WithdrawalApproved
- WithdrawalSent
- WithdrawalConfirmed
- WithdrawalFailed
- LedgerEntryPosted
- ReconciliationCompleted
- ReconciliationErrorDetected

### Trading
- BotSessionStarted
- BotSessionPaused
- BotSessionStopped
- OrderSubmitted
- OrderFilled
- OrderCancelled
- OrderRejected
- PositionOpened
- PositionClosed
- StopLossTriggered
- TakeProfitTriggered

### Risk
- RiskCheckPassed
- RiskCheckFailed
- DrawdownWarning
- DrawdownStop
- LiquidationImminent
- KillSwitchTriggered
- EmergencyStopActivated

### Compliance
- KycSubmitted
- KycApproved
- KycRejected
- AmlScreeningCompleted
- SanctionsHitDetected
- ClientFrozen
- ClientUnfrozen

### Signals
- SignalRawIngested
- SignalParsed
- SignalScored
- SignalDuplicate

### Fees
- FeeAccrued
- FeePosted
- HighWaterMarkUpdated

### Admin
- AdminActionPerformed (with action_type)
- ManualLedgerAdjustmentPosted

---

## 2. Transport

- Temporal signals / activity completions для workflow coordination.
- Database outbox pattern для durable event publishing.
- Redis pub/sub для realtime UI updates (non-critical).
- WebSocket / SSE для client UI streaming.

---

## 3. Idempotency

Каждый event имеет:

```
{
  event_id: uuid,
  event_type: ...,
  occurred_at: timestamp,
  correlation_id: uuid,
  causation_id: uuid (parent event),
  aggregate_id: ...,
  payload: { ... },
  metadata: { source, version, ... }
}
```

Subscribers store processed event_ids → replay-safe.

---

## 4. Ordering

- Per-aggregate ordering enforced (e.g., per client_id для balance changes).
- Cross-aggregate ordering — relaxed, eventual consistency.

---

## 5. Critical workflows (Temporal)

### DepositProcessingWorkflow
DepositDetected → wait confirmations → AML screen → DepositConfirmed → DepositCredited (ledger entry) → notify client.

### WithdrawalApprovalWorkflow
WithdrawalRequested → AML/risk score → if auto: WithdrawalApproved; else: pending_review → admin approval → WithdrawalApproved.

### WithdrawalSendingWorkflow
WithdrawalApproved → call signing service → broadcast tx → wait confirmations → WithdrawalSent / WithdrawalFailed.

### StopTradingWorkflow
StopTradingRequested → cancel open orders → close positions → calculate PnL → accrue fees → update available balance → BotSessionStopped.

### EmergencyShutdownWorkflow
EmergencyStopActivated (admin) → for each active bot_session: StopTradingWorkflow → freeze trading platform-wide → notify all affected clients.

### ReconciliationWorkflow
Schedule → pull blockchain + exchange + ledger → compare → ReconciliationCompleted or ReconciliationErrorDetected.

### FeeCalculationWorkflow
Schedule (daily/end-of-period) → compute performance fee with HWM, management fee, bot fee → post ledger entries → FeeAccrued + FeePosted events.

### KycReviewWorkflow
KycSubmitted → provider verification → sanctions/PEP check → AML score → manual review (если flagged) → KycApproved / KycRejected.

---

## 6. Observability

- Каждое event в structured log с correlation_id.
- Metrics counters per event_type.
- Dashboard "events per service" в Grafana.
