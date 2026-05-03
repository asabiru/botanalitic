# Compliance Checklist

> Раздел 17 ТЗ + Compliance Requirements Agent (раздел 26.2 ТЗ).

---

## Pre-launch legal review (раздел 3 ТЗ)

Перед запуском с реальными клиентскими средствами требуется юридическое заключение по:

- [ ] Стране регистрации компании (DEC-001).
- [ ] Странам клиентов (allowed/restricted matrix).
- [ ] Допустимости приема USDT.
- [ ] Допустимости торговли средствами клиента (custody management).
- [ ] Требованиям к лицензии (VASP / CASP / investment firm / portfolio manager).
- [ ] KYC / AML обязательствам.
- [ ] Санкционному скринингу.
- [ ] Договорам с клиентами (terms of service, custody agreement, risk disclosure).
- [ ] Раскрытию рисков.
- [ ] Рекламным ограничениям.
- [ ] Налогам (платформа и клиенты).
- [ ] Ответственности за убытки.

---

## KYC (раздел 17.1)

### Сохраняемые данные

- [ ] client identity status
- [ ] country
- [ ] document verification status
- [ ] address verification
- [ ] source of funds
- [ ] risk level
- [ ] sanctions result
- [ ] PEP status
- [ ] manual review notes

### Требуемые документы

- Government-issued ID (passport / national ID / driver license).
- Selfie / liveness check.
- Proof of address (utility bill, bank statement, < 90 дней).
- Source of funds declaration.
- Suitability questionnaire (для derivatives mode — раздел 55 ТЗ).

### KYC tiers (рекомендация)

| Tier | Limits | Required |
|------|--------|----------|
| Tier 0 | Signal-only, демо | Email + 2FA |
| Tier 1 | Deposit до 1000 USDT, demo trading | + ID + selfie |
| Tier 2 | Managed trading, deposit до 25000 USDT | + Proof of address + suitability |
| Tier 3 | Higher limits | + enhanced due diligence (EDD), source of wealth |

Финальные пороги — DEC от Founder.

---

## AML (раздел 17.2)

### Что проверяем

- [ ] входящие транзакции (chain analysis)
- [ ] исходящие транзакции
- [ ] адреса кошельков (counterparty risk)
- [ ] санкционные списки
- [ ] high-risk jurisdictions
- [ ] suspicious transaction patterns (rapid in/out, structuring)
- [ ] mixer exposure (Tornado Cash, ChipMixer, etc.)
- [ ] darknet exposure (если провайдер дает)

### AML provider (см. ADR-006)

- MVP 0–2: OpenSanctions + Watchman (sanctions only).
- MVP 3+: Chainalysis или TRM Labs (full AML inc. blockchain analytics).

### Действия по AML score

| Score | Action |
|-------|--------|
| Low (0–30) | Pass, normal flow |
| Medium (31–60) | Hold, manual review (24h SLA) |
| High (61–85) | Hold, escalate to compliance officer |
| Critical (86–100) | Block, freeze account, file SAR if jurisdiction requires |

---

## Sanctions screening (раздел 17.2 + 26.4 Compliance Agent)

- OFAC SDN list
- EU consolidated list
- UN Security Council list
- HM Treasury (UK)
- Локальные списки выбранной юрисдикции

Screening на:
- Onboarding (KYC).
- Каждом депозите (sender address).
- Каждом выводе (recipient address).
- Periodic re-screening (weekly или monthly).

При hit — automatic freeze + immediate compliance review.

---

## Restricted countries (раздел 17.3)

Default baseline (требует Founder approval — DEC-008):

- US (если нет SEC/CFTC регистрации).
- UK (если нет FCA авторизации).
- Canada.
- Iran.
- North Korea (DPRK).
- Syria.
- Cuba.
- Russia, Belarus (в зависимости от выбранной юрисдикции).
- Mainland China.
- FATF high-risk and non-cooperative jurisdictions.

Restricted клиент НЕ может:
- проходить onboarding
- вносить средства
- включать автоторговлю
- покупать подписку (если запрещено)

Geo-IP block + KYC country check + address country check.

---

## Risk Disclosure (раздел 3 ТЗ + 26.2)

Клиент обязан принять перед:
- первым депозитом
- активацией Managed Trading mode
- увеличением leverage (re-acknowledge)
- material strategy change

Хранится: client_documents с типом risk_disclosure, hash, accepted_at.

См. risk-disclosure-requirements.md.

---

## Запрещенные формулировки в продукте (раздел 3 ТЗ)

- "гарантированная прибыль"
- "без риска"
- "стабильный доход"
- "безопасная торговля"
- "100% сигнал"
- "пассивный доход без потерь"

Static check: Semgrep custom rule на эти строки в frontend.

Правильные формулировки:
- "торговля фьючерсами связана с высоким риском"
- "возможна частичная или полная потеря капитала"
- "результаты в прошлом не гарантируют будущую доходность"
- "бот работает в рамках заданных риск-лимитов, но не гарантирует прибыль"
- "клиент может остановить торговлю и запросить вывод доступного баланса"

---

## Suitability (раздел 55)

Для managed futures режима:

- derivatives suitability questionnaire (опыт, понимание leverage, понимание ликвидации)
- leverage knowledge check
- risk acknowledgement before first live session
- periodic re-acknowledgement после material strategy changes

Если клиент не проходит — fallback в signal_only / demo / read-only.

---

## Records retention (раздел 58)

| Класс данных | Retention |
|--------------|-----------|
| audit_logs | 7 лет (или больше по локальному закону) |
| ledger_entries | permanent (immutable) |
| KYC данные | 5 лет после последнего contact (или больше) |
| AML results | 5 лет |
| client statements | permanent |
| chat / support records | 3 года |
| operational logs | 90 дней |

Финальные сроки — после DEC-001 и legal review.

---

## Reporting obligations (TBD после DEC-001)

Зависит от юрисдикции:

- SAR (Suspicious Activity Reports)
- CTR (Currency Transaction Reports) — если применимо
- Travel Rule (FATF) — для крипто-переводов > $1k/$3k
- Tax reporting (1099 / Common Reporting Standard)
- Prudential reporting (если CASP/MIFID)

---

## Ongoing controls

- [ ] Annual AML training для команды.
- [ ] Quarterly compliance review.
- [ ] Annual penetration test.
- [ ] Annual external audit.
- [ ] Suspicious activity monitoring (automated rules + manual reviews).
- [ ] Customer Due Diligence refresh каждые 1-3 года (зависит от tier).
