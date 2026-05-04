---
name: testing-ai-finance-bot
description: Test the AI Finance Telegram bot end-to-end. Use when verifying bot startup, free mode (no YooKassa), market data, AI analysis, or X.com sentiment changes.
---

# Testing AI Finance Bot

## Overview

This is a Telegram bot — there is no browser UI. All testing is done via shell commands and Node.js scripts that exercise internal services directly.

## Devin Secrets Needed

- `OPENAI_API_KEY` — Required for real AI analysis (without it, bot falls back to demo generator)
- `TELEGRAM_BOT_TOKEN` — Required for bot to connect to Telegram
- `ADMIN_CHAT_ID` — Required for admin commands

YooKassa credentials (`YOOKASSA_SHOP_ID`, `YOOKASSA_SECRET_KEY`) are optional — when absent, the bot runs in free mode.

## Setup

1. **Build the project:**
   ```bash
   cd services/telegram-bot && npx tsc --noEmit && npm run build
   ```

2. **Start PostgreSQL** (if not running):
   ```bash
   cd /home/ubuntu/repos/botanalitic && docker compose up -d postgres
   npx prisma migrate deploy --schema=services/telegram-bot/prisma/schema.prisma
   ```

3. **Start the bot** with secrets from environment:
   ```bash
   cd services/telegram-bot
   OPENAI_API_KEY="$OPENAI_API_KEY" \
   TELEGRAM_BOT_TOKEN="$TELEGRAM_BOT_TOKEN" \
   ADMIN_CHAT_ID="$ADMIN_CHAT_ID" \
   node dist/index.js
   ```
   Note: The `.env` file may have empty values for these keys. Pass them explicitly from the shell environment where Devin secrets are available.

4. **Verify startup:**
   ```bash
   curl -s http://localhost:3000/health
   # Expected: {"ok":true}
   ```

## Key Test Scenarios

### Free Mode (no YooKassa)
- When `YOOKASSA_SHOP_ID` and `YOOKASSA_SECRET_KEY` are empty, `YooKassaService.isConfigured` returns `false`
- The `pay:{instrumentId}` callback in `index.ts` skips payment creation and generates analysis directly
- Order status transitions: created → paid → delivered (no payment URL)

### Market Data
- `MarketDataService.getMarketContext(instrumentId)` fetches quote, news, technical analysis, and X.com sentiment in parallel
- Gold uses Yahoo Finance (`GC=F` symbol), crypto uses CoinGecko
- Instrument-to-provider mapping is in `integrations/instrument-mapper.ts`

### AI Analysis
- `AiAnalysisService.generateAnalysis()` uses OpenAI when `OPENAI_API_KEY` is set, falls back to demo generator otherwise
- Real analysis is typically 1500-3000 chars, includes disclaimer
- Market context (quotes, news, sentiment) is passed to the OpenAI prompt for better analysis

### X.com Sentiment
- `XSentimentProvider.getSentiment(instrumentId)` uses `@the-convocation/twitter-scraper` in guest mode
- Guest mode may return `null` (no tweets found) — this is expected graceful behavior
- With Twitter credentials (`TWITTER_USERNAME`, `TWITTER_PASSWORD`, `TWITTER_EMAIL`), search mode is available for better results

## Known Issues & Quirks

- **CoinGecko free tier:** 24h high/low values might be identical to current price. This doesn't break functionality but shows a zero-width range.
- **Yahoo Finance `historical()` deprecated:** May throw `InvalidOptionsError` for `period2: undefined`. The `historicalBars` array will be empty. This is a pre-existing issue — consider migrating to `chart()` API.
- **Yahoo Finance survey notice:** First call prints a deprecation notice to stderr. This is cosmetic only.
- **Bot welcome message:** Still says "AI Market View" in some places (index.ts `/start` handler) — may need updating to "AI Finance".
- **`punycode` deprecation warning:** Node.js prints `[DEP0040]` warning on startup. Cosmetic only.

## Testing Script

A comprehensive test script is at `services/telegram-bot/test-e2e.mjs`. Run it from the `services/telegram-bot` directory:
```bash
cd services/telegram-bot && node test-e2e.mjs
```

It tests: health check, parsePeriodDays, YooKassa isConfigured, CoinGecko quote, MarketDataService, X.com sentiment, and AI analysis.

## Bot Architecture Notes

- **Polling mode:** `bot.launch()` uses long polling (not webhooks)
- **HTTP server:** Express on port 3000, serves `/health`, `/webhooks/yookassa`, admin API
- **Session store:** In-memory (resets on restart)
- **Order store:** Prisma/PostgreSQL when `DATABASE_URL` is set, in-memory otherwise
- **Instrument catalog:** 12 instruments defined in `catalog.ts` (currencies, commodities, stocks, indices, crypto)
