# ADR-010: Security Scanning Stack

## Status
Proposed

## Date
2026-04-29

## Context

Раздел 23.6 ТЗ: Semgrep, Opengrep (опционально), Gitleaks, Trivy, CodeQL. Security scanners обязательны в CI.

## Decision

Все обязательны в CI как required status checks:

- **Semgrep** — SAST custom rules для money/ledger/withdrawal — .github/workflows/semgrep.yml
- **Gitleaks** — secrets в git history — .github/workflows/gitleaks.yml
- **Trivy** — container vulnerabilities, IaC, SBOM — .github/workflows/trivy.yml
- **CodeQL** — GitHub native SAST — .github/workflows/codeql.yml
- **Dependabot** — dependency updates — .github/dependabot.yml
- **GitHub secret scanning + push protection** — repo settings

Custom Semgrep rules:

- Запрет прямого UPDATE на client_balances без ledger entry.
- Запрет console.log/print с переменными, содержащими private, key, secret, seed.
- Запрет Math.random в money paths (нужен crypto-secure).
- Запрет литералов "guaranteed profit", "no risk" и подобных в UI.

## Consequences

### Positive
- Автоматизированная защита.
- Compliance-ready audit trail сканов.

### Negative
- Initial false positives нужно тюнить.

## Related

- Раздел 21.1, 23.6 ТЗ
- Security Agent (раздел 26.11)
