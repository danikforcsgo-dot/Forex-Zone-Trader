import { Router } from "express";
import { PAIRS, fetchAllPairs, fetchPairData } from "../lib/forex-fetcher";
import { calculateZones, getPriceZoneStatus } from "../lib/sr-zones";
import { getCurrentSession } from "../lib/session";
import { detectPattern } from "../lib/patterns";
import { enrichZonesWithHTF } from "../lib/htf-zones";
import { calculateAdr } from "../lib/adr";
import { calcEMA, fetchDailyCandles, calcDailyBias } from "../lib/ema";
import { analyzeMarketStructure } from "../lib/market-structure";
import { detectFVGs } from "../lib/fvg";
import { calcZoneProbability, findPsychologicalLevels } from "../lib/probability";
import { calcVolumeProfile } from "../lib/volume-profile";
import { analyzeSmc } from "../lib/smc";

const router = Router();

function getKillZone(
  utcHour: number,
  utcMin: number
): { isKillZone: boolean; killZoneName: string | null } {
  const t = utcHour + utcMin / 60;
  if (t >= 2 && t < 5)
    return { isKillZone: true, killZoneName: "Азиатская Kill Zone (02:00–05:00)" };
  if (t >= 7 && t < 9)
    return { isKillZone: true, killZoneName: "Лондонская Kill Zone (07:00–09:00)" };
  if (t >= 12 && t < 14)
    return { isKillZone: true, killZoneName: "Нью-Йоркская Kill Zone (12:00–14:00)" };
  return { isKillZone: false, killZoneName: null };
}

router.get("/pairs", async (req, res) => {
  const all = await fetchAllPairs();

  const results = await Promise.all(
    all.map(async (pair) => {
      const { resistance, support } = calculateZones(pair.candles);
      const zoneInfo = getPriceZoneStatus(pair.currentPrice, resistance, support);

      const context =
        zoneInfo.signal === "short"
          ? "resistance"
          : zoneInfo.signal === "long"
          ? "support"
          : "any";
      const pattern = detectPattern(pair.candles.slice(-2), context);

      const [adr, dailyCandles] = await Promise.all([
        calculateAdr(pair.pairInfo.yahooSymbol, pair.pairInfo.symbol),
        fetchDailyCandles(pair.pairInfo.yahooSymbol),
      ]);

      const dailyBias = calcDailyBias(dailyCandles, pair.currentPrice);
      const ms = analyzeMarketStructure(pair.candles);

      const ema50Arr = calcEMA(pair.candles, 50);
      const ema200Arr = calcEMA(pair.candles, 200);
      const ema50 = ema50Arr[ema50Arr.length - 1] ?? null;
      const ema200 = ema200Arr[ema200Arr.length - 1] ?? null;

      return {
        symbol: pair.symbol,
        displayName: pair.displayName,
        currentPrice: pair.currentPrice,
        bid: pair.bid,
        ask: pair.ask,
        change: pair.change,
        changePct: pair.changePct,
        zoneStatus: zoneInfo.status,
        signal: zoneInfo.signal,
        pattern,
        nearestResistance: zoneInfo.nearestResistance,
        nearestSupport: zoneInfo.nearestSupport,
        distanceToNearestZonePct: zoneInfo.distanceToNearestZonePct,
        adrPips: adr.adrPips,
        todayRangePips: adr.todayRangePips,
        adrPercent: adr.adrPercent,
        adrRisk: adr.adrRisk,
        dailyBias,
        ema50: isNaN(ema50 ?? NaN) ? null : (ema50 ?? null),
        ema200: isNaN(ema200 ?? NaN) ? null : (ema200 ?? null),
        trend: ms.trend,
        updatedAt: new Date().toISOString(),
      };
    })
  );

  res.json(results);
});

router.get("/pairs/:symbol", async (req, res) => {
  const { symbol } = req.params;
  const pairInfo = PAIRS.find(
    (p) => p.symbol.toUpperCase() === symbol.toUpperCase()
  );
  if (!pairInfo) {
    res.status(404).json({ error: "Pair not found" });
    return;
  }

  const data = await fetchPairData(pairInfo.yahooSymbol);
  if (!data) {
    res.status(404).json({ error: "Could not fetch pair data" });
    return;
  }

  const { resistance, support } = calculateZones(data.candles);
  const zoneInfo = getPriceZoneStatus(data.currentPrice, resistance, support);

  const context =
    zoneInfo.signal === "short"
      ? "resistance"
      : zoneInfo.signal === "long"
      ? "support"
      : "any";
  const pattern = detectPattern(data.candles.slice(-2), context);

  const [enriched, adr, dailyCandles] = await Promise.all([
    enrichZonesWithHTF(pairInfo.yahooSymbol, [...resistance, ...support]),
    calculateAdr(pairInfo.yahooSymbol, pairInfo.symbol),
    fetchDailyCandles(pairInfo.yahooSymbol),
  ]);

  const dailyBias = calcDailyBias(dailyCandles, data.currentPrice);
  const ms = analyzeMarketStructure(data.candles);
  const fvgs = detectFVGs(data.candles, 5);
  const smc = analyzeSmc(data.candles);
  const volumeProfile = calcVolumeProfile(data.candles.slice(-200));

  const ema50Arr = calcEMA(data.candles, 50);
  const ema200Arr = calcEMA(data.candles, 200);
  const lastN = 200;
  const ema50Values = ema50Arr.slice(-lastN).map((v) => (isNaN(v) ? 0 : v));
  const ema200Values = ema200Arr.slice(-lastN).map((v) => (isNaN(v) ? 0 : v));
  const ema50 = ema50Arr[ema50Arr.length - 1] ?? null;
  const ema200 = ema200Arr[ema200Arr.length - 1] ?? null;

  const psychologicalLevels = findPsychologicalLevels(
    data.currentPrice,
    pairInfo.symbol,
    6
  );

  const enrichedWithProb = enriched.map((z) => {
    const { probabilityScore, nearRoundNumber, ageBars } = calcZoneProbability(
      z,
      data.currentPrice,
      pattern ?? "none",
      adr.adrPercent,
      dailyBias,
      data.candles.length
    );
    return { ...z, probabilityScore, nearRoundNumber, ageBars };
  });

  res.json({
    symbol: pairInfo.symbol,
    displayName: pairInfo.displayName,
    currentPrice: data.currentPrice,
    bid: data.bid,
    ask: data.ask,
    change: data.change,
    changePct: data.changePct,
    zoneStatus: zoneInfo.status,
    signal: zoneInfo.signal,
    pattern,
    nearestResistance: zoneInfo.nearestResistance,
    nearestSupport: zoneInfo.nearestSupport,
    candles: data.candles.slice(-200),
    resistanceZones: enrichedWithProb.filter((z) => z.isResistance),
    supportZones: enrichedWithProb.filter((z) => !z.isResistance),
    adrPips: adr.adrPips,
    todayRangePips: adr.todayRangePips,
    adrPercent: adr.adrPercent,
    adrRisk: adr.adrRisk,
    dailyBias,
    ema50: isNaN(ema50 ?? NaN) ? null : (ema50 ?? null),
    ema200: isNaN(ema200 ?? NaN) ? null : (ema200 ?? null),
    ema50Values,
    ema200Values,
    trend: ms.trend,
    fairValueGaps: fvgs,
    marketStructure: {
      trend: ms.trend,
      lastSwingHigh: ms.lastSwingHigh,
      lastSwingLow: ms.lastSwingLow,
      bos: ms.bos,
      choch: ms.choch,
    },
    psychologicalLevels,
    volumeProfile,
    orderBlocks: smc.orderBlocks,
    liquidityGrabs: smc.liquidityGrabs,
    updatedAt: new Date().toISOString(),
  });
});

router.get("/zones", async (req, res) => {
  const all = await fetchAllPairs();
  const zonesResult: unknown[] = [];
  for (const pair of all) {
    const { resistance, support } = calculateZones(pair.candles);
    for (const zone of [...resistance, ...support]) {
      const priceInZone =
        pair.currentPrice >= zone.bot && pair.currentPrice <= zone.top;
      const distancePct =
        (Math.abs(pair.currentPrice - zone.center) / pair.currentPrice) * 100;
      zonesResult.push({
        symbol: pair.symbol,
        displayName: pair.displayName,
        zone: { ...zone, rating: 1, htfConfluence: false, htfLevel: "none" },
        priceInZone,
        distancePct,
      });
    }
  }
  res.json(zonesResult);
});

router.get("/alerts", async (req, res) => {
  const all = await fetchAllPairs();
  const alerts: unknown[] = [];
  for (const pair of all) {
    const { resistance, support } = calculateZones(pair.candles);
    const zoneInfo = getPriceZoneStatus(pair.currentPrice, resistance, support);
    if (zoneInfo.signal !== "none") {
      const zones = zoneInfo.signal === "short" ? resistance : support;
      const zone = zones.find(
        (z) => pair.currentPrice >= z.bot && pair.currentPrice <= z.top
      );
      if (zone) {
        const context = zoneInfo.signal === "short" ? "resistance" : "support";
        const pattern = detectPattern(pair.candles.slice(-2), context);
        alerts.push({
          symbol: pair.symbol,
          displayName: pair.displayName,
          signal: zoneInfo.signal,
          zoneStatus: zoneInfo.status,
          currentPrice: pair.currentPrice,
          zoneTop: zone.top,
          zoneBot: zone.bot,
          zoneCenter: zone.center,
          strength: zone.strength,
          touches: zone.touches,
          message:
            zoneInfo.signal === "short"
              ? `${pair.displayName} вошёл в зону сопротивления — сигнал ШОРТ`
              : `${pair.displayName} вошёл в зону поддержки — сигнал ЛОНГ`,
          triggeredAt: new Date().toISOString(),
        });
      }
    }
  }
  res.json(alerts);
});

router.get("/market-summary", async (req, res) => {
  const all = await fetchAllPairs();
  const { session, sessionTime } = getCurrentSession();
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcMin = now.getUTCMinutes();
  const { isKillZone, killZoneName } = getKillZone(utcHour, utcMin);
  const dayOfWeek = now.getUTCDay();
  const dayWarning =
    dayOfWeek === 1
      ? "Понедельник — осторожно, низкая ликвидность в начале дня"
      : dayOfWeek === 5
      ? "Пятница — осторожно, не держите сделки на выходных"
      : dayOfWeek === 0 || dayOfWeek === 6
      ? "Выходной — рынок закрыт"
      : null;

  let pairsInResistance = 0,
    pairsInSupport = 0,
    pairsNearZone = 0,
    activeAlerts = 0;
  for (const pair of all) {
    const { resistance, support } = calculateZones(pair.candles);
    const zoneInfo = getPriceZoneStatus(pair.currentPrice, resistance, support);
    if (zoneInfo.status === "resistance") {
      pairsInResistance++;
      activeAlerts++;
    } else if (zoneInfo.status === "support") {
      pairsInSupport++;
      activeAlerts++;
    } else if (
      zoneInfo.status === "near_resistance" ||
      zoneInfo.status === "near_support"
    ) {
      pairsNearZone++;
    }
  }
  res.json({
    totalPairs: PAIRS.length,
    pairsInResistance,
    pairsInSupport,
    pairsNearZone,
    activeAlerts,
    session,
    sessionTime,
    isKillZone,
    killZoneName,
    dayOfWeek,
    dayWarning,
  });
});

export default router;
