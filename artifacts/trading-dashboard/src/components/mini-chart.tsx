import { useState, useCallback } from "react";
import { PairDetail, Zone } from "@workspace/api-client-react";
import { priceDecimals } from "@/lib/format";

interface MiniChartProps {
  detail: PairDetail;
}

interface Tooltip {
  x: number;
  y: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  time: string;
  date: string;
}

const VOL_H = 38; // volume bar area height in px
const PAD = { top: 24, right: 82, bottom: 32 + VOL_H, left: 6 };

function useChartScales(
  validCandles: PairDetail["candles"],
  allZones: Zone[],
  currentPrice: number,
  width: number,
  height: number
) {
  const chartW = width - PAD.left - PAD.right;
  const chartH = height - PAD.top - PAD.bottom;

  const prices = validCandles.flatMap((c) => [c.high, c.low]);
  const zonePrices = allZones.flatMap((z) => [z.top, z.bot]);
  const allValues = [...prices, ...zonePrices, currentPrice].filter(
    (v) => isFinite(v) && v > 0
  );

  if (allValues.length === 0) return null;

  const rawMin = Math.min(...allValues);
  const rawMax = Math.max(...allValues);
  const pad = (rawMax - rawMin) * 0.06 || rawMin * 0.001;
  const yMin = rawMin - pad;
  const yMax = rawMax + pad;

  const xScale = (i: number) =>
    PAD.left + ((i + 0.5) / validCandles.length) * chartW;
  const yScale = (price: number) =>
    PAD.top + (1 - (price - yMin) / (yMax - yMin)) * chartH;

  return { xScale, yScale, yMin, yMax, chartW, chartH };
}

function formatXLabel(ts: number, spansDays: boolean): string {
  const d = new Date(ts * 1000);
  if (spansDays) {
    return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }) +
      " " + d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

export function MiniChart({ detail }: MiniChartProps) {
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  const [size, setSize] = useState({ w: 800, h: 420 });

  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const ro = new ResizeObserver((entries) => {
      const e = entries[0];
      if (e) setSize({ w: e.contentRect.width, h: e.contentRect.height });
    });
    ro.observe(node);
  }, []);

  const N = 120;
  const candles = detail.candles.slice(-N);
  const validCandles = candles.filter(
    (c) => c.high > 0 && c.low > 0 && c.open > 0 && c.close > 0
  );

  const firstTs = validCandles[0]?.timestamp ?? 0;
  const lastTs = validCandles[validCandles.length - 1]?.timestamp ?? 0;
  const spansDays = lastTs - firstTs > 86400;

  const allZones: Zone[] = [...detail.resistanceZones, ...detail.supportZones];
  const scales = useChartScales(validCandles, allZones, detail.currentPrice, size.w, size.h);

  const yTicks = scales
    ? (() => {
        const count = 6;
        const step = (scales.yMax - scales.yMin) / (count - 1);
        return Array.from({ length: count }, (_, i) => scales.yMin + step * i);
      })()
    : [];

  const step = Math.max(1, Math.floor(validCandles.length / 6));
  const xTicks = validCandles
    .map((c, i) => ({ i, c }))
    .filter(({ i }) => i % step === 0);

  const candleW = scales
    ? Math.max(1.5, ((size.w - PAD.left - PAD.right) / validCandles.length) * 0.7)
    : 4;

  // Align EMA arrays to the last N candles (ema values match detail.candles, so we slice the same N)
  const ema50Vals = (detail.ema50Values ?? []).slice(-N);
  const ema200Vals = (detail.ema200Values ?? []).slice(-N);

  // Volume bars normalization
  const volumes = validCandles.map((c) => c.volume ?? 0);
  const maxVol = Math.max(...volumes, 1);
  const volAreaTop = size.h - PAD.bottom + 4;
  const volAreaH = VOL_H - 6;

  // Build EMA polyline points (only non-zero values)
  function buildEmaPath(vals: number[], scalesRef: typeof scales): string {
    if (!scalesRef || vals.length === 0) return "";
    const points: string[] = [];
    for (let i = 0; i < validCandles.length && i < vals.length; i++) {
      const v = vals[i];
      if (!v || v <= 0 || isNaN(v)) continue;
      const x = scalesRef.xScale(i);
      const y = scalesRef.yScale(v);
      points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    if (points.length < 2) return "";
    return "M " + points.join(" L ");
  }

  const chartBottom = size.h - PAD.bottom;
  const chartRight = size.w - PAD.right;

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%", position: "relative" }}>
      <svg
        width={size.w}
        height={size.h}
        style={{ display: "block", overflow: "visible" }}
        onMouseLeave={() => setTooltip(null)}
      >
        {scales && (
          <>
            {/* Grid lines */}
            {yTicks.map((price, i) => (
              <line key={i}
                x1={PAD.left} y1={scales.yScale(price)}
                x2={chartRight} y2={scales.yScale(price)}
                stroke="#1e2535" strokeWidth={1}
              />
            ))}

            {/* FVG bands */}
            {(detail.fairValueGaps ?? []).map((fvg, i) => {
              const y1 = scales.yScale(fvg.top);
              const y2 = scales.yScale(fvg.bottom);
              const color = fvg.isBullish ? "#26a69a" : "#f44753";
              return (
                <g key={`fvg-${i}`}>
                  <rect
                    x={PAD.left} y={y1}
                    width={chartRight - PAD.left}
                    height={Math.max(y2 - y1, 2)}
                    fill={color} fillOpacity={0.08}
                  />
                  <line x1={PAD.left} y1={(y1 + y2) / 2} x2={chartRight} y2={(y1 + y2) / 2}
                    stroke={color} strokeOpacity={0.25} strokeWidth={1} strokeDasharray="2 4"
                  />
                </g>
              );
            })}

            {/* Psychological levels */}
            {(detail.psychologicalLevels ?? []).map((level, i) => {
              if (level < scales.yMin || level > scales.yMax) return null;
              const y = scales.yScale(level);
              return (
                <line key={`psych-${i}`}
                  x1={PAD.left} y1={y} x2={chartRight} y2={y}
                  stroke="#ffffff" strokeOpacity={0.06} strokeWidth={1} strokeDasharray="1 6"
                />
              );
            })}

            {/* Support zones */}
            {detail.supportZones.map((z, i) => {
              const y1 = scales.yScale(z.top);
              const y2 = scales.yScale(z.bot);
              return (
                <g key={`sup-${i}`}>
                  <rect x={PAD.left} y={y1}
                    width={chartRight - PAD.left}
                    height={Math.max(y2 - y1, 2)}
                    fill="#26a69a" fillOpacity={0.12}
                  />
                  <line x1={PAD.left} y1={y1} x2={chartRight} y2={y1}
                    stroke="#26a69a" strokeOpacity={0.5} strokeWidth={1} strokeDasharray="4 3" />
                  <line x1={PAD.left} y1={y2} x2={chartRight} y2={y2}
                    stroke="#26a69a" strokeOpacity={0.5} strokeWidth={1} strokeDasharray="4 3" />
                </g>
              );
            })}

            {/* Resistance zones */}
            {detail.resistanceZones.map((z, i) => {
              const y1 = scales.yScale(z.top);
              const y2 = scales.yScale(z.bot);
              return (
                <g key={`res-${i}`}>
                  <rect x={PAD.left} y={y1}
                    width={chartRight - PAD.left}
                    height={Math.max(y2 - y1, 2)}
                    fill="#f44753" fillOpacity={0.12}
                  />
                  <line x1={PAD.left} y1={y1} x2={chartRight} y2={y1}
                    stroke="#f44753" strokeOpacity={0.5} strokeWidth={1} strokeDasharray="4 3" />
                  <line x1={PAD.left} y1={y2} x2={chartRight} y2={y2}
                    stroke="#f44753" strokeOpacity={0.5} strokeWidth={1} strokeDasharray="4 3" />
                </g>
              );
            })}

            {/* EMA 200 — orange, thicker, behind EMA 50 */}
            {buildEmaPath(ema200Vals, scales) && (
              <path
                d={buildEmaPath(ema200Vals, scales)}
                fill="none" stroke="#f97316" strokeWidth={1.2} strokeOpacity={0.75}
              />
            )}

            {/* EMA 50 — cyan/blue */}
            {buildEmaPath(ema50Vals, scales) && (
              <path
                d={buildEmaPath(ema50Vals, scales)}
                fill="none" stroke="#60a5fa" strokeWidth={1} strokeOpacity={0.8}
              />
            )}

            {/* Volume bars */}
            <line
              x1={PAD.left} y1={volAreaTop}
              x2={chartRight} y2={volAreaTop}
              stroke="#1e2535" strokeWidth={1}
            />
            {validCandles.map((c, i) => {
              const cx = scales.xScale(i);
              const vol = c.volume ?? 0;
              const barH = (vol / maxVol) * volAreaH;
              const isBull = c.close >= c.open;
              return (
                <rect key={`vol-${i}`}
                  x={cx - candleW / 2} y={volAreaTop + volAreaH - barH}
                  width={Math.max(candleW, 1)} height={Math.max(barH, 1)}
                  fill={isBull ? "#26a69a" : "#f44753"} fillOpacity={0.35}
                />
              );
            })}

            {/* Candles */}
            {validCandles.map((c, i) => {
              const cx = scales.xScale(i);
              const isBull = c.close >= c.open;
              const color = isBull ? "#26a69a" : "#f44753";
              const yH = scales.yScale(c.high);
              const yL = scales.yScale(c.low);
              const yO = scales.yScale(c.open);
              const yC = scales.yScale(c.close);
              const bodyTop = Math.min(yO, yC);
              const bodyH = Math.max(Math.abs(yC - yO), 1);
              const d = new Date(c.timestamp * 1000);
              const timeStr = d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
              const dateStr = d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });

              return (
                <g key={i}
                  onMouseEnter={() => setTooltip({
                    x: cx, y: yH,
                    open: c.open, high: c.high, low: c.low, close: c.close,
                    volume: c.volume ?? 0,
                    time: timeStr, date: dateStr
                  })}
                >
                  <rect x={cx - candleW} y={yH - 2} width={candleW * 2} height={yL - yH + 4} fill="transparent" />
                  <line x1={cx} y1={yH} x2={cx} y2={yL} stroke={color} strokeWidth={1} />
                  <rect x={cx - candleW / 2} y={bodyTop} width={candleW} height={bodyH}
                    fill={color} fillOpacity={isBull ? 0.85 : 1} stroke={color} strokeWidth={0.5}
                  />
                </g>
              );
            })}

            {/* Current price line */}
            <line
              x1={PAD.left} y1={scales.yScale(detail.currentPrice)}
              x2={chartRight} y2={scales.yScale(detail.currentPrice)}
              stroke="#00bcd4" strokeWidth={1.5} strokeDasharray="5 3"
            />
            <rect
              x={chartRight + 2} y={scales.yScale(detail.currentPrice) - 9}
              width={PAD.right - 4} height={18}
              fill="#00bcd4" rx={2}
            />
            <text
              x={chartRight + 5} y={scales.yScale(detail.currentPrice) + 4}
              fill="#0d1117" fontSize={10} fontFamily="monospace" fontWeight="bold"
            >
              {detail.currentPrice.toFixed(priceDecimals(detail.symbol))}
            </text>

            {/* Y axis labels */}
            {yTicks.map((price, i) => (
              <text key={i}
                x={chartRight + 4} y={scales.yScale(price) + 4}
                fill="#4a5568" fontSize={10} fontFamily="monospace"
              >
                {price.toFixed(priceDecimals(detail.symbol))}
              </text>
            ))}

            {/* EMA legend */}
            <g>
              <line x1={PAD.left + 4} y1={PAD.top - 8} x2={PAD.left + 18} y2={PAD.top - 8}
                stroke="#60a5fa" strokeWidth={1.5} />
              <text x={PAD.left + 22} y={PAD.top - 4} fill="#60a5fa" fontSize={9} fontFamily="monospace">EMA 50</text>
              <line x1={PAD.left + 68} y1={PAD.top - 8} x2={PAD.left + 82} y2={PAD.top - 8}
                stroke="#f97316" strokeWidth={1.5} />
              <text x={PAD.left + 86} y={PAD.top - 4} fill="#f97316" fontSize={9} fontFamily="monospace">EMA 200</text>
            </g>

            {/* X axis labels */}
            {xTicks.map(({ i, c }) => (
              <text key={i}
                x={scales.xScale(i)} y={size.h - VOL_H - 4}
                fill="#4a5568" fontSize={9} textAnchor="middle" fontFamily="monospace"
              >
                {formatXLabel(c.timestamp, spansDays)}
              </text>
            ))}

            {/* Tooltip */}
            {tooltip && (() => {
              const isBull = tooltip.close >= tooltip.open;
              const color = isBull ? "#26a69a" : "#f44753";
              const tw = 130;
              const th = 120;
              const tx = Math.min(tooltip.x + 12, chartRight - tw - 4);
              const ty = Math.max(tooltip.y - 10, PAD.top);
              return (
                <g>
                  <rect x={tx} y={ty} width={tw} height={th}
                    fill="#1a1f2e" stroke="#2a3045" strokeWidth={1} rx={4}
                  />
                  <text x={tx + 8} y={ty + 14} fill="#6b7280" fontSize={9} fontFamily="monospace">
                    {tooltip.date}
                  </text>
                  <text x={tx + 8} y={ty + 26} fill="#6b7280" fontSize={9} fontFamily="monospace">
                    {tooltip.time}
                  </text>
                  {[
                    ["О", tooltip.open, color],
                    ["В", tooltip.high, "#26a69a"],
                    ["Н", tooltip.low, "#f44753"],
                    ["З", tooltip.close, color],
                  ].map(([label, val, clr], idx) => (
                    <g key={idx}>
                      <text x={tx + 8} y={ty + 42 + idx * 16} fill="#9ca3af" fontSize={10} fontFamily="monospace">
                        {label as string}:
                      </text>
                      <text x={tx + 26} y={ty + 42 + idx * 16} fill={clr as string} fontSize={10} fontFamily="monospace">
                        {(val as number).toFixed(priceDecimals(detail.symbol))}
                      </text>
                    </g>
                  ))}
                  <text x={tx + 8} y={ty + 108} fill="#6b7280" fontSize={9} fontFamily="monospace">
                    Vol: {tooltip.volume > 0 ? (tooltip.volume / 1000).toFixed(0) + "K" : "—"}
                  </text>
                </g>
              );
            })()}
          </>
        )}
      </svg>
    </div>
  );
}
