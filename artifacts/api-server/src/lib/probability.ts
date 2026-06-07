import type { SRZone } from "./sr-zones";
import type { HTFLevel } from "./htf-zones";
import type { DailyBias } from "./ema";

export interface ZoneWithScore extends SRZone {
  htfConfluence: boolean;
  htfLevel: HTFLevel;
  rating: number;
  probabilityScore: number;
  nearRoundNumber: boolean;
  ageBars: number;
}

/**
 * Calculate probability score 0-100 for a zone.
 * Combines: touches, HTF confluence, age, round numbers, ADR risk.
 */
export function calcZoneProbability(
  zone: SRZone & { htfConfluence: boolean; htfLevel: HTFLevel; rating: number },
  currentPrice: number,
  pattern: string,
  adrPercent: number | null,
  dailyBias: DailyBias,
  totalCandles: number
): { probabilityScore: number; nearRoundNumber: boolean; ageBars: number } {
  let score = 30; // base

  // Touches
  if (zone.touches >= 2) score += 10;
  if (zone.touches >= 3) score += 10;
  if (zone.touches >= 5) score += 10;

  // HTF confluence
  if (zone.htfLevel === "H1") score += 10;
  if (zone.htfLevel === "H4") score += 15;
  if (zone.htfLevel === "H1_H4") score += 20;

  // Pattern at zone
  if (pattern && pattern !== "none") score += 10;

  // Daily bias alignment
  if (zone.isResistance && dailyBias === "bearish") score += 10;
  if (!zone.isResistance && dailyBias === "bullish") score += 10;
  if (zone.isResistance && dailyBias === "bullish") score -= 10;
  if (!zone.isResistance && dailyBias === "bearish") score -= 10;

  // ADR risk (too extended = less likely reversal)
  if (adrPercent !== null && adrPercent > 90) score -= 15;
  if (adrPercent !== null && adrPercent > 70) score -= 5;

  // Zone age (fresh zones 1-10 days better on M15; 1 day ≈ 96 bars)
  const ageBars = totalCandles - zone.lastTouch;
  const ageDays = ageBars / 96;
  if (ageDays <= 1) score += 10;
  else if (ageDays <= 5) score += 5;
  else if (ageDays > 20) score -= 10;

  // Round number proximity (check if zone center is near .00 or .50)
  const isJpy = false; // caller doesn't know symbol here; round numbers at integer/half
  const frac = (zone.center * 100) % 100;
  const nearRoundNumber = frac < 5 || frac > 95 || (frac >= 45 && frac <= 55);

  if (nearRoundNumber) score += 10;

  return {
    probabilityScore: Math.max(10, Math.min(95, score)),
    nearRoundNumber,
    ageBars,
  };
}

/**
 * Detect psychological / round number levels near price.
 * Returns levels in [price - range, price + range] at .00 and .50
 */
export function findPsychologicalLevels(
  currentPrice: number,
  symbol: string,
  count = 6
): number[] {
  const isJpy = symbol.toUpperCase().includes("JPY");
  // For JPY: whole numbers and .50; for others: .0000 and .5000
  const step = isJpy ? 0.5 : 0.005;
  const halfStep = step / 2;

  // Find nearest round number below
  const base = Math.round(currentPrice / step) * step;
  const levels: number[] = [];

  for (let i = -Math.ceil(count / 2); i <= Math.ceil(count / 2); i++) {
    const level = Math.round((base + i * step) * 1e6) / 1e6;
    levels.push(level);
  }

  return levels
    .filter((l) => l > 0)
    .sort((a, b) => Math.abs(a - currentPrice) - Math.abs(b - currentPrice))
    .slice(0, count);
}
