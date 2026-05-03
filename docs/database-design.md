# Database Design

> Каркас по разделу 19 ТЗ. Финальная Prisma/Drizzle схема в prisma/schema.prisma после DEC-005.

Все money-related поля: NUMERIC(38, 18) для USDT (18 decimals headroom).
Все ID: UUID v7 (sortable + uniqueness).
Все timestamps: TIMESTAMPTZ.
Все таблицы — append-friendly (мягкое удаление через deleted_at где применимо).

---

## 1. Users and Clients (раздел 19.1)

### users
- id, email (unique), password_hash, mfa_secret_encrypted, role, status, last_login_at, created_at, updated_at
- Constraints: email regex, password meets policy

### roles, permissions
- RBAC. roles, permissions (many-to-many)
- Roles: client, admin, trader, compliance_officer, support, system

### clients
- id, user_id (FK unique), display_name, country, timezone, mode, risk_profile_id, created_at
- mode enum: signal_only / demo / managed / paused / withdrawal / frozen

### client_profiles
- client_id (PK FK), pii_encrypted (JSONB), source_of_funds, occupation, expected_volume

### client_risk_profiles
- id, client_id, name, max_risk_per_trade, max_leverage, max_daily_drawdown, max_weekly_drawdown, max_monthly_drawdown, max_open_positions, max_exposure_per_asset, max_exposure_per_strategy, max_total_margin_usage, blacklist_assets, allowed_strategies, created_at, version

### client_documents
- id, client_id, type, s3_url, hash, status, uploaded_at, reviewed_by, reviewed_at
- type: passport / selfie / proof_of_address / agreement / risk_disclosure

### client_sessions
- id, client_id, token_hash, ip, user_agent, created_at, expires_at, revoked_at

---

## 2. Compliance (раздел 19.2)

### kyc_profiles
- id, client_id, status, provider, provider_reference, decision_at, expires_at
- status: pending / approved / rejected / expired

### kyc_checks
- id, kyc_profile_id, type, result, evidence_url, created_at
- type: identity / address / liveness

### aml_checks
- id, client_id OR transaction_id, score, flags (JSONB), provider, raw_response, created_at

### sanction_checks
- id, client_id, hits (JSONB), source, checked_at
- source: OFAC / EU / UN

### compliance_notes
- id, client_id, author_user_id, body, severity, created_at

### restricted_countries
- code (PK), name, restriction, reason, updated_at
- restriction: full / partial

### risk_assessments
- id, client_id, level, factors (JSONB), assessed_by, assessed_at
- level: low / medium / high

---

## 3. Custody and Ledger (раздел 19.3)

### wallets
- id, kind, network, address, label, created_at
- kind: deposit_collection / treasury / withdrawal / fee / cold_reserve
- network: TRC20 / ERC20

### wallet_addresses
- id, wallet_id, address, derivation_index, label, active

### client_deposit_addresses
- id, client_id, network, address, memo, created_at, active

### deposits
- id, client_id, network, address, tx_hash (unique per network), amount, asset, confirmations, status, aml_score, raw_tx (JSONB), detected_at, credited_at
- status: created / pending / detected / confirming / aml_review / confirmed / credited / rejected / frozen / failed

### withdrawals
- id, client_id, network, to_address, amount, asset, fee_amount, status, tx_hash, requested_at, approved_at, sent_at, confirmed_at
- status: requested / pending_review / approved / rejected / processing / sent / confirmed / failed / cancelled / frozen

### withdrawal_approvals
- id, withdrawal_id, approver_user_id, decision, reason, mfa_verified, created_at
- decision: approve / reject
- Constraint: для withdrawal с amount > dual_threshold нужно >= 2 approvals от разных users

### withdrawal_address_allowlist
- id, client_id, address, network, label, added_at, cooling_off_until, active

### ledger_accounts
- id, code, name, kind, owner_type, client_id (NULL для platform), asset, balance_cached, balance_updated_at
- code examples: CLIENT_AVAILABLE, CLIENT_TRADING, ...

### ledger_entries
- См. ledger-model.md раздел 4
- Indexes: (client_id, created_at), (transaction_id), (idempotency_key UNIQUE), (reference_type, reference_id), (audit_hash)

### ledger_transactions
- id, type, reference_type, reference_id, created_at, created_by, metadata
- Constraint: SUM(debit) = SUM(credit) per asset (через trigger или application-level transaction)

### client_balances
- client_id (PK), asset (PK), available, trading, locked_margin, pending_withdrawal, frozen, total_equity (computed), updated_at
- Materialized cache, sync через ledger triggers/transactions

### custody_events
- id, client_id, type, payload, created_at

### reconciliation_runs
- id, scope, status, started_at, finished_at, mismatches_count, summary (JSONB)
- scope: deposits / withdrawals / balances / pnl / fees / full

### reconciliation_errors
- id, reconciliation_run_id, severity, entity_type, entity_id, expected, actual, diff, status, resolved_at
- severity: low / medium / high / critical
- status: open / resolved / accepted

---

## 4. Trading (раздел 19.4)

### exchanges
- id, name, kind, status, api_endpoint, sandbox_endpoint
- kind: perp_futures

### exchange_accounts
- id, exchange_id, label, kind, api_key_encrypted, api_secret_encrypted, passphrase_encrypted, status, max_exposure_cap
- kind: master / subaccount

### trading_pools
- id, exchange_account_id, total_balance_cached, available, locked, updated_at

### client_pool_allocations
- id, client_id, trading_pool_id, share_bps, updated_at

### strategies
- id, name, version, status, risk_level, allowed_assets, max_leverage, default_stop_loss, default_take_profit, description, params (JSONB)
- status: draft / paper / live / paused / retired

### strategy_versions
- id, strategy_id, version, params, created_by, created_at, backtest_metrics (JSONB), paper_metrics (JSONB), promoted_at

### bot_sessions
- id, client_id, strategy_id, strategy_version_id, exchange_account_id, status, started_at, stopped_at, last_heartbeat_at, kill_reason
- status: active / paused / stopped / errored

### signals_raw
- id, source, raw_text, url, author, asset_mentions, language, captured_at, metadata

### signals_parsed
- id, raw_signal_id, asset, direction, entry, stop_loss, take_profit, time_horizon, confidence, source_reliability, risk_score, duplicate_of, created_at
- direction: long / short

### trade_ideas
- id, signal_id, strategy_id, status, risk_eval (JSONB), created_at
- status: proposed / approved / rejected

### orders
- id, bot_session_id, exchange_account_id, client_order_id (UNIQUE per exchange), exchange_order_id, side, type, reduce_only, asset, qty, price, stop_price, status, submitted_at, filled_at, filled_qty, avg_fill_price, fee, fee_asset
- side: buy / sell
- type: market / limit / stop / stop_limit / take_profit
- status: new / partially_filled / filled / cancelled / rejected / expired

### trades
- id, order_id, bot_session_id, exchange_account_id, asset, side, qty, price, fee, fee_asset, executed_at, exchange_trade_id

### positions
- id, bot_session_id, exchange_account_id, asset, side, qty, entry_price, mark_price, liquidation_price, leverage, margin, unrealized_pnl, realized_pnl, opened_at, closed_at, status
- status: open / closed

### risk_events
- id, client_id, bot_session_id, type, severity, payload, created_at
- type: drawdown_warning / drawdown_stop / liquidation_risk / leverage_breach / strategy_anomaly / kill_switch

### execution_errors
- id, order_id, type, message, raw_response, created_at, retry_count

---

## 5. Fees and Billing (раздел 19.5)

### fee_schedules
- id, name, type, rate_bps, fixed_amount, currency, period, effective_from, effective_to
- type: performance / management / bot / withdrawal / subscription / setup
- period: one_time / daily / weekly / monthly / per_event

### fee_accruals
- id, client_id, fee_schedule_id, period_start, period_end, amount, status, ledger_entry_id
- status: pending / posted / waived

### fee_charges
- id, fee_accrual_id, ledger_entry_id, charged_at

### high_water_marks
- id, client_id, value, set_at, ledger_anchor_entry_id, reason
- append-only, no UPDATE, no DELETE

### subscriptions
- id, client_id, plan_id, status, current_period_start, current_period_end, billing_provider, billing_reference
- status: active / cancelled / past_due / trial

### invoices
- id, client_id, subscription_id, amount, currency, status, due_at, paid_at
- status: open / paid / void / failed

### payments
- id, invoice_id, amount, currency, method, provider_reference, status, created_at

---

## 6. Audit and Reports (раздел 19.6)

### audit_logs
- id, actor_user_id, actor_role, action, entity_type, entity_id, before (JSONB), after (JSONB), reason, ip, user_agent, correlation_id, created_at
- append-only, retention per data-retention-policy

### admin_actions
- id, admin_user_id, action_type, target_id, dual_approver_id, mfa_verified, reason, created_at
- action_type: approve_withdrawal / reject_withdrawal / freeze_account / emergency_stop / manual_adjustment / change_risk_limit / change_fee_settings

### client_reports
- id, client_id, type, period, format, s3_url, generated_at
- type: monthly_statement / annual_summary / tax_report
- format: pdf / csv

### system_events
- id, type, severity, payload, source, created_at

### notifications
- id, client_id, channel, template, payload, status, sent_at, delivered_at
- channel: email / push / telegram / sms

### support_tickets
- id, client_id, category, severity, status, created_at, last_updated_at, sla_due_at, assignee_user_id
- category: deposit / withdrawal / kyc / bot / fee / security / compliance / technical

### support_ticket_messages
- id, ticket_id, author_user_id, kind, body, attachments (JSONB), created_at
- kind: client / support / compliance / finance / fraud / system

---

## 7. Indexes (priority)

- ledger_entries: (client_id, created_at), (transaction_id), (idempotency_key UNIQUE), (reference_type, reference_id)
- deposits: (client_id, status), (tx_hash UNIQUE per network)
- withdrawals: (client_id, status), (status, requested_at)
- orders: (bot_session_id, status), (client_order_id UNIQUE per exchange_account_id)
- audit_logs: (entity_type, entity_id, created_at), (actor_user_id, created_at)
- bot_sessions: (client_id, status), (status, last_heartbeat_at)

---

## 8. Constraints

- ledger_entries: CHECK (amount > 0)
- withdrawals: CHECK (amount > 0)
- positions: CHECK (qty >= 0)
- client_balances: CHECK (available >= 0)
- restricted: CHECK при попытке UPDATE client_balances вне ledger transaction (через trigger или строгое разделение прав)

---

## 9. Migrations strategy

- Каждая миграция append-only (no breaking column drops без двойной миграции).
- Для money-tables (ledger, balances, withdrawals) никаких truncate/destructive ops в production.
- Migration review требует Database Architect Agent + Founder approval (раздел 26.4 ТЗ).
