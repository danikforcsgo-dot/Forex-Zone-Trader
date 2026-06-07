import { useGetPairDetail, getGetPairDetailQueryKey, useGetAlerts } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { ArrowLeft, Loader2, Target, TrendingUp, TrendingDown, BarChart2, Minus, Layers, Zap } from "lucide-react";
import { MiniChart } from "@/components/mini-chart";
import { PatternBadge } from "@/components/pattern-badge";
import { ZoneRating } from "@/components/zone-rating";
import { AdrBar } from "@/components/adr-bar";
import { useSoundAlert } from "@/hooks/use-sound-alert";
import { formatPrice, formatChange, zoneStatusRu, priceDecimals } from "@/lib/format";

const TREND_RU: Record<string, string> = {
  up:    "↑ Восходящий",
  down:  "↓ Нисходящий",
  range: "— Боковик",
};

const BIAS_RU: Record<string, string> = {
  bullish: "↑ БЫЧИЙ",
  bearish: "↓ МЕДВЕЖИЙ",
  neutral: "— НЕЙТРАЛЬНЫЙ",
};

function ProbabilityBadge({ score }: { score: number }) {
  const color =
    score >= 70 ? "text-success bg-success/15 border-success/40" :
    score >= 50 ? "text-warning bg-warning/15 border-warning/40" :
    "text-muted-foreground bg-muted/20 border-border";
  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border font-mono ${color}`}>
      {score}%
    </span>
  );
}

export default function PairDetail() {
  const params = useParams<{ symbol: string }>();
  const symbol = params.symbol;

  const { data: detail, isLoading } = useGetPairDetail(symbol || "", {
    query: {
      enabled: !!symbol,
      queryKey: getGetPairDetailQueryKey(symbol || ""),
      refetchInterval: 5000,
    },
  });

  const { data: alerts } = useGetAlerts({ query: { refetchInterval: 5000 } });
  useSoundAlert(alerts);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-3 font-mono">ЗАГРУЗКА ТЕРМИНАЛА...</span>
      </div>
    );
  }

  if (!detail) return <div className="text-destructive font-mono">Данные не найдены</div>;

  const isShort = detail.signal === "short";
  const isLong  = detail.signal === "long";
  const dec = priceDecimals(detail.symbol);

  const signalColor  = isShort ? "text-destructive" : isLong ? "text-success" : "text-muted-foreground";
  const signalBorder = isShort ? "border-destructive bg-destructive/10" : isLong ? "border-success bg-success/10" : "border-border bg-card";

  const ms   = detail.marketStructure;
  const bias = detail.dailyBias ?? "neutral";
  const vp   = detail.volumeProfile;

  const biasColor =
    bias === "bullish" ? "text-success" :
    bias === "bearish" ? "text-destructive" :
    "text-muted-foreground";

  const trendLabel = ms ? (TREND_RU[ms.trend] ?? ms.trend) : "—";

  const activeObs  = (detail.orderBlocks ?? []).filter(ob => !ob.mitigated);
  const recentGrabs = (detail.liquidityGrabs ?? []).slice(0, 3);

  return (
    <div className="max-w-6xl mx-auto space-y-4 animate-in fade-in">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground" data-testid="link-back">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-black tracking-tight">{detail.displayName}</h1>
            <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1 font-mono">
              <span>{detail.symbol}</span>
              <span>•</span>
              <span>M15</span>
              <span>•</span>
              <span className={detail.change >= 0 ? "text-success" : "text-destructive"}>
                {formatChange(detail.change, detail.symbol)} ({detail.changePct > 0 ? "+" : ""}{detail.changePct.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-4xl font-mono font-black ${signalColor}`} data-testid="text-current-price">
            {formatPrice(detail.currentPrice, detail.symbol)}
          </div>
          <div className="text-xs text-muted-foreground mt-1 font-mono uppercase tracking-wider">
            {zoneStatusRu(detail.zoneStatus)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sidebar */}
        <div className="space-y-3">

          {/* Signal */}
          <div className={`p-4 rounded-lg border ${signalBorder}`}>
            <h3 className="text-xs font-bold text-muted-foreground uppercase mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Торговый Сигнал
            </h3>
            <div className={`text-3xl font-black uppercase tracking-widest mb-3 ${signalColor}`}>
              {isShort ? "ПРОДАЖА" : isLong ? "ПОКУПКА" : "НЕЙТРАЛЬНО"}
            </div>
            {detail.pattern && detail.pattern !== "none" && (
              <div className="mb-3"><PatternBadge pattern={detail.pattern} /></div>
            )}
            <div className="space-y-0 font-mono text-sm">
              {[
                ["Bid",  formatPrice(detail.bid, detail.symbol)],
                ["Ask",  formatPrice(detail.ask, detail.symbol)],
                ["Изм.", formatChange(detail.change, detail.symbol)],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between items-center py-1.5 border-b border-border/40 last:border-0">
                  <span className="text-muted-foreground">{label}</span>
                  <span>{val}</span>
                </div>
              ))}
            </div>
            {!isShort && !isLong && (detail.nearestResistance != null || detail.nearestSupport != null) && (
              <div className="mt-3 pt-3 border-t border-border/40 space-y-1 text-xs font-mono">
                {detail.nearestResistance != null && (
                  <div className="flex justify-between">
                    <span className="text-destructive/80">↑ Сопр.</span>
                    <span>{formatPrice(detail.nearestResistance, detail.symbol)}
                      <span className="text-muted-foreground ml-1">
                        +{((detail.nearestResistance - detail.currentPrice) / detail.currentPrice * 100).toFixed(2)}%
                      </span>
                    </span>
                  </div>
                )}
                {detail.nearestSupport != null && (
                  <div className="flex justify-between">
                    <span className="text-success/80">↓ Подд.</span>
                    <span>{formatPrice(detail.nearestSupport, detail.symbol)}
                      <span className="text-muted-foreground ml-1">
                        -{((detail.currentPrice - detail.nearestSupport) / detail.currentPrice * 100).toFixed(2)}%
                      </span>
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Market Structure */}
          <div className="p-4 rounded-lg border border-border bg-card">
            <h3 className="text-xs font-bold text-muted-foreground uppercase mb-3 flex items-center gap-2">
              <BarChart2 className="w-4 h-4" />
              Структура Рынка
            </h3>
            <div className="space-y-0 text-xs font-mono">
              <div className="flex justify-between items-center py-1.5 border-b border-border/40">
                <span className="text-muted-foreground">Daily Bias</span>
                <span className={`font-bold ${biasColor}`}>{BIAS_RU[bias] ?? bias}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-border/40">
                <span className="text-muted-foreground">M15 Тренд</span>
                <span className={`font-bold ${
                  ms?.trend === "up" ? "text-success" :
                  ms?.trend === "down" ? "text-destructive" :
                  "text-muted-foreground"
                }`}>{trendLabel}</span>
              </div>
              {detail.ema50 != null && detail.ema200 != null && (
                <div className="flex justify-between items-start py-1.5 border-b border-border/40">
                  <span className="text-muted-foreground">EMA 50/200</span>
                  <div className="text-right space-y-0.5">
                    <div><span className="text-blue-400">EMA50</span><span className="ml-1">{formatPrice(detail.ema50, detail.symbol)}</span></div>
                    <div><span className="text-orange-400">EMA200</span><span className="ml-1">{formatPrice(detail.ema200, detail.symbol)}</span></div>
                  </div>
                </div>
              )}
              {ms && (ms.lastSwingHigh != null || ms.lastSwingLow != null) && (
                <div className="flex justify-between items-start py-1.5 border-b border-border/40">
                  <span className="text-muted-foreground">Свинги</span>
                  <div className="text-right space-y-0.5">
                    {ms.lastSwingHigh != null && <div><span className="text-destructive/80">↑ High</span><span className="ml-1">{ms.lastSwingHigh.toFixed(dec)}</span></div>}
                    {ms.lastSwingLow  != null && <div><span className="text-success/80">↓ Low</span><span className="ml-1">{ms.lastSwingLow.toFixed(dec)}</span></div>}
                  </div>
                </div>
              )}
              {ms?.bos && (
                <div className="flex justify-between items-center py-1.5 border-b border-border/40">
                  <span className={ms.bos.direction === "up" ? "text-success font-bold" : "text-destructive font-bold"}>
                    BOS {ms.bos.direction === "up" ? "▲" : "▼"}
                  </span>
                  <span>{ms.bos.price.toFixed(dec)}</span>
                </div>
              )}
              {ms?.choch && (
                <div className="flex justify-between items-center py-1.5">
                  <span className={ms.choch.direction === "up" ? "text-success font-bold" : "text-destructive font-bold"}>
                    CHOCH {ms.choch.direction === "up" ? "▲" : "▼"}
                  </span>
                  <span>{ms.choch.price.toFixed(dec)}</span>
                </div>
              )}
              {detail.fairValueGaps != null && detail.fairValueGaps.length > 0 && (
                <div className="flex justify-between items-center py-1.5 border-t border-border/40">
                  <span className="text-muted-foreground">FVG (незакрытые)</span>
                  <span className="text-cyan-400 font-bold">{detail.fairValueGaps.filter(f => !f.filled).length}</span>
                </div>
              )}
            </div>
          </div>

          {/* SMC: Order Blocks + Liquidity Grabs */}
          {(activeObs.length > 0 || recentGrabs.length > 0) && (
            <div className="p-4 rounded-lg border border-border bg-card">
              <h3 className="text-xs font-bold text-muted-foreground uppercase mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4" />
                SMC / ICT
              </h3>
              <div className="text-xs font-mono space-y-2">
                {/* Active Order Blocks */}
                {activeObs.length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Order Blocks</div>
                    {activeObs.slice(0, 4).map((ob, i) => {
                      const isAbove = ob.bot > detail.currentPrice;
                      const isBelow = ob.top < detail.currentPrice;
                      const color = ob.isBullish ? "text-success" : "text-destructive";
                      const label = ob.isBullish ? "Bull OB" : "Bear OB";
                      const dist = isAbove
                        ? ((ob.bot - detail.currentPrice) / detail.currentPrice * 100).toFixed(2)
                        : isBelow
                        ? ((detail.currentPrice - ob.top) / detail.currentPrice * 100).toFixed(2)
                        : "INSIDE";
                      return (
                        <div key={i} className="flex justify-between items-center py-1 border-b border-border/30 last:border-0">
                          <span className={`font-bold ${color}`}>{label}</span>
                          <span className="text-muted-foreground">{ob.bot.toFixed(dec)}—{ob.top.toFixed(dec)}</span>
                          <span className={`text-[9px] ${isAbove ? "text-destructive/70" : isBelow ? "text-success/70" : "text-warning"}`}>
                            {dist === "INSIDE" ? "⚡ В зоне" : `${isAbove ? "↑" : "↓"}${dist}%`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Liquidity Grabs */}
                {recentGrabs.length > 0 && (
                  <div className={activeObs.length > 0 ? "pt-2 border-t border-border/40" : ""}>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
                      <Zap className="w-3 h-3" /> Захваты ликвидности
                    </div>
                    {recentGrabs.map((lq, i) => {
                      const d = new Date(lq.timestamp * 1000);
                      const timeStr = d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
                      const dateStr = d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
                      return (
                        <div key={i} className="flex justify-between items-center py-1 border-b border-border/30 last:border-0">
                          <span className={lq.isBuySide ? "text-destructive font-bold" : "text-success font-bold"}>
                            {lq.isBuySide ? "▲ BSL sweep" : "▼ SSL sweep"}
                          </span>
                          <span>{lq.price.toFixed(dec)}</span>
                          <span className="text-muted-foreground text-[9px]">{dateStr} {timeStr}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Volume Profile stats */}
          {vp && (
            <div className="p-4 rounded-lg border border-border bg-card">
              <h3 className="text-xs font-bold text-muted-foreground uppercase mb-3">
                Volume Profile
              </h3>
              <div className="text-xs font-mono space-y-0">
                {[
                  ["POC", vp.poc.toFixed(dec), "text-yellow-400"],
                  ["VAH", vp.vah.toFixed(dec), "text-blue-400"],
                  ["VAL", vp.val.toFixed(dec), "text-blue-400"],
                ].map(([label, val, color]) => (
                  <div key={label} className="flex justify-between items-center py-1.5 border-b border-border/40 last:border-0">
                    <span className="text-muted-foreground">{label}</span>
                    <span className={color as string}>{val}</span>
                  </div>
                ))}
                {/* Show if price is above/below POC */}
                <div className="flex justify-between items-center pt-1.5">
                  <span className="text-muted-foreground">Цена vs POC</span>
                  <span className={detail.currentPrice > vp.poc ? "text-success font-bold" : "text-destructive font-bold"}>
                    {detail.currentPrice > vp.poc ? "↑ Выше" : "↓ Ниже"}
                    <span className="text-muted-foreground ml-1 font-normal">
                      {Math.abs(detail.currentPrice - vp.poc).toFixed(dec)}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ADR */}
          <div className="p-4 rounded-lg border border-border bg-card">
            <AdrBar
              adrPips={detail.adrPips}
              todayRangePips={detail.todayRangePips}
              adrPercent={detail.adrPercent}
              adrRisk={detail.adrRisk}
            />
          </div>

          {/* Zones */}
          <div className="p-4 rounded-lg border border-border bg-card">
            <h3 className="text-xs font-bold text-muted-foreground uppercase mb-4">Ближайшие зоны</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 text-destructive mb-2 text-xs font-bold uppercase tracking-wider">
                  <TrendingDown className="w-3.5 h-3.5" /> Сопротивление
                </div>
                {detail.resistanceZones.slice(0, 3).map((z, i) => (
                  <div key={i} className="py-2 border-b border-border/50 last:border-0 space-y-1" data-testid={`zone-resistance-${i}`}>
                    <div className="font-mono text-xs flex justify-between items-center">
                      <span>{z.bot.toFixed(dec)} — {z.top.toFixed(dec)}</span>
                      <div className="flex items-center gap-1">
                        {z.nearRoundNumber && (
                          <span className="text-[9px] px-1 py-0.5 rounded bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 font-bold">00/50</span>
                        )}
                        <span className="text-muted-foreground">{z.touches} кас.</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <ZoneRating rating={z.rating ?? 1} htfConfluence={z.htfConfluence ?? false} htfLevel={z.htfLevel} />
                      {z.probabilityScore != null && <ProbabilityBadge score={z.probabilityScore} />}
                    </div>
                    {z.ageBars != null && (
                      <div className="text-[9px] text-muted-foreground font-mono">
                        Возраст: ~{Math.round(z.ageBars / 96 * 10) / 10} дн.
                      </div>
                    )}
                  </div>
                ))}
                {detail.resistanceZones.length === 0 && <div className="text-xs text-muted-foreground py-1">Нет зон</div>}
              </div>

              <div className="pt-1">
                <div className="flex items-center gap-2 text-success mb-2 text-xs font-bold uppercase tracking-wider">
                  <TrendingUp className="w-3.5 h-3.5" /> Поддержка
                </div>
                {detail.supportZones.slice(0, 3).map((z, i) => (
                  <div key={i} className="py-2 border-b border-border/50 last:border-0 space-y-1" data-testid={`zone-support-${i}`}>
                    <div className="font-mono text-xs flex justify-between items-center">
                      <span>{z.bot.toFixed(dec)} — {z.top.toFixed(dec)}</span>
                      <div className="flex items-center gap-1">
                        {z.nearRoundNumber && (
                          <span className="text-[9px] px-1 py-0.5 rounded bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 font-bold">00/50</span>
                        )}
                        <span className="text-muted-foreground">{z.touches} кас.</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <ZoneRating rating={z.rating ?? 1} htfConfluence={z.htfConfluence ?? false} htfLevel={z.htfLevel} />
                      {z.probabilityScore != null && <ProbabilityBadge score={z.probabilityScore} />}
                    </div>
                    {z.ageBars != null && (
                      <div className="text-[9px] text-muted-foreground font-mono">
                        Возраст: ~{Math.round(z.ageBars / 96 * 10) / 10} дн.
                      </div>
                    )}
                  </div>
                ))}
                {detail.supportZones.length === 0 && <div className="text-xs text-muted-foreground py-1">Нет зон</div>}
              </div>

              {/* Psychological levels */}
              {detail.psychologicalLevels && detail.psychologicalLevels.length > 0 && (
                <div className="pt-2 border-t border-border/40">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Minus className="w-3 h-3" /> Психолог. уровни
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {detail.psychologicalLevels.slice(0, 6).map((level, i) => {
                      const isCurrent = Math.abs(level - detail.currentPrice) / detail.currentPrice < 0.002;
                      return (
                        <span key={i} className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                          isCurrent ? "bg-cyan-400/20 text-cyan-400 border border-cyan-400/30" : "bg-muted/30 text-muted-foreground"
                        }`}>
                          {level.toFixed(dec)}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="lg:col-span-2 rounded-lg border border-border bg-card p-4 min-h-[520px] flex flex-col">
          <h3 className="text-xs font-bold text-muted-foreground uppercase mb-4 tracking-wider">
            M15 · График, Зоны S&amp;R, OB, LQ, Volume Profile
          </h3>
          <div className="flex-1 w-full min-h-[460px]">
            <MiniChart detail={detail} />
          </div>
        </div>
      </div>
    </div>
  );
}
