# Restricted Countries Policy

> Раздел 17.3 ТЗ. Финал после DEC-001 + DEC-008.

---

## 1. Принцип

Сервис недоступен клиентам из restricted countries. Геоблок применяется на:

- IP при visit landing.
- KYC country declaration.
- Deposit address (chain analysis).
- Withdrawal recipient address (опционально).

---

## 2. Default baseline (требует DEC-008)

### 2.1. Sanctioned (always blocked)

- Iran
- North Korea (DPRK)
- Syria
- Cuba
- Crimea, Donetsk, Luhansk regions
- Other OFAC/EU/UN comprehensive sanctions targets

### 2.2. Regulatory-driven (зависит от DEC-001)

- US persons если нет SEC/CFTC/FinCEN регистрации.
- UK persons если нет FCA авторизации.
- Canadian persons если нет local regulatory permission.
- EU persons если нет MiCA / CASP регистрации.
- Mainland China.
- Singapore если нет MAS license (для derivatives).

### 2.3. FATF high-risk (caution / EDD)

- Все страны в FATF high-risk и increased monitoring lists.

### 2.4. Other commonly restricted

- Myanmar
- Belarus
- Russia (зависит от юрисдикции и санкций)

---

## 3. Что блокируется

Restricted клиент НЕ может:

- проходить onboarding (KYC blocks)
- вносить средства (deposit address не выдается)
- включать автоторговлю
- покупать подписку (если запрещено правилами)
- использовать API

Demo / read-only доступ — TBD per jurisdiction.

---

## 4. Geo-IP blocking

- На landing: cookie banner + region check.
- VPN detection (опционально, IPQualityScore / MaxMind).
- Если detected — block onboarding.
- VPN не считается доказательством — главное declared country in KYC.

---

## 5. KYC country check

- Country of residence в KYC (документально).
- Country of nationality.
- Если любое в restricted list — block.
- Manual review для borderline (dual citizenship).

---

## 6. Periodic re-check

- Sanctions lists обновляются daily от провайдера.
- При обновлении: re-screening активных клиентов.
- При hit: freeze account + compliance review.

---

## 7. Restriction tiers

| Tier | Description | Action |
|------|-------------|--------|
| Full block | Sanctioned countries | No onboarding, no funds, freeze if existing |
| Regulatory block | US, UK без лицензии | No onboarding |
| EDD | FATF high-risk | Allow с EDD + manual review + lower limits |
| Allow | Все остальные | Normal flow со standard KYC |

---

## 8. Travel risk

Если клиент путешествует в restricted country:

- Login from restricted IP — session warning, but не block legitimate user.
- Withdrawal to address in restricted country — manual review.
- Persistent location change в restricted — KYC refresh required.

---

## 9. Audit

- Каждый отказ в onboarding logged с reason.
- Sanctions hits logged с full details.
- Annual audit of restricted countries policy.

---

## 10. Open decisions

- DEC-008 — финальный список.
- DEC-001 — юрисдикция влияет.
- Allow demo mode для restricted? — TBD.
