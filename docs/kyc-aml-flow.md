# KYC / AML Flow

> Раздел 17 ТЗ + Compliance Requirements Agent (раздел 26.2). Финал после DEC-001.

---

## 1. KYC tiers

| Tier | Limits | Required documents |
|------|--------|--------------------|
| 0 | Signal-only, демо, read-only | Email + 2FA |
| 1 | Deposit до 1000 USDT, demo trading | + government ID + selfie + liveness |
| 2 | Managed trading, до 25 000 USDT | + Proof of address (< 90 days) + suitability questionnaire |
| 3 | Higher limits | + EDD: source of wealth, employment verification |

Финальные пороги — DEC после DEC-001.

---

## 2. KYC flow

```
Sign up (email + password + 2FA)
  -> Tier 0
  -> Optional: enable additional tier
    -> Provide ID document
    -> Selfie + liveness check
    -> Provide proof of address (Tier 2+)
    -> Provide source of funds declaration
    -> Suitability questionnaire (Tier 2+ for managed)
    -> Provider check (Sumsub / Onfido / Veriff TBD)
    -> Sanctions / PEP screening
    -> AML risk scoring
    -> Manual review (если flagged)
  -> Tier promoted (если все pass)
  -> Records: kyc_profile + kyc_checks rows
```

---

## 3. KYC providers

- Sumsub — broad, поддерживает liveness, document verification, AML, PEP.
- Onfido — similar, strong UK focus.
- Veriff — strong document support, pricing varies.
- Persona — flexible workflows.

Pluggable interface: KycProvider в services/compliance.

Финальный выбор — DEC после quote от провайдеров.

---

## 4. AML flow

### 4.1. Onboarding

- Sanctions screening (OFAC, EU, UN, UK, локальные).
- PEP screening.
- Adverse media check.
- Initial risk score.

### 4.2. Per deposit

- Source address chain analysis (Chainalysis / TRM Labs).
- Score: low / medium / high / critical.
- Mixers, darknet, sanctions-related — auto-block.
- Score > medium — hold + manual review.

### 4.3. Per withdrawal

- Recipient address risk check.
- Travel rule (FATF) для крупных переводов.

### 4.4. Periodic re-screening

- Weekly sanctions re-check активных clients.
- Monthly transaction monitoring (anomalies, structuring).

---

## 5. AML actions matrix

| Score | Onboarding | Deposit | Withdrawal |
|-------|-----------|---------|-----------|
| Low | Pass | Pass | Pass |
| Medium | Manual review | Hold + review (24h SLA) | Hold + review |
| High | Reject or EDD | Block | Block + freeze |
| Critical | Reject + report | Block + freeze + SAR | Block + freeze + SAR |

---

## 6. Manual review SLA

- Standard: 24 часа.
- High-risk: 72 часа (с EDD additional documents).
- Critical: 1 час to acknowledge.

---

## 7. CDD refresh

- Tier 2 — every 2 years.
- Tier 3 — annually.
- При material change — immediate refresh.

---

## 8. Records retention

См. data-retention-policy.md. KYC данные — 5 лет после offboarding.

---

## 9. Tests

- Sanctions-list match -> auto-block.
- KYC provider down -> graceful degradation, manual review path.
- Restricted country code -> block onboarding.
- High AML score on deposit -> hold + manual review.

---

## 10. Open decisions

- DEC-001: юрисдикция определяет SAR обязательства.
- KYC provider selection.
- AML provider production: Chainalysis vs TRM Labs.
