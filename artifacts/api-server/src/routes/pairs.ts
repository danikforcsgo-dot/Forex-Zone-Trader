import { Router } from "express";
import { PAIRS, fetchAllPairs, fetchPairData } from "../lib/forex-fetcher";
import { calculateZones, getPriceZoneStatus } from "../lib/sr-zones";
import { getCurrentSession } from "../lib/session";

const router = Router();

router.get("/pairs", async (req, res) => {
  const all = await fetchAllPairs();
  const result = all.map((pair) => {
    const { resistance, support } = calculateZones(pair.candles);
    const zoneInfo = getPriceZoneStatus(pair.currentPrice, resistance, support);
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
      nearestResistance: zoneInfo.nearestResistance,
      nearestSupport: zoneInfo.nearestSupport,
      distanceToNearestZonePct: zoneInfo.distanceToNearestZonePct,
      updatedAt: new Date().toISOString(),
    };
  });
  res.json(result);
});

router.get("/pairs/:symbol", async (req, res) => {
  const { symbol } = req.params;
  const pairInfo = PAIRS.find((p) => p.symbol.toUpperCase() === symbol.toUpperCase());
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
    candles: data.candles.slice(-200),
    resistanceZones: resistance,
    supportZones: support,
    updatedAt: new Date().toISOString(),
  });
});

router.get("/zones", async (req, res) => {
  const all = await fetchAllPairs();
  const zonesResult: unknown[] = [];

  for (const pair of all) {
    const { resistance, support } = calculateZones(pair.candles);
    const allZones = [...resistance, ...support];
    for (const zone of allZones) {
      const priceInZone = pair.currentPrice >= zone.bot && pair.currentPrice <= zone.top;
      const distancePct = Math.abs(pair.currentPrice - zone.center) / pair.currentPrice * 100;
      zonesResult.push({
        symbol: pair.symbol,
        displayName: pair.displayName,
        zone,
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

  let pairsInResistance = 0;
  let pairsInSupport = 0;
  let pairsNearZone = 0;
  let activeAlerts = 0;

  for (const pair of all) {
    const { resistance, support } = calculateZones(pair.candles);
    const zoneInfo = getPriceZoneStatus(pair.currentPrice, resistance, support);

    if (zoneInfo.status === "resistance") { pairsInResistance++; activeAlerts++; }
    else if (zoneInfo.status === "support") { pairsInSupport++; activeAlerts++; }
    else if (zoneInfo.status === "near_resistance" || zoneInfo.status === "near_support") {
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
  });
});

export default router;
