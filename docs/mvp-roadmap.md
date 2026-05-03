# MVP Roadmap

> Раздел 24 + 47 + 48 ТЗ.

---

## Главное правило (раздел 48)

Не начинать с бота, который сразу торгует деньгами клиентов. Начинаем с:

1. Ledger.
2. Custody.
3. Withdrawals.
4. Reconciliation.
5. Risk Engine.
6. Audit Log.
7. Compliance.
8. Только потом — реальная торговля.

---

## MVP 0 — Product & Compliance Design (текущая стадия)

**Цель:** все спецификации, юридические рамки, архитектура зафиксированы до написания production-кода.

### Acceptance:

- [x] Финальное ТЗ
- [x] Роли пользователей (user-flows.md)
- [x] User flows (user-flows.md)
- [x] Architecture diagram (architecture.md)
- [x] Database draft (database-design.md)
- [x] Ledger model (ledger-model.md)
- [x] Risk rules (risk-rules.md)
- [x] Withdrawal flow (withdrawal-flow.md)
- [x] Compliance checklist (compliance-checklist.md)
- [x] Risk disclosure requirements (risk-disclosure-requirements.md)
- [x] ADR-001..010
- [x] Decision board с pending DECs
- [ ] Founder решения по DEC-001..DEC-010
- [ ] Юридическая консультация (заказана)

---

## MVP 1 — Custody Simulation

**Без реальных денег.** Цель: убедиться, что архитектура работает на fake данных.

### Функции:

- Регистрация (email + 2FA).
- Клиентский кабинет.
- Demo balance (fake USDT).
- Fake deposits (через admin tool).
- Ledger entries для всех операций.
- Fake withdrawals (через approval flow).
- Audit log на каждое действие.
- Admin panel: clients, ledger viewer, withdrawal queue.

### Acceptance:

- Ledger invariants проходят (debits = credits на каждой операции).
- Audit log содержит каждое финансовое движение.
- Withdrawal flow работает с manual approval.
- Tests: unit + integration для ledger и withdrawals.
- E2E: register -> fake deposit -> fake trade -> fake withdraw.

### Технологии (после DECs):

- Backend (DEC-004), DB (DEC-005), monorepo (DEC-009).
- Postgres + Redis + Temporal local.
- Prisma migrations.

---

## MVP 2 — Real Deposits + Ledger

**С реальными USDT, но БЕЗ автоторговли.**

### Функции:

- Per-client deposit address generation.
- Blockchain watcher (после DEC-002 для сети).
- Confirmations tracking.
- AML-ready status (sanctions check минимум).
- Ledger credit on confirmed.
- Withdrawal request с manual approval.
- Tx hash сохраняется.
- Reconciliation daily job.
- Treasury wallet structure (раздел 49).
- Signing service изолирован (ADR-008).
- KMS keys, hot/cold wallet separation.

### Acceptance:

- Real testnet деньги полным циклом deposit -> ledger -> withdrawal -> chain.
- Reconciliation проходит daily without errors.
- Signing service работает только при approved withdrawals.
- Audit log + reconciliation report экспортируются.
- Penetration test на signing flow.

---

## MVP 3 — Paper Trading Bot

**Без риска клиентских средств.** Цель: валидировать стратегии и risk engine.

### Функции:

- Signal sources: TradingView webhook, manual analyst input (минимум).
- Raw signal storage.
- Parsed signal с scoring (раздел 13).
- Strategy engine (signal-following baseline).
- Paper positions (mock biржа или CCXT sandbox).
- Risk engine с pre-trade checks.
- Paper PnL computation.
- Stop-bot conditions.
- Strategy metrics dashboard.

### Acceptance:

- Bot работает stable 7 дней на paper.
- Pre-trade checks rejects невалидные ордера (см. risk-rules.md).
- Stop-bot triggers при искусственном drawdown.
- Strategy metrics публикуются.

---

## MVP 4 — Limited Auto Trading

**С малыми лимитами и ручным контролем.**

### Функции:

- Exchange integration (после DEC-003).
- Real orders на small amount cap.
- Strict risk limits (override admin не допускается без 2FA + reason).
- Emergency stop UI и workflow.
- Admin monitoring dashboard.
- Client Stop Trading button работает за <5 секунд.
- Reports (PDF/CSV monthly statement).
- Daily equity snapshots (раздел 51).
- High-water mark в production.

### Acceptance:

- Live trading на subset of clients (alpha cohort).
- Не более X USDT total exposure (config-driven).
- Reconciliation passes.
- No critical incidents за 14 дней.
- Real performance fee начислена и собрана с HWM.
- Penetration test пройден.
- Independent code review.

---

## MVP 5 — Production Managed Trading

**После юридической проверки.**

### Функции:

- Full KYC/AML (Chainalysis или TRM Labs).
- Automated withdrawals с controls (allowlist, cooling-off, dual approval).
- Multiple strategies (signal-following + breakout + funding-aware минимум).
- Multiple exchanges (если нужно для риск-распределения).
- Fee automation (performance + management + bot).
- High-water mark per client.
- Proof / reconciliation reports для клиентов.
- Suitability re-acknowledgement workflow.
- Incident response runbook validated.

### Acceptance:

- Юридическое заключение получено.
- Beta period (30+ дней) пройден без critical incidents.
- External security audit пройден.
- All release gates (раздел 57) выполнены.
- Founder sign-off на live rollout.

---

## Транзитивные acceptance criteria (применяются ко всем MVP)

- Все money/trading workflows идемпотентны.
- Все critical actions в audit_logs.
- Tests для ledger / risk / withdrawal / bot обязательны.
- Security scanners (Semgrep, Gitleaks, Trivy, CodeQL) в CI зеленые.
- No hardcoded secrets.
- No "guaranteed profit" wording (Semgrep static check).
- Decision board updated при каждом критическом изменении.

---

## Текущий статус по MVP

```
MVP 0 [██████████░░] ~85%   awaiting DEC-001..010
MVP 1 [░░░░░░░░░░░░] 0%
MVP 2 [░░░░░░░░░░░░] 0%
MVP 3 [░░░░░░░░░░░░] 0%
MVP 4 [░░░░░░░░░░░░] 0%
MVP 5 [░░░░░░░░░░░░] 0%
```

---

## Рекомендованная команда / нагрузка

Грубо:

- MVP 0: 1 architect + product owner. ~2 недели.
- MVP 1: 1 backend + 1 frontend + product. ~4 недели.
- MVP 2: + DevOps + Security review. ~6-8 недель.
- MVP 3: + 1 trading engineer + risk specialist. ~8 недель.
- MVP 4: full team + compliance officer + external audit. ~10-12 недель.
- MVP 5: full team + legal + external audit + insurance. ~8 недель.

Итого до production: ~9-12 месяцев минимум при хорошем темпе.

---

## Бюджетные категории

- Hosting (PG, Redis, Temporal cluster, app servers).
- Monitoring (Grafana Cloud / Sentry / PagerDuty).
- KMS (AWS KMS / Vault).
- Blockchain RPC (TronGrid / Alchemy / dedicated node).
- AML provider (Chainalysis: $30k–$100k+/year на production).
- KYC provider (Sumsub / Onfido: $1–$5 per check).
- Legal (legal opinion: $20k–$80k; ongoing counsel).
- External security audit ($30k–$80k).
- Insurance (custody insurance — опционально).
- Bug bounty program.

---

## Связанные документы

- decision-board.md — pending DECs.
- known-risks-register.md — реестр рисков.
- release-gates.md — формальные ворота для production.
