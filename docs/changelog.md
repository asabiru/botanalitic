# Changelog — AI Market View Bot

---

## 2025-05-03

### Маркет — Market Data Engineer
- Создан слой интеграции с рыночными данными
- Yahoo Finance: акции США, commodities, FX
- MOEX ISS: акции РФ, IMOEX, RGBI
- CoinGecko: криптовалюты
- ЦБ РФ: курсы валют
- Investing.com RSS: новости рынков (4 фида по категориям)
- Bloomberg RSS: новости
- TradingView: технический анализ (strong_buy/buy/neutral/sell/strong_sell)
- X.com: sentiment (интерфейс готов, заглушка до получения API ключа)
- In-memory кэш с TTL (котировки 60с, история 5мин, новости 15мин)
- Маппинг инструментов на провайдеры
- MarketDataService с методом getMarketContext()
- Интеграция реальных данных в демо-аналитику (ai-analysis.ts)
- Обновлены app-context.ts и index.ts
