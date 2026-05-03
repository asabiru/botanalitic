# Test Plan

> Раздел 26.12 ТЗ. QA/Test Agent отвечает за этот файл.

---

## 1. Test pyramids

```
           E2E
        /       \
   Integration tests
  /                 \
        Unit tests
```

Цели coverage (orientational):

- Unit: 80%+ для money/risk/withdrawal modules; 60%+ для остальных.
- Integration: все critical happy paths + edge cases.
- E2E: все user-facing critical flows.

---

## 2. Categories

### 2.1. Ledger
- Double-entry invariant: SUM(debits) = SUM(credits) per asset, per transaction.
- Idempotency: повтор события не двоит баланс.
- Concurrency: 2 одновременных withdrawal не вылезают за available.
- Audit chain: change to past entry breaks integrity check.
- Reconciliation: искусственное расхождение → reconciliation_error.

### 2.2. Withdrawals
- Cannot create amount > available_to_withdraw.
- Cannot send without approval.
- Dual approval works for amount > threshold.
- Cooling-off period blocks new address withdrawal.
- Failed withdrawal reverts ledger.
- Tx hash saved on send.
- Reorg → tx invalidated → ledger reverse.

### 2.3. Deposits
- Duplicate webhook не двоит баланс (idempotency).
- N confirmations enforced.
- AML hold blocks credit.
- Insufficient confirmations: status confirming, not credited.
- Reorg invalidates pending deposit.

### 2.4. Bot / Risk
- Pre-trade check rejects each invalid case (раздел 11.4 ТЗ).
- Stop-bot triggers at drawdown limit.
- Bot не торгует после Stop Trading.
- Bot не открывает order без stop loss.
- Bot не превышает max leverage.
- Emergency stop останавливает все боты.
- Liquidation imminent → emergency close.

### 2.5. Fees
- Performance fee только с realized profit.
- HWM работает (после drawdown fee не берется до восстановления).
- Management fee начисляется по периоду.
- Fee создает ledger entry.
- Fee видна клиенту в UI.

### 2.6. Reconciliation
- Daily run завершается успешно on happy path.
- Mismatch создает reconciliation_error.
- Critical error блокирует withdrawals + new trades.

### 2.7. Compliance
- Sanctions hit blocks onboarding.
- AML high score holds deposit.
- Restricted country blocks signup.
- KYC tier limits enforced.

### 2.8. Security
- Auth required on all protected endpoints.
- Step-up 2FA enforced for critical actions.
- Rate limit applies.
- Forbidden phrases caught by Semgrep.
- No secrets in logs.

### 2.9. Frontend
- Risk warnings visible на правильных страницах.
- Stop Trading button работает.
- Withdraw button показывает available_to_withdraw корректно.
- PnL display соответствует ledger (no rounding mismatches).

---

## 3. Specific test cases (раздел 26.12)

- [ ] Deposit happy path
- [ ] Duplicate webhook
- [ ] Withdrawals
- [ ] Insufficient balance
- [ ] Failed withdrawal
- [ ] Ledger consistency
- [ ] Fee calculation
- [ ] High-water mark
- [ ] Risk engine
- [ ] Bot stop
- [ ] Exchange errors
- [ ] Reconciliation errors

Дополнительно (рекомендации QA Agent):

- [ ] Stress tests
- [ ] Chaos tests (exchange outage, signing service down, KMS denied, blockchain RPC down)
- [ ] Duplicate withdrawal tests
- [ ] Stop Trading failure tests (бот не должен торговать ни при каких обстоятельствах после stop)

---

## 4. Tools (раздел 23.7)

- Playwright — E2E browser automation.
- Vitest или Jest — unit / integration.
- Testcontainers — integration tests с реальными PG/Redis.
- Mock Exchange Service — для trading flows.

---

## 5. Property-based tests

Для invariants:

- fast-check (TS) для:
  - ledger double-entry invariant
  - HWM monotonicity
  - withdrawal amount checks
  - risk engine pre-trade decisions

---

## 6. Chaos engineering

- Exchange API timeout / errors / 5xx.
- Blockchain RPC отказ.
- Signing service unavailable.
- DB transient failure.
- Temporal worker restart in middle of workflow.
- Time skew (для funding fee timing).
- Memory pressure / OOM.

---

## 7. CI matrix

- Pull requests: unit + integration + lint + typecheck + Semgrep + Gitleaks + Trivy + CodeQL.
- Main: above + E2E nightly.
- Release branch: above + chaos suite + load test.

---

## 8. Test data management

- Fixtures для seed test DB (testcontainers).
- Synthetic clients / deposits / orders.
- No real PII in test data.
- Reset between test runs.

---

## 9. Definition of Done (раздел 39 ТЗ)

Фича готова если:
1. Backend/API.
2. Frontend (если требуется).
3. DB migration.
4. Audit log.
5. Tests.
6. Error handling.
7. Документация.
8. RBAC checks.
9. Security review для чувствительных функций.
10. Acceptance criteria checklist.
11. Idempotency для денег/торговли.
12. Risk check для trading features.

---

## 10. Acceptance criteria для critical features (раздел 40 ТЗ)

См. соответствующие документы:
- Ledger — docs/ledger-model.md раздел 12.
- Withdrawals — docs/withdrawal-flow.md раздел 10.
- Bot — docs/risk-rules.md раздел 12.
- Fees — этот файл, раздел 2.5.
