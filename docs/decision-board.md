# Decision Board

Все предложения агентов и решения Founder фиксируются здесь. Формат — раздел 30 ТЗ.

Шаблон записи (раздел 29 ТЗ):

```text
DEC-XXX
Proposal ID:
Agent:
Area:
Problem:
Proposed change:
Why it matters:
Impact:
Risk:
Effort:
Priority:
Requires founder approval: yes/no
Recommendation:
Status: Pending / Approved / Rejected / Deferred
Decision:
Decided by:
Decided at:
```

---

## Pending Decisions

### DEC-001 — Юрисдикция компании

- **Agent:** Compliance Requirements Agent
- **Area:** Compliance / Legal
- **Problem:** От юрисдикции зависит весь compliance/legal слой: лицензирование (VASP/CASP), KYC/AML требования, restricted countries, договоры с клиентами, налоги.
- **Options:** UAE (VARA), Lithuania (CASP под MiCA), BVI, Cayman, Seychelles, Switzerland, Singapore, El Salvador.
- **Impact:** Critical — определяет требования к лицензии и стоимость compliance.
- **Priority:** P0
- **Requires founder approval:** yes
- **Status:** Pending

### DEC-002 — Сеть USDT для MVP

- **Agent:** Custody & Ledger Agent
- **Area:** Custody / Deposits
- **Problem:** Раздел 8.1 ТЗ требует выбрать одну сеть для MVP, чтобы не усложнять учет, AML и поддержку.
- **Options:** TRC20 (низкие комиссии, доминирует в крипте СНГ/Азии), ERC20 (выше комиссии, но шире покрытие AML-провайдерами и institutional clients).
- **Impact:** High — влияет на blockchain watcher, AML provider, treasury wallets, fee policy.
- **Priority:** P0
- **Requires founder approval:** yes
- **Status:** Pending

### DEC-003 — Биржа для MVP

- **Agent:** Trading Bot Agent + Counterparty Risk Agent
- **Area:** Trading / Counterparty
- **Options:** Binance Futures, Bybit, OKX, Bitget, Deribit. Возможно начать с testnet+paper, прежде чем выбирать live.
- **Impact:** High — влияет на CCXT vs native SDK, KYC требования биржи к корпоративному аккаунту, ликвидность, риск контрагента.
- **Priority:** P0 (для MVP 4)
- **Requires founder approval:** yes
- **Status:** Pending

### DEC-004 — Backend framework

- **Agent:** System Architect Agent
- **Options:** NestJS (раздел 22.2 ТЗ — модульность, DI, mature ecosystem) vs Fastify (легче, быстрее, меньше boilerplate).
- **Recommendation:** NestJS — лучше подходит для офисной модели с сильно разделёнными модулями (ledger, risk, custody, trading), DI помогает изолировать тестирование критичных модулей.
- **Impact:** Medium
- **Priority:** P1
- **Requires founder approval:** yes
- **Status:** Pending

### DEC-005 — ORM

- **Agent:** Database Architect Agent
- **Options:** Prisma (developer experience, миграции, type-safety) vs Drizzle (ближе к SQL, лучше для сложных запросов и performance).
- **Recommendation:** Prisma для MVP 0–3, рассмотреть переезд на Drizzle для performance-critical модулей (ledger queries, reconciliation), если упремся в Prisma performance.
- **Impact:** Medium
- **Priority:** P1
- **Requires founder approval:** yes
- **Status:** Pending

### DEC-006 — Ledger engine

- **Agent:** Tooling Research Agent
- **Options:** Summa Ledger / Ledgito Core / Midaz / собственный ledger на PostgreSQL с double-entry constraints.
- **Reference:** Требуется ADR-001 (раздел 23.3 ТЗ).
- **Impact:** Critical — самый важный модуль системы.
- **Priority:** P0
- **Requires founder approval:** yes
- **Status:** Pending → см. `docs/adr/001-ledger-engine-choice.md`

### DEC-007 — Performance fee % и management fee %

- **Agent:** Product Architect Agent
- **Problem:** Нужны конкретные числа для high-water mark логики и UI прозрачности.
- **Industry benchmarks:** Performance fee 15–25% от realized profit с HWM. Management fee 0–2% годовых.
- **Impact:** High — влияет на бизнес-модель, UX, fee scheduler.
- **Priority:** P0
- **Requires founder approval:** yes
- **Status:** Pending

### DEC-008 — Restricted countries (стартовый список)

- **Agent:** Compliance Requirements Agent
- **Baseline:** US, UK, Canada (если нет лицензии), все санкционные страны (Iran, North Korea, Syria, Cuba, Russia/Belarus в зависимости от юрисдикции), Mainland China, FATF high-risk jurisdictions.
- **Impact:** Critical
- **Priority:** P0
- **Requires founder approval:** yes
- **Status:** Pending

### DEC-009 — Workspace style

- **Agent:** DevOps Agent
- **Options:** monorepo с pnpm + Turborepo (раздел 22 ТЗ предполагает много пакетов) vs polyrepo.
- **Recommendation:** monorepo (pnpm + Turborepo) — соответствует структуре раздела 41 ТЗ.
- **Impact:** Medium
- **Priority:** P1
- **Requires founder approval:** yes
- **Status:** Pending

### DEC-010 — Withdrawal threshold для dual approval

- **Agent:** Custody & Ledger Agent + Security Agent
- **Problem:** Раздел 9.4 ТЗ требует dual approval для крупных выводов, но не задает порог.
- **Suggestion:** 5,000 USDT (как в примере раздела 44 ТЗ), но финальное решение за Founder.
- **Impact:** High
- **Priority:** P1
- **Requires founder approval:** yes
- **Status:** Pending

---

## Approved Decisions

_Пока пусто._

---

## Rejected Decisions

_Пока пусто._

---

## Deferred Decisions

_Пока пусто._
