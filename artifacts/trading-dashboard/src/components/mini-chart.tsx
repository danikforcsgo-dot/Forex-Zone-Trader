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
  time: string;
  date: string;
}

const PAD = { top: 24, right: 82, bottom: 32, left: 6 };

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

  const candles = detail.candles.slice(-120);
  const validCandles = candles.filter(
    (c) => c.high > 0 && c.low > 0 && c.open > 0 && c.close > 0
  );

  // Check if candles span multiple calendar days
  const firstTs = validCandles[0]?.timestamp ?? 0;
  const lastTs = validCandles[validCandles.length - 1]?.timestamp ?? 0;
  const spansDays = lastTs - firstTs > 86400;

  const allZones: Zone[] = [...detail.resistanceZones, ...detail.supportZones];

  const scales = useChartScales(validCandles, allZones, detail.currentPrice, size.w, size.h);

  const yTicks = scales
    ? (() => {
        const count = 7;
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
                x2={size.w - PAD.right} y2={scales.yScale(price)}
                stroke="#1e2535" strokeWidth={1}
              />
            ))}

            {/* Support zones */}
            {detail.supportZones.map((z, i) => {
              const y1 = scales.yScale(z.top);
              const y2 = scales.yScale(z.bot);
              return (
                <g key={`sup-${i}`}>
                  <rect x={PAD.left} y={y1}
                    width={size.w - PAD.left - PAD.right}
                    height={Math.max(y2 - y1, 2)}
                    fill="#26a69a" fillOpacity={0.12}
                  />
                  <line x1={PAD.left} y1={y1} x2={size.w - PAD.right} y2={y1}
                    stroke="#26a69a" strokeOpacity={0.5} strokeWidth={1} strokeDasharray="4 3" />
                  <line x1={PAD.left} y1={y2} x2={size.w - PAD.right} y2={y2}
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
                    width={size.w - PAD.left - PAD.right}
                    height={Math.max(y2 - y1, 2)}
                    fill="#f44753" fillOpacity={0.12}
                  />
                  <line x1={PAD.left} y1={y1} x2={size.w - PAD.right} y2={y1}
                    stroke="#f44753" strokeOpacity={0.5} strokeWidth={1} strokeDasharray="4 3" />
                  <line x1={PAD.left} y1={y2} x2={size.w - PAD.right} y2={y2}
                    stroke="#f44753" strokeOpacity={0.5} strokeWidth={1} strokeDasharray="4 3" />
                </g>
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
              const ts = c.timestamp;
              const d = new Date(ts * 1000);
              const timeStr = d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
              const dateStr = d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });

              return (
                <g key={i}
                  onMouseEnter={() => setTooltip({ x: cx, y: yH, open: c.open, high: c.high, low: c.low, close: c.close, time: timeStr, date: dateStr })}
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
              x2={size.w - PAD.right} y2={scales.yScale(detail.currentPrice)}
              stroke="#00bcd4" strokeWidth={1.5} strokeDasharray="5 3"
            />
            <rect
              x={size.w - PAD.right + 2} y={scales.yScale(detail.currentPrice) - 9}
              width={PAD.right - 4} height={18}
              fill="#00bcd4" rx={2}
            />
            <text
              x={size.w - PAD.right + 5} y={scales.yScale(detail.currentPrice) + 4}
              fill="#0d1117" fontSize={10} fontFamily="monospace" fontWeight="bold"
            >
              {detail.currentPrice.toFixed(priceDecimals(detail.symbol))}
            </text>

            {/* Y axis labels */}
            {yTicks.map((price, i) => (
              <text key={i}
                x={size.w - PAD.right + 4} y={scales.yScale(price) + 4}
                fill="#4a5568" fontSize={10} fontFamily="monospace"
              >
                {price.toFixed(priceDecimals(detail.symbol))}
              </text>
            ))}

            {/* X axis labels */}
            {xTicks.map(({ i, c }) => (
              <text key={i}
                x={scales.xScale(i)} y={size.h - 6}
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
              const th = 106;
              const tx = Math.min(tooltip.x + 12, size.w - PAD.right - tw - 4);
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
                </g>
              );
            })()}
          </>
        )}
      </svg>
    </div>
  );
}
