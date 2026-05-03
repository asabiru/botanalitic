# Risk Rules

> Раздел 12 ТЗ + Risk Engine Agent (раздел 26.7 ТЗ).

---

## 1. Pre-trade checks (раздел 11.4 ТЗ)

Перед каждой сделкой Risk Engine ОБЯЗАТЕЛЬНО проверяет:

- [ ] клиент активен (status = active)
- [ ] KYC/AML пройден
- [ ] стратегия активна
- [ ] бот не остановлен (bot_session.status = active)
- [ ] актив разрешен (whitelist стратегии и risk_profile.blacklist_assets)
- [ ] хватает баланса (CLIENT_TRADING > required_margin)
- [ ] не превышено max_leverage
- [ ] есть stop loss
- [ ] риск на сделку в лимите (max_risk_per_trade)
- [ ] дневная просадка в лимите
- [ ] недельная просадка в лимите
- [ ] месячная просадка в лимите
- [ ] нет reconciliation_error со статусом open
- [ ] биржа доступна (health check)
- [ ] цена актуальна (mark_price age < threshold)
- [ ] нет emergency stop
- [ ] нет AML hold
- [ ] нет critical risk_event

При false на любом — order rejected, risk_event создан.

---

## 2. Лимиты клиента (раздел 12.1 ТЗ)

Per-client risk profile содержит:

| Limit | Описание | Default conservative | Default balanced | Default aggressive |
|-------|----------|----------------------|------------------|--------------------|
| max_risk_per_trade | % equity, рискуемый на одну сделку | 0.5% | 1% | 2% |
| max_leverage | Максимальное плечо | 3x | 5x | 10x |
| max_daily_drawdown | Дневная просадка stop | 3% | 5% | 8% |
| max_weekly_drawdown | Недельная просадка stop | 7% | 10% | 15% |
| max_monthly_drawdown | Месячная просадка stop | 15% | 20% | 30% |
| max_open_positions | Максимум открытых позиций | 3 | 5 | 10 |
| max_exposure_per_asset | % equity на актив | 25% | 35% | 50% |
| max_exposure_per_strategy | % equity на стратегию | 50% | 75% | 100% |
| max_total_margin_usage | % equity в маржу | 30% | 50% | 70% |
| blacklist_assets | Запрещенные активы | shitcoins | shitcoins | none |

Defaults — рекомендация Risk Agent. Финальные значения — DEC от Founder.

---

## 3. Stop-bot события (раздел 12.2 ТЗ)

Бот ОБЯЗАН остановиться, если:

1. дневная просадка достигла лимита
2. недельная просадка достигла лимита
3. месячная просадка достигла лимита
4. liquidation risk превышен (mark_price близок к liquidation_price)
5. биржа недоступна (X consecutive failures)
6. API возвращает критические ошибки
7. ledger не сходится (reconciliation_error severity=critical)
8. стратегия ведет себя аномально (anomaly score > threshold)
9. клиент нажал Stop Trading
10. администратор включил emergency stop
11. compliance заморозил клиента
12. withdrawal mode активирован

Stop-bot создает risk_event с severity=high|critical, обновляет bot_session.status = stopped.

---

## 4. Запрещенные действия бота (раздел 12.3 ТЗ)

Бот НЕ ИМЕЕТ ПРАВА:

- выводить средства
- переводить средства между кошельками без ledger entry
- открывать сделку без stop loss
- превышать max_leverage клиента
- превышать риск на сделку
- торговать после Stop Trading
- торговать при reconciliation_error (severity high+)
- открывать сделки на весь депозит
- усреднять позицию без разрешения стратегии

Эти правила enforced на уровне Risk Engine + Semgrep static checks.

---

## 5. Liquidation protection

- Sliding alert: при mark_price достигает 70% liquidation -> warning event.
- При 85% liquidation -> auto reduce position (если стратегия позволяет) или alert manual review.
- При 95% liquidation -> immediate close (market order, reduce-only).

Liquidation buffer должен быть включен в pre-trade size calculation.

---

## 6. Drawdown calculation

- daily_drawdown = (start_of_day_equity - current_equity) / start_of_day_equity
- weekly_drawdown — относительно equity начала недели UTC
- monthly_drawdown — относительно equity начала месяца UTC
- HWM-based drawdown — отдельный counter для performance fee context

Snapshots делаются ежедневно (раздел 51 ТЗ).

---

## 7. Exposure checks

- per_asset_exposure = SUM(open_position_notional[asset]) / total_equity
- per_strategy_exposure = SUM(open_position_notional[strategy]) / total_equity
- total_margin_usage = SUM(locked_margin) / total_equity
- При нарушении любого — pre-trade check fails.

---

## 8. Volatility-based sizing (рекомендация Risk Agent)

Вместо фиксированного % equity — учитывать ATR:

```
position_size = (max_risk_per_trade * equity) / (atr * atr_multiplier)
```

Это снижает экспозицию в высокой волатильности.

P2 priority — после MVP 4.

---

## 9. Correlation checks (рекомендация Risk Agent)

Проверка corr между открытыми позициями: если 2+ позиции с corr > 0.8 — суммарный risk_per_trade считается как одна позиция.

P3 priority.

---

## 10. Emergency stop (раздел 16.2 ТЗ)

Ручная процедура:

1. Admin клик Emergency Stop в админке.
2. 2FA verification + dual approval + reason.
3. Workflow:
   - все bot_sessions переводятся в status = stopped
   - все open orders отменяются (cancel_all per exchange_account)
   - открытые позиции — close или freeze (config-driven)
   - feature flag botEnabled = false
4. Notification всем клиентам с активными ботами.
5. Audit log + system_event.
6. Postmortem обязателен.

---

## 11. Risk events catalog

| type | severity | trigger | action |
|------|----------|---------|--------|
| drawdown_warning | low | drawdown >= 50% от лимита | log, notify |
| drawdown_stop | high | drawdown >= лимита | stop bot session |
| liquidation_warning | medium | mark_price близок | warn, throttle new orders |
| liquidation_imminent | critical | mark_price near liquidation | emergency close |
| leverage_breach | high | order would exceed max_leverage | reject order |
| strategy_anomaly | medium | strategy score outlier | pause session, notify |
| kill_switch_manual | critical | admin emergency stop | platform-wide stop |
| reconciliation_critical | critical | ledger mismatch | freeze withdrawals + new trades |
| exchange_health_degraded | medium | exchange API errors > threshold | throttle, fallback |

---

## 12. Tests obligatorio

- Unit: каждый pre-trade check rejects соответствующий невалидный кейс.
- Integration: stop-bot triggers при превышении лимита, генерируется risk_event.
- E2E: emergency stop останавливает все боты в течение N секунд.
- Regression: после Stop Trading бот не открывает новые ордера (даже если приходит сигнал).
- Property test: невозможно открыть позицию с margin > available trading balance.
