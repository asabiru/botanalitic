# Runbook: Withdrawal Wallet Replenishment

> Раздел 49 + 26.18 ТЗ.

---

## Trigger

- Alert: `withdrawal_wallet.balance < threshold`.
- Manual review: anticipated withdrawal demand exceeds capacity.

## Pre-conditions

- Authorized treasury operator.
- Founder approval if amount > daily outgoing limit.
- No open SEV-1/2 incidents.
- No pending reconciliation_errors critical.

## Procedure

1. Verify alert is real (check actual balance from chain RPC vs cached).
2. Compute replenishment amount: target = `expected_demand_24h * safety_factor`.
3. Open ticket: linked to runbook execution.
4. Two custodians required (dual control).
5. From treasury_wallet → withdrawal_wallet:
   - Custodian A initiates tx.
   - Custodian B reviews and co-signs.
   - Tx broadcast.
   - Wait N confirmations.
6. Update wallet inventory.
7. Verify balance reconciliation post-replenishment.
8. Close ticket; record in audit log.

## If treasury also low

- Escalate to Founder.
- Initiate cold_reserve → treasury sweep:
  - Offline procedure.
  - Two custodians.
  - Hardware-signed.
  - Chain broadcast от secure environment.
  - Wait extended confirmations.

## Post-actions

- Update monitoring dashboard.
- Check alert thresholds; adjust if frequent.
- If pattern indicates withdrawal demand spike — trigger Capacity Review.

## Failure modes

- Tx stuck — replace-by-fee.
- Network congestion — defer if not urgent.
- Cold reserve key issue — invoke key recovery procedure (separate runbook).
