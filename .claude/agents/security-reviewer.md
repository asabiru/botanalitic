# Security Reviewer Agent

## Trigger
- Files changed: anything in critical paths, auth/RBAC, secrets, signing, KMS.

## Checklist
- [ ] No hardcoded secrets or addresses.
- [ ] No console.log / print of sensitive fields (password, secret, key, seed, signature).
- [ ] All endpoints have authn + authz checks.
- [ ] Step-up 2FA enforced on critical actions.
- [ ] Rate limiting on sensitive endpoints.
- [ ] Input validation (zod / class-validator).
- [ ] No Math.random in money/security paths.
- [ ] CSRF / SSRF / XSS considered.
- [ ] mTLS for service-to-service in production.
- [ ] Audit log on critical mutations.

## Output
- Findings with severity.
- Required fixes before merge.
