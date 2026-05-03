# Incident Response Runbook

> Раздел 54 ТЗ + Incident Response Agent (раздел 26.20).

---

## 1. Severity model

| Severity | Definition | Response time |
|----------|-----------|---------------|
| SEV-1 | Money/data loss possible, security breach, withdrawals/deposits broken, ledger inconsistent | <15 min ack, 24/7 |
| SEV-2 | Critical functionality degraded, no money loss yet | <1 hour ack, business hours |
| SEV-3 | Minor degradation, workaround available | <4 hours ack, business hours |
| SEV-4 | Cosmetic, monitoring noise | Next business day |

---

## 2. Roles (раздел 54.2)

- **Incident commander (IC):** ведет инцидент, принимает решения о freeze/rollback, эскалирует Founder.
- **Communications owner:** обновляет client-facing status page, send notifications.
- **Technical owner:** root cause investigation, fix, deploy.
- **Compliance escalation owner (SEV-1/2):** информирует compliance officer, готовит regulator notification.
- **Postmortem owner:** ведет постмортем после resolution.

---

## 3. Freeze matrix (раздел 54.3)

Можно freeze независимо:

- Withdrawals only — пример: подозрение на компрометацию signing service.
- Trading only — пример: ledger inconsistency, exchange API issues.
- Both — пример: critical security breach.

Freeze toggling — admin emergency action, audit log.

---

## 4. Detection sources

- Automated alerts (Prometheus, Sentry).
- Reconciliation errors.
- Client support tickets с pattern.
- External monitoring (uptime).
- Security alerts (WAF, IDS).

---

## 5. Initial response steps

1. Acknowledge alert / ticket.
2. Open incident issue (label: incident).
3. Назначить IC (или сам IC если on-call).
4. Создать incident channel (Slack / Telegram).
5. Начать timeline.
6. Оценить severity.
7. Если SEV-1/2 — notify Founder.
8. Decide on freeze (см. matrix).
9. Mitigate (rollback / patch / scale / failover).
10. Communicate (status page / clients).
11. Resolve.
12. Postmortem.

---

## 6. Specific scenarios

### 6.1. Ledger inconsistency

- Freeze withdrawals immediately.
- Freeze new trades.
- Run full reconciliation.
- Identify mismatch source.
- Apply correction via RECONCILIATION_CORRECTION ledger entry (с reason + audit trail + Founder approval).
- Post-resolution: reconciliation_error closed, withdrawals re-enabled.

### 6.2. Signing service compromise suspected

- Immediately freeze withdrawals platform-wide.
- Rotate KMS keys.
- Audit all recent withdrawals для unauthorized signs.
- Inform Founder + Security lead.
- If confirmed — internal forensics + regulator/insurance notification.

### 6.3. Exchange outage

- Detect via health check.
- If DEGRADED — throttle new orders.
- If UNHEALTHY — pause new orders, reduce exposure.
- If CRITICAL — emergency close-out (если безопасно), withdraw funds к treasury.
- Communicate с affected clients.

### 6.4. Stuck withdrawal transaction

- Identify (mempool / chain analysis).
- Replace-by-fee (если возможно).
- Wait for inclusion (timeout config).
- Manual review если persists.
- В ledger статус = processing до inclusion / failed.

### 6.5. Reorg detected

- Wait for additional confirmations (config buffer).
- Re-verify tx inclusion.
- Если invalidated — ledger reverse + retry.

### 6.6. KMS access denied

- Immediately freeze withdrawals.
- Investigate IAM / key state.
- Recover via secondary key (если multi-region).
- Postmortem.

---

## 7. Communications templates

Внутренние:
- "Incident detected at <ts>, severity <sev>, IC: <name>, channel: <link>"
- Updates каждые 15-30 min (зависит от sev).

Client-facing:
- Status page с simple language.
- Email / push notifications для затронутых клиентов.
- НЕ раскрывать internal details security incidents до завершения forensics.

Regulator / compliance:
- Если threshold по юрисдикции — обязательный notification (timing varies).

---

## 8. Postmortem (раздел 54.4)

Шаблон docs/postmortem-template.md.

Обязательно для SEV-1, рекомендовано для SEV-2.

Содержит:

- What happened.
- Timeline.
- Root cause.
- Detection.
- Response.
- Resolution.
- Impact (money, clients, reputational).
- What went well.
- What went poorly.
- Action items.
- Updates to runbooks / risk register.

Postmortem публикуется внутренне; client-facing postmortem — селективно по severity и реляции.

---

## 9. Regulator escalation

Зависит от выбранной юрисдикции (DEC-001). Compliance escalation owner отвечает за timeline и filing (например, suspicious activity reports).

---

## 10. Tests

- Quarterly tabletop exercises на SEV-1 scenarios.
- Annual full DR test.
- Chaos days: simulate exchange outage, signing service failure, blockchain RPC outage.
