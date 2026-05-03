# /money-feature-check

Проверка money-impacting feature перед merge.

Checklist:
- [ ] Ledger entries создаются на каждое финансовое движение.
- [ ] Idempotency keys используются.
- [ ] Audit log entry на critical actions.
- [ ] Tests: unit + integration + property test for invariants.
- [ ] No direct UPDATE on client_balances.
- [ ] No hardcoded amounts/addresses/keys.
- [ ] Risk Engine pre-trade check (если торговля).
- [ ] Compliance/AML hooks (если deposit/withdrawal).
- [ ] Documentation updated (docs/ledger-model.md, docs/withdrawal-flow.md, docs/risk-rules.md, по релевантности).
- [ ] Founder approval received (DEC reference в PR).
