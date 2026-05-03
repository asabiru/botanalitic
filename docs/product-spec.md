# Product Specification

> Выжимка из ТЗ v1.5 для быстрого онбординга агентов и команды.

## 1. Что это

Custodial Managed Trading Platform + Signal Subscription:

1. **Auto Managed Trading** — клиент вносит USDT, бот торгует крипто-фьючерсами по выбранной стратегии в рамках риск-лимитов; клиент может остановить торговлю и вывести доступный баланс.
2. **Signal Subscription** — клиент покупает доступ к торговым сигналам и сам принимает торговые решения; средства платформе не передает.

## 2. Бизнес-модель

Источники дохода:

- Performance fee (% от realized profit с HWM)
- Management fee (% годовых от AUM)
- Bot fee (фикс или % за использование бота)
- Withdrawal fee (опционально)
- Subscription fee (signal-only режим)
- Setup fee (опционально)

## 3. Целевые пользователи

- Розничные крипто-трейдеры, которые хотят systematic exposure без ручной торговли.
- Подписчики на сигналы (self-directed traders).
- Не подходит для: US persons (без лицензии), restricted countries, клиентов без подходящего risk profile.

## 4. Что НЕ делаем

- Не принимаем фиат — только USDT (TRC20 или ERC20 в MVP).
- Не торгуем спотом в MVP — только крипто-фьючерсы (perpetuals).
- Не предлагаем "гарантированную прибыль", "пассивный доход", "безрисковую торговлю" (раздел 3 ТЗ).
- Не запускаем real-money trading без юридического заключения.

## 5. Режимы клиента (раздел 6 ТЗ)

| Режим | Описание |
|-------|----------|
| Signal Only | Клиент покупает сигналы и сам торгует |
| Demo Trading | Клиент тестирует бота без реальных денег |
| Auto Managed Trading | Клиент внес USDT, бот торгует автоматически |
| Paused | Торговля остановлена, новые сделки не открываются |
| Withdrawal Mode | Позиции закрыты, клиент может вывести доступный баланс |
| Frozen | Аккаунт заморожен из-за AML/security/risk события |

## 6. Главный value prop для клиента

- Прозрачный ledger каждого движения средств.
- Stop Trading кнопка работает гарантированно.
- High-water mark на performance fee.
- Risk engine не дает боту делать глупости.
- Audit log на всё.
- Понятные комиссии без скрытых начислений.

## 7. Главные принципы продукта (раздел 4 ТЗ)

1. Custody & Ledger
2. Compliance & Risk Disclosure
3. Trading & Risk Engine
4. Client Transparency

## 8. Принцип запуска (раздел 47–48 ТЗ)

Сначала ledger, custody, withdrawals, reconciliation, risk engine, audit log, compliance — и только потом реальная торговля.

## 9. KPI продукта

- AUM (Assets Under Management)
- Active clients
- Average client deposit
- Bot uptime per session
- Performance fee revenue
- Withdrawal turnaround time
- Reconciliation error rate (должен быть 0 на production)
- NPS / Trust Score

## 10. Acceptance Criteria для MVP launch (раздел 40 ТЗ)

### Ledger
- баланс клиента нельзя изменить без ledger entry
- сумма debit/credit сходится
- все операции идемпотентны
- ручные корректировки требуют причины и audit log

### Withdrawals
- вывод нельзя создать сверх available balance
- вывод нельзя отправить без approval
- high-risk withdrawals — manual review
- после отправки сохраняется tx hash
- failed withdrawal корректно отражается в ledger

### Bot
- бот не торгует без активного клиента, risk profile, risk approval
- бот не торгует после Stop Trading
- бот не открывает сделку без stop loss
- бот не превышает max leverage
- бот останавливается при drawdown limit

### Fees
- performance fee только с realized profit
- HWM работает
- комиссия видна клиенту
- комиссия фиксируется ledger entry
