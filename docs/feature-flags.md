# Feature Flags

> Раздел 26.3 ТЗ.

Feature flags хранятся в БД + Redis cache, мутации идут через audit log. Доступны через `packages/config`.

---

## Critical flags

| Flag | Default | Description | Stage |
|------|---------|-------------|-------|
| `realMoneyTrading` | false | Включает реальные ордера на бирже | MVP 4+ |
| `paperTradingOnly` | true | Все ордера в paper mode | MVP 0–3 |
| `withdrawalsEnabled` | false | Глобальный killswitch выводов | per env |
| `botEnabled` | false | Глобальный killswitch торговли | per env |
| `signalsPublic` | false | Публикация сигналов | MVP 3+ |
| `newDepositsEnabled` | false | Прием новых депозитов | per env |
| `subscriptionPaymentsEnabled` | false | Прием subscription payments | MVP 3+ |
| `auditExportEnabled` | true | Compliance reports export | always |

## Provider toggles

| Flag | Values | Description |
|------|--------|-------------|
| `kycProvider` | sumsub / onfido / veriff / persona | Pluggable KYC |
| `amlProvider` | opensanctions / watchman / chainalysis / trm | Pluggable AML |
| `signalProviderEnabled.tradingview` | true/false | TradingView webhook |
| `signalProviderEnabled.twitter` | true/false | Twitter ingestion |
| `signalProviderEnabled.telegram` | true/false | Telegram ingestion |

## Per-feature rollout flags

| Flag | Description |
|------|-------------|
| `strategy.<id>.enabled` | per-strategy live toggle |
| `strategy.<id>.cohort` | percent of clients exposed |
| `exchange.<name>.enabled` | per-exchange toggle |
| `network.<name>.depositsEnabled` | per-network deposit |
| `network.<name>.withdrawalsEnabled` | per-network withdrawal |

## Risk killswitches

| Flag | Description |
|------|-------------|
| `risk.maxLeverageOverride` | global override (cap, никогда выше дефолта) |
| `risk.tradingHaltedReason` | если non-null, бот не торгует platform-wide |
| `risk.withdrawalsHaltedReason` | если non-null, выводы не идут |

---

## Mutation flow

1. Admin (или automated incident response) меняет flag через admin API.
2. Step-up 2FA + reason обязательны.
3. Audit log entry записывается.
4. Cache invalidated в Redis (pub/sub).
5. All services получают обновление.
6. Critical flags (real-money, withdrawals, bot) — Founder approval required.

---

## Naming conventions

- camelCase.
- Намерение, не реализация: `withdrawalsEnabled` (а не `withdrawalsApiOff`).
- Killswitches: явно negative по reason: `tradingHaltedReason`.

---

## Tests

- Каждый critical flag тестируется both states.
- E2E: emergency stop disables bot, withdrawals.
- E2E: real-money trading flag false → no ордеры на реальную биржу.
