# Treasury Operations

> Раздел 49 ТЗ + Treasury Operations Agent (раздел 26.18). Все политики требуют Founder approval (раздел 49.3).

---

## 1. Wallet topology

| Wallet | Назначение | Balance | Access |
|--------|-----------|---------|--------|
| deposit_collection | Адреса для приема депозитов от клиентов | низкий, sweep daily | watcher service |
| treasury | Operational casна | средний, dynamic | signing service |
| withdrawal | Hot wallet для выводов | низкий-средний, дневной запас | signing service |
| fee | Fee revenue, изолирован | средний, накопительный | signing service (sweep), payroll/expenses (manual) |
| cold_reserve | Holдодное хранение основной массы | большой | offline, dual-control manual |

Per-network: одна группа wallets per network (TRC20 / ERC20).

---

## 2. Sweep policy

- Deposit addresses sweep -> treasury, daily или при достижении threshold.
- Treasury sweep -> cold_reserve, при превышении X% от monthly_volume.
- Fee wallet sweep -> fee storage, monthly.
- Cold-to-hot replenishment: manual procedure, dual control, runbook.

---

## 3. Hot/cold ratio (рекомендация)

- Hot total (treasury + withdrawal + fee operational) ≤ 20% от total custody.
- Cold reserve ≥ 80%.
- Withdrawal wallet daily limit: ≤ 5% от total custody (hard cap).

Финальные значения — DEC от Founder.

---

## 4. Withdrawal liquidity planning

- Daily withdrawal estimate based on rolling average + buffer.
- Auto-alert если withdrawal_wallet < estimated demand.
- Replenishment workflow: cold -> treasury -> withdrawal (manual approval at each step).
- Time-to-withdraw SLA: 24h max for amounts <= dual_threshold; больше для крупных.

---

## 5. Wallet inventory

Все wallet'ы должны быть в registry:

```
wallets table
  id, kind, network, address, label, owner_team, derivation_path,
  signing_method (kms / hardware), backup_status, created_at
```

Inventory регулярно reconcile с reality (chain query) — раздел 18.

---

## 6. Per-network wallet policy

### TRC20 (если DEC-002 = TRC20)

- TRX баланс на withdrawal wallet >= X TRX (для энергии).
- Auto-stake TRX для энергии (опционально) или buy daily.

### ERC20 (если DEC-002 = ERC20)

- ETH баланс на withdrawal wallet >= X ETH (для gas).
- Gas price monitoring: pause withdrawals если gas > threshold (config).

---

## 7. Wallet ownership registry

- Owner team: Treasury Operations.
- Backup custodians: Founder + 1 trusted senior.
- Multi-sig consideration: для cold reserve обязательно (M-of-N), для hot — TBD.

---

## 8. Treasury controls (раздел 49.2)

- [ ] Hot wallet balance threshold defined.
- [ ] Automatic или manual sweep в cold wallet.
- [ ] Withdrawal wallet replenishment procedure documented.
- [ ] Emergency wallet freeze procedure documented.
- [ ] Wallet rotation policy (annually).
- [ ] Address labeling.
- [ ] Daily outgoing treasury limit.
- [ ] Manual treasury reconciliation checklist.

---

## 9. Founder approval required (раздел 49.3)

- Wallet segregation model.
- Treasury sweep policy.
- Cold storage policy.
- Outgoing liquidity limits.

---

## 10. Runbooks (TBD в docs/runbooks/)

- Wallet replenishment.
- Cold-to-hot transfer.
- Emergency wallet freeze.
- Lost key recovery (multi-sig).
- Network congestion / high-fee response.
- Reorg or stuck transaction.

---

## 11. Tests

- E2E test: full deposit -> sweep -> reconciliation -> withdrawal cycle.
- Chaos test: signing service down -> withdrawal queue не теряется.
- Reconciliation test: искусственно введенное расхождение -> alert + freeze.
