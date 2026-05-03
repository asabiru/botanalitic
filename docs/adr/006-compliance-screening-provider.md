# ADR-006: Compliance/Sanctions Screening Provider

## Status
Proposed

## Date
2026-04-29

## Context

Раздел 23.5 ТЗ предлагает: OpenSanctions / yente, Moov Watchman, pluggable AML provider interface.

## Options Considered

### Option A — OpenSanctions + yente (self-host)
- **Pros:** open data, низкая стоимость, custom matching logic.
- **Cons:** нужно поддерживать infrastructure, false positive rate выше.

### Option B — Moov Watchman
- **Pros:** open-source, OFAC/EU/UN lists out-of-the-box, API стабильный.
- **Cons:** покрытие списков ограничено базовыми санкционными.

### Option C — Commercial (Chainalysis / TRM Labs / Elliptic)
- **Pros:** institutional-grade, blockchain analytics, регуляторы признают.
- **Cons:** дорого ($30k–$100k+/year), требует контракта.

## Decision

**Pluggable AML provider interface.**

- MVP 0–2: интеграция с OpenSanctions + Watchman (sanctions screening только для KYC).
- MVP 3+: добавить blockchain analytics (Chainalysis или TRM) для AML входящих транзакций — обязательно перед запуском real-money.

Через интерфейс ComplianceProvider в services/compliance.

## Consequences

### Positive
- Не lock-in на одного провайдера.
- Легкая замена.
- Дешевый старт.

### Negative
- Нужно поддерживать adapter logic.

## Compliance / Security / Money impact

- **Compliance: Critical.** Без AML на входящих транзакциях нельзя запускать real custody.

## Related

- DEC-001 (юрисдикция влияет на требования провайдера)
- Раздел 17, 23.5 ТЗ
