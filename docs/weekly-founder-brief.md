# Weekly Founder Brief

Формат — раздел 34 ТЗ.

---

## Week of 2026-04-27 → 2026-05-03

### Executive Summary

Запущена офисная структура проекта согласно ТЗ v1.5. Создан полный каркас репозитория (раздел 41 ТЗ), офисные документы (decision-board, daily report, founder brief, known risks), шаблоны RFC/ADR и Claude project layer. Стадия — **MVP 0 (Product & Compliance Design)**.

Главный блокер недели — необходимы 10 founder-решений (см. Decisions Needed) для перехода к MVP 1.

### Product Progress

- ✅ Финальное ТЗ v1.5 принято как источник истины.
- ✅ Заложена структура `apps/`, `services/`, `packages/`, `src/modules/`, `docs/`.
- ✅ Подготовлены документы MVP 0: product-spec, user-flows, mvp-roadmap, client-journeys.
- ✅ Закрыт legal-блок: compliance-checklist, kyc-aml-flow, risk-disclosure-requirements, restricted-countries-policy (как драфты — финал после DEC-001).

### Engineering Progress

- ✅ Service map и event flow в `docs/architecture.md`.
- ✅ Database draft (`docs/database-design.md`) — каркас по разделу 19 ТЗ.
- ✅ Ledger model (`docs/ledger-model.md`) — критический документ с double-entry инвариантами.
- ✅ Risk rules, withdrawal flow, treasury operations, security baseline.
- ✅ ADR-001..ADR-010 заведены с анализом опций.
- ⬜ Реальный код (services/, packages/) — начнём после MVP 0 closure.

### Risks

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Юрисдикция не выбрана — нельзя финализировать legal | Critical | DEC-001 на approval |
| Сеть USDT не выбрана — нельзя проектировать blockchain watcher и treasury | High | DEC-002 на approval |
| Ledger engine не выбран — высокий switching cost потом | High | ADR-001 готов, DEC-006 на approval |
| Биржа не выбрана — нельзя начинать exchange adapter работы | Medium | DEC-003 на approval; в MVP 1–3 биржа не нужна |
| Performance/management fee % не заданы — UI и fee scheduler в подвешенном состоянии | Medium | DEC-007 на approval |
| Без юридической консультации запускать прием USDT нельзя (раздел 3 ТЗ) | Critical | требуется заказать legal opinion параллельно с MVP 1–2 |

### Decisions Needed

См. `docs/decision-board.md`. Pending DEC-001..DEC-010:

1. Юрисдикция компании (P0).
2. Сеть USDT для MVP — TRC20 или ERC20 (P0).
3. Биржа для MVP (P0, нужно к MVP 4).
4. Backend framework — NestJS vs Fastify (P1).
5. ORM — Prisma vs Drizzle (P1).
6. Ledger engine — Summa / Ledgito / Midaz / собственный (P0).
7. Performance fee % и management fee % (P0).
8. Restricted countries — стартовый список (P0).
9. Workspace style — monorepo vs polyrepo (P1).
10. Withdrawal threshold для dual approval (P1).

### Agent Recommendations

- **System Architect Agent** рекомендует NestJS + Temporal с самого начала, даже если в MVP 0–1 Temporal не запускаем — закладываем интерфейсы.
- **Custody & Ledger Agent** рекомендует начать с собственной PostgreSQL-ledger модели (двойная запись + constraints), параллельно оценить Midaz как кандидат на замену через 6 месяцев.
- **Security Agent** рекомендует с MVP 1 разделить signing service от основного API (раздел 21.1 ТЗ — "private keys не должны храниться в основном приложении").
- **Compliance Agent** рекомендует заказать пред-проектную юридическую консультацию параллельно MVP 1, чтобы не получить блокер на MVP 2.
- **Review Agent** напоминает, что без ledger consistency tests, withdrawal kill switch, risk approval перед сделкой и audit log нельзя пропустить ни один money-impacting release.

### Budget / Complexity Notes

- MVP 0 (текущий) — 100% документация, no spend.
- MVP 1–2 — нужен budget на: hosting (staging+prod), monitoring (Sentry+Grafana cloud или self-host), dev secrets manager, blockchain RPC (TRON/ETH).
- Юридическая консультация — отдельный budget item, P0.
- Sanctions screening provider (раздел 23.5 ТЗ — OpenSanctions/Watchman бесплатные базовые, но коммерческие — Chainalysis, TRM Labs, Elliptic — нужны для AML production).

### Next Week Plan

1. Founder ревью DEC-001..DEC-010.
2. Заказ юридической консультации.
3. Закрытие MVP 0 (acceptance: все docs финализированы по выбранной юрисдикции/сети/бирже).
4. Старт MVP 1 — Custody Simulation: регистрация → demo balance → fake deposit → ledger → fake withdrawal → audit log → admin panel.
5. Initial Prisma schema по `docs/database-design.md`.
