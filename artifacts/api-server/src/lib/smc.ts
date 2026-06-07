interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface OrderBlock {
  top: number;
  bot: number;
  isBullish: boolean;
  timestamp: number;
  mitigated: boolean;
}

export interface LiquidityGrab {
  price: number;
  isBuySide: boolean;
  timestamp: number;
  wickExtent: number;
}

export interface SmcAnalysis {
  orderBlocks: OrderBlock[];
  liquidityGrabs: LiquidityGrab[];
}

function calcATR(candles: Candle[], period = 14): number {
  if (candles.length < 2) return 0;
  const n = Math.min(period, candles.length - 1);
  let sum = 0;
  for (let i = candles.length - n; i < candles.length; i++) {
    const prev = candles[i - 1];
    const c = candles[i];
    const tr = Math.max(
      c.high - c.low,
      Math.abs(c.high - prev.close),
      Math.abs(c.low - prev.close)
    );
    sum += tr;
  }
  return sum / n;
}

export function detectOrderBlocks(candles: Candle[]): OrderBlock[] {
  if (candles.length < 10) return [];

  const atr = calcATR(candles);
  if (atr === 0) return [];
  const threshold = atr * 1.2;

  const results: OrderBlock[] = [];
  const lookback = Math.min(candles.length - 3, 120);

  for (let i = candles.length - lookback; i < candles.length - 2; i++) {
    const c = candles[i];
    const next = candles[i + 1];
    const next2 = candles[i + 2];

    // Bearish OB: bullish candle immediately before a strong down-move
    if (c.close > c.open && next.close < c.open) {
      const move = c.close - next2.low;
      if (move >= threshold) {
        const mitigated = candles
          .slice(i + 2)
          .some((x) => x.low <= c.close && x.high >= c.open);
        results.push({
          top: c.high,
          bot: c.open,
          isBullish: false,
          timestamp: c.timestamp,
          mitigated,
        });
      }
    }

    // Bullish OB: bearish candle immediately before a strong up-move
    if (c.close < c.open && next.close > c.open) {
      const move = next2.high - c.close;
      if (move >= threshold) {
        const mitigated = candles
          .slice(i + 2)
          .some((x) => x.high >= c.close && x.low <= c.open);
        results.push({
          top: c.open,
          bot: c.low,
          isBullish: true,
          timestamp: c.timestamp,
          mitigated,
        });
      }
    }
  }

  // Most recent first, max 6 total
  return results.sort((a, b) => b.timestamp - a.timestamp).slice(0, 6);
}

export function detectLiquidityGrabs(
  candles: Candle[],
  swingPeriod = 15
): LiquidityGrab[] {
  if (candles.length < swingPeriod + 2) return [];

  const results: LiquidityGrab[] = [];
  const lookback = Math.min(candles.length - swingPeriod, 80);

  for (let i = candles.length - lookback; i < candles.length; i++) {
    const c = candles[i];
    const prev = candles.slice(Math.max(0, i - swingPeriod), i);
    if (prev.length < 5) continue;

    const swingHigh = Math.max(...prev.map((x) => x.high));
    const swingLow = Math.min(...prev.map((x) => x.low));

    // Buy-side liquidity grab: wick above swing high, close below it
    if (c.high > swingHigh && c.close < swingHigh) {
      results.push({
        price: swingHigh,
        isBuySide: true,
        timestamp: c.timestamp,
        wickExtent: c.high - swingHigh,
      });
    }

    // Sell-side liquidity grab: wick below swing low, close above it
    if (c.low < swingLow && c.close > swingLow) {
      results.push({
        price: swingLow,
        isBuySide: false,
        timestamp: c.timestamp,
        wickExtent: swingLow - c.low,
      });
    }
  }

  return results.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
}

export function analyzeSmc(candles: Candle[]): SmcAnalysis {
  return {
    orderBlocks: detectOrderBlocks(candles),
    liquidityGrabs: detectLiquidityGrabs(candles),
  };
}
