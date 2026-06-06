import type { Candle } from "./forex-fetcher";

export type CandlePattern =
  | "none"
  | "pin_bar_bullish"
  | "pin_bar_bearish"
  | "engulfing_bullish"
  | "engulfing_bearish"
  | "doji_bearish"
  | "doji_bullish"
  | "doji";

/**
 * Detect the most significant candlestick pattern on the last 1-2 candles.
 * context: "resistance" = looking for bearish patterns (short)
 *          "support"    = looking for bullish patterns (long)
 *          "any"        = detect anything
 */
export function detectPattern(
  candles: Candle[],
  context: "resistance" | "support" | "any" = "any"
): CandlePattern {
  if (candles.length < 2) return "none";

  const cur = candles[candles.length - 1]!;
  const prev = candles[candles.length - 2]!;

  const curRange = cur.high - cur.low;
  if (curRange <= 0) return "none";

  const curBody = Math.abs(cur.close - cur.open);
  const curUpperWick = cur.high - Math.max(cur.open, cur.close);
  const curLowerWick = Math.min(cur.open, cur.close) - cur.low;
  const bodyRatio = curBody / curRange;

  // --- DOJI: body < 10% of range ---
  if (bodyRatio < 0.1) {
    if (context === "resistance") return "doji_bearish";
    if (context === "support")    return "doji_bullish";
    return "doji";
  }

  // --- BEARISH PIN BAR (shooting star / gravestone) ---
  // Upper wick >= 2x body, lower wick small, body in lower 40% of range
  if (
    curUpperWick >= curBody * 2 &&
    curLowerWick <= curBody * 0.5 &&
    Math.min(cur.open, cur.close) <= cur.low + curRange * 0.4
  ) {
    if (context !== "support") return "pin_bar_bearish";
  }

  // --- BULLISH PIN BAR (hammer / dragonfly) ---
  // Lower wick >= 2x body, upper wick small, body in upper 40% of range
  if (
    curLowerWick >= curBody * 2 &&
    curUpperWick <= curBody * 0.5 &&
    Math.max(cur.open, cur.close) >= cur.low + curRange * 0.6
  ) {
    if (context !== "resistance") return "pin_bar_bullish";
  }

  // --- BEARISH ENGULFING ---
  // Current candle is bearish and fully engulfs previous bullish candle body
  const prevBody = Math.abs(prev.close - prev.open);
  const prevIsBullish = prev.close > prev.open;
  const curIsBearish = cur.close < cur.open;
  if (
    curIsBearish &&
    prevIsBullish &&
    cur.open >= prev.close &&
    cur.close <= prev.open &&
    curBody > prevBody * 0.9
  ) {
    if (context !== "support") return "engulfing_bearish";
  }

  // --- BULLISH ENGULFING ---
  // Current candle is bullish and fully engulfs previous bearish candle body
  const prevIsBearish = prev.close < prev.open;
  const curIsBullish = cur.close > cur.open;
  if (
    curIsBullish &&
    prevIsBearish &&
    cur.open <= prev.close &&
    cur.close >= prev.open &&
    curBody > prevBody * 0.9
  ) {
    if (context !== "resistance") return "engulfing_bullish";
  }

  return "none";
}
