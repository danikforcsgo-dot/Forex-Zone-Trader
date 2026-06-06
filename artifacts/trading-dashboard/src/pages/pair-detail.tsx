import { useGetPairDetail, getGetPairDetailQueryKey, useGetAlerts } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { ArrowLeft, Loader2, Target, TrendingUp, TrendingDown } from "lucide-react";
import { MiniChart } from "@/components/mini-chart";
import { PatternBadge } from "@/components/pattern-badge";
import { ZoneRating } from "@/components/zone-rating";
import { AdrBar } from "@/components/adr-bar";
import { useSoundAlert } from "@/hooks/use-sound-alert";
import { formatPrice, formatChange, zoneStatusRu } from "@/lib/format";

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
  const isLong = detail.signal === "long";

  const signalColor = isShort ? "text-destructive" : isLong ? "text-success" : "text-muted-foreground";
  const signalBorder = isShort ? "border-destructive bg-destructive/10" : isLong ? "border-success bg-success/10" : "border-border bg-card";

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar */}
        <div className="space-y-4">

          {/* Signal card */}
          <div className={`p-5 rounded-lg border ${signalBorder}`}>
            <h3 className="text-xs font-bold text-muted-foreground uppercase mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Торговый Сигнал
            </h3>

            <div className={`text-3xl font-black uppercase tracking-widest mb-3 ${signalColor}`}>
              {isShort ? "ПРОДАЖА" : isLong ? "ПОКУПКА" : "НЕЙТРАЛЬНО"}
            </div>

            {detail.pattern && detail.pattern !== "none" && (
              <div className="mb-3">
                <PatternBadge pattern={detail.pattern} />
              </div>
            )}

            <div className="space-y-0 font-mono text-sm">
              {[
                ["Bid", formatPrice(detail.bid, detail.symbol)],
                ["Ask", formatPrice(detail.ask, detail.symbol)],
                ["Изм.", formatChange(detail.change, detail.symbol)],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between items-center py-1.5 border-b border-border/40 last:border-0">
                  <span className="text-muted-foreground">{label}</span>
                  <span>{val}</span>
                </div>
              ))}
            </div>

            {/* Distance to nearest zone when neutral */}
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

          {/* ADR card */}
          <div className="p-5 rounded-lg border border-border bg-card">
            <AdrBar
              adrPips={detail.adrPips}
              todayRangePips={detail.todayRangePips}
              adrPercent={detail.adrPercent}
              adrRisk={detail.adrRisk}
            />
          </div>

          {/* Zones list */}
          <div className="p-5 rounded-lg border border-border bg-card">
            <h3 className="text-xs font-bold text-muted-foreground uppercase mb-4">Ближайшие зоны</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 text-destructive mb-2 text-xs font-bold uppercase tracking-wider">
                  <TrendingDown className="w-3.5 h-3.5" /> Сопротивление
                </div>
                {detail.resistanceZones.slice(0, 3).map((z, i) => (
                  <div key={i} className="py-2 border-b border-border/50 last:border-0 space-y-1" data-testid={`zone-resistance-${i}`}>
                    <div className="font-mono text-xs flex justify-between">
                      <span className="text-foreground">{z.bot.toFixed(5)} — {z.top.toFixed(5)}</span>
                      <span className="text-muted-foreground">{z.touches} кас.</span>
                    </div>
                    <ZoneRating rating={z.rating ?? 1} htfConfluence={z.htfConfluence ?? false} htfLevel={z.htfLevel} />
                  </div>
                ))}
                {detail.resistanceZones.length === 0 && (
                  <div className="text-xs text-muted-foreground py-1">Нет зон</div>
                )}
              </div>

              <div className="pt-1">
                <div className="flex items-center gap-2 text-success mb-2 text-xs font-bold uppercase tracking-wider">
                  <TrendingUp className="w-3.5 h-3.5" /> Поддержка
                </div>
                {detail.supportZones.slice(0, 3).map((z, i) => (
                  <div key={i} className="py-2 border-b border-border/50 last:border-0 space-y-1" data-testid={`zone-support-${i}`}>
                    <div className="font-mono text-xs flex justify-between">
                      <span className="text-foreground">{z.bot.toFixed(5)} — {z.top.toFixed(5)}</span>
                      <span className="text-muted-foreground">{z.touches} кас.</span>
                    </div>
                    <ZoneRating rating={z.rating ?? 1} htfConfluence={z.htfConfluence ?? false} htfLevel={z.htfLevel} />
                  </div>
                ))}
                {detail.supportZones.length === 0 && (
                  <div className="text-xs text-muted-foreground py-1">Нет зон</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="lg:col-span-2 rounded-lg border border-border bg-card p-4 min-h-[500px] flex flex-col">
          <h3 className="text-xs font-bold text-muted-foreground uppercase mb-4 tracking-wider">M15 · График и Зоны S&R</h3>
          <div className="flex-1 w-full min-h-[420px]">
            <MiniChart detail={detail} />
          </div>
        </div>
      </div>
    </div>
  );
}
