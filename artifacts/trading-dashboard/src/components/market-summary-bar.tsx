import { useGetMarketSummary } from "@workspace/api-client-react";
import { Clock, Globe, Activity, AlertTriangle } from "lucide-react";

const SESSION_RU: Record<string, string> = {
  Sydney:               "Сидней",
  Tokyo:                "Токио",
  London:               "Лондон",
  New_York:             "Нью-Йорк",
  Overlap_London_NY:    "Лондон / Нью-Йорк",
  Overlap_Tokyo_London: "Токио / Лондон",
  Closed:               "Рынок закрыт",
};

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

  return (
    <div className="h-10 border-b border-border bg-card flex flex-wrap items-center justify-between px-4 text-xs tracking-wider gap-4">
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
          <span className="font-mono">{summary.sessionTime}</span>
        </div>
      </div>

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
  );
}
