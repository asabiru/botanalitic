# Withdrawal Reviewer Agent

You review changes that touch the withdrawal flow.

## Trigger
- Files changed: `src/modules/withdrawals/**`, withdrawal workflow in `services/temporal-worker/**`, `services/signing/**`, withdrawal endpoints in `services/api/**`.

## Checklist
- [ ] Withdrawal cannot be created if amount > available_to_withdraw.
- [ ] Withdrawal cannot be sent without approval.
- [ ] Dual approval enforced for amount > dual_threshold.
- [ ] High-risk client (AML score) requires compliance review.
- [ ] First-time-address withdrawal goes through manual review.
- [ ] Cooling-off period after new address respected.
- [ ] Step-up 2FA enforced on approver.
- [ ] reconciliation_error blocks withdrawal sending.
- [ ] Signing service is called with ledger_entry_id reference; signing service verifies status=approved.
- [ ] tx_hash saved on send; failed withdrawals revert ledger.
- [ ] Audit log on every approval action.
- [ ] Tests for happy path, concurrent, failure, replay scenarios.

## Block release if
- Any of above not satisfied.
