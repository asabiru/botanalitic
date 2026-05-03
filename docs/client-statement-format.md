# Client Statement Format

> Раздел 51 + 26.21 ТЗ. Customer Transparency Agent.

---

## 1. Monthly statement (PDF / CSV)

Включает:

### Header
- Client ID / display name (без PII details).
- Period (start / end UTC).
- Statement generation timestamp.
- Document hash (для tamper detection).

### Account summary
- Opening equity.
- Closing equity.
- Realized PnL за период.
- Unrealized PnL (на close period).
- Total fees paid.
- Net change.

### Transactions
- Deposits: date, amount, network, tx_hash.
- Withdrawals: date, amount, address, tx_hash, status.
- Trades: opened/closed, asset, side, qty, entry, exit, PnL, fees.
- Fee accruals: type, amount, period, ledger reference.

### Equity timeline
- Daily snapshot (date, equity, realized_pnl, unrealized_pnl, fees, hwm).

### Reconciliation status
- "All movements reconciled with blockchain and exchange as of <date>."
- Если есть открытые reconciliation_errors — disclosure.

### Disclaimers
- Статус не является советом по налогам.
- Trade результаты не гарантируют будущую доходность.

---

## 2. CSV format

```
type,date,amount,asset,description,reference_id,balance_after
deposit,2026-04-01T10:00:00Z,1000,USDT,Initial deposit,DEP-...,1000
trade_open,2026-04-02T11:00:00Z,-50,USDT,Margin lock BTC long,POS-...,950
trade_close,2026-04-02T15:00:00Z,55,USDT,Position closed +5,POS-...,1005
fee,2026-04-02T15:01:00Z,-1,USDT,Performance fee,FEE-...,1004
withdrawal,2026-04-15T09:00:00Z,-500,USDT,Withdrawal to T...xyz,WD-...,504
```

## 3. PDF layout

- Branded header.
- Summary block.
- Tables по разделам.
- Equity chart.
- Footer with disclaimers + signed manifest hash.

## 4. Generation

- Workflow: ReportGenerationWorkflow (BullMQ).
- Triggered: monthly schedule + on-demand by client.
- Stored in S3 with encryption.
- Available для скачивания в течение retention period (permanent для statements).

## 5. Localization

- RU / EN на старте.
- Переводимый template, identical data.

## 6. Where is my money? View

Мини-statement live в UI:

```
Total equity: 1234.56 USDT
  Available to withdraw: 1100.00
  In trading pool: 50.00
  Locked margin: 80.00
  Pending withdrawal: 0.00
  AML hold: 0.00
  Reconciliation reserve: 4.56
```

Linked в client-journeys "trust-building elements".

## 7. Trade explainability

Per-trade modal:

- Signal source: <Twitter @user / TradingView / Manual>
- Parsed: long BTC at 65000, SL 64500, TP 66500
- Strategy: signal-following v1.2
- Risk approval: passed (max_risk_per_trade=1%, current usage 0.7%)
- Position size: 0.01 BTC ($650 notional, 5x leverage)
- Execution: filled at 65010
- Outcome: closed +50 (TP hit) at 66500
- Fees: exchange 0.5, performance 10
- Net to client: 39.5
