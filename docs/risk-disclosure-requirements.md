# Risk Disclosure Requirements

> Раздел 3 + 15.3 + 55 ТЗ. Все юридические тексты требуют Founder approval (раздел 38).

---

## 1. Обязательные дисклеймеры

### 1.1. Главный risk warning (раздел 15.3 ТЗ)

На всех торговых страницах:

> Торговля фьючерсами связана с высоким риском. Возможна частичная или полная потеря капитала. Прошлая доходность стратегии не гарантирует будущие результаты.

### 1.2. Custody disclaimer

> Платформа хранит ваши средства в кошельках, контролируемых ею. Вы не контролируете приватные ключи. В случае компрометации платформы или операционного сбоя вы можете потерять доступ к средствам полностью или частично.

### 1.3. Bot disclaimer

> Бот работает в рамках заданных риск-лимитов, но не гарантирует прибыль. Алгоритмическая торговля может привести к убыткам в любых рыночных условиях. Вы можете остановить торговлю и запросить вывод доступного баланса в любой момент.

### 1.4. Leverage disclaimer

> Использование плеча многократно увеличивает как потенциальную прибыль, так и потенциальные убытки. Возможна потеря всей маржи и больше при недостаточном балансе.

### 1.5. Strategy disclaimer

> Backtest и paper trading результаты не гарантируют будущую доходность. Рыночные условия могут измениться, и стратегия может перестать работать без предупреждения.

### 1.6. Withdrawal disclaimer

> Вывод средств возможен только после расчета открытых позиций и всех начисленных комиссий. Доступная к выводу сумма может отличаться от текущего equity.

---

## 2. Где показывать (UX requirements)

| Место | Что |
|-------|-----|
| Landing page | Footer disclaimer (короткий) + cookie banner |
| Sign-up flow | Полный risk disclosure modal + checkbox accept |
| First deposit page | Custody disclaimer + accept |
| Start Bot button | Bot disclaimer + leverage warning + accept |
| Strategy selection | Strategy disclaimer per strategy |
| Withdraw page | Withdrawal disclaimer |
| Dashboard top bar | Compact warning (always visible) |
| Statement / Report | Footer disclaimer |

---

## 3. Acceptance tracking

Каждое принятие сохраняется как:

- client_id
- document_type (risk_disclosure / custody_agreement / strategy_acknowledgement_{id} / leverage_warning)
- document_version
- document_hash
- accepted_at (timestamp + IP + user_agent)
- mfa_verified (для critical accept)

Если документ обновляется — клиент должен принять новую версию перед следующей critical action (start bot, withdraw, change strategy).

---

## 4. Запрещенные формулировки (раздел 3 ТЗ)

В UI, marketing, документах ЗАПРЕЩЕНО:

- "гарантированная прибыль" / "guaranteed profit"
- "без риска" / "risk-free" / "no risk"
- "стабильный доход" / "stable income"
- "безопасная торговля" / "safe trading"
- "100% сигнал" / "100% signal" / "always wins"
- "пассивный доход без потерь" / "passive income without losses"
- "вернем деньги" / "money back guarantee" (в смысле компенсации торговых убытков)
- "auto-pilot to wealth", "millionaire bot" и т.п.

Static check: Semgrep правило в .github/workflows/semgrep.yml на эти строки в apps/web/.

---

## 5. Правильные формулировки

- "Торговля фьючерсами связана с высоким риском"
- "Возможна частичная или полная потеря капитала"
- "Результаты в прошлом не гарантируют будущую доходность"
- "Бот работает в рамках заданных риск-лимитов, но не гарантирует прибыль"
- "Клиент может остановить торговлю и запросить вывод доступного баланса"
- "Платформа не несет ответственности за рыночные убытки"
- "Стратегия может приводить к убыткам в неблагоприятных рыночных условиях"

---

## 6. Suitability questionnaire (раздел 55)

Для активации Managed Trading mode клиент проходит:

1. Опыт торговли (years in crypto / TradFi).
2. Понимание fundamentals: leverage, liquidation, funding, stop loss.
3. Опыт с деривативами: yes/no, какие.
4. Понимание риска полной потери.
5. Источник средств (savings / investment portfolio / loan / business).
6. Можете ли позволить себе потерять эту сумму?
7. Финансовые цели и horizon.
8. Annual income / net worth bracket (для tier).

Score определяет:
- Pass — Managed mode разрешен.
- Borderline — Managed разрешен с conservative profile only.
- Fail — Signal-only / Demo only.

Re-take требуется ежегодно или при material change strategy.

---

## 7. Локализация

Тексты должны быть:

- Available на языках клиентов (минимум RU + EN на старте).
- Юридически проверенные на каждом языке.
- Identical hash per language version.

---

## 8. Versioning

- Каждый документ версионирован: risk_disclosure_v1.0, custody_agreement_v1.0, ...
- Изменения требуют Founder approval + legal review.
- Старые версии хранятся (для исторических accept).
- При новой версии — клиенту показывается diff и требуется re-accept.

---

## 9. Acceptance criteria

- [ ] Все 6 disclaimers интегрированы в UI на правильных страницах.
- [ ] Accept tracking работает с MFA на critical actions.
- [ ] Static check ловит запрещенные формулировки в коде.
- [ ] Documents versioned и hash-stamped.
- [ ] Suitability questionnaire blocks Managed mode при fail.
- [ ] Re-acceptance triggered на material changes.
