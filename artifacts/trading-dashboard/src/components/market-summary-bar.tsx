import { useGetMarketSummary } from "@workspace/api-client-react";
import { Clock, Globe, Activity, AlertTriangle, Zap } from "lucide-react";

const SESSION_RU: Record<string, string> = {
  Sydney:               "Сидней",
  Tokyo:                "Токио",
  London:               "Лондон",
  New_York:             "Нью-Йорк",
  Overlap_London_NY:    "Лондон / Нью-Йорк",
  Overlap_Tokyo_London: "Токио / Лондон",
  Closed:               "Рынок закрыт",
};

const DAY_RU = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

export function MarketSummaryBar() {
  const { data: summary, isLoading } = useGetMarketSummary({
    query: { refetchInterval: 5000 }
  });

  if (isLoading || !summary) {
    return (
      <div className="h-10 border-b border-border bg-card flex items-center px-4 animate-pulse">
        <div className="h-3 w-64 bg-muted rounded" />
      </div>
    );
  }

  const sessionLabel = SESSION_RU[summary.session] ?? summary.session.replace(/_/g, " ");
  const dayLabel = summary.dayOfWeek != null ? DAY_RU[summary.dayOfWeek] : "";

  return (
    <div className={`border-b border-border flex flex-col ${summary.isKillZone ? "bg-warning/5" : "bg-card"}`}>
      <div className="h-10 flex flex-wrap items-center justify-between px-4 text-xs tracking-wider gap-4">
        {/* Left: session + time + kill zone */}
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Globe className="w-3.5 h-3.5 text-primary" />
            <span>СЕССИЯ:</span>
            <span className={`font-bold ${summary.session === "Closed" ? "text-muted-foreground" : "text-foreground"}`}>
              {sessionLabel}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground hidden sm:flex">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-mono">{dayLabel} {summary.sessionTime}</span>
          </div>
          {summary.isKillZone && (
            <div className="flex items-center gap-1 text-warning font-bold animate-pulse">
              <Zap className="w-3 h-3" />
              <span className="text-[10px]">KILL ZONE</span>
            </div>
          )}
        </div>

        {/* Right: pairs in zones + alerts */}
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Activity className="w-3.5 h-3.5" />
            <span>ПАРЫ В ЗОНАХ:</span>
            <span className="text-destructive font-bold">{summary.pairsInResistance} СОПР</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-success font-bold">{summary.pairsInSupport} ПОДД</span>
          </div>

          {summary.activeAlerts > 0 && (
            <div className="flex items-center gap-1.5 text-warning font-bold bg-warning/10 px-2 py-0.5 rounded">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>СИГНАЛОВ: {summary.activeAlerts}</span>
            </div>
          )}
        </div>
      </div>

      {/* Kill zone name bar */}
      {summary.isKillZone && summary.killZoneName && (
        <div className="px-4 pb-1 text-[10px] text-warning/80 font-mono tracking-wider">
          ⚡ {summary.killZoneName} — лучшее время для входа
        </div>
      )}

      {/* Day warning bar */}
      {summary.dayWarning && !summary.isKillZone && (
        <div className="px-4 pb-1 text-[10px] text-warning/70 font-mono tracking-wider">
          ⚠ {summary.dayWarning}
        </div>
      )}
    </div>
  );
}
