# Known Risks Register

Реестр известных рисков (раздел 26.22 ТЗ — Release Governance Agent отвечает за этот файл).

| ID | Risk | Category | Severity | Mitigation | Owner | Status |
|----|------|----------|----------|------------|-------|--------|
| KR-001 | Регуляторный риск: custody без лицензии | Compliance/Legal | Critical | Юридическая консультация, выбор юрисдикции (DEC-001), VASP/CASP лицензия до live | Founder + Compliance Agent | Open |
| KR-002 | AML риск: депозит со skомпрометированных адресов | Compliance/Custody | High | AML provider integration, blocking списка адресов, hold + manual review | Compliance Agent | Open |
| KR-003 | Санкционный риск: клиент из restricted country | Compliance | Critical | Geo-block на onboarding, sanctions screening на каждом депозите/выводе | Compliance Agent | Open |
| KR-004 | Технический риск: ledger inconsistency | Technical/Custody | Critical | Double-entry constraints, idempotency keys, daily reconciliation, freeze withdrawals при error | Custody Agent | Open |
| KR-005 | Операционный риск: компрометация private keys | Security/Custody | Critical | Hot/cold wallet separation, отдельный signing service, HSM/MPC, key rotation | Security Agent | Open |
| KR-006 | Рыночный риск: ликвидация позиций клиентов | Trading/Risk | High | Risk engine с liquidation buffer, max leverage limits, stop-loss обязателен, drawdown limits | Risk Agent | Open |
| KR-007 | Counterparty risk: банкротство биржи (FTX-сценарий) | Counterparty | High | Exchange exposure caps, multi-exchange, daily withdrawal sweeps, exchange health monitoring | Counterparty Agent | Open |
| KR-008 | Технический риск: race condition в withdrawal flow (двойной вывод) | Technical | High | Idempotency keys, ledger lock на available balance, Temporal workflow | Custody Agent | Open |
| KR-009 | Бот торгует после Stop Trading | Technical/Trading | Critical | Kill switch, pre-trade check на bot session status, integration tests | Risk + Trading Agent | Open |
| KR-010 | Performance fee начисляется неправильно (без HWM) | Financial | High | HWM в ledger как отдельный счет, тесты на edge cases, аудит fee accruals | Custody Agent | Open |
| KR-011 | Withdrawal address allowlist обходится | Security | High | Cooling-off period, audit log на edits, step-up auth, first withdrawal manual review | Security Agent | Open |
| KR-012 | DDoS / API abuse | Technical | Medium | Rate limiting, WAF, IP allowlist для admin | DevOps Agent | Open |
| KR-013 | Insider risk: admin переводит средства | Security/Compliance | High | Dual approval, audit log, RBAC, separation of duties, cold storage | Security + Compliance Agent | Open |
| KR-014 | Reputational risk: клиент проиграл деньги, публичный скандал | Brand/Legal | High | Risk disclosure, suitability questionnaire, derivatives knowledge check, no guaranteed-profit wording | Product + Compliance Agent | Open |
| KR-015 | Блокчейн reorg или mempool stuck transaction | Technical | Medium | N confirmations, retry logic, timeout escalation, manual override | Custody Agent | Open |
| KR-016 | Exchange API outage в момент Stop Trading | Counterparty/Technical | High | Retry policy, fallback close, alerting, manual close runbook | Trading + Incident Response Agent | Open |
| KR-017 | Сигнал источник скомпрометирован (fake X account) | Trading/Signal | Medium | Source reliability scoring, dual confirmation, manual review для high-impact signals | Signal Agent | Open |
| KR-018 | Tax/reporting risk для клиентов и платформы | Legal/Tax | Medium | Tax disclaimer, transaction history export, юридическая консультация по налогам в выбранной юрисдикции | Legal/Compliance | Open |
| KR-019 | Зависимость от Temporal Cloud / самохостинга | Technical/Infra | Medium | DR plan, backup state, документированный fallback на BullMQ для некритичных задач | DevOps Agent | Open |
| KR-020 | Утечка PII (KYC документы) | Security/Privacy | Critical | Шифрование at-rest, masked views, retention policy, access review, key rotation | Security + Data Governance Agent | Open |

---

## Категории

- **Compliance/Legal** — KYC, AML, санкции, лицензирование
- **Custody** — деньги клиентов, ledger, выводы
- **Security** — ключи, доступ, аутентификация
- **Trading/Risk** — рыночный риск, поведение бота
- **Counterparty** — биржи, провайдеры
- **Technical** — баги, race condition, отказоустойчивость
- **Brand/Legal** — репутационные риски
- **Privacy** — PII клиентов
