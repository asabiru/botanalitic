# Техническое задание v1.5

## Custodial Managed Trading Platform + Signal Subscription

### Платформа автоторговли фьючерсами на средства клиентов в USDT + подписка на сигналы

---

## 1. Краткое описание проекта

Проект представляет собой платформу, где клиенты могут:

1. Внести USDT на депозитный адрес платформы.
2. Получить внутренний баланс в системе.
3. Включить автоматическую торговлю фьючерсами.
4. Разрешить торговому боту использовать их средства в рамках выбранной стратегии и риск-лимитов.
5. В любой момент остановить торговлю.
6. После остановки торговли и расчета открытых позиций запросить вывод доступного баланса.
7. Видеть сделки, комиссии, PnL, историю депозитов, выводов и работу бота.

Также проект должен иметь отдельный продукт:

**Signal Subscription** — клиент покупает подписку на торговые сигналы, но не передает средства платформе. В этом режиме клиент сам решает, торговать или нет.

---

## 2. Основная бизнес-модель

### 2.1. Auto Managed Trading

Клиент переводит USDT на платформу.  
Платформа учитывает средства клиента во внутреннем ledger.  
Автоматический бот торгует крипто-фьючерсами по выбранной стратегии.  
Клиент может остановить торговлю и запросить вывод доступных средств.

Платформа зарабатывает на комиссиях:

* комиссия с прибыли;
* комиссия за управление;
* комиссия за использование бота;
* комиссия за вывод, если предусмотрено;
* подписка на сигналы, если клиент выбирает только сигналы.

### 2.2. Signal Subscription

Клиент не переводит средства платформе.  
Он покупает доступ к сигналам и сам принимает торговые решения.

Клиент получает:

* торговые сигналы;
* актив;
* направление: long / short;
* точку входа;
* stop loss;
* take profit;
* уровень риска;
* confidence score;
* историю сигналов;
* статистику сигналов;
* уведомления.

---

## 3. Ключевое юридическое предупреждение

Проект принимает USDT клиентов и торгует ими. Это может подпадать под регулирование:

* custody;
* crypto-asset services;
* investment services;
* portfolio management;
* VASP / CASP;
* AML / KYC;
* санкционного контроля;
* правил торговли деривативами и фьючерсами.

Перед запуском с реальными клиентскими средствами нужно получить юридическое заключение по:

* стране регистрации компании;
* странам клиентов;
* допустимости приема USDT;
* допустимости торговли средствами клиента;
* требованиям к лицензии;
* KYC / AML;
* санкционному скринингу;
* договорам с клиентами;
* раскрытию рисков;
* рекламным ограничениям;
* налогам;
* ответственности за убытки.

В продукте запрещено писать:

* "гарантированная прибыль";
* "без риска";
* "стабильный доход";
* "безопасная торговля";
* "100% сигнал";
* "пассивный доход без потерь".

Правильные формулировки:

* "торговля фьючерсами связана с высоким риском";
* "возможна частичная или полная потеря капитала";
* "результаты в прошлом не гарантируют будущую доходность";
* "бот работает в рамках заданных риск-лимитов, но не гарантирует прибыль";
* "клиент может остановить торговлю и запросить вывод доступного баланса".

---

## 4. Главный принцип продукта

Проект должен быть построен вокруг четырех главных блоков:

1. **Custody & Ledger**  
   Прием USDT, учет средств клиентов, выводы, комиссии, сверка.

2. **Compliance & Risk Disclosure**  
   KYC, AML, санкции, документы, предупреждения о рисках.

3. **Trading & Risk Engine**  
   Бот, стратегии, риск-лимиты, стоп-механизмы, защита от ликвидации.

4. **Client Transparency**  
   Клиент всегда видит баланс, сделки, комиссии, PnL, риски и доступный вывод.

Без ledger, audit log, risk engine, stop-bot, withdrawal control, treasury policy и release gates автоторговлю реальными средствами запускать нельзя.

---

## 5. Роли пользователей

### 5.1. Client

Клиент может:

* зарегистрироваться;
* пройти KYC;
* принять документы;
* внести USDT;
* выбрать режим: сигналы или автоторговля;
* выбрать стратегию;
* выбрать риск-профиль;
* видеть баланс;
* видеть equity;
* видеть realized PnL;
* видеть unrealized PnL;
* видеть комиссии;
* видеть открытые позиции;
* видеть историю сделок;
* остановить торговлю;
* запросить вывод;
* скачать отчет;
* обратиться в поддержку.

### 5.2. Admin

Администратор может:

* управлять клиентами;
* видеть KYC / AML статусы;
* управлять депозитами;
* управлять выводами;
* одобрять выводы;
* отклонять выводы;
* замораживать аккаунты;
* останавливать ботов клиентов;
* запускать emergency stop;
* смотреть ledger;
* смотреть audit log;
* управлять комиссиями;
* настраивать risk limits;
* видеть reconciliation errors;
* управлять стратегиями;
* управлять источниками сигналов.

### 5.3. Trader / Strategy Manager

Может:

* создавать стратегии;
* редактировать стратегии;
* включать стратегии;
* отключать стратегии;
* смотреть эффективность стратегий;
* смотреть paper trading results;
* анализировать сигналы;
* подтверждать торговые идеи, если включен semi-auto режим;
* видеть risk events;
* запускать backtest;
* предлагать улучшения стратегий.

### 5.4. Compliance Officer

Может:

* проверять KYC;
* проверять AML flags;
* проверять санкционные совпадения;
* помечать клиента как high-risk;
* блокировать депозит;
* блокировать вывод;
* замораживать аккаунт;
* добавлять compliance notes;
* запускать manual review;
* экспортировать compliance report.

### 5.5. Support Manager

Может:

* видеть профиль клиента;
* видеть статус депозитов;
* видеть статус выводов;
* видеть обращения клиента;
* создавать support ticket;
* передавать спорные случаи администратору или compliance officer.

Support Manager не должен иметь доступа к секретам, private keys, API keys и критическим финансовым действиям.

---

## 6. Режимы клиента

| Режим | Описание |
| --- | --- |
| Signal Only | Клиент покупает сигналы и сам торгует |
| Demo Trading | Клиент тестирует бота без реальных денег |
| Auto Managed Trading | Клиент внес USDT, бот торгует автоматически |
| Paused | Торговля остановлена, новые сделки не открываются |
| Withdrawal Mode | Позиции закрыты или рассчитаны, клиент может вывести доступный баланс |
| Frozen | Аккаунт заморожен из-за AML/security/risk события |

---

## 7. Custody & Ledger

### 7.1. Основной принцип

Каждое движение средств должно иметь ledger-запись.

Нельзя менять баланс клиента напрямую без ledger entry.

Баланс клиента должен быть:

* либо рассчитан из ledger entries;
* либо материализован как кэш, но с обязательной сверкой с ledger.

### 7.2. Ledger должен учитывать

* депозит клиента;
* подтверждение депозита;
* зачисление на баланс;
* перевод средств в торговый пул;
* открытие позиции;
* использование маржи;
* realized PnL;
* unrealized PnL;
* funding fee;
* trading fee биржи;
* performance fee;
* management fee;
* bot fee;
* withdrawal request;
* withdrawal approval;
* отправку USDT;
* transaction hash;
* ошибку вывода;
* отмену вывода;
* ручную корректировку;
* заморозку средств;
* разморозку средств;
* reconciliation correction.

### 7.3. Ledger-счета

Система должна поддерживать следующие типы счетов:

* Client Available Balance;
* Client Trading Balance;
* Client Locked Margin;
* Client Pending Withdrawal;
* Client Realized PnL;
* Client Unrealized PnL;
* Platform Fee Revenue;
* Exchange Fee Expense;
* Funding Fee;
* Adjustment Account;
* Suspense Account.

### 7.4. Поля ledger entry

Каждая ledger-запись должна содержать:

* id;
* client_id;
* ledger_account_id;
* type;
* amount;
* asset;
* direction: debit / credit;
* reference_type;
* reference_id;
* status;
* created_at;
* created_by;
* metadata;
* audit_hash;
* idempotency_key.

---

## 8. Депозиты USDT

### 8.1. Поддерживаемые сети

Для MVP выбрать одну основную сеть:

* USDT TRC20;

или:

* USDT ERC20.

Не подключать сразу много сетей, чтобы не усложнять учет, AML и поддержку.

### 8.2. Сценарий депозита

1. Клиент открывает страницу Deposit.
2. Выбирает сеть.
3. Получает уникальный депозитный адрес или memo/tag.
4. Отправляет USDT.
5. Blockchain watcher обнаруживает транзакцию.
6. Система ждет нужное количество подтверждений.
7. AML-модуль проверяет источник средств.
8. Если проверка успешна, депозит получает статус confirmed.
9. Ledger зачисляет средства.
10. Клиент видит баланс.

### 8.3. Статусы депозита

* created;
* pending;
* detected;
* confirming;
* aml_review;
* confirmed;
* credited;
* rejected;
* frozen;
* failed.

---

## 9. Вывод средств

### 9.1. Правило доступного баланса

Клиент может вывести только доступный баланс.

Формула:

```text
available_to_withdraw =
client_total_equity
- locked_margin
- pending_fees
- pending_withdrawals
- unresolved_reconciliation_amount
- aml_hold_amount
```

### 9.2. Сценарий вывода

1. Клиент нажимает Withdraw.
2. Система показывает доступный баланс.
3. Клиент вводит адрес и сеть.
4. Система проверяет адрес.
5. Система проверяет AML/security/risk.
6. Создается withdrawal request.
7. Если сумма маленькая и риск низкий — возможен auto approval.
8. Если сумма большая или риск высокий — manual approval.
9. После approval создается transaction.
10. После отправки клиент видит tx hash.
11. Ledger фиксирует списание.

### 9.3. Статусы вывода

* requested;
* pending_review;
* approved;
* rejected;
* processing;
* sent;
* confirmed;
* failed;
* cancelled;
* frozen.

### 9.4. Защита выводов

Обязательные требования:

* нельзя вывести больше доступного баланса;
* нельзя отправить вывод без approval;
* нельзя отправить вывод при critical reconciliation error;
* крупные выводы требуют dual approval;
* выводы high-risk клиентов требуют compliance review;
* все действия по выводу должны попадать в audit log;
* private keys не должны храниться в основном приложении;
* signing service должен быть изолирован.

---

## 10. Stop Trading flow

Клиент должен иметь кнопку **Stop Trading**.

После нажатия:

1. Система запрещает открытие новых сделок.
2. Отменяет неисполненные ордера.
3. Закрывает или постепенно выводит открытые позиции.
4. Рассчитывает realized PnL.
5. Начисляет комиссии.
6. Обновляет available balance.
7. Переводит клиента в Paused или Withdrawal Mode.

Клиенту нужно показать:

* новые сделки больше не открываются;
* открытые позиции закрываются или ожидают закрытия;
* доступный баланс обновится после расчета;
* вывод возможен только для доступного баланса.

---

## 11. Trading System

### 11.1. Bot Engine

Bot Engine отвечает за:

* запуск торговой сессии;
* остановку торговой сессии;
* выбор стратегии;
* получение сигналов;
* расчет размера позиции;
* проверку через risk engine;
* отправку ордеров;
* сопровождение позиции;
* закрытие позиции;
* обработку ошибок;
* запись всех действий в audit log.

### 11.2. Strategy Engine

Стратегии:

* signal-following;
* breakout;
* trend-following;
* mean reversion;
* news momentum;
* social sentiment momentum;
* funding-aware strategy;
* manual analyst strategy.

Каждая стратегия должна иметь:

* id;
* name;
* version;
* status;
* risk_level;
* allowed_assets;
* max_leverage;
* default_stop_loss;
* default_take_profit;
* description;
* historical_metrics;
* backtest_results;
* paper_trading_results.

### 11.3. Execution Engine

Execution Engine отвечает за:

* market order;
* limit order;
* stop market;
* stop limit;
* take profit;
* reduce-only;
* close position;
* cancel order;
* cancel all orders;
* retry policy;
* idempotency keys.

### 11.4. Проверки перед сделкой

Перед каждой сделкой система должна проверить:

* клиент активен;
* KYC/AML пройден;
* стратегия активна;
* бот не остановлен;
* актив разрешен;
* хватает баланса;
* не превышено плечо;
* есть stop loss;
* риск на сделку в лимите;
* дневная просадка в лимите;
* недельная просадка в лимите;
* нет reconciliation error;
* биржа доступна;
* цена актуальна;
* нет emergency stop.

---

## 12. Risk Engine

### 12.1. Лимиты клиента

Для каждого клиента должны быть настройки:

* max risk per trade;
* max leverage;
* max daily drawdown;
* max weekly drawdown;
* max monthly drawdown;
* max open positions;
* max exposure per asset;
* max exposure per strategy;
* max total margin usage;
* max liquidation risk;
* blacklist assets;
* allowed strategies.

### 12.2. Stop-bot события

Бот должен остановиться, если:

* дневная просадка достигла лимита;
* недельная просадка достигла лимита;
* месячная просадка достигла лимита;
* liquidation risk превышен;
* биржа недоступна;
* API возвращает критические ошибки;
* ledger не сходится;
* стратегия ведет себя аномально;
* клиент нажал Stop Trading;
* администратор включил emergency stop;
* compliance заморозил клиента;
* withdrawal mode активирован.

### 12.3. Запрещенные действия бота

Бот не имеет права:

* выводить средства;
* переводить средства между кошельками без ledger;
* открывать сделку без stop loss;
* превышать max leverage клиента;
* превышать риск на сделку;
* торговать после Stop Trading;
* торговать при reconciliation error;
* открывать сделки на весь депозит;
* усреднять позицию без разрешения.

---

## 13. Signal Engine

### 13.1. Источники сигналов

Система должна поддерживать:

* X/Twitter;
* Telegram;
* TradingView webhooks;
* RSS/news;
* manual analyst input;
* биржевые данные;
* open interest;
* funding rate;
* liquidations;
* volume spikes.

### 13.2. Raw signal

Сохранять:

* source;
* raw_text;
* timestamp;
* url;
* author;
* asset_mentions;
* confidence;
* language;
* metadata.

### 13.3. Parsed signal

Из сигнала выделять:

* asset;
* direction: long / short;
* entry;
* stop loss;
* take profit;
* time horizon;
* confidence score;
* source reliability;
* risk score;
* duplicate signals;
* related news.

### 13.4. Scoring

Оценка сигнала от 0 до 100.

Факторы:

| Фактор | Вес |
| --- | ---: |
| Надежность источника | 20% |
| Подтверждение другими источниками | 20% |
| Техническая картина | 20% |
| Risk/reward | 15% |
| Волатильность | 10% |
| Funding/open interest | 10% |
| Новостной фон | 5% |

---

## 14. Комиссии

### 14.1. Виды комиссий

Платформа должна поддерживать:

* performance fee;
* management fee;
* bot fee;
* withdrawal fee;
* subscription fee;
* setup fee, опционально.

### 14.2. Performance fee

Требования:

* комиссия только с realized profit;
* high-water mark обязателен;
* комиссия не берется с unrealized PnL;
* комиссия не берется, пока клиент не восстановил прошлую просадку;
* расчет комиссии должен быть прозрачен клиенту.

### 14.3. High-water mark

Пример:

```text
Initial deposit: 10,000 USDT
Equity after profit: 11,000 USDT
Profit above HWM: 1,000 USDT
Performance fee: 20%
Fee: 200 USDT
New HWM: 11,000 USDT
```

Если баланс падает до 10,500 USDT, новая performance fee не начисляется до превышения 11,000 USDT.

---

## 15. Клиентский кабинет

### 15.1. Главный dashboard

Показывать:

* total deposit;
* current equity;
* available balance;
* locked margin;
* realized PnL;
* unrealized PnL;
* total fees;
* high-water mark;
* active strategy;
* risk profile;
* bot status;
* open positions;
* last trades;
* deposits;
* withdrawals;
* documents status.

### 15.2. Кнопки

* Deposit;
* Start Bot;
* Pause Bot;
* Stop Trading;
* Withdraw;
* Download Report;
* Change Risk Profile;
* Contact Support.

### 15.3. Risk warnings

На всех торговых страницах показывать:

```text
Торговля фьючерсами связана с высоким риском. Возможна частичная или полная потеря капитала. Прошлая доходность стратегии не гарантирует будущие результаты.
```

---

## 16. Админ-панель

### 16.1. Разделы

* Clients;
* KYC/AML;
* Deposits;
* Withdrawals;
* Ledger;
* Trading Pools;
* Bot Sessions;
* Strategies;
* Signals;
* Risk Events;
* Reconciliation;
* Fees;
* Reports;
* Audit Logs;
* Settings.

### 16.2. Critical admin actions

Все критические действия требуют audit log:

* approve withdrawal;
* reject withdrawal;
* freeze account;
* unfreeze account;
* stop client bot;
* emergency stop all;
* manual ledger adjustment;
* change risk limit;
* change fee settings;
* change strategy status.

Для критических действий желательно добавить:

* 2FA;
* step-up authentication;
* dual approval;
* reason/comment required.

---

## 17. Compliance module

### 17.1. KYC

Сохранять:

* client identity status;
* country;
* document verification status;
* address verification;
* source of funds;
* risk level;
* sanctions result;
* PEP status;
* manual review notes.

### 17.2. AML

Проверять:

* входящие транзакции;
* исходящие транзакции;
* адреса кошельков;
* санкционные списки;
* high-risk jurisdictions;
* suspicious transaction patterns;
* rapid deposit-withdrawal behavior;
* mixer exposure;
* darknet exposure, если доступно через провайдера.

### 17.3. Restricted countries

Должен быть список стран, где сервис недоступен.

Клиент из restricted country не должен иметь возможность:

* проходить onboarding;
* вносить средства;
* включать автоторговлю;
* покупать подписку, если это запрещено правилами компании.

---

## 18. Reconciliation

### 18.1. Что сверять

Система должна регулярно сверять:

* blockchain deposits;
* blockchain withdrawals;
* internal ledger;
* exchange balances;
* open positions;
* realized PnL;
* funding fees;
* trading fees;
* fee wallet;
* client balances.

### 18.2. При ошибке сверки

Если найдена ошибка:

* создать reconciliation_error;
* уведомить админа;
* остановить выводы, если ошибка критична;
* остановить новые сделки, если ошибка критична;
* записать audit log;
* показать статус в админке.

---

## 19. База данных

### 19.1. Users & Clients

* users;
* roles;
* permissions;
* clients;
* client_profiles;
* client_risk_profiles;
* client_documents;
* client_sessions.

### 19.2. Compliance

* kyc_profiles;
* kyc_checks;
* aml_checks;
* sanction_checks;
* compliance_notes;
* restricted_countries;
* risk_assessments.

### 19.3. Custody & Ledger

* wallets;
* wallet_addresses;
* client_deposit_addresses;
* deposits;
* withdrawals;
* withdrawal_approvals;
* ledger_accounts;
* ledger_entries;
* client_balances;
* custody_events;
* reconciliation_runs;
* reconciliation_errors.

### 19.4. Trading

* exchanges;
* exchange_accounts;
* trading_pools;
* client_pool_allocations;
* strategies;
* strategy_versions;
* bot_sessions;
* signals_raw;
* signals_parsed;
* trade_ideas;
* orders;
* trades;
* positions;
* risk_events;
* execution_errors.

### 19.5. Fees & Billing

* fee_schedules;
* fee_accruals;
* fee_charges;
* high_water_marks;
* subscriptions;
* invoices;
* payments.

### 19.6. Audit & Reports

* audit_logs;
* admin_actions;
* client_reports;
* system_events;
* notifications;
* support_tickets.

---

## 20. API endpoints

### 20.1. Auth

```text
POST /auth/register
POST /auth/login
POST /auth/logout
POST /auth/2fa/enable
POST /auth/2fa/verify
```

### 20.2. Client

```text
GET /client/dashboard
GET /client/balance
GET /client/positions
GET /client/trades
GET /client/reports
POST /client/risk-profile
POST /client/accept-document
```

### 20.3. Deposits

```text
POST /deposits/address
GET /deposits
GET /deposits/:id
POST /deposits/webhook/blockchain
```

### 20.4. Withdrawals

```text
POST /withdrawals
GET /withdrawals
GET /withdrawals/:id
POST /withdrawals/:id/cancel
POST /admin/withdrawals/:id/approve
POST /admin/withdrawals/:id/reject
```

### 20.5. Bot

```text
POST /bot/start
POST /bot/pause
POST /bot/stop
GET /bot/status
GET /bot/sessions
```

### 20.6. Strategies

```text
GET /strategies
GET /strategies/:id
POST /admin/strategies
PATCH /admin/strategies/:id
POST /admin/strategies/:id/activate
POST /admin/strategies/:id/pause
```

### 20.7. Signals

```text
GET /signals
GET /signals/:id
POST /signals/webhook/tradingview
POST /admin/signals/manual
```

### 20.8. Admin

```text
GET /admin/clients
GET /admin/clients/:id
POST /admin/clients/:id/freeze
POST /admin/clients/:id/unfreeze
GET /admin/ledger
GET /admin/audit-logs
GET /admin/risk-events
POST /admin/emergency-stop
```

---

## 21. Нефункциональные требования

### 21.1. Security

* шифрование секретов;
* 2FA для админов;
* RBAC;
* audit log;
* rate limiting;
* IP allowlist для админки, опционально;
* секреты не логируются;
* withdrawal private keys не доступны основному приложению;
* отдельный signing service;
* hot/cold wallet separation.

### 21.2. Reliability

* idempotency для депозитов, выводов и ордеров;
* retry policy;
* dead letter queue;
* monitoring;
* alerting;
* backup базы;
* disaster recovery plan.

### 21.3. Performance

* dashboard до 2 секунд;
* критические bot/risk проверки до 500 мс;
* reconciliation по расписанию;
* фоновые задачи через queue.

### 21.4. Auditability

Каждое важное действие должно быть воспроизводимо:

* кто сделал;
* когда;
* что изменил;
* почему;
* какой был баланс до/после;
* ссылка на transaction/order/ledger entry.

---

## 22. Рекомендуемый стек

### 22.1. Frontend

* Next.js;
* React;
* TypeScript;
* Tailwind CSS;
* shadcn/ui;
* Recharts/Tremor;
* TanStack Query.

### 22.2. Backend

* NestJS или Fastify;
* PostgreSQL;
* Prisma или Drizzle;
* Redis;
* Temporal;
* BullMQ;
* WebSocket/SSE.

### 22.3. Trading

* CCXT для MVP;
* native exchange SDK для production-критичных операций;
* отдельный execution service;
* отдельный risk service.

### 22.4. Infrastructure

* Docker;
* GitHub Actions;
* staging/prod environments;
* monitoring;
* logs;
* secrets manager;
* backup;
* alerting.

---

## 23. GitHub / open-source инструменты

### 23.1. Agent development

* Ruflo — основной orchestrator;
* `wshobson/agents` — дополнительные agent templates и reviewer-паттерны;
* `VoltAgent/awesome-claude-code-subagents` — каталог subagents и workflow-идей;
* OpenHands — опционально, только для research и изолированных экспериментов.

### 23.2. Trading research

* CCXT — exchange adapter;
* Freqtrade — research/backtesting;
* Hummingbot — reference для trading architecture;
* Jesse / OctoBot / Passivbot — только research-only.

### 23.3. Ledger

Кандидаты:

* Summa Ledger;
* Ledgito Core;
* Midaz.

Перед выбором нужен ADR:

```text
ADR-001: Ledger engine selection
```

### 23.4. Durable workflows

* Temporal — для критических процессов;
* BullMQ — для некритичных фоновых задач.

Temporal использовать для:

* deposit processing;
* withdrawal approval;
* withdrawal sending;
* Stop Trading;
* emergency shutdown;
* reconciliation;
* fee calculation;
* KYC/AML review;
* bot session lifecycle.

### 23.5. Compliance

* OpenSanctions / yente;
* Moov Watchman;
* pluggable AML provider interface.

### 23.6. Security

* Semgrep;
* Opengrep, опционально;
* Gitleaks;
* Trivy;
* CodeQL.

Security scanners обязательны в CI.

### 23.7. Testing

* Playwright;
* Vitest/Jest;
* Testcontainers;
* Mock Exchange Service.

### 23.8. Observability

* Prometheus;
* Grafana;
* Loki / ELK;
* Sentry.

### 23.9. Documentation

* Docusaurus или Mintlify;
* Mermaid;
* Markdown docs в `/docs`.

---

## 24. MVP roadmap

### MVP 0 — Product & Compliance Design

Результат:

* финальное ТЗ;
* роли;
* user flows;
* legal checklist;
* risk disclosure draft;
* architecture diagram;
* database draft.

### MVP 1 — Custody Simulation

Без реальных денег.

Функции:

* регистрация;
* клиентский кабинет;
* demo balance;
* fake deposits;
* ledger;
* fake withdrawals;
* audit log;
* admin panel.

### MVP 2 — Real Deposits + Ledger

С реальными USDT, но без автоторговли.

Функции:

* deposit address;
* blockchain watcher;
* confirmations;
* AML-ready status;
* ledger credit;
* withdrawal request;
* manual approval;
* tx hash;
* reconciliation.

### MVP 3 — Paper Trading Bot

Без риска клиентских средств.

Функции:

* signals;
* strategy engine;
* risk engine;
* paper positions;
* simulated PnL;
* stop-bot;
* strategy metrics.

### MVP 4 — Limited Auto Trading

С малыми лимитами и ручным контролем.

Функции:

* exchange integration;
* real orders;
* strict risk limits;
* emergency stop;
* admin monitoring;
* client stop trading;
* reports.

### MVP 5 — Production Managed Trading

После юридической проверки.

Функции:

* full KYC/AML;
* automated withdrawals with controls;
* multiple strategies;
* multiple exchanges;
* fee automation;
* high-water mark;
* proof/reconciliation reports.

---

## 25. Разработка через Ruflo

### 25.1. Главная идея

Ruflo используется как multi-agent команда разработки.

Агенты должны работать как специалисты в офисе:

* каждый имеет роль;
* каждый имеет зону ответственности;
* каждый предлагает улучшения;
* каждый предупреждает о рисках;
* каждый документирует изменения;
* каждый передает критические решения Founder.

Founder принимает финальные решения.

---

## 26. Все агенты Ruflo и что они делают

### 26.1. Product Architect Agent

Отвечает за продуктовую структуру.

Делает:

* продуктовую спецификацию;
* user flows;
* client journeys;
* роли пользователей;
* MVP scope;
* roadmap;
* acceptance criteria;
* onboarding logic;
* trust-building элементы;
* клиентские сценарии.

Создает файлы:

```text
/docs/product-spec.md
/docs/user-flows.md
/docs/mvp-roadmap.md
/docs/client-journeys.md
```

Должен предлагать:

* улучшения UX;
* новые клиентские сценарии;
* понятные тарифы;
* улучшения onboarding;
* способы повысить доверие;
* улучшения PnL-прозрачности;
* retention-идеи.

Требует Founder approval для:

* изменения бизнес-модели;
* изменения тарифов;
* изменения продуктовых режимов;
* изменения positioning;
* запуска новых клиентских сценариев с реальными деньгами.

### 26.2. Compliance Requirements Agent

Отвечает за compliance checklist.

Делает:

* KYC/AML flow;
* risk disclosure requirements;
* restricted countries logic;
* sanctions screening flow;
* suitability questionnaire;
* список юридических документов;
* предупреждения о рисках;
* правила маркетинговых формулировок.

Создает файлы:

```text
/docs/compliance-checklist.md
/docs/kyc-aml-flow.md
/docs/risk-disclosure-requirements.md
/docs/restricted-countries-policy.md
/docs/suitability-questionnaire.md
```

Должен предлагать:

* улучшения KYC;
* AML risk scoring;
* warning screens;
* dispute handling;
* withdrawal review rules;
* safer marketing wording.

Требует Founder approval для:

* изменения KYC/AML логики;
* изменения risk disclosure;
* restricted countries;
* юридических текстов;
* политики блокировки клиентов.

### 26.3. System Architect Agent

Отвечает за архитектуру системы.

Делает:

* service map;
* module boundaries;
* data flow;
* event flow;
* queue architecture;
* workflow architecture;
* отказоустойчивость;
* feature flags;
* deployment separation.

Создает файлы:

```text
/docs/architecture.md
/docs/service-map.md
/docs/event-flow.md
/docs/workflow-architecture.md
/docs/feature-flags.md
```

Должен предлагать:

* улучшение архитектуры;
* разделение сервисов;
* использование Temporal;
* rollback mechanisms;
* event-driven подход;
* улучшения отказоустойчивости.

Требует Founder approval для:

* крупных архитектурных изменений;
* выбора workflow engine;
* изменения custody architecture;
* изменения production deployment.

### 26.4. Database Architect Agent

Отвечает за базу данных.

Делает:

* PostgreSQL schema;
* Prisma/Drizzle schema;
* индексы;
* constraints;
* migrations;
* ledger data model;
* materialized views;
* database performance review.

Создает файлы:

```text
/docs/database-design.md
/docs/ledger-model.md
/prisma/schema.prisma
/prisma/migrations/
```

Должен предлагать:

* улучшения схемы;
* индексы;
* audit tables;
* ledger improvements;
* reconciliation models;
* constraints для защиты данных.

Требует Founder approval для:

* изменения ledger model;
* изменения client balance logic;
* изменения money tables;
* крупных database redesign.

### 26.5. Custody & Ledger Agent

Отвечает за деньги клиентов.

Делает:

* deposits;
* withdrawals;
* ledger entries;
* client balances;
* reconciliation;
* idempotency;
* withdrawal locking;
* fee accounting.

Создает модули:

```text
/src/modules/ledger
/src/modules/deposits
/src/modules/withdrawals
/src/modules/reconciliation
```

Создает документы:

```text
/docs/ledger-model.md
/docs/withdrawal-flow.md
/docs/reconciliation.md
```

Должен предлагать:

* safer deposit flow;
* withdrawal limits;
* dual approval;
* fee wallet separation;
* hot/cold wallet separation;
* anti-duplicate transaction logic;
* proof-of-solvency идеи.

Требует Founder approval для:

* изменения балансов;
* изменения withdrawal flow;
* изменения fee flow;
* изменения custody model;
* изменения reconciliation policy.

### 26.6. Trading Bot Agent

Отвечает за торгового бота.

Делает:

* bot sessions;
* strategy execution;
* order lifecycle;
* paper trading;
* real trading behind feature flag;
* exchange adapter usage;
* bot health checks;
* error handling.

Создает модули:

```text
/src/modules/bot
/src/modules/strategies
/src/modules/execution
```

Создает документы:

```text
/docs/bot-engine.md
/docs/strategy-engine.md
/docs/execution-engine.md
```

Должен предлагать:

* улучшения execution;
* safer retry logic;
* stop-loss handling;
* exchange fallback;
* paper trading period;
* strategy health checks.

Требует Founder approval для:

* включения real-money trading;
* изменения стратегии;
* изменения логики ордеров;
* изменения поведения бота;
* включения новой биржи.

### 26.7. Risk Engine Agent

Отвечает за риск.

Делает:

* preTradeCheck;
* drawdown checks;
* leverage limits;
* liquidation risk;
* stop-bot conditions;
* exposure limits;
* risk events;
* risk scoring.

Создает модули:

```text
/src/modules/risk
```

Создает документы:

```text
/docs/risk-rules.md
/docs/stop-bot-rules.md
/docs/liquidation-risk.md
```

Должен предлагать:

* более строгие лимиты;
* новые stop-bot условия;
* liquidation protection;
* exposure limits;
* correlation checks;
* volatility-based position sizing.

Требует Founder approval для:

* изменения default risk limits;
* изменения max leverage;
* изменения stop-bot условий;
* изменения правил допуска к торговле.

### 26.8. Signal Engine Agent

Отвечает за сигналы.

Делает:

* raw signals;
* parsed signals;
* scoring;
* источники сигналов;
* TradingView webhook;
* Telegram-ready adapter;
* X/Twitter-ready adapter;
* duplicate detection;
* source reliability scoring.

Создает модули:

```text
/src/modules/signals
```

Создает документы:

```text
/docs/signal-engine.md
/docs/signal-scoring.md
/docs/signal-sources.md
```

Должен предлагать:

* новые источники сигналов;
* фильтры качества;
* fake signal detection;
* source reliability score;
* sentiment scoring;
* anti-manipulation checks.

Требует Founder approval для:

* сигналов, влияющих на реальную торговлю;
* добавления платных источников;
* изменения scoring, если он влияет на bot trading.

### 26.9. Frontend Client Dashboard Agent

Отвечает за клиентский интерфейс.

Делает:

* dashboard клиента;
* баланс;
* deposits UI;
* withdrawals UI;
* bot status;
* PnL UI;
* positions UI;
* trade history;
* risk warnings;
* Stop Trading button;
* Withdraw button.

Создает:

```text
/apps/web/app/client
/apps/web/components/client
```

Должен предлагать:

* улучшение интерфейса;
* понятный PnL;
* страницу "Where is my money?";
* onboarding;
* mobile UX;
* trust-building blocks;
* историю комиссий.

Требует Founder approval для:

* изменения ключевых клиентских сценариев;
* изменения текстов про риски;
* изменения видимости финансовых данных;
* изменения UX, влияющего на решения клиента.

### 26.10. Frontend Admin Dashboard Agent

Отвечает за админку.

Делает:

* clients table;
* deposits dashboard;
* withdrawals queue;
* approval UI;
* ledger viewer;
* bot sessions dashboard;
* risk events dashboard;
* reconciliation dashboard;
* audit logs UI;
* emergency stop UI.

Создает:

```text
/apps/web/app/admin
/apps/web/components/admin
```

Должен предлагать:

* удобную очередь выводов;
* risk command center;
* reconciliation dashboard;
* admin notes;
* fraud flags;
* client health score;
* emergency controls.

Требует Founder approval для:

* изменения critical admin actions;
* emergency stop UI;
* withdrawal approval logic;
* freeze/unfreeze behavior.

### 26.11. Security Agent

Отвечает за безопасность.

Делает:

* auth;
* RBAC;
* 2FA;
* secrets policy;
* API key handling;
* private key isolation;
* secure coding review;
* security scanners;
* step-up authentication;
* admin action protection.

Создает документы:

```text
/docs/security.md
/docs/secrets-management.md
/docs/withdrawal-signing-security.md
```

Настраивает:

```text
/.github/workflows/semgrep.yml
/.github/workflows/gitleaks.yml
/.github/workflows/trivy.yml
/.github/workflows/codeql.yml
```

Должен предлагать:

* passkeys;
* IP allowlist;
* key rotation;
* signing isolation;
* suspicious login detection;
* withdrawal step-up auth;
* admin dual approval.

Требует Founder approval для:

* security model;
* private key architecture;
* production secrets setup;
* withdrawal signing architecture.

### 26.12. QA/Test Agent

Отвечает за тестирование.

Делает:

* unit tests;
* integration tests;
* e2e tests;
* regression checklist;
* edge cases;
* failure simulations;
* test plans.

Создает:

```text
/tests/unit
/tests/integration
/tests/e2e
/docs/test-plan.md
/docs/qa-checklist.md
```

Должен тестировать:

* deposits;
* duplicate webhook;
* withdrawals;
* insufficient balance;
* failed withdrawal;
* ledger consistency;
* fee calculation;
* high-water mark;
* risk engine;
* bot stop;
* exchange errors;
* reconciliation errors.

Должен предлагать:

* stress tests;
* chaos tests;
* exchange outage tests;
* duplicate withdrawal tests;
* Stop Trading failure tests.

Требует Founder approval только если тесты требуют изменения архитектуры.

### 26.13. DevOps Agent

Отвечает за инфраструктуру.

Делает:

* Docker;
* docker-compose;
* CI/CD;
* staging;
* production deployment plan;
* migrations;
* monitoring;
* logging;
* backups;
* runbooks.

Создает:

```text
docker-compose.yml
/.github/workflows/
infra/
docs/deployment.md
docs/runbooks/
```

Должен предлагать:

* monitoring;
* alerting;
* backup strategy;
* rollback;
* staging strategy;
* secrets management;
* incident response;
* runbooks.

Требует Founder approval для:

* production deployment;
* infrastructure provider;
* backup policy;
* secrets management;
* monitoring costs.

### 26.14. Review Agent

Отвечает за финальное ревью.

Делает:

* PR review;
* architecture review;
* security review summary;
* release readiness check;
* blocker detection;
* acceptance criteria check.

Создает:

```text
/docs/review-reports/
```

Должен блокировать release, если:

* withdrawal flow небезопасен;
* ledger не сходится;
* нет risk check перед trade;
* нет audit log;
* нет tests для money/trading logic;
* есть hardcoded secrets;
* бот может торговать после Stop Trading;
* можно вывести больше available balance;
* есть guaranteed profit wording.

Требует Founder approval для:

* release decision;
* acceptance of known risks;
* production launch.

### 26.15. Tooling Research Agent

Отвечает за выбор open-source инструментов.

Делает:

* сравнивает Summa vs Ledgito vs Midaz;
* сравнивает Freqtrade vs Hummingbot vs internal bot;
* выбирает blockchain watcher stack;
* выбирает sanctions screening stack;
* готовит ADR.

Создает:

```text
/docs/adr/001-ledger-engine-choice.md
/docs/adr/002-trading-framework-choice.md
/docs/adr/003-blockchain-watcher-choice.md
/docs/adr/004-compliance-screening-choice.md
```

Должен предлагать:

* лучшие инструменты;
* плюсы/минусы;
* риски зависимостей;
* production vs research-only разделение.

Требует Founder approval для:

* выбора core dependency;
* выбора платного провайдера;
* выбора ledger engine;
* выбора trading engine.

### 26.16. Workflow Agent

Отвечает за Temporal workflows.

Делает:

* DepositProcessingWorkflow;
* WithdrawalApprovalWorkflow;
* WithdrawalSendingWorkflow;
* StopTradingWorkflow;
* EmergencyShutdownWorkflow;
* FeeCalculationWorkflow;
* ReconciliationWorkflow;
* KycReviewWorkflow.

Создает:

```text
/src/workflows
/docs/workflows.md
/docs/state-machines.md
```

Должен предлагать:

* компенсационные действия;
* retry logic;
* timeout logic;
* failure handling;
* idempotency improvements.

Требует Founder approval для:

* изменения critical money workflows;
* изменения withdrawal workflow;
* изменения Stop Trading workflow.

### 26.17. Documentation Agent

Отвечает за документацию.

Делает:

* product docs;
* technical docs;
* API docs;
* runbooks;
* diagrams;
* onboarding docs for developers;
* internal operating procedures.

Создает:

```text
/docs
/docs/runbooks
/docs/api
/docs/diagrams
```

Должен предлагать:

* улучшение структуры документации;
* понятные схемы;
* инструкции для support/admin;
* operating manuals.

Требует Founder approval для:

* публичных документов;
* клиентских формулировок;
* risk/legal текстов.

### 26.18. Treasury Operations Agent

Отвечает за treasury operations.

Делает:

* wallet topology;
* hot/cold rules;
* sweep policy;
* withdrawal liquidity planning;
* wallet inventory;
* treasury runbooks.

Создает:

```text
/docs/treasury-operations.md
/docs/hot-cold-wallet-policy.md
/docs/wallet-replenishment-runbook.md
```

Требует Founder approval для:

* wallet segregation model;
* cold storage policy;
* outgoing treasury limits.

### 26.19. Counterparty Risk Agent

Отвечает за риск контрагентов.

Делает:

* exchange exposure limits;
* venue scorecards;
* provider dependency review;
* exchange outage response rules.

Создает:

```text
/docs/counterparty-risk-policy.md
/docs/exchange-scorecards.md
/docs/venue-failover-rules.md
```

Требует Founder approval для:

* exchange caps;
* onboarding новой биржи;
* failover rules для real-money trading.

### 26.20. Incident Response Agent

Отвечает за incident response.

Делает:

* severity model;
* incident playbooks;
* postmortem templates;
* communication templates;
* freeze matrix.

Создает:

```text
/docs/runbooks/incident-response.md
/docs/postmortem-template.md
/docs/status-communication-templates.md
```

Требует Founder approval для:

* incident public messaging policy;
* freeze matrix for production incidents.

### 26.21. Customer Transparency Agent

Отвечает за клиентскую прозрачность.

Делает:

* statement format;
* fee transparency views;
* "Where is my money?" logic;
* trade explainability;
* trust UX copy.

Создает:

```text
/docs/client-statement-format.md
/docs/client-transparency-principles.md
/docs/trade-explainability.md
```

Требует Founder approval для:

* клиентских финансовых формулировок;
* fee disclosure wording;
* доверительных UX-элементов, влияющих на решение клиента.

### 26.22. Release Governance Agent

Отвечает за release governance.

Делает:

* release gates;
* rollout checklist;
* canary and shadow mode policy;
* known risk register;
* protected branch policy.

Создает:

```text
/docs/release-gates.md
/docs/release-checklist.md
/docs/known-risks-register.md
```

Требует Founder approval для:

* live rollout approval;
* выпуск money-impacting changes с известными рисками.

### 26.23. Data Governance Agent

Отвечает за data governance.

Делает:

* retention policy;
* masking rules;
* legal hold procedures;
* evidence export format;
* access review policy.

Создает:

```text
/docs/data-retention-policy.md
/docs/evidence-export-format.md
/docs/access-review-policy.md
```

Требует Founder approval для:

* deletion policy;
* long-term retention policy;
* evidence disclosure rules.

---

## 27. Агентная модель "как офис"

### 27.1. Основной принцип

Агенты должны работать как офисная команда.

Каждый агент обязан:

* анализировать задачу;
* выполнять свою часть;
* предлагать улучшения;
* предупреждать о рисках;
* документировать предложения;
* передавать критические решения Founder.

Главное правило:

```text
Агенты могут быть инициативными, но не могут самовольно менять стратегию продукта, финансовую логику, custody, ledger, withdrawals, compliance или trading-risk правила.
```

---

## 28. Роль Founder / Product Owner

Founder принимает финальные решения по:

* бизнес-модели;
* тарифам;
* комиссиям;
* юрисдикции;
* риск-профилям;
* запуску реальной торговли;
* запуску приема USDT;
* выбору бирж;
* выбору стратегий;
* бренду и позиционированию;
* roadmap;
* production release;
* critical architecture decisions.

---

## 29. Формат предложений агентов

Каждый агент должен оформлять предложения так:

```text
Proposal ID:
Agent:
Area:
Problem:
Proposed change:
Why it matters:
Impact:
Risk:
Effort:
Priority:
Requires founder approval: yes/no
Recommendation:
```

---

## 30. Decision Board

Создать файл:

```text
/docs/decision-board.md
```

Структура:

```text
# Decision Board

## Pending Decisions

## Approved Decisions

## Rejected Decisions

## Deferred Decisions
```

Каждое предложение агента должно попадать в Decision Board.

---

## 31. RFC-процесс

RFC обязателен для:

* ledger architecture;
* withdrawal architecture;
* trading bot architecture;
* risk engine;
* fee model;
* custody architecture;
* compliance architecture;
* production deployment;
* security model;
* database redesign;
* major frontend redesign;
* new product mode;
* new exchange integration.

Хранить RFC здесь:

```text
/docs/rfc/
```

Формат RFC:

```text
# RFC-XXX: Title

## Author
## Status
## Context
## Proposal
## Options
## Recommendation
## Benefits
## Risks
## Cost / Effort
## Impacted modules
## Decision needed
## Final decision
```

---

## 32. ADR-процесс

Architecture Decision Records обязательны для:

```text
ADR-001: Ledger engine selection
ADR-002: Custody architecture
ADR-003: Blockchain watcher implementation
ADR-004: Trading engine architecture
ADR-005: Temporal vs BullMQ responsibility split
ADR-006: Compliance/sanctions screening provider
ADR-007: Exchange integration approach
ADR-008: Withdrawal signing architecture
ADR-009: Monitoring and alerting stack
ADR-010: Security scanning stack
```

Хранить:

```text
/docs/adr/
```

---

## 33. Daily Agent Report

Ruflo должен собирать ежедневный отчет:

```text
/docs/daily-agent-report.md
```

Формат:

```text
# Daily Agent Report

## Date

## Completed

## In Progress

## Blockers

## New Proposals

## Risks Found

## Next Recommended Actions
```

---

## 34. Weekly Founder Brief

Ruflo должен собирать Founder brief:

```text
/docs/weekly-founder-brief.md
```

Формат:

```text
# Weekly Founder Brief

## Executive Summary
## Product Progress
## Engineering Progress
## Risks
## Decisions Needed
## Agent Recommendations
## Budget / Complexity Notes
## Next Week Plan
```

---

## 35. Приоритеты предложений

Каждое предложение должно иметь priority:

```text
P0 — Critical, blocks launch
P1 — Important, should be done before beta
P2 — Useful improvement
P3 — Future idea
```

---

## 36. Impact score

Каждый агент должен оценивать:

```text
Security impact: Low / Medium / High
Financial impact: Low / Medium / High
Compliance impact: Low / Medium / High
UX impact: Low / Medium / High
Engineering effort: Low / Medium / High
```

---

## 37. Что агенты могут менять самостоятельно

Агенты могут самостоятельно улучшать:

* тесты;
* документацию;
* типизацию;
* обработку ошибок;
* UI polish;
* accessibility;
* empty states;
* refactoring без изменения бизнес-логики;
* helper-функции;
* minor layout changes.

---

## 38. Что агенты не могут менять без Founder approval

Агенты не могут без утверждения менять:

* комиссии;
* клиентский баланс;
* ledger model;
* withdrawal flow;
* custody architecture;
* risk limits;
* trading strategy;
* real-money trading behavior;
* KYC/AML требования;
* юридические тексты;
* private key architecture;
* production deployment;
* emergency stop logic.

---

## 39. Definition of Done

Фича готова, только если:

1. Есть backend/API.
2. Есть frontend, если требуется.
3. Есть DB migration.
4. Есть audit log.
5. Есть tests.
6. Есть error handling.
7. Есть документация.
8. Есть RBAC checks.
9. Есть security review для чувствительных функций.
10. Есть acceptance criteria checklist.
11. Для денег/торговли есть idempotency.
12. Для trading features есть risk check.

---

## 40. Critical acceptance criteria

### 40.1. Ledger

* баланс клиента нельзя изменить без ledger entry;
* сумма debit/credit должна сходиться;
* все операции идемпотентны;
* ручные корректировки требуют причины;
* все корректировки видны в audit log.

### 40.2. Withdrawals

* вывод нельзя создать сверх available balance;
* вывод нельзя отправить без approval;
* high-risk withdrawals попадают в manual review;
* после отправки сохраняется tx hash;
* failed withdrawal корректно отражается в ledger.

### 40.3. Bot

* бот не торгует без активного клиента;
* бот не торгует без risk profile;
* бот не торгует без risk engine approval;
* бот не торгует после Stop Trading;
* бот не открывает сделку без stop loss;
* бот не превышает max leverage;
* бот останавливается при drawdown limit.

### 40.4. Fees

* performance fee считается только с realized profit;
* high-water mark работает;
* комиссия видна клиенту;
* комиссия фиксируется ledger entry.

---

## 41. Структура репозитория

```text
project-root/
  apps/
    web/
      app/
        client/
        admin/
        auth/
      components/
      lib/

  services/
    api/
    worker/
    temporal-worker/
    trading/
    blockchain-watcher/
    reconciliation/
    compliance/

  packages/
    db/
    ledger/
    risk/
    exchange/
    shared/
    ui/
    config/

  docs/
    product-spec.md
    architecture.md
    agent-workflow.md
    compliance-checklist.md
    database-design.md
    ledger-model.md
    risk-rules.md
    api-spec.md
    security.md
    test-plan.md
    decision-board.md
    daily-agent-report.md
    weekly-founder-brief.md
    treasury-operations.md
    counterparty-risk-policy.md
    release-gates.md
    data-retention-policy.md
    client-statement-format.md
    rfc/
    adr/
    runbooks/

  prisma/
    schema.prisma
    migrations/

  tests/
    unit/
    integration/
    e2e/

  infra/
    docker/
    monitoring/
    temporal/
    grafana/
    prometheus/

  .github/
    workflows/
      ci.yml
      semgrep.yml
      codeql.yml
      trivy.yml
      gitleaks.yml

  .claude/
    agents/
    commands/
    hooks/
    settings.json
```

---

## 42. Master prompt для Ruflo

```text
You are Ruflo orchestrating a multi-agent office-style development team.

The Founder is the final decision maker.
Agents must be proactive, but they must not make critical product, financial, custody, trading, compliance, risk or security decisions without Founder approval.

Project:
Custodial crypto managed trading platform.
Clients deposit USDT.
The platform tracks funds in a strict ledger.
An automated bot trades crypto futures with client funds under risk limits.
Clients can stop trading and request withdrawal.
The platform earns fees.
There is also a signal subscription product.

Agent behavior:
Each agent must act like a specialist in an office.
Agents must not only complete assigned tasks, but also propose improvements.
Agents must identify risks, alternatives, tradeoffs and recommended decisions.
Agents must document proposals in /docs/decision-board.md.
Major changes require RFC in /docs/rfc/.
Architecture choices require ADR in /docs/adr/.
Daily progress must be summarized in /docs/daily-agent-report.md.
Weekly or phase-level progress must be summarized in /docs/weekly-founder-brief.md.

For every task, each agent must output:
1. Base implementation
2. Improvement ideas
3. Risks
4. Recommendation
5. Decisions needed from Founder
6. Files changed
7. Tests added
8. Documentation updated

Decision rules:
Agents may autonomously improve tests, docs, typing, error handling, UI polish and refactoring that does not change business logic.

Agents must request Founder approval before changing:
- ledger model
- client balance logic
- withdrawal flow
- custody architecture
- fee model
- high-water mark logic
- trading strategy
- real-money trading behavior
- risk limits
- KYC/AML logic
- legal wording
- private key/signing architecture
- production deployment
- emergency stop logic

Critical project rules:
- No client balance mutation without ledger entry.
- No withdrawal without approval workflow.
- No trade without risk engine approval.
- No bot trading after Stop Trading.
- No order without stop loss.
- No secret keys in code or logs.
- No guaranteed profit wording.
- All money and trading workflows must be idempotent.
- Temporal must be used for critical money/trading workflows.
- Security scanners must run in CI.
- Ledger, withdrawals, fees, risk engine and bot execution require tests.

Office-style outputs:
Maintain:
- /docs/decision-board.md
- /docs/daily-agent-report.md
- /docs/weekly-founder-brief.md
- /docs/rfc/
- /docs/adr/
- /docs/meeting-notes/

The goal:
Build not just a working MVP, but a serious, trustworthy, scalable, office-grade fintech/crypto trading platform where the Founder makes decisions and agents work proactively as a coordinated team.
```

---

## 43. Prompt для каждого агента

```text
You are an expert agent working inside an office-style multi-agent team.

You are expected to be proactive.
Do not only execute the task. Think like a senior specialist.
Suggest improvements that make the product safer, stronger, more scalable, more trustworthy, more beautiful or more profitable.

For every assignment, provide:
- What you implemented
- What you recommend improving
- Risks you discovered
- Decisions the Founder must make
- Whether your proposal is P0/P1/P2/P3
- Whether it requires legal, security or founder review

You may improve non-critical implementation details autonomously.
You must not change critical financial, custody, ledger, trading, withdrawal, compliance, risk or security logic without Founder approval.

All proposals must be added to /docs/decision-board.md.
Major proposals must become RFCs.
Architecture choices must become ADRs.
```

---

## 44. Пример офисного процесса

Founder говорит:

```text
Сделать модуль вывода средств.
```

Ruflo запускает:

* Custody & Ledger Agent;
* Workflow Agent;
* Security Agent;
* Compliance Agent;
* QA/Test Agent;
* Review Agent.

Агенты предлагают:

```text
Custody Agent:
Предлагаю dual approval для выводов выше 5,000 USDT.

Security Agent:
Предлагаю step-up 2FA перед approve withdrawal.

Compliance Agent:
Предлагаю AML review для первого вывода клиента.

QA Agent:
Предлагаю тест duplicate withdrawal request.

Review Agent:
Release нельзя пропускать, если withdrawal не блокируется при reconciliation error.
```

Все попадает в:

```text
/docs/decision-board.md
```

Founder принимает решения:

```text
DEC-014 Approved: dual approval above 5,000 USDT.
DEC-015 Approved: 2FA required for all withdrawal approvals.
DEC-016 Deferred: AML review threshold to be decided after provider selection.
```

После этого агенты реализуют.

---

## 45. Главное правило качества продукта

Каждый агент должен задавать вопрос:

```text
What would make this product feel like a serious financial office, not a toy app?
```

Это должно влиять на:

* прозрачность;
* отчетность;
* аудит;
* риск-контроль;
* админские процессы;
* доверие клиента;
* безопасность операций;
* incident handling;
* support readiness;
* compliance readiness.

---

## 46. Запрещенные инструменты и подходы

Запрещено использовать:

* flash USDT tools;
* fake deposit tools;
* fake balance tools;
* fake transaction tools;
* volume bots;
* wash trading tools;
* инструменты подделки tx hash;
* любые схемы, где депозит засчитывается без реальной on-chain транзакции.

Депозит признается только после:

* реальной on-chain транзакции;
* достаточного количества подтверждений;
* отсутствия критического AML/security flag;
* успешной ledger-записи.

---

## 47. Порядок запуска

Правильный порядок:

1. Документация и архитектура.
2. Ledger simulation.
3. Депозиты и выводы без торговли.
4. Reconciliation.
5. Paper trading.
6. Risk engine.
7. Signal engine.
8. Limited real trading behind feature flag.
9. Security audit.
10. Legal review.
11. Beta с малыми лимитами.
12. Production launch.

---

## 48. Главная рекомендация

Не начинать с бота, который сразу торгует деньгами клиентов.

Начинать нужно с:

1. Ledger.
2. Custody.
3. Withdrawals.
4. Reconciliation.
5. Risk Engine.
6. Audit Log.
7. Compliance.
8. Только потом — реальная торговля.

Для проекта с клиентскими средствами это не дополнительная сложность, а фундамент выживания продукта.

---

## 49. Treasury Operations

### 49.1. Treasury layer

Платформа должна иметь отдельный treasury layer, описывающий операционное управление ликвидностью.

Обязательные элементы:

* deposit collection wallet;
* treasury wallet;
* fee wallet;
* withdrawal wallet;
* cold reserve wallet;
* wallet inventory с назначением каждого кошелька;
* per-network wallet policy;
* wallet ownership registry.

### 49.2. Treasury controls

Обязательные требования:

* hot wallet balance threshold;
* automatic или manual sweep в cold wallet;
* withdrawal wallet replenishment procedure;
* emergency wallet freeze procedure;
* wallet rotation policy;
* address labeling;
* daily outgoing treasury limit;
* manual treasury reconciliation checklist.

### 49.3. Founder approval required

Требуется Founder approval для:

* wallet segregation model;
* treasury sweep policy;
* cold storage policy;
* outgoing liquidity limits.

---

## 50. Withdrawal Address Security

### 50.1. Account-level protections

Система должна поддерживать:

* withdrawal address allowlist;
* cooling-off period после добавления нового адреса;
* withdrawal block после password reset;
* withdrawal block после 2FA reset;
* device-change withdrawal review;
* first withdrawal manual review;
* high-risk address reuse detection;
* whitelist edit audit trail;
* optional per-client daily withdrawal cap;
* optional verified-owner-wallet mode.

### 50.2. Operational rules

* адреса должны проходить форматную и network-проверку;
* изменение allowlist должно логироваться в audit log;
* high-risk withdrawals должны эскалироваться в Compliance;
* критические изменения адреса вывода должны требовать step-up auth.

---

## 51. Daily Equity Snapshots and Client Statements

### 51.1. Immutable snapshots

Система должна создавать:

* end-of-day equity snapshot по каждому клиенту;
* daily realized PnL snapshot;
* daily unrealized PnL snapshot;
* daily fee accrual snapshot;
* historical high-water mark timeline.

### 51.2. Client statements

Платформа должна поддерживать:

* monthly statement generation;
* CSV export;
* PDF export;
* client-visible "what changed today" summary;
* inclusion of reconciliation status in reports.

### 51.3. Value

Этот слой нужен для:

* клиентского доверия;
* споров по начислениям и выводу;
* tax/reporting use cases;
* institutional-feel продукта.

---

## 52. Trade Explainability and Execution Quality

### 52.1. Explainability

Каждая исполненная сделка должна быть связана с:

* signal source;
* parsed signal;
* strategy version;
* risk approval result;
* bot session;
* stop-loss / take-profit parameters.

### 52.2. Client-facing transparency

Для клиента должна быть доступна панель:

* why this trade happened;
* какой сигнал был использован;
* какая стратегия его интерпретировала;
* какой риск-чек был пройден;
* какой был размер позиции и почему.

### 52.3. Execution quality

Система должна сохранять:

* slippage;
* expected vs actual fill;
* retry history;
* partial fill behavior;
* cancel-replace chain;
* execution delay metrics.

---

## 53. Counterparty Risk Management

### 53.1. Venue-level controls

Платформа должна учитывать не только риск клиента, но и риск внешних контрагентов.

Нужно поддерживать:

* exchange concentration limits;
* exposure cap per exchange;
* exchange health monitoring;
* exchange withdrawal status monitoring;
* exchange API degradation states;
* venue-specific emergency de-risking rules;
* counterparty risk score per exchange/provider.

### 53.2. Operational workflows

Должен существовать manual "reduce exposure" workflow при:

* ухудшении состояния биржи;
* росте операционного риска;
* проблемах с выводом с биржи;
* сбоях API;
* регуляторных рисках по контрагенту.

---

## 54. Incident Response and Client Communications

### 54.1. Severity model

Инциденты должны классифицироваться как:

* SEV-1;
* SEV-2;
* SEV-3;
* SEV-4.

### 54.2. Incident command

Должны быть определены:

* incident commander;
* owner по коммуникациям;
* owner по технике;
* owner по compliance escalation;
* postmortem owner.

### 54.3. Freeze matrix

Система должна уметь отдельно:

* freeze withdrawals only;
* freeze trading only;
* freeze both trading and withdrawals.

### 54.4. Communication requirements

Нужны:

* client communication templates;
* admin communication timeline;
* internal escalation checklist;
* regulator/compliance escalation checklist;
* postmortem template;
* status page или internal incident dashboard.

---

## 55. Derivatives Suitability and Product Access Matrix

### 55.1. Suitability

Для managed futures режима должны существовать:

* derivatives suitability questionnaire;
* leverage knowledge check;
* risk acknowledgement before first live session;
* periodic re-acknowledgement после material strategy changes.

### 55.2. Product access matrix

Платформа должна поддерживать матрицу допуска по:

* country;
* KYC status;
* AML risk level;
* suitability result;
* client risk profile;
* product mode.

### 55.3. Fallback mode

Если клиент не подходит под managed futures mode, система может разрешать:

* signals only;
* demo trading;
* read-only access к исторической аналитике.

---

## 56. Support Case Management

### 56.1. Support workflow

Support должен работать через структурированную case model:

* ticket severity;
* ticket category;
* client timeline;
* internal note types;
* attachments/evidence;
* SLA metrics.

### 56.2. Case categories

Минимум:

* deposit issue;
* withdrawal issue;
* KYC resubmission;
* bot behavior question;
* fee dispute;
* account security concern;
* compliance review;
* technical bug.

### 56.3. Internal note types

* support note;
* compliance note;
* finance note;
* fraud note.

---

## 57. Live Trading Release Gates

### 57.1. Rollout stages

Для money-impacting trading features обязателен staged rollout:

* shadow mode;
* paper/live comparison period;
* canary cohort rollout;
* limited live rollout;
* broader release.

### 57.2. Mandatory controls

* release checklist;
* rollback playbook;
* independent real-trading kill switch;
* release freeze during unresolved critical reconciliation incident;
* founder approval before broader real-money rollout.

### 57.3. Strategy rollout

Каждая новая strategy version должна проходить:

* backtest review;
* paper results review;
* risk review;
* limited live cohort;
* post-launch monitoring window.

---

## 58. Data Governance and Evidence Preservation

### 58.1. Retention

Нужна retention policy по классам данных:

* audit logs;
* ledger entries;
* KYC data;
* AML results;
* client statements;
* chat/support records;
* operational logs.

### 58.2. Evidence preservation

Платформа должна поддерживать:

* immutable audit retention;
* evidence bundle export;
* legal hold mode;
* masked views for sensitive fields;
* access review policy.

### 58.3. Correlation

Во всех сервисах должен использоваться correlation ID для связи:

* API request;
* workflow run;
* ledger action;
* order lifecycle;
* audit record;
* support case.

---

## 59. Claude Code and GitHub Office Automation Layer

### 59.1. Claude project layer

В репозитории должна быть структура:

```text
/.claude/
  agents/
  commands/
  hooks/
  settings.json
```

Использование:

* project-specific subagents;
* reusable slash commands;
* hooks для policy enforcement;
* shared project settings.

### 59.2. Required Claude capabilities

Должны использоваться:

* subagents;
* slash commands;
* hooks;
* shared settings;
* MCP integrations.

### 59.3. Recommended subagents

* ledger reviewer;
* withdrawal reviewer;
* security reviewer;
* compliance reviewer;
* frontend trust reviewer;
* ADR writer;
* postmortem writer.

### 59.4. Recommended project commands

* `/rfc`
* `/adr`
* `/proposal`
* `/release-check`
* `/money-feature-check`
* `/incident-report`
* `/founder-brief`

### 59.5. Recommended hooks

* block edits to critical money modules without linked founder decision or RFC;
* require proposal output when critical modules are touched;
* remind about tests for ledger/risk/withdrawal/bot changes;
* update decision-board after critical proposals;
* run targeted validation after sensitive edits.

### 59.6. Recommended MCP stack

* GitHub MCP server;
* filesystem MCP;
* PostgreSQL MCP;
* Playwright MCP;
* optional internal docs/search MCP.

---

## 60. GitHub Governance, Security and Delivery Controls

### 60.1. Repository governance

Нужно добавить:

* CODEOWNERS для critical folders;
* repository rulesets или branch protection;
* required status checks;
* merge queue для protected branches;
* required reviewers для production deploys;
* protected environments `staging` и `production`.

### 60.2. Security and supply chain

Обязательные controls:

* CodeQL;
* secret scanning;
* push protection;
* Dependabot;
* dependency review action;
* artifact attestations;
* signed release workflow where practical;
* SBOM generation, если принята в infra policy.

### 60.3. Delivery operations

Нужно добавить:

* issue forms для RFC, incident, bug, proposal, release request;
* PR template с risk/compliance/test checklist;
* release template для beta/live rollout;
* GitHub Projects board со статусами:
  * founder approval needed;
  * risk level;
  * money impact;
  * compliance impact;
  * release gate status.

### 60.4. Principle

Все критические финансовые, custody, withdrawal, risk и trading changes должны быть защищены не только документацией, но и repository-level controls, agent workflow policies и release gates в GitHub и Claude project settings.

