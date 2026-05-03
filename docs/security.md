# Security Baseline

> Раздел 21.1 + 26.11 ТЗ. Security Agent отвечает за этот документ.

---

## 1. Принципы

- Defense in depth.
- Least privilege (RBAC + scoped permissions).
- Secrets никогда не в коде, не в логах, не в client-side bundles.
- Private keys изолированы (раздел 21.1).
- Zero trust между сервисами (mTLS).
- Audit log на каждое critical action.

---

## 2. Authentication

- Email + password (bcrypt/argon2id).
- 2FA обязателен для admin, опционален для client (но рекомендуется).
- Passkeys / WebAuthn — P1 enhancement.
- Session: signed JWT с коротким expiry + refresh token; revocation via Redis blacklist.
- Rate limit: login (5/min/IP), 2FA (5/min/account), withdrawal (10/min/account).

## 3. Authorization (RBAC)

Роли (раздел 5 ТЗ):
- client
- admin
- trader / strategy_manager
- compliance_officer
- support
- system

Permissions определены в packages/shared/permissions.ts. Каждый endpoint:

```
@RequirePermission('withdrawal.approve')
async approveWithdrawal(...) { ... }
```

Support НЕ ИМЕЕТ доступа к: private keys, API keys, signing service, withdrawal approval, ledger mutation (раздел 5.5).

---

## 4. Secrets management

- Production: AWS Secrets Manager / GCP Secret Manager / HashiCorp Vault.
- Dev: .env files + dotenv-safe; `.env.example` чекинится, `.env` — никогда.
- Secrets ротируются: API keys (90 дней), DB passwords (180 дней), KMS keys (annual).
- Никогда не логируем поля: password, secret, token, key, seed, mnemonic, signature.

---

## 5. Withdrawal signing (раздел 21.1, ADR-008)

- Private keys только в KMS (FIPS 140-2 Level 2+).
- Signing service в private subnet, только mTLS API.
- API service не имеет KMS access — только call signing service с ledger_entry_id.
- Signing service проверяет: entry status=approved, idempotency, request hash signature.
- Каждое подписание logged в KMS audit + custom audit_logs.
- Cold reserve keys offline; sweep-out процедура — manual + dual control.

---

## 6. Database

- Encryption at rest (PG with KMS).
- Encryption in transit (TLS 1.2+).
- Backups encrypted, retained per data-retention-policy.
- DB users:
  - app_writer — INSERT/UPDATE на бизнес-таблицы, READ на configurations.
  - app_reader — read-only для analytics.
  - migrator — DDL only, не используется application'ом в runtime.
  - ledger_writer — специальная роль для LedgerService (только INSERT в ledger_entries; UPDATE на client_balances только через trigger).

---

## 7. Network

- Public endpoints: только web app + API gateway.
- Internal services: private subnet, no public IP.
- API Gateway: WAF (CloudFlare / AWS WAF) с OWASP rules.
- Admin endpoints: optional IP allowlist (раздел 21.1).
- Rate limiting на edge (Cloudflare/Nginx) + per-route (API).

---

## 8. Logging and monitoring

- Logs structured (JSON), без PII или secrets.
- Correlation IDs (раздел 58.3).
- Sentry для exceptions с rate limiting + filtering.
- Alerts на: failed login spikes, withdrawal rejection rate, signing service errors, ledger inconsistency, reconciliation errors, exchange auth failures.

---

## 9. CI/CD security (ADR-010)

- Semgrep: custom rules для money/ledger/withdrawal patterns.
- Gitleaks: pre-commit hook + CI.
- Trivy: container scan + IaC scan.
- CodeQL: SAST.
- Dependabot: weekly updates.
- Secret scanning + push protection: GitHub native.
- Dependency review action: на PR.
- Signed commits required (рекомендация).
- Branch protection: main защищена, required reviewers, required status checks, no force push.

---

## 10. Step-up authentication

Step-up 2FA требуется для:

- Approve withdrawal.
- Reject withdrawal.
- Freeze / unfreeze account.
- Manual ledger adjustment.
- Change risk limit.
- Change fee settings.
- Add/remove admin user.
- Edit withdrawal address allowlist.
- Emergency stop.
- Critical configuration changes.

Step-up = re-verify 2FA TOTP, не просто session check.

---

## 11. Dual approval

Для критических действий (раздел 16.2):

- Withdrawal > dual_threshold (DEC-010).
- Manual ledger adjustment > X amount.
- Strategy promotion to live.
- Emergency stop (recommended).
- Reset HWM (Founder-only, never delegated).

Dual approver не может быть тот же user, что инициировал, и оба должны иметь свои step-up auth.

---

## 12. Audit log requirements

См. раздел 21.4 ТЗ.

Каждая запись:
- кто (user_id + role)
- когда (timestamp)
- что изменил (entity, before/after JSONB)
- почему (reason text)
- какой был баланс до/после (для money actions)
- ссылка на transaction/order/ledger entry
- correlation_id

Audit log append-only, retention permanent для money actions.

---

## 13. Incident response (раздел 54)

См. docs/runbooks/incident-response.md (TBD).

SEV model:
- SEV-1: deposit/withdrawal не работают, money loss possible, data breach.
- SEV-2: критичная функциональность degraded.
- SEV-3: minor degradation.
- SEV-4: cosmetic / monitoring noise.

Incident commander назначается, freeze matrix применяется (можно freeze только withdrawals или только trading или оба).

---

## 14. Data privacy (раздел 58)

- PII шифруется at-rest (column-level или application-level).
- Masked views для non-essential staff.
- Access reviews quarterly.
- Right to access / right to erasure (зависит от юрисдикции — DEC-001).
- KYC docs хранятся в S3 с server-side encryption + bucket lock.

---

## 15. Запрещенные практики

- Math.random() в money/security paths (нужен crypto.randomBytes).
- console.log с values содержащими secret keywords.
- Прямой UPDATE на client_balances вне ledger transaction.
- Hardcoded secrets, API keys, addresses в коде.
- Передача private keys через HTTP / lambda env vars в plain text.
- Обход 2FA для "convenience".
- Логирование raw request/response с биржей (содержит API key).

Static check: Semgrep custom rules в .github/workflows/semgrep.yml.

---

## 16. Penetration testing

- Internal security review перед каждым MVP gate.
- External penetration test перед MVP 4 launch.
- Re-test annually + после major architectural changes.
- Bug bounty program — рассмотреть после MVP 5 (HackerOne / Immunefi).

---

## 17. Tests

- Authn/Authz unit tests на каждый endpoint.
- E2E тесты на step-up auth flow.
- Tests на запрещенные patterns (Semgrep CI).
- Chaos test: signing service down during withdrawal.
- Chaos test: KMS access denied — graceful degradation.

---

## 18. Open decisions

- DEC-001: юрисдикция → влияет на data residency, KMS region.
- Insurance: custody insurance (Lloyd's или specialized providers) — TBD после MVP 5.
- Bug bounty platform — TBD.
