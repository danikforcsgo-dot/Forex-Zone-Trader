import type { Candle } from "./forex-fetcher";

export interface FairValueGap {
  top: number;
  bottom: number;
  isBullish: boolean;
  timestamp: number;
  filled: boolean;
}

/**
 * Detect Fair Value Gaps on the candle array.
 * Bullish FVG: candle[i-2].high < candle[i].low (gap in body)
 * Bearish FVG: candle[i-2].low > candle[i].high
 * Returns only recent unfilled FVGs.
 */
export function detectFVGs(candles: Candle[], maxGaps = 5): FairValueGap[] {
  const gaps: FairValueGap[] = [];

  for (let i = 2; i < candles.length; i++) {
    const c0 = candles[i - 2]!;
    const c2 = candles[i]!;

    // Bullish FVG: previous high < current low
    if (c0.high < c2.low) {
      const top = c2.low;
      const bottom = c0.high;

      // Check if gap was subsequently filled
      let filled = false;
      for (let j = i + 1; j < candles.length; j++) {
        if (candles[j]!.low <= bottom) { filled = true; break; }
      }

      gaps.push({ top, bottom, isBullish: true, timestamp: c2.timestamp, filled });
    }

    // Bearish FVG: previous low > current high
    if (c0.low > c2.high) {
      const top = c0.low;
      const bottom = c2.high;

      // Check if gap was subsequently filled
      let filled = false;
      for (let j = i + 1; j < candles.length; j++) {
        if (candles[j]!.high >= top) { filled = true; break; }
      }

      gaps.push({ top, bottom, isBullish: false, timestamp: c2.timestamp, filled });
    }
  }

  // Return only recent unfilled gaps, sorted by recency
  return gaps
    .filter((g) => !g.filled)
    .slice(-maxGaps);
}
