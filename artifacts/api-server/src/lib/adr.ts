/**
 * ADR — Average Daily Range
 * Calculated from daily candles over the last 14 days.
 * Shows what % of the typical daily move has already been consumed today.
 */

import { logger } from "./logger";

export type AdrRisk = "low" | "medium" | "high" | "very_high" | "unknown";

export interface AdrResult {
  adrPips: number | null;
  todayRangePips: number | null;
  adrPercent: number | null;
  adrRisk: AdrRisk;
}

interface DayCandle {
  high: number;
  low: number;
  open: number;
  close: number;
  timestamp: number;
}

interface YahooResponse {
  chart: {
    result?: Array<{
      timestamp: number[];
      indicators: {
        quote: Array<{
          open: (number | null)[];
          high: (number | null)[];
          low: (number | null)[];
          close: (number | null)[];
        }>;
      };
    }>;
  };
}

// Cache daily candles — TTL 5 min (no need to refresh often)
const adrCache: Map<string, { result: AdrResult; ts: number }> = new Map();
const ADR_CACHE_TTL = 5 * 60 * 1000;

function pipSize(symbol: string): number {
  // JPY pairs: 1 pip = 0.01, everything else: 0.0001
  return symbol.toUpperCase().includes("JPY") ? 0.01 : 0.0001;
}

function toPips(price: number, symbol: string): number {
  return price / pipSize(symbol);
}

function getRisk(pct: number): AdrRisk {
  if (pct < 50) return "low";
  if (pct < 70) return "medium";
  if (pct < 90) return "high";
  return "very_high";
}

export async function calculateAdr(
  yahooSymbol: string,
  symbolKey: string
): Promise<AdrResult> {
  const cached = adrCache.get(yahooSymbol);
  if (cached && Date.now() - cached.ts < ADR_CACHE_TTL) {
    return cached.result;
  }

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=1mo&includePrePost=false`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return { adrPips: null, todayRangePips: null, adrPercent: null, adrRisk: "unknown" };
    }

    const json = (await res.json()) as YahooResponse;
    const result = json?.chart?.result?.[0];
    if (!result) {
      return { adrPips: null, todayRangePips: null, adrPercent: null, adrRisk: "unknown" };
    }

    const timestamps = result.timestamp ?? [];
    const q = result.indicators?.quote?.[0];
    if (!q || timestamps.length === 0) {
      return { adrPips: null, todayRangePips: null, adrPercent: null, adrRisk: "unknown" };
    }

    const days: DayCandle[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const h = q.high[i], l = q.low[i], o = q.open[i], c = q.close[i];
      if (h == null || l == null || o == null || c == null) continue;
      days.push({ timestamp: timestamps[i]!, high: h, low: l, open: o, close: c });
    }

    if (days.length < 2) {
      return { adrPips: null, todayRangePips: null, adrPercent: null, adrRisk: "unknown" };
    }

    // ADR = average of last 14 complete days (exclude today — last candle may be incomplete)
    const completeDays = days.slice(-15, -1); // up to 14 complete days
    const avgRange =
      completeDays.reduce((sum, d) => sum + (d.high - d.low), 0) /
      completeDays.length;

    // Today = last candle (may be partial intraday)
    const today = days[days.length - 1]!;
    const todayRange = today.high - today.low;

    const adrPips = toPips(avgRange, symbolKey);
    const todayRangePips = toPips(todayRange, symbolKey);
    const adrPercent = (todayRange / avgRange) * 100;

    const adrResult: AdrResult = {
      adrPips: Math.round(adrPips * 10) / 10,
      todayRangePips: Math.round(todayRangePips * 10) / 10,
      adrPercent: Math.round(adrPercent * 10) / 10,
      adrRisk: getRisk(adrPercent),
    };

    adrCache.set(yahooSymbol, { result: adrResult, ts: Date.now() });
    return adrResult;
  } catch (err) {
    logger.warn({ err, yahooSymbol }, "ADR fetch failed");
    return { adrPips: null, todayRangePips: null, adrPercent: null, adrRisk: "unknown" };
  }
}
