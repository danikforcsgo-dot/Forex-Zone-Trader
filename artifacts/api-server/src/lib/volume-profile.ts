export interface VpBin {
  priceMid: number;
  normalizedVol: number;
  isPoc: boolean;
  isValueArea: boolean;
}

export interface VolumeProfile {
  poc: number;
  vah: number;
  val: number;
  bins: VpBin[];
}

interface Candle {
  high: number;
  low: number;
  close?: number;
  volume?: number;
}

export function calcVolumeProfile(
  candles: Candle[],
  numBins = 60
): VolumeProfile | null {
  const valid = candles.filter(
    (c) => c.high > 0 && c.low > 0 && (c.volume ?? 0) > 0
  );
  if (valid.length < 10) return null;

  const priceMin = Math.min(...valid.map((c) => c.low));
  const priceMax = Math.max(...valid.map((c) => c.high));
  const range = priceMax - priceMin;
  if (range === 0) return null;

  const binSize = range / numBins;
  const rawBins = new Float64Array(numBins);

  for (const c of valid) {
    const vol = c.volume ?? 1;
    const spread = c.high - c.low;
    if (spread === 0) {
      const b = Math.min(
        Math.floor((c.high - priceMin) / binSize),
        numBins - 1
      );
      rawBins[b] += vol;
      continue;
    }
    for (let b = 0; b < numBins; b++) {
      const bLow = priceMin + b * binSize;
      const bHigh = bLow + binSize;
      const overlap = Math.min(bHigh, c.high) - Math.max(bLow, c.low);
      if (overlap > 0) rawBins[b] += vol * (overlap / spread);
    }
  }

  const maxVol = Math.max(...rawBins);
  if (maxVol === 0) return null;

  const pocBin = [...rawBins].indexOf(maxVol);
  const poc = priceMin + (pocBin + 0.5) * binSize;

  // Value Area: 70% of total volume, expanding from POC outward
  const totalVol = rawBins.reduce((a, v) => a + v, 0);
  const target = totalVol * 0.70;
  let vaVol = rawBins[pocBin];
  let vaLow = pocBin;
  let vaHigh = pocBin;

  while (vaVol < target && (vaLow > 0 || vaHigh < numBins - 1)) {
    const addL = vaLow > 0 ? rawBins[vaLow - 1] : 0;
    const addH = vaHigh < numBins - 1 ? rawBins[vaHigh + 1] : 0;
    if (addL >= addH && vaLow > 0) {
      vaVol += rawBins[--vaLow];
    } else if (vaHigh < numBins - 1) {
      vaVol += rawBins[++vaHigh];
    } else {
      break;
    }
  }

  const val = priceMin + vaLow * binSize;
  const vah = priceMin + (vaHigh + 1) * binSize;

  const bins: VpBin[] = [...rawBins].map((vol, i) => ({
    priceMid: priceMin + (i + 0.5) * binSize,
    normalizedVol: vol / maxVol,
    isPoc: i === pocBin,
    isValueArea: i >= vaLow && i <= vaHigh,
  }));

  return { poc, vah, val, bins };
}
