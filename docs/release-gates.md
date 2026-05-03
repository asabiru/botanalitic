# Release Gates

> Раздел 26.22 + 57 ТЗ. Release Governance Agent отвечает за этот файл.

---

## 1. Принцип

Money-impacting изменения проходят staged rollout (раздел 57.1):

```
shadow mode -> paper/live comparison -> canary cohort -> limited live -> broader release
```

Каждая стадия имеет required checks. Founder approval требуется для перехода к limited live и broader release.

---

## 2. Mandatory controls (раздел 57.2)

- [ ] Release checklist пройден.
- [ ] Rollback playbook готов.
- [ ] Independent real-trading kill switch проверен.
- [ ] Нет unresolved critical reconciliation incident.
- [ ] Founder approval перед broader real-money rollout.

---

## 3. Release checklist (для money-impacting features)

### 3.1. Code quality
- [ ] Code review approved by 2+ reviewers (1 senior).
- [ ] CODEOWNERS approval для critical folders.
- [ ] Все CI checks зеленые: tests, Semgrep, Gitleaks, Trivy, CodeQL.
- [ ] No new TODO в money paths.
- [ ] No hardcoded secrets / addresses.

### 3.2. Tests
- [ ] Unit tests добавлены (coverage не упал).
- [ ] Integration tests для money flow.
- [ ] E2E tests для critical user journeys.
- [ ] Property tests для invariants (если применимо).
- [ ] Chaos test: failure scenarios покрыты.

### 3.3. Documentation
- [ ] API documentation updated.
- [ ] Runbook updated (если применимо).
- [ ] RFC / ADR updated (если архитектурное изменение).
- [ ] Changelog entry.
- [ ] Breaking changes документированы.

### 3.4. Risk
- [ ] Risk Engine Agent review.
- [ ] Reconciliation impact assessment.
- [ ] Audit log coverage check.
- [ ] Idempotency check.

### 3.5. Security
- [ ] Security Agent review.
- [ ] Penetration test (если new attack surface).
- [ ] Secrets management проверен.
- [ ] Authorization checks на всех новых endpoints.

### 3.6. Compliance
- [ ] Compliance Agent review (если касается KYC/AML/withdrawals/restricted countries).
- [ ] Risk disclosure updated (если applicable).

### 3.7. Operations
- [ ] Monitoring dashboards обновлены.
- [ ] Alerts настроены.
- [ ] Capacity planning sign-off.
- [ ] Backup/restore tested.

---

## 4. Strategy rollout (раздел 57.3)

Каждая новая strategy version:

1. **Backtest review**
   - 2+ лет исторических данных.
   - Sharpe / Sortino / max drawdown / win rate / avg trade.
   - Out-of-sample validation.

2. **Paper trading**
   - 30+ дней live paper.
   - Comparison с backtest expectations.
   - Risk events count.

3. **Risk review**
   - Risk Agent проверяет лимиты, edge cases.

4. **Limited live cohort**
   - Альфа-tester clients (opt-in).
   - Caps: small position size, low total exposure.
   - Daily monitoring window 14 дней.

5. **Post-launch monitoring**
   - 30+ дней с automatic anomaly detection.
   - Если drawdown > expected backtest 95th percentile — strategy paused.

---

## 5. Rollback playbook

Для каждого release предоставить:

- [ ] Trigger criteria (когда rollback).
- [ ] Steps (DB migration reverse / feature flag toggle / version pin).
- [ ] Communication template.
- [ ] Postmortem template.
- [ ] Estimated time to rollback.

---

## 6. Release freeze conditions

Release НЕ выпускается если:

- [ ] Open SEV-1 / SEV-2 incident.
- [ ] Critical reconciliation error не resolved.
- [ ] Security advisory open для зависимости в production.
- [ ] Pending Founder approval по DEC.

---

## 7. Release Agent должен блокировать release (раздел 26.14 ТЗ)

Если:

- withdrawal flow небезопасен;
- ledger не сходится;
- нет risk check перед trade;
- нет audit log;
- нет tests для money/trading logic;
- есть hardcoded secrets;
- бот может торговать после Stop Trading;
- можно вывести больше available balance;
- есть guaranteed profit wording.

---

## 8. Approval matrix

| Release type | Reviewers | Founder approval |
|--------------|-----------|------------------|
| Bug fix non-money | 1 reviewer | no |
| UI polish | 1 reviewer | no |
| New non-money feature | 2 reviewers | no |
| Money/trading feature | 2 reviewers + Security + Compliance | yes |
| Strategy rollout | + Risk + Trader | yes |
| Real-money rollout | full team review + external audit | yes |
| Production deploy | + DevOps | yes |
| Emergency hotfix | reduced (DevOps + on-call senior) | post-hoc |

---

## 9. Canary criteria

Limited live cohort: ≤5% клиентов, opt-in или auto-selected (low-balance, demo-experienced).

Promote to broader rollout если за 14 дней:
- error rate < baseline + 10%
- no SEV-1/SEV-2 incidents
- reconciliation passes daily
- client complaints < threshold
- performance within SLOs

Иначе — extended canary или rollback.

---

## 10. GitHub controls (раздел 60)

- CODEOWNERS для critical folders (см. .github/CODEOWNERS).
- Branch protection on main: required reviews, required checks, signed commits.
- Required status checks: tests, Semgrep, Gitleaks, Trivy, CodeQL.
- Merge queue для protected branches.
- Protected environments: staging, production (manual approval gate).
- Required reviewers для production deploys.
