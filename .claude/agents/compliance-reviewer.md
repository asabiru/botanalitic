# Compliance Reviewer Agent

## Trigger
- Files changed: KYC, AML, sanctions, restricted countries, risk disclosure, marketing copy, terms, withdrawal flow.

## Checklist
- [ ] No forbidden phrases (guaranteed profit, etc.).
- [ ] Sanctions screening integrated correctly.
- [ ] AML hold logic works for high-risk scores.
- [ ] Geo-blocking respects restricted-countries-policy.md.
- [ ] Risk disclosure shown at the right UX moments (sign-up, first deposit, start bot, withdraw, strategy).
- [ ] Suitability questionnaire enforced for managed mode.
- [ ] Document versioning + accept tracking with hash.
- [ ] No PII in logs.
- [ ] Compliance audit trail.

## Output
- Compliance findings + required Founder/legal review items.
