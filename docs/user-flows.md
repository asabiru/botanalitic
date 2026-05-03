# User Flows

Покрытие: разделы 5, 6, 8, 9, 10, 11 ТЗ.

---

## 1. Client onboarding

```
Register (email + password + 2FA enable)
  -> Accept Terms / Risk Disclosure / Privacy Policy
  -> KYC submission (passport, selfie, address proof)
  -> Sanctions/PEP screening
  -> AML risk scoring
  -> Suitability questionnaire (для derivatives mode — раздел 55 ТЗ)
  -> Choose mode: Signal Only / Demo Trading / Managed Trading
  -> Choose risk profile (conservative / balanced / aggressive)
  -> Choose strategy (если Managed Trading)
  -> Account ready (state: active / pending_review / restricted)
```

## 2. Deposit USDT (раздел 8.2 ТЗ)

```
Client opens Deposit page
  -> Selects network (TRC20 или ERC20 — финал после DEC-002)
  -> System generates per-client deposit address (или memo/tag)
  -> Client sends USDT to address
  -> Blockchain watcher detects tx (status: detected)
  -> Wait N confirmations (status: confirming -> confirmed)
  -> AML screening on source of funds (status: aml_review)
  -> If pass: ledger entry CLIENT_AVAILABLE (status: credited)
  -> If fail: hold + manual review (status: frozen)
  -> Client sees balance update, notification
```

## 3. Start trading (Managed mode)

```
Client clicks Start Bot
  -> Pre-flight checks: KYC complete, suitability ok, risk profile set, no active freezes, no reconciliation errors
  -> Show final risk disclosure modal
  -> Client confirms
  -> Bot session created (state: active)
  -> Funds moved CLIENT_AVAILABLE -> CLIENT_TRADING (ledger entry MOVE_TO_TRADING)
  -> Bot starts evaluating signals + risk checks
  -> First trade only after risk engine approval
```

## 4. Stop Trading flow (раздел 10 ТЗ)

```
Client clicks Stop Trading
  -> System rejects new orders immediately
  -> Cancels unfilled orders
  -> Closes open positions (market) or graceful unwind
  -> Calculates realized PnL
  -> Accrues fees (performance / management / bot / exchange)
  -> Updates available balance
  -> Client moved to Paused or Withdrawal Mode
  -> Client sees: new trades stopped, positions closing/closed, balance updating
```

## 5. Withdrawal flow (раздел 9.2 ТЗ)

```
Client clicks Withdraw
  -> System shows available_to_withdraw (formula in ledger-model.md section 7)
  -> Client enters address + amount
  -> System: address format check, network check, allowlist check (раздел 50 ТЗ)
  -> If new address: cooling-off period (24h) until first withdrawal
  -> AML/security/risk screening
  -> Withdrawal request created (status: requested)
  -> Funds locked: CLIENT_AVAILABLE -> CLIENT_PENDING_WITHDRAWAL
  -> If amount <= small + low risk + auto-approval enabled: auto-approve
  -> Else: manual review (status: pending_review)
  -> If amount > dual_approval_threshold: dual approval required
  -> On approve: WithdrawalSendingWorkflow (Temporal)
    -> Signing service signs tx
    -> Tx broadcast
    -> Save tx_hash
    -> Wait N confirmations
    -> Final ledger entry WITHDRAWAL_SENT
  -> If failed: ledger entry WITHDRAWAL_FAILED -> funds returned to CLIENT_AVAILABLE
```

## 6. Signal subscription flow

```
Client subscribes to signal plan
  -> Pays subscription fee (USDT or card via Stripe — TBD)
  -> Gets feed access
  -> Sees: asset, direction, entry, SL, TP, risk level, confidence score, source, history
  -> Receives notifications (email / Telegram / push)
  -> No funds custody, no bot — client trades manually
```

## 7. Admin: approve withdrawal

```
Admin opens Withdrawals queue
  -> Filters: pending_review, high-risk, large amounts
  -> Opens specific withdrawal -> sees: client, amount, address, AML score, allowlist status, prior history
  -> Step-up 2FA required
  -> Approve / Reject / Escalate to compliance
  -> If reject: ledger entry WITHDRAWAL_CANCELLED + reason
  -> If approve: enters WithdrawalSendingWorkflow
  -> All actions in audit log
```

## 8. Admin: emergency stop all

```
Admin clicks Emergency Stop (раздел 16.2 ТЗ)
  -> Requires: 2FA + reason + dual approval (рекомендация Security Agent)
  -> All bot sessions stopped
  -> All open orders cancelled
  -> Trading paused platform-wide
  -> Withdrawals: optionally also paused (freeze matrix — раздел 54.3 ТЗ)
  -> Incident workflow triggered
  -> Notification to all clients (template)
  -> Postmortem task created
```

## 9. Compliance: review high-risk client

```
Compliance opens client profile
  -> Sees: KYC docs, AML score, sanctions hits, transaction history, risk events
  -> Adds compliance note
  -> Actions:
    - Mark as high-risk (escalates risk profile)
    - Block deposit
    - Block withdrawal
    - Freeze account (workflow: notify client, stop bot, lock balance)
    - Request additional KYC docs (KycReviewWorkflow)
    - Export compliance report
```

## 10. Support: client ticket

```
Support opens ticket
  -> Sees client profile, balance, recent deposits/withdrawals/trades
  -> NO access to private keys, API keys, signing service
  -> Categories (раздел 56.2 ТЗ): deposit issue / withdrawal issue / KYC / bot behavior / fee dispute / security / compliance / technical bug
  -> Internal notes (support / compliance / finance / fraud)
  -> Escalate to admin or compliance officer
  -> SLA tracked
```

## 11. Reconciliation (automated, daily)

```
ReconciliationWorkflow (Temporal, scheduled)
  -> Pull blockchain deposits (last 24h + buffer)
  -> Pull blockchain withdrawals
  -> Pull exchange balances + open positions + realized PnL
  -> Compare with ledger
  -> If mismatch: create reconciliation_error
    -> Notify admin
    -> If critical: freeze withdrawals + freeze new trades
  -> Save reconciliation_run report
  -> Status visible in admin dashboard
```

## 12. Daily equity snapshot (раздел 51 ТЗ)

```
Scheduled (00:00 UTC):
  -> For each client: snapshot equity, realized PnL, unrealized PnL, fees accrued, HWM
  -> Stored immutably
  -> Used for monthly statements (PDF/CSV)
  -> Visible in client cabinet as historical timeline
```
