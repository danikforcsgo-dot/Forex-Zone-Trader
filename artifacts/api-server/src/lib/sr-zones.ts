/**
 * S&R Zone calculation engine — ported from Pine Script "S&R Zones [FEELS]"
 * Uses "Swing" preset defaults: pivLeft=15, pivRight=8, clusterTol=0.9×ATR, minSpacing=20
 */

import type { Candle } from "./forex-fetcher";

export interface SRZone {
  top: number;
  bot: number;
  center: number;
  isResistance: boolean;
  touches: number;
  strength: number;
  volSum: number;
  firstBar: number;
  lastTouch: number;
}

interface Pivot {
  price: number;
  bar: number;
  vol: number;
  wick: number;
}

function atr(candles: Candle[], period = 50): number {
  if (candles.length < 2) return 0;
  const slice = candles.slice(-period);
  let sum = 0;
  for (let i = 1; i < slice.length; i++) {
    const prev = slice[i - 1]!;
    const cur = slice[i]!;
    const tr = Math.max(
      cur.high - cur.low,
      Math.abs(cur.high - prev.close),
      Math.abs(cur.low - prev.close)
    );
    sum += tr;
  }
  return sum / (slice.length - 1);
}

function smaVolume(candles: Candle[], period = 50): number {
  const slice = candles.slice(-period);
  const validVols = slice.map((c) => c.volume || 0);
  const sum = validVols.reduce((a, b) => a + b, 0);
  return validVols.length > 0 ? sum / validVols.length : 1;
}

function findPivotHighs(candles: Candle[], pivLeft: number, pivRight: number): Pivot[] {
  const pivots: Pivot[] = [];
  for (let i = pivLeft; i < candles.length - pivRight; i++) {
    const c = candles[i]!;
    let isHigh = true;
    for (let j = i - pivLeft; j <= i + pivRight; j++) {
      if (j === i) continue;
      if (candles[j]!.high >= c.high) {
        isHigh = false;
        break;
      }
    }
    if (isHigh) {
      const wick = c.high - Math.max(c.open, c.close);
      pivots.push({ price: c.high, bar: i, vol: c.volume || 1, wick: Math.max(0, wick) });
    }
  }
  return pivots;
}

function findPivotLows(candles: Candle[], pivLeft: number, pivRight: number): Pivot[] {
  const pivots: Pivot[] = [];
  for (let i = pivLeft; i < candles.length - pivRight; i++) {
    const c = candles[i]!;
    let isLow = true;
    for (let j = i - pivLeft; j <= i + pivRight; j++) {
      if (j === i) continue;
      if (candles[j]!.low <= c.low) {
        isLow = false;
        break;
      }
    }
    if (isLow) {
      const wick = Math.min(c.open, c.close) - c.low;
      pivots.push({ price: c.low, bar: i, vol: c.volume || 1, wick: Math.max(0, wick) });
    }
  }
  return pivots;
}

function pivotWeight(p: Pivot, a: number, vAvg: number, currentBar: number): number {
  const safeVol = p.vol > 0 ? p.vol : 0;
  const safeWick = p.wick >= 0 ? p.wick : 0;
  const age = Math.max(1, currentBar - p.bar);
  const decay = 1.0 / (1.0 + age / 200.0);
  const volNorm = vAvg > 0 ? safeVol / vAvg : 1.0;
  const wickNorm = a > 0 ? safeWick / a : 0.0;
  return (1.0 + volNorm * 0.5 + wickNorm * 0.5) * decay;
}

function buildZones(
  pivots: Pivot[],
  isResistance: boolean,
  a: number,
  vAvg: number,
  currentBar: number,
  minTouches = 2,
  clusterTol = 0.9,
  minSpacing = 20
): SRZone[] {
  const zones: SRZone[] = [];
  if (pivots.length < minTouches || a <= 0) return zones;

  const tol = a * clusterTol;
  const used = new Array(pivots.length).fill(false);

  for (let i = 0; i < pivots.length; i++) {
    if (used[i]) continue;
    const seed = pivots[i]!;
    const members: Pivot[] = [seed];
    used[i] = true;

    for (let j = i + 1; j < pivots.length; j++) {
      if (used[j]) continue;
      const cand = pivots[j]!;
      if (Math.abs(cand.price - seed.price) <= tol) {
        let farEnough = true;
        if (minSpacing > 0) {
          for (const m of members) {
            if (Math.abs(cand.bar - m.bar) < minSpacing) {
              farEnough = false;
              break;
            }
          }
        }
        if (farEnough) {
          members.push(cand);
          used[j] = true;
        }
      }
    }

    if (members.length >= minTouches) {
      let priceSum = 0;
      let weightSum = 0;
      let volSum = 0;
      let earliest = members[0]!.bar;
      let latest = members[0]!.bar;

      for (const m of members) {
        const w = pivotWeight(m, a, vAvg, currentBar);
        priceSum += m.price * w;
        weightSum += w;
        volSum += m.vol;
        earliest = Math.min(earliest, m.bar);
        latest = Math.max(latest, m.bar);
      }

      if (weightSum > 0) {
        const center = priceSum / weightSum;
        const pad = a * 0.25;
        zones.push({
          top: center + pad,
          bot: center - pad,
          center,
          isResistance,
          touches: members.length,
          strength: weightSum,
          volSum,
          firstBar: earliest,
          lastTouch: latest,
        });
      }
    }
  }

  // Sort by strength desc, take top 6
  zones.sort((a, b) => b.strength - a.strength);
  return zones.slice(0, 6);
}

export function calculateZones(candles: Candle[]): { resistance: SRZone[]; support: SRZone[] } {
  if (candles.length < 30) return { resistance: [], support: [] };

  const a = atr(candles, 50);
  const vAvg = smaVolume(candles, 50);
  const currentBar = candles.length - 1;

  // Swing preset
  const pivLeft = 15;
  const pivRight = 8;
  const clusterTol = 0.9;
  const minSpacing = 20;
  const minTouches = 2;

  const highPivots = findPivotHighs(candles, pivLeft, pivRight);
  const lowPivots = findPivotLows(candles, pivLeft, pivRight);

  const resistance = buildZones(highPivots, true, a, vAvg, currentBar, minTouches, clusterTol, minSpacing);
  const support = buildZones(lowPivots, false, a, vAvg, currentBar, minTouches, clusterTol, minSpacing);

  return { resistance, support };
}

export type ZoneStatus = "neutral" | "resistance" | "support" | "near_resistance" | "near_support";
export type Signal = "none" | "short" | "long";

export function getPriceZoneStatus(
  price: number,
  resistance: SRZone[],
  support: SRZone[],
  nearThresholdPct = 0.1
): { status: ZoneStatus; signal: Signal; nearestResistance: number | null; nearestSupport: number | null; distanceToNearestZonePct: number | null } {
  // Check if inside resistance zone
  for (const z of resistance) {
    if (price >= z.bot && price <= z.top) {
      return {
        status: "resistance",
        signal: "short",
        nearestResistance: z.center,
        nearestSupport: support[0]?.center ?? null,
        distanceToNearestZonePct: 0,
      };
    }
  }

  // Check if inside support zone
  for (const z of support) {
    if (price >= z.bot && price <= z.top) {
      return {
        status: "support",
        signal: "long",
        nearestResistance: resistance[0]?.center ?? null,
        nearestSupport: z.center,
        distanceToNearestZonePct: 0,
      };
    }
  }

  // Find nearest zone distance
  let nearestResistanceCenter: number | null = null;
  let nearestSupportCenter: number | null = null;
  let minDistPct: number | null = null;
  let nearStatus: ZoneStatus = "neutral";

  for (const z of resistance) {
    const dist = Math.abs(price - z.center) / price * 100;
    if (minDistPct === null || dist < minDistPct) {
      minDistPct = dist;
      nearestResistanceCenter = z.center;
      if (dist <= nearThresholdPct) nearStatus = "near_resistance";
    }
  }

  for (const z of support) {
    const dist = Math.abs(price - z.center) / price * 100;
    if (minDistPct === null || dist < minDistPct) {
      minDistPct = dist;
      nearestSupportCenter = z.center;
      if (dist <= nearThresholdPct) nearStatus = "near_support";
    }
  }

  return {
    status: nearStatus,
    signal: "none",
    nearestResistance: nearestResistanceCenter ?? resistance[0]?.center ?? null,
    nearestSupport: nearestSupportCenter ?? support[0]?.center ?? null,
    distanceToNearestZonePct: minDistPct,
  };
}
