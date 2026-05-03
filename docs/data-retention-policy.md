# Data Retention Policy

> Раздел 58 ТЗ + Data Governance Agent (раздел 26.23). Финал — после DEC-001 (юрисдикция влияет).

---

## 1. Retention by data class

| Data class | Retention | Reason |
|------------|-----------|--------|
| Audit logs | 7 лет (минимум) | Regulatory, dispute resolution |
| Ledger entries | Permanent (immutable) | Financial records |
| KYC documents | 5 лет после offboarding | AML / KYC regulations |
| AML check results | 5 лет | AML regulations |
| Transaction history | Permanent (linked to ledger) | Financial records |
| Client statements | Permanent | Tax / legal |
| Support tickets | 3 года | Operational + dispute |
| System operational logs | 90 дней | Debug / capacity planning |
| Application logs (info) | 30 дней | Debug |
| Application logs (error) | 90 дней | Investigation |
| PII masked snapshots | per analytics needs | Reporting |
| Marketing data / cookies | per GDPR / locale | Privacy |
| Webhooks raw | 30 дней | Replay window |

---

## 2. Immutable retention

Никогда не удаляются:

- ledger_entries
- ledger_transactions
- audit_logs
- admin_actions
- high_water_marks history
- withdrawal records (final state)
- deposit records (confirmed)
- compliance decisions

Реализация: append-only tables, no DELETE permission на уровне DB user.

---

## 3. Right to erasure (GDPR / similar)

Если применимо в выбранной юрисдикции:

- PII в client_profiles может быть masked / deleted.
- НЕ удаляются: ledger entries, audit logs (financial regulation overrides).
- Replacement: keep records с pseudonymized client reference.

---

## 4. Legal hold

Procedure:

- Compliance officer may impose legal hold on a client.
- При hold: все данные клиента preserved; deletion requests deferred.
- Hold tracked в legal_holds table.
- Removal hold требует approval.

---

## 5. Masked views

Для non-essential staff (support, ops):

- email -> masked
- phone -> masked
- address -> redacted
- KYC docs -> not visible

DB views или application-level masking. Audit trail кто видел unmask.

---

## 6. Evidence preservation (раздел 58.2)

- Immutable audit retention включает hash chain.
- Evidence bundle export для регуляторов / disputes.
- Format: structured JSON + signed manifest + supporting attachments.

---

## 7. Access review

- Quarterly access review всех staff users.
- Annual full review.
- Departing staff — immediate revoke + audit.

---

## 8. Backup retention

- DB daily backups: 90 дней.
- Weekly snapshots: 1 год.
- Monthly snapshots: 7 лет (для audit logs / ledger).
- All backups encrypted, off-site.

---

## 9. Founder approval required (раздел 26.23)

- Deletion policy.
- Long-term retention policy.
- Evidence disclosure rules.

---

## 10. Open decisions

- DEC-001 — юрисдикция определяет точные retention сроки.
- GDPR vs financial regulation conflict resolution rules.
