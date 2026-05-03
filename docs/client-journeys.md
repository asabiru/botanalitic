# Client Journeys

> Раздел 26.1 ТЗ. Product Architect Agent.

---

## Journey 1: First-time deposit + start managed trading

1. Discovers via marketing / referral.
2. Lands on landing page → видит value prop + risk disclaimer.
3. Sign up: email + password + 2FA.
4. Onboarding flow:
   - Choose mode: Signal Only / Demo / Managed
   - Если Managed: KYC Tier 2 required.
5. KYC submission (10 minutes).
6. Wait approval (24-72h).
7. Email "KYC approved".
8. Login, see dashboard with empty balance.
9. Click Deposit → see deposit address (TRC20/ERC20).
10. Send USDT from external wallet.
11. Watch confirmations on UI.
12. Balance appears.
13. Click Start Bot.
14. Pre-flight: choose strategy, choose risk profile (conservative/balanced/aggressive).
15. Final risk modal: review limits, confirm.
16. Bot session active. Dashboard shows status.
17. First trade after signal + risk approval.
18. Daily statement appears.
19. Performance fee accrues при profit с HWM.

## Journey 2: Stop trading + withdraw

1. Click Stop Trading.
2. UI shows: "Closing positions, calculating fees..."
3. Wait для positions to close.
4. Available balance updates.
5. Click Withdraw.
6. Enter address (если новый — cooling-off warning, manual review).
7. Confirm withdrawal.
8. Status: requested → pending_review (если manual approval нужно).
9. Email "Withdrawal approved" / "Withdrawal sent".
10. tx_hash visible.
11. After confirmations: status confirmed.

## Journey 3: Drawdown stop event

1. Bot активен.
2. Market goes against position.
3. Drawdown approaches limit.
4. UI warning at 50% от limit.
5. At limit: bot stopped automatically.
6. Notification: "Bot paused due to drawdown limit. Please review and re-enable manually."
7. Client sees: realized PnL, current equity, what happened.
8. Options: reduce risk profile, change strategy, withdraw, re-start bot.

## Journey 4: Signal-only subscriber

1. Sign up.
2. KYC Tier 0 enough.
3. Subscribe to plan (USDT or card).
4. Receive signals via UI / email / Telegram.
5. Trade manually on own exchange.
6. View signal history + statistics.
7. Cancel subscription anytime.

## Journey 5: Account compromise suspicion

1. Client sees unusual login email.
2. Click "this wasn't me".
3. Account → frozen, all sessions revoked.
4. 2FA reset workflow начинается.
5. KYC re-verify.
6. Compliance review.
7. Withdrawals blocked 48 часов.
8. After verify — re-enabled.

## Journey 6: Strategy migration / promotion

1. New strategy version paper-tested.
2. Limited cohort включается (clients get notification + opt-in).
3. Performance monitored.
4. Broader rollout via opt-in.
5. Clients always see strategy version, can revert.

## Journey 7: AML hold

1. Client deposits USDT from suspicious source.
2. AML score = high.
3. Status: aml_review (held, не credited).
4. Client sees "Deposit under review".
5. Compliance reviews.
6. Outcome: credit / reject (return to sender) / freeze.
7. If reject: client gets explanation + option to provide source-of-funds documents.

## Journey 8: Tax / reporting

1. Year-end: client downloads annual statement (PDF/CSV).
2. CSV: per-trade PnL, fees, deposits, withdrawals.
3. Disclaimer: "Consult your tax advisor; we are not tax advisors."

---

## Trust-building elements (раздел 26.1, 26.21)

- "Where is my money?" page: live breakdown of available / trading / margin / pending.
- Daily reconciliation status visible.
- HWM displayed.
- Fee history transparent.
- Trade explainability: "This trade because of {signal} via {strategy}, risk-checked at {time}".
- Audit trail для клиента (свой statement export).

---

## Friction points to monitor

- KYC drop-off rate.
- First deposit conversion.
- Stop Trading frequency (signal of dissatisfaction).
- Withdrawal abandonment.
- Support ticket volume per category.

---

## Re-engagement / retention

- Re-acceptance после material strategy change.
- Newsletter / education content (раздел 3 ТЗ ограничения по wording).
- Performance reports.
- Loyalty / tier benefits (TBD).
