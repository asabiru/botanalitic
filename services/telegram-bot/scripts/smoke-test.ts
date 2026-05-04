/**
 * End-to-end smoke test for the AI analysis pipeline.
 * Runs the full MarketDataService + AiAnalysisService for several instruments
 * to validate that all 6 audit fixes work with real data and real GPT.
 *
 * Usage: npx tsx scripts/smoke-test.ts
 */

import "dotenv/config";
import { MarketDataService } from "../src/integrations/market-data.service.js";
import { AiAnalysisService } from "../src/ai-analysis.js";
import { findInstrumentById } from "../src/catalog.js";
import { isOpenAIConfigured } from "../src/integrations/ai/openai-client.js";

const cases: Array<{
  label: string;
  instrumentId: string;
  ticker?: string;
  highlight: string;
}> = [
  {
    label: "AAPL (US stock)",
    instrumentId: "us-stocks",
    ticker: "AAPL",
    highlight: "Yahoo Finance retry/fallback + getFundamentals + GPT analyzer",
  },
  {
    label: "TEAM (Atlassian, US stock)",
    instrumentId: "us-stocks",
    ticker: "TEAM",
    highlight: "Repro for user-reported timeout — should complete in <10s",
  },
  {
    label: "SBER (MOEX stock)",
    instrumentId: "ru-stocks",
    ticker: "SBER",
    highlight: "TradingView russia/scan (RUS:SBER) + GPT analyzer",
  },
  {
    label: "GOLD",
    instrumentId: "gold",
    highlight: "Yahoo + dynamic ATR levels + GPT",
  },
];

function preview(text: string, n = 8000): string {
  return text.length > n ? text.slice(0, n) + "\n…[truncated]" : text;
}

async function main(): Promise<void> {
  console.log(`OpenAI configured: ${isOpenAIConfigured()}`);
  console.log(`OpenAI model: ${process.env.OPENAI_MODEL ?? "(default)"}`);
  console.log("");

  const market = new MarketDataService();
  const analyzer = new AiAnalysisService();

  for (const c of cases) {
    console.log(`\n========== ${c.label} ==========`);
    console.log(`Highlight: ${c.highlight}`);
    const instrument = findInstrumentById(c.instrumentId);
    if (!instrument) {
      console.error(`  Instrument ${c.instrumentId} not found`);
      continue;
    }
    const t0 = Date.now();
    let context;
    try {
      context = await market.getMarketContext(c.instrumentId, c.ticker);
    } catch (err) {
      console.error(`  getMarketContext failed:`, (err as Error).message);
      continue;
    }
    const t1 = Date.now();
    console.log(`  Market context fetched in ${t1 - t0}ms`);
    if (context.quote) {
      console.log(
        `  quote: price=${context.quote.price.toFixed(2)} change=${context.quote.changePercent.toFixed(2)}% vol=${context.quote.volume ?? "n/a"}`,
      );
    } else {
      console.log("  quote: NULL");
    }
    console.log(`  history bars: ${context.historicalBars?.length ?? 0}`);
    console.log(`  news: ${context.news?.length ?? 0}`);
    console.log(
      `  technical: ${context.technicalSummary ?? "NULL"} (recommend=${context.technicalRecommend ?? "n/a"})`,
    );
    console.log(`  sentiment: ${context.sentiment ? `${context.sentiment.label} score=${context.sentiment.score}` : "NULL"}`);
    if (context.fundamentals) {
      const f = context.fundamentals;
      console.log(
        `  fundamentals: P/E=${f.peRatio} fwdP/E=${f.forwardPe} EPS=${f.eps} divYield=${f.dividendYield} mcap=${f.marketCap} 52w=[${f.low52w}–${f.high52w}]`,
      );
    } else {
      console.log("  fundamentals: NULL");
    }

    let result;
    try {
      result = await analyzer.generateAnalysis({
        instrument,
        ticker: c.ticker,
        marketContext: context,
      });
    } catch (err) {
      console.error("  generateAnalysis failed:", (err as Error).message);
      continue;
    }
    const t2 = Date.now();
    console.log(`  Analysis ready in ${t2 - t1}ms`);
    console.log(`  charts: ${result.charts.length}`);
    console.log("--- report preview ---");
    console.log(preview(result.text));
  }
}

main().catch((err) => {
  console.error("smoke test failed:", err);
  process.exit(1);
});
