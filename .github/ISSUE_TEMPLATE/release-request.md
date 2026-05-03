---
name: Release Request
about: Запрос на production deploy
title: "[Release] <version> — <summary>"
labels: release, founder-approval-required
---

## Version

## Type
- [ ] Patch / hotfix
- [ ] Feature release
- [ ] Money-impacting release
- [ ] Strategy rollout
- [ ] Architecture change

## Linked PRs

## Checklist (см. docs/release-gates.md)
- [ ] All required tests pass
- [ ] Semgrep / Gitleaks / Trivy / CodeQL зеленые
- [ ] CODEOWNERS approval
- [ ] No open SEV-1/2 incidents
- [ ] No unresolved critical reconciliation errors
- [ ] Rollback plan documented
- [ ] Monitoring dashboards updated
- [ ] Runbook updated (если applicable)
- [ ] Compliance review (если касается money/custody/KYC)
- [ ] Security review (если касается auth/secrets/signing)
- [ ] Founder approval

## Rollout plan
- [ ] Shadow mode period
- [ ] Canary cohort %
- [ ] Limited live cohort %
- [ ] Broader release

## Communications

## Rollback criteria

## Rollback plan
