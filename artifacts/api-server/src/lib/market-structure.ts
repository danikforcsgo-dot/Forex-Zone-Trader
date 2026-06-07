import type { Candle } from "./forex-fetcher";

export type Trend = "up" | "down" | "range";

export interface SwingPoint {
  price: number;
  bar: number;
  timestamp: number;
}

export interface MarketStructure {
  trend: Trend;
  lastSwingHigh: number | null;
  lastSwingLow: number | null;
  bos: { price: number; direction: "up" | "down"; timestamp: number } | null;
  choch: { price: number; direction: "up" | "down"; timestamp: number } | null;
}

function findSwingHighs(candles: Candle[], lookback = 5): SwingPoint[] {
  const result: SwingPoint[] = [];
  for (let i = lookback; i < candles.length - lookback; i++) {
    const c = candles[i]!;
    let isHigh = true;
    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j === i) continue;
      if (candles[j]!.high >= c.high) { isHigh = false; break; }
    }
    if (isHigh) result.push({ price: c.high, bar: i, timestamp: c.timestamp });
  }
  return result;
}

function findSwingLows(candles: Candle[], lookback = 5): SwingPoint[] {
  const result: SwingPoint[] = [];
  for (let i = lookback; i < candles.length - lookback; i++) {
    const c = candles[i]!;
    let isLow = true;
    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j === i) continue;
      if (candles[j]!.low <= c.low) { isLow = false; break; }
    }
    if (isLow) result.push({ price: c.low, bar: i, timestamp: c.timestamp });
  }
  return result;
}

export function analyzeMarketStructure(candles: Candle[]): MarketStructure {
  if (candles.length < 30) {
    return { trend: "range", lastSwingHigh: null, lastSwingLow: null, bos: null, choch: null };
  }

  const highs = findSwingHighs(candles, 5);
  const lows = findSwingLows(candles, 5);

  const lastHigh = highs.at(-1) ?? null;
  const prevHigh = highs.at(-2) ?? null;
  const lastLow = lows.at(-1) ?? null;
  const prevLow = lows.at(-2) ?? null;

  // Determine trend from last 2 swing highs and lows
  let trend: Trend = "range";
  if (lastHigh && prevHigh && lastLow && prevLow) {
    const hhhl = lastHigh.price > prevHigh.price && lastLow.price > prevLow.price;
    const lhll = lastHigh.price < prevHigh.price && lastLow.price < prevLow.price;
    if (hhhl) trend = "up";
    else if (lhll) trend = "down";
  } else if (lastHigh && prevHigh) {
    trend = lastHigh.price > prevHigh.price ? "up" : "down";
  }

  const currentPrice = candles.at(-1)!.close;
  const currentTs = candles.at(-1)!.timestamp;

  // BOS — Break of Structure
  let bos: MarketStructure["bos"] = null;
  if (trend === "up" && lastHigh) {
    // In uptrend, price breaks BELOW last swing low = bearish BOS
    if (lastLow && currentPrice < lastLow.price) {
      bos = { price: lastLow.price, direction: "down", timestamp: currentTs };
    }
  } else if (trend === "down" && lastLow) {
    // In downtrend, price breaks ABOVE last swing high = bullish BOS
    if (lastHigh && currentPrice > lastHigh.price) {
      bos = { price: lastHigh.price, direction: "up", timestamp: currentTs };
    }
  }

  // CHOCH — Change of Character (reversal signal inside the trend)
  let choch: MarketStructure["choch"] = null;
  if (trend === "down" && lastHigh && prevHigh) {
    // In downtrend, if new swing high is HIGHER than the previous one = CHOCH
    if (lastHigh.price > prevHigh.price) {
      choch = { price: lastHigh.price, direction: "up", timestamp: lastHigh.timestamp };
    }
  } else if (trend === "up" && lastLow && prevLow) {
    // In uptrend, if new swing low is LOWER than the previous one = CHOCH
    if (lastLow.price < prevLow.price) {
      choch = { price: lastLow.price, direction: "down", timestamp: lastLow.timestamp };
    }
  }

  return {
    trend,
    lastSwingHigh: lastHigh?.price ?? null,
    lastSwingLow: lastLow?.price ?? null,
    bos,
    choch,
  };
}
