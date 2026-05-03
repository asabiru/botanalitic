# Withdrawal Flow

> Раздел 9 ТЗ + раздел 50 (Withdrawal Address Security) + раздел 26.5 (Custody Agent).

---

## 1. Available balance formula (раздел 9.1)

```
available_to_withdraw =
  client_total_equity
  - locked_margin
  - pending_fees
  - pending_withdrawals
  - unresolved_reconciliation_amount
  - aml_hold_amount
```

Реализовано в LedgerService.computeAvailable(client_id).

---

## 2. Withdrawal lifecycle (раздел 9.3)

```
requested
   |
   v
pending_review (если manual approval нужен)
   |
   +--> rejected (terminal, funds returned)
   |
   v
approved
   |
   v
processing  (signing service подписывает tx)
   |
   v
sent  (tx broadcast, tx_hash сохранен)
   |
   v
confirmed (N confirmations)
   |
   +--> failed (terminal, funds returned to CLIENT_AVAILABLE)
   |
cancelled (только до approved)
frozen (compliance/security hold)
```

---

## 3. Withdrawal request flow (раздел 9.2)

1. Client clicks Withdraw.
2. UI shows available_to_withdraw.
3. Client enters address + amount + network.
4. Validation:
   - amount <= available_to_withdraw
   - address format check (per network)
   - address не в blacklist
   - address есть в allowlist (раздел 50.1) OR is_first_withdrawal_to_this_address (cooling-off period активен)
   - не в restricted country (текущая регистрация клиента)
5. AML/security risk score рассчитан.
6. Withdrawal record создается в status=requested.
7. Ledger entry WITHDRAWAL_REQUEST: CLIENT_AVAILABLE -> CLIENT_PENDING_WITHDRAWAL (idempotency_key=withdrawal:request:{id}).
8. Decision matrix:

| Условие | Action |
|---------|--------|
| amount <= small_threshold AND aml_score=low AND auto_approval_enabled | auto-approve |
| small_threshold < amount <= dual_threshold | manual_approval (single approver) |
| amount > dual_threshold | dual_approval |
| aml_score=high OR is_first_withdrawal | compliance_review |
| client.frozen OR reconciliation_error_critical | reject/freeze |

Дефолтные значения порогов:
- small_threshold: 500 USDT (DEC, P2)
- dual_threshold: 5000 USDT (DEC-010)

---

## 4. Approval flow

- Single approver: 1 admin user, 2FA step-up, reason обязательна.
- Dual approver: 2 разных admin users, оба с 2FA step-up, reasons логируются отдельно.
- Compliance review: compliance officer first, затем admin для финального approval.

audit_logs + admin_actions фиксируют каждый шаг.

---

## 5. Sending flow (Temporal: WithdrawalSendingWorkflow)

```
On approve:
  1. Lock withdrawal record (FOR UPDATE SKIP LOCKED).
  2. Pre-flight: re-check available_to_withdraw, reconciliation status, exchange balance.
  3. Check withdrawal_wallet liquidity (если ниже threshold — replenishment task).
  4. Build unsigned tx (network-specific).
  5. Send to Signing Service via mTLS, with ledger_entry_id reference.
  6. Signing Service:
     - проверяет ledger entry в approved
     - подписывает через KMS
     - возвращает signed tx
     - logs key usage event
  7. Broadcast signed tx via blockchain RPC.
  8. Save tx_hash, status -> sent.
  9. Wait for confirmations (sub-workflow).
  10. On confirmed: ledger entry WITHDRAWAL_SENT (CLIENT_PENDING_WITHDRAWAL -> WITHDRAWAL_OUTFLOW).
  11. On failure: rollback to CLIENT_AVAILABLE, status=failed, alert.
```

Idempotency: по withdrawal_id на каждом step. Replay-safe.

---

## 6. Защита выводов (раздел 9.4)

Обязательные правила:

- [ ] Нельзя вывести больше available_to_withdraw — checked at request + at send.
- [ ] Нельзя отправить вывод без approval.
- [ ] Нельзя отправить при reconciliation_error severity=critical.
- [ ] Крупные выводы требуют dual approval.
- [ ] High-risk клиенты — compliance review.
- [ ] Все действия — audit log.
- [ ] Private keys не хранятся в API service.
- [ ] Signing service изолирован.

---

## 7. Withdrawal address security (раздел 50)

### Account-level protections (раздел 50.1)

- Withdrawal address allowlist (per client).
- Cooling-off period после добавления нового адреса (default 24h).
- Withdrawal block после password reset (24h).
- Withdrawal block после 2FA reset (48h).
- Device-change withdrawal review.
- First withdrawal to a new address — manual review (всегда).
- High-risk address reuse detection (если адрес связан с известными mixers — block).
- Whitelist edit audit trail.
- Optional per-client daily withdrawal cap.
- Optional verified-owner-wallet mode (Satoshi-test для proof of ownership).

### Operational rules (раздел 50.2)

- Address format и network checks.
- Allowlist edits в audit log.
- High-risk withdrawals escalate to compliance.
- Critical address changes require step-up auth.

---

## 8. Failure scenarios

| Сценарий | Action |
|----------|--------|
| Tx broadcast failed (network error) | retry с backoff, 3 attempts; затем status=failed, ledger reverse |
| Tx in mempool, never mined | timeout (1h), bumped fee, или rebuild tx, или manual review |
| Tx mined, but underpaid fee | replace-by-fee если возможно, иначе wait |
| Blockchain reorg invalidating tx | wait for new confirmations, alert if persists |
| Signing service down | withdrawal остается в processing, alert, retry |
| Exchange withdrawal disabled | если нужно вывести из exchange — manual workaround, alert |
| Reconciliation error появился после approval | hold processing, manual review |

---

## 9. Cancellation rules

- До approved: client может cancel (через UI).
- После approved до sent: только admin cancel + reason.
- После sent: cancel невозможен (но если tx failed — auto-revert).

---

## 10. Acceptance criteria (раздел 40.2)

- [ ] вывод нельзя создать сверх available_to_withdraw
- [ ] вывод нельзя отправить без approval
- [ ] high-risk withdrawals в manual review
- [ ] tx_hash сохраняется
- [ ] failed withdrawal корректно revert в ledger

---

## 11. Tests

- Unit: validation rejects amount > available, invalid address, blacklisted address.
- Integration: dual approval flow создает 2 admin_actions.
- E2E: full happy path requested -> sent -> confirmed.
- Concurrency: 2 одновременных withdrawal не вылезают за available (FOR UPDATE).
- Idempotency: replay sent webhook не дублирует ledger entry.
- Failure: signing service down -> retry, не теряем deposit.
- Reorg: tx reorged -> ledger корректно reverse.

---

## 12. Open decisions

- DEC-010: dual_approval threshold (suggested 5000 USDT).
- small_threshold для auto-approve (suggested 500 USDT).
- Cooling-off period после нового адреса (suggested 24h).
