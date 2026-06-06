/**
 * Higher Time Frame (HTF) S&R zone fetching and confluence detection.
 * Fetches H1 and H4 candles from Yahoo Finance and checks if M15 zones overlap.
 */

import { logger } from "./logger";
import type { Candle } from "./forex-fetcher";
import { calculateZones } from "./sr-zones";
import type { SRZone } from "./sr-zones";

// HTF cache — longer TTL since H1/H4 data changes slowly
const htfCache: Map<string, { candles: Candle[]; ts: number }> = new Map();
const HTF_CACHE_TTL_MS = 60_000; // 1 minute

interface YahooChartResponse {
  chart: {
    result?: Array<{
      meta: { symbol: string };
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

async function fetchHTFCandles(
  yahooSymbol: string,
  interval: "60m" | "4h",
  range: "1mo" | "3mo"
): Promise<Candle[]> {
  const cacheKey = `${yahooSymbol}_${interval}`;
  const cached = htfCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < HTF_CACHE_TTL_MS) {
    return cached.candles;
  }

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=${interval}&range=${range}&includePrePost=false`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return [];

    const json = (await res.json()) as YahooChartResponse;
    const result = json?.chart?.result?.[0];
    if (!result) return [];

    const timestamps = result.timestamp ?? [];
    const q = result.indicators?.quote?.[0];
    if (!q || timestamps.length === 0) return [];

    const candles: Candle[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const o = q.open[i], h = q.high[i], l = q.low[i], c = q.close[i];
      if (o == null || h == null || l == null || c == null) continue;
      candles.push({
        timestamp: timestamps[i]!,
        open: o, high: h, low: l, close: c,
        volume: q.volume[i] ?? 0,
      });
    }

    htfCache.set(cacheKey, { candles, ts: Date.now() });
    return candles;
  } catch (err) {
    logger.warn({ err, yahooSymbol, interval }, "Failed to fetch HTF candles");
    return [];
  }
}

export type HTFLevel = "none" | "H1" | "H4" | "H1_H4";

export interface HTFResult {
  htfConfluence: boolean;
  htfLevel: HTFLevel;
  h1Zones: SRZone[];
  h4Zones: SRZone[];
}

function zonesOverlap(m15Zone: SRZone, htfZone: SRZone): boolean {
  // Check if the center of m15 zone is within the htf zone (with small tolerance)
  const tol = (htfZone.top - htfZone.bot) * 0.2;
  return m15Zone.center >= htfZone.bot - tol && m15Zone.center <= htfZone.top + tol;
}

export async function getHTFConfluence(
  yahooSymbol: string,
  m15Zone: SRZone
): Promise<HTFResult> {
  const [h1Candles, h4Candles] = await Promise.all([
    fetchHTFCandles(yahooSymbol, "60m", "1mo"),
    fetchHTFCandles(yahooSymbol, "4h", "3mo"),
  ]);

  const h1Result = h1Candles.length >= 10 ? calculateZones(h1Candles) : { resistance: [], support: [] };
  const h4Result = h4Candles.length >= 10 ? calculateZones(h4Candles) : { resistance: [], support: [] };

  const h1AllZones = [...h1Result.resistance, ...h1Result.support];
  const h4AllZones = [...h4Result.resistance, ...h4Result.support];

  const hasH1 = h1AllZones.some((z) => zonesOverlap(m15Zone, z));
  const hasH4 = h4AllZones.some((z) => zonesOverlap(m15Zone, z));

  let htfLevel: HTFLevel = "none";
  if (hasH1 && hasH4) htfLevel = "H1_H4";
  else if (hasH4) htfLevel = "H4";
  else if (hasH1) htfLevel = "H1";

  return {
    htfConfluence: hasH1 || hasH4,
    htfLevel,
    h1Zones: h1AllZones,
    h4Zones: h4AllZones,
  };
}

/**
 * Batch enrich all zones of a pair with HTF confluence data.
 * Uses bulk H1/H4 zone fetch (2 requests total, not per zone).
 */
export async function enrichZonesWithHTF(
  yahooSymbol: string,
  zones: SRZone[]
): Promise<(SRZone & { htfConfluence: boolean; htfLevel: HTFLevel; rating: number })[]> {
  if (zones.length === 0) return [];

  const [h1Candles, h4Candles] = await Promise.all([
    fetchHTFCandles(yahooSymbol, "60m", "1mo"),
    fetchHTFCandles(yahooSymbol, "4h", "3mo"),
  ]);

  const h1Result = h1Candles.length >= 10 ? calculateZones(h1Candles) : { resistance: [], support: [] };
  const h4Result = h4Candles.length >= 10 ? calculateZones(h4Candles) : { resistance: [], support: [] };

  const h1AllZones = [...h1Result.resistance, ...h1Result.support];
  const h4AllZones = [...h4Result.resistance, ...h4Result.support];

  return zones.map((zone) => {
    const hasH1 = h1AllZones.some((z) => zonesOverlap(zone, z));
    const hasH4 = h4AllZones.some((z) => zonesOverlap(zone, z));

    let htfLevel: HTFLevel = "none";
    if (hasH1 && hasH4) htfLevel = "H1_H4";
    else if (hasH4) htfLevel = "H4";
    else if (hasH1) htfLevel = "H1";

    const htfConfluence = hasH1 || hasH4;

    // Rating 1-5
    let rating = 1;
    if (zone.touches >= 3) rating++;
    if (zone.touches >= 5) rating++;
    if (hasH1) rating++;
    if (hasH4) rating++;
    rating = Math.min(5, Math.max(1, rating));

    return { ...zone, htfConfluence, htfLevel, rating };
  });
}
