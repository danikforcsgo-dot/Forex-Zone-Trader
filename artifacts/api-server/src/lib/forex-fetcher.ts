import { logger } from "./logger";

export const PAIRS = [
  { symbol: "GBPUSD", displayName: "GBP/USD", yahooSymbol: "GBPUSD=X" },
  { symbol: "NZDUSD", displayName: "NZD/USD", yahooSymbol: "NZDUSD=X" },
  { symbol: "EURUSD", displayName: "EUR/USD", yahooSymbol: "EURUSD=X" },
  { symbol: "AUDUSD", displayName: "AUD/USD", yahooSymbol: "AUDUSD=X" },
  { symbol: "USDJPY", displayName: "USD/JPY", yahooSymbol: "USDJPY=X" },
  { symbol: "USDCHF", displayName: "USD/CHF", yahooSymbol: "USDCHF=X" },
  { symbol: "USDCAD", displayName: "USD/CAD", yahooSymbol: "USDCAD=X" },
];

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ForexQuote {
  symbol: string;
  displayName: string;
  currentPrice: number;
  bid: number;
  ask: number;
  open: number;
  previousClose: number;
  change: number;
  changePct: number;
  candles: Candle[];
}

// Cache to avoid hammering Yahoo Finance
const cache: Map<string, { data: ForexQuote; ts: number }> = new Map();
const CACHE_TTL_MS = 5_000; // 5 seconds

export async function fetchPairData(yahooSymbol: string): Promise<ForexQuote | null> {
  const cached = cache.get(yahooSymbol);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=15m&range=5d&includePrePost=false`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      logger.warn({ yahooSymbol, status: res.status }, "Yahoo Finance returned non-200");
      return null;
    }

    const json = (await res.json()) as YahooChartResponse;
    const result = json?.chart?.result?.[0];
    if (!result) return null;

    const timestamps = result.timestamp ?? [];
    const q = result.indicators?.quote?.[0];
    if (!q || timestamps.length === 0) return null;

    const opens = q.open ?? [];
    const highs = q.high ?? [];
    const lows = q.low ?? [];
    const closes = q.close ?? [];
    const volumes = q.volume ?? [];

    const candles: Candle[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (
        opens[i] == null || highs[i] == null ||
        lows[i] == null || closes[i] == null
      ) continue;
      candles.push({
        timestamp: timestamps[i],
        open: opens[i]!,
        high: highs[i]!,
        low: lows[i]!,
        close: closes[i]!,
        volume: volumes[i] ?? 0,
      });
    }

    if (candles.length === 0) return null;

    const meta = result.meta;
    const currentPrice = meta.regularMarketPrice ?? candles[candles.length - 1]!.close;
    const previousClose = meta.previousClose ?? meta.chartPreviousClose ?? currentPrice;
    const change = currentPrice - previousClose;
    const changePct = previousClose !== 0 ? (change / previousClose) * 100 : 0;

    const data: ForexQuote = {
      symbol: meta.symbol.replace("=X", ""),
      displayName: meta.symbol.replace("=X", "").replace(/([A-Z]{3})([A-Z]{3})/, "$1/$2"),
      currentPrice,
      bid: currentPrice - 0.00005,
      ask: currentPrice + 0.00005,
      open: meta.regularMarketOpen ?? currentPrice,
      previousClose,
      change,
      changePct,
      candles,
    };

    cache.set(yahooSymbol, { data, ts: Date.now() });
    return data;
  } catch (err) {
    logger.error({ err, yahooSymbol }, "Failed to fetch forex data from Yahoo Finance");
    return null;
  }
}

export async function fetchAllPairs(): Promise<(ForexQuote & { pairInfo: typeof PAIRS[0] })[]> {
  const results = await Promise.allSettled(
    PAIRS.map(async (pair) => {
      const data = await fetchPairData(pair.yahooSymbol);
      if (!data) return null;
      return { ...data, symbol: pair.symbol, displayName: pair.displayName, pairInfo: pair };
    })
  );

  return results
    .filter((r): r is PromiseFulfilledResult<NonNullable<(ForexQuote & { pairInfo: typeof PAIRS[0] }) | null>> =>
      r.status === "fulfilled" && r.value !== null
    )
    .map((r) => r.value!);
}

// Yahoo Finance response type (partial)
interface YahooChartResponse {
  chart: {
    result?: Array<{
      meta: {
        symbol: string;
        regularMarketPrice: number;
        previousClose: number;
        chartPreviousClose: number;
        regularMarketOpen: number;
      };
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
    error?: unknown;
  };
}
