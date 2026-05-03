# Agent Workflow

> Раздел 25–46 ТЗ.

---

## Главный принцип (раздел 25.1)

Ruflo / Claude Code используется как multi-agent команда разработки. Агенты работают как специалисты в офисе:

- каждый имеет роль (раздел 26)
- каждый имеет зону ответственности
- каждый предлагает улучшения
- каждый предупреждает о рисках
- каждый документирует изменения
- каждый передает критические решения Founder

Founder принимает финальные решения.

---

## Roles (раздел 26)

См. список ролей в разделе 26 ТЗ. Все агенты определены там; в этом репозитории мы создали Claude subagents для самых частых review tasks (см. .claude/agents).

| Agent | Файл | Trigger |
|-------|------|---------|
| Product Architect | tz §26.1 | product changes |
| Compliance Requirements | tz §26.2 | KYC/AML/legal copy |
| System Architect | tz §26.3 | architecture |
| Database Architect | tz §26.4 | schema/migrations |
| Custody & Ledger | tz §26.5 | money modules |
| Trading Bot | tz §26.6 | bot/strategy/execution |
| Risk Engine | tz §26.7 | risk rules |
| Signal Engine | tz §26.8 | signals |
| Frontend Client | tz §26.9 | apps/web/client |
| Frontend Admin | tz §26.10 | apps/web/admin |
| Security | tz §26.11 + .claude/agents/security-reviewer.md | secrets/auth/signing |
| QA / Test | tz §26.12 | tests |
| DevOps | tz §26.13 | infra/CI |
| Review | tz §26.14 + .claude/agents/* | release readiness |
| Tooling Research | tz §26.15 | dependency choices |
| Workflow | tz §26.16 | Temporal workflows |
| Documentation | tz §26.17 | docs |
| Treasury Operations | tz §26.18 | wallets/treasury |
| Counterparty Risk | tz §26.19 | exchange/provider risk |
| Incident Response | tz §26.20 | incidents |
| Customer Transparency | tz §26.21 | client-facing copy |
| Release Governance | tz §26.22 | release gates |
| Data Governance | tz §26.23 | retention/privacy |

---

## Founder approval matrix

См. README.md и раздел 38 ТЗ.

Агенты НЕ МОГУТ без Founder approval менять:

- комиссии
- клиентский баланс / ledger model
- withdrawal flow
- custody architecture
- risk limits
- trading strategy
- real-money trading behavior
- KYC/AML требования
- юридические тексты
- private key architecture
- production deployment
- emergency stop logic
- HWM logic
- fee model
- legal wording

Все остальное (тесты, документация, типизация, error handling, UI polish, refactoring без изменения бизнес-логики) — агенты могут самостоятельно.

---

## Operational rituals

### Daily
- Daily Agent Report (`docs/daily-agent-report.md`).
- Decision Board updates если новые предложения.

### Weekly
- Weekly Founder Brief (`docs/weekly-founder-brief.md`).
- Risk register review.

### On change
- Critical money/custody/trading change → RFC.
- Architecture decision → ADR.
- Production incident → postmortem.

### Per release
- Release checklist (docs/release-gates.md).

---

## Proposal format (раздел 29)

```
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
Priority: P0/P1/P2/P3
Requires founder approval: yes/no
Recommendation:
```

---

## RFC and ADR

См. docs/rfc/_template.md и docs/adr/_template.md.

---

## Github commands (.claude/commands)

- /rfc — create new RFC.
- /adr — create new ADR.
- /proposal — add to decision-board.
- /release-check — release readiness.
- /money-feature-check — money-impacting feature checklist.
- /incident-report — open incident.
- /founder-brief — generate weekly brief.

---

## What "office-grade" means (раздел 45)

Каждый агент должен задавать вопрос:

> What would make this product feel like a serious financial office, not a toy app?

И влиять на:
- прозрачность
- отчетность
- аудит
- риск-контроль
- админские процессы
- доверие клиента
- безопасность операций
- incident handling
- support readiness
- compliance readiness

---

## Forbidden tools (раздел 46)

Запрещено использовать:

- flash USDT tools
- fake deposit / balance / transaction tools
- volume bots / wash trading tools
- инструменты подделки tx hash
- любые схемы, где депозит засчитывается без реальной on-chain транзакции

Депозит признается только после: реальной on-chain транзакции, достаточного количества подтверждений, отсутствия критического AML/security flag, успешной ledger-записи.
