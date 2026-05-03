# /release-check

Запустить release readiness checklist (см. docs/release-gates.md).

Steps:
1. Проверить open SEV-1/2 incidents.
2. Проверить unresolved critical reconciliation_error.
3. Проверить CI status (tests, Semgrep, Gitleaks, Trivy, CodeQL).
4. Проверить required reviewers per CODEOWNERS.
5. Проверить, что все money-feature checks пройдены.
6. Проверить наличие rollback playbook.
7. Output: pass / blocked + список blockers.
