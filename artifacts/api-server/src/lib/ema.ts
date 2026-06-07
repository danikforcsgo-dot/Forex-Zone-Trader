import type { Candle } from "./forex-fetcher";
import { logger } from "./logger";

const htfDailyCache: Map<string, { candles: Candle[]; ts: number }> = new Map();
const DAILY_CACHE_TTL_MS = 5 * 60_000; // 5 minutes

interface YahooChartResponse {
  chart: {
    result?: Array<{
      timestamp: number[];
      indicators: {
        quote: Array<{
          open: (number | null)[];
          high: (number | null)[];
          low: (number | null)[];
          close: (number | null)[];
          volume: (number | null)[];
        }>;
      };
    }>;
  };
}

export function calcEMA(candles: Candle[], period: number): number[] {
  if (candles.length < period) return candles.map(() => NaN);
  const k = 2 / (period + 1);
  const result: number[] = [];

  // seed with SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += candles[i]!.close;
    result.push(NaN);
  }
  let ema = sum / period;
  result[period - 1] = ema;

  for (let i = period; i < candles.length; i++) {
    ema = candles[i]!.close * k + ema * (1 - k);
    result.push(ema);
  }

  return result;
}

export async function fetchDailyCandles(yahooSymbol: string): Promise<Candle[]> {
  const cached = htfDailyCache.get(yahooSymbol);
  if (cached && Date.now() - cached.ts < DAILY_CACHE_TTL_MS) return cached.candles;

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=6mo&includePrePost=false`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as YahooChartResponse;
    const result = json?.chart?.result?.[0];
    if (!result) return [];

    const candles: Candle[] = [];
    const q = result.indicators?.quote?.[0];
    if (!q) return [];

    for (let i = 0; i < result.timestamp.length; i++) {
      const o = q.open[i], h = q.high[i], l = q.low[i], c = q.close[i];
      if (o == null || h == null || l == null || c == null) continue;
      candles.push({ timestamp: result.timestamp[i]!, open: o, high: h, low: l, close: c, volume: q.volume[i] ?? 0 });
    }

    htfDailyCache.set(yahooSymbol, { candles, ts: Date.now() });
    return candles;
  } catch (err) {
    logger.warn({ err, yahooSymbol }, "Failed to fetch daily candles for EMA");
    return [];
  }
}

export type DailyBias = "bullish" | "bearish" | "neutral";

export function calcDailyBias(dailyCandles: Candle[], currentPrice: number): DailyBias {
  if (dailyCandles.length < 5) return "neutral";

  const ema20 = calcEMA(dailyCandles, 20);
  const ema50 = calcEMA(dailyCandles, 50);
  const lastEma20 = ema20[ema20.length - 1];
  const lastEma50 = ema50[ema50.length - 1];

  if (!lastEma20 || !lastEma50 || isNaN(lastEma20) || isNaN(lastEma50)) {
    // Fallback: last 5 days trend
    const recent = dailyCandles.slice(-5);
    const bullishDays = recent.filter((c) => c.close > c.open).length;
    if (bullishDays >= 4) return "bullish";
    if (bullishDays <= 1) return "bearish";
    return "neutral";
  }

  // Price above EMA20 above EMA50 → bullish, below → bearish
  if (currentPrice > lastEma20 && lastEma20 > lastEma50) return "bullish";
  if (currentPrice < lastEma20 && lastEma20 < lastEma50) return "bearish";
  if (currentPrice > lastEma20 && currentPrice > lastEma50) return "bullish";
  if (currentPrice < lastEma20 && currentPrice < lastEma50) return "bearish";
  return "neutral";
}
