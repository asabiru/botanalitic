# Ledger Model

> Критический документ. Любые изменения требуют Founder approval (раздел 38, 26.5 ТЗ).

Ссылки на ТЗ: разделы 7, 14, 40.1.

---

## 1. Главный принцип

Каждое движение средств клиента ОБЯЗАТЕЛЬНО имеет ledger entry. Баланс клиента нельзя менять напрямую без сопровождающей ledger entry.

Баланс клиента может быть:

1. рассчитан на лету из ledger entries (slow but auditable)
2. материализован как кэш (client_balances) с обязательной сверкой и invariants

Реализация: Option B (материализованный кэш), но любое изменение client_balances происходит через LedgerService.postEntries(...) транзакционно. Ежедневная reconciliation проверяет: для каждого клиента materialized_balance == sum(ledger_entries).

---

## 2. Double-entry правила

Каждая финансовая операция = транзакция, состоящая из 2+ ledger entries, у которых:

```
sum(debits) === sum(credits)   per asset, per transaction
```

Constraint enforced на уровне БД (DEFERRABLE CHECK) + transactional guard в коде.

Каждая ledger entry имеет direction: debit или credit.

Знаки балансов по типам счетов:

| Account type             | Normal balance | Increase by |
|--------------------------|---------------|-------------|
| Client Available Balance | credit        | credit      |
| Client Trading Balance   | credit        | credit      |
| Client Locked Margin     | credit        | credit      |
| Client Pending Withdrawal| credit        | credit      |
| Client Realized PnL      | credit (gain) / debit (loss) | depends |
| Client Unrealized PnL    | tracked separately, snapshot only |  |
| Platform Fee Revenue     | credit        | credit      |
| Exchange Fee Expense     | debit         | debit       |
| Funding Fee              | debit / credit | depends    |
| Adjustment Account       | debit / credit | manual only |
| Suspense Account         | debit / credit | must reconcile to 0 |

---

## 3. Типы ledger-счетов (раздел 7.3 ТЗ)

| Code | Name | Owner | Описание |
|------|------|-------|----------|
| CLIENT_AVAILABLE | Client Available Balance | per client | средства, доступные к выводу или к торговле |
| CLIENT_TRADING | Client Trading Balance | per client | средства, переведенные в trading pool, но не зажатые в маржу |
| CLIENT_LOCKED_MARGIN | Client Locked Margin | per client | маржа под открытыми позициями |
| CLIENT_PENDING_WITHDRAWAL | Client Pending Withdrawal | per client | вывод запрошен, ждет approval/sending |
| CLIENT_REALIZED_PNL | Client Realized PnL | per client | реализованный PnL (накопительный) |
| CLIENT_UNREALIZED_PNL | Client Unrealized PnL | per client | snapshot, не участвует в double-entry |
| PLATFORM_FEE_REVENUE | Platform Fee Revenue | platform | комиссии в пользу платформы |
| EXCHANGE_FEE_EXPENSE | Exchange Fee Expense | platform | комиссии биржи |
| FUNDING_FEE | Funding Fee | per client / platform | funding rate расходы/доходы |
| ADJUSTMENT | Adjustment | platform | ручные корректировки (требуют reason) |
| SUSPENSE | Suspense | platform | временный счет для незакрытых операций |

Важно: Client Unrealized PnL — это snapshot, не источник истины для available balance. Performance fee НЕ начисляется с unrealized PnL (раздел 14.2 ТЗ).

---

## 4. Поля ledger entry (раздел 7.4 ТЗ)

```
ledger_entries
  id                  UUID PK
  transaction_id      UUID FK -> ledger_transactions(id)
  client_id           UUID NULL  (NULL для platform-only счетов)
  ledger_account_id   UUID FK -> ledger_accounts(id)
  type                ENUM (см. раздел 5)
  amount              NUMERIC(38,18) NOT NULL CHECK (amount >= 0)
  asset               TEXT NOT NULL  (например USDT)
  direction           ENUM(debit, credit)
  reference_type      TEXT  (например deposit, withdrawal, order, fee_accrual)
  reference_id        UUID
  status              ENUM(pending, posted, reversed)
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
  created_by          TEXT  (system / user_id / workflow_id)
  metadata            JSONB
  audit_hash          TEXT  (hash of canonical entry payload + previous_hash)
  idempotency_key     TEXT UNIQUE  (gracefully retry-able)
  previous_entry_hash TEXT  (chain для tamper-evidence)
```

Constraints:

- UNIQUE (idempotency_key) — повторный post с тем же ключом возвращает существующую entry.
- CHECK (amount > 0) — суммы всегда положительные, направление задает direction.
- CHECK (status IN (pending, posted, reversed)).

---

## 5. Типы операций (раздел 7.2 ТЗ)

| type | Описание | Дебет | Кредит |
|------|----------|-------|--------|
| DEPOSIT_DETECTED | TX замечена в mempool | SUSPENSE | (нет, до credit) |
| DEPOSIT_CONFIRMED | TX подтверждена (N confirmations) | SUSPENSE | swap |
| DEPOSIT_CREDITED | Финальное зачисление клиенту | DEPOSIT_INFLOW | CLIENT_AVAILABLE |
| MOVE_TO_TRADING | Перевод из available в trading | CLIENT_AVAILABLE | CLIENT_TRADING |
| LOCK_MARGIN | Открытие позиции — резервируем маржу | CLIENT_TRADING | CLIENT_LOCKED_MARGIN |
| UNLOCK_MARGIN | Закрытие позиции | CLIENT_LOCKED_MARGIN | CLIENT_TRADING |
| REALIZED_PNL_GAIN | Прибыль по сделке | TRADING_GAIN | CLIENT_TRADING + CLIENT_REALIZED_PNL |
| REALIZED_PNL_LOSS | Убыток по сделке | CLIENT_TRADING + CLIENT_REALIZED_PNL | TRADING_LOSS |
| FUNDING_FEE_PAID | Funding rate (клиент платит) | CLIENT_TRADING | FUNDING_FEE |
| FUNDING_FEE_RECEIVED | Funding rate (клиент получает) | FUNDING_FEE | CLIENT_TRADING |
| EXCHANGE_FEE | Комиссия биржи | CLIENT_TRADING | EXCHANGE_FEE_EXPENSE |
| PERFORMANCE_FEE | Performance fee | CLIENT_TRADING | PLATFORM_FEE_REVENUE |
| MANAGEMENT_FEE | Management fee | CLIENT_AVAILABLE / CLIENT_TRADING | PLATFORM_FEE_REVENUE |
| BOT_FEE | Bot fee | CLIENT_AVAILABLE | PLATFORM_FEE_REVENUE |
| WITHDRAWAL_REQUEST | Запрос на вывод (lock funds) | CLIENT_AVAILABLE | CLIENT_PENDING_WITHDRAWAL |
| WITHDRAWAL_APPROVED | Approval (status-event) | (нет) | (нет) |
| WITHDRAWAL_SENT | Tx отправлена | CLIENT_PENDING_WITHDRAWAL | WITHDRAWAL_OUTFLOW |
| WITHDRAWAL_CANCELLED | Отмена | CLIENT_PENDING_WITHDRAWAL | CLIENT_AVAILABLE |
| WITHDRAWAL_FAILED | Tx failed — возврат | CLIENT_PENDING_WITHDRAWAL | CLIENT_AVAILABLE |
| MANUAL_ADJUSTMENT_DEBIT | Корректировка вниз | CLIENT_AVAILABLE | ADJUSTMENT |
| MANUAL_ADJUSTMENT_CREDIT | Корректировка вверх | ADJUSTMENT | CLIENT_AVAILABLE |
| FREEZE_FUNDS | Заморозка | CLIENT_AVAILABLE | CLIENT_FROZEN |
| UNFREEZE_FUNDS | Разморозка | CLIENT_FROZEN | CLIENT_AVAILABLE |
| RECONCILIATION_CORRECTION | Сверочная корректировка | depends | depends |

---

## 6. Идемпотентность

Каждая операция строит idempotency_key детерминированно:

- deposit:{tx_hash}:{vout_index}
- withdrawal:request:{withdrawal_id}
- withdrawal:sent:{withdrawal_id}:{tx_hash}
- order:{exchange}:{client_order_id}:{event_type}
- fee:{type}:{period}:{client_id}
- funding:{exchange}:{position_id}:{interval_start}

Повтор с тем же ключом — no-op (идемпотент).

---

## 7. Available balance (раздел 9.1 ТЗ)

```
available_to_withdraw =
  client_total_equity
  - locked_margin
  - pending_fees
  - pending_withdrawals
  - unresolved_reconciliation_amount
  - aml_hold_amount
```

Computed on-the-fly из ledger:

```
SELECT
  SUM(signed_amount) FILTER (WHERE account = CLIENT_AVAILABLE)
  - SUM(signed_amount) FILTER (WHERE account = CLIENT_PENDING_WITHDRAWAL)
  - SUM(signed_amount) FILTER (WHERE account = AML_HOLD)
  AS available
FROM ledger_entries WHERE client_id = :id AND status = posted
```

---

## 8. High-water mark (раздел 14.3 ТЗ)

Для performance fee:

```
hwm[client_id] = max(hwm[client_id], current_realized_equity_after_fees)
performance_fee = max(0, current_realized_equity - hwm) * fee_rate
```

Performance fee начисляется только при превышении HWM. Reset HWM невозможен без Founder approval.

Хранится в high_water_marks с полной историей изменений (append-only).

---

## 9. Invariants (проверяются daily reconciliation)

1. SUM(debits) = SUM(credits) per (asset, day, transaction).
2. Для каждого клиента: materialized_balance == ledger_computed_balance.
3. Сумма всех CLIENT_AVAILABLE + CLIENT_TRADING + CLIENT_LOCKED_MARGIN + CLIENT_PENDING_WITHDRAWAL <= treasury_total + exchange_balance + buffer.
4. Suspense account — ноль через 24 часа.
5. audit_hash chain не разрывается.

При нарушении — reconciliation_error создается, withdrawals блокируются (раздел 18.2 ТЗ).

---

## 10. Audit hash chain

Каждый entry содержит audit_hash:

```
audit_hash = sha256(canonical_json(entry_payload) + previous_entry_hash_for_account)
```

previous_entry_hash_for_account — последний audit_hash в том же ledger_account_id. Tamper-evident: любое изменение прошлой записи разрывает цепь.

---

## 11. Запрещенные операции

- Прямой UPDATE client_balances.
- Прямой UPDATE ledger_entries (только INSERT; reverse через новую entry).
- DELETE из ledger_entries — запрещено навсегда.
- Любой transfer без idempotency_key.
- Performance fee с unrealized PnL.

Semgrep правила в .github/workflows/semgrep.yml ловят такие нарушения статически.

---

## 12. Tests (Definition of Done для ledger)

- Double-entry invariant property test (debits = credits на каждой операции).
- Idempotency replay test (повтор события не двоит баланс).
- Concurrent withdrawal test (race condition не дает выйти больше available).
- HWM regression test (после drawdown fee не берется до восстановления).
- Reconciliation test (искусственное расхождение — reconciliation_error).
- Audit chain test (изменение записи — integrity check fails).

См. docs/test-plan.md.

---

## 13. Открытые вопросы для Founder

- DEC-006: выбор движка (см. ADR-001).
- Фиксация performance fee % и management fee % (DEC-007) — нужны для тестов и UI.
- Решение: HWM сбрасывается ли после крупного withdrawal клиентом?
