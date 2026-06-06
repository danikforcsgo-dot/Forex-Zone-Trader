import { useGetMarketSummary } from "@workspace/api-client-react";
import { Clock, Globe, Activity, AlertTriangle } from "lucide-react";

export function MarketSummaryBar() {
  const { data: summary, isLoading } = useGetMarketSummary({
    query: { refetchInterval: 30000 }
  });

  if (isLoading || !summary) {
    return (
      <div className="h-12 border-b border-border bg-card flex items-center px-4 animate-pulse">
        <div className="h-4 w-64 bg-muted rounded"></div>
      </div>
    );
  }

  return (
    <div className="h-12 border-b border-border bg-card flex flex-wrap items-center justify-between px-4 text-xs tracking-wider gap-4">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Globe className="w-4 h-4 text-primary" />
          <span>СЕССИЯ:</span>
          <span className="text-foreground font-bold">{summary.session.replace(/_/g, " ")}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground hidden sm:flex">
          <Clock className="w-4 h-4" />
          <span>{summary.sessionTime}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">ПАРЫ В ЗОНАХ:</span>
          <span className="text-destructive font-bold">{summary.pairsInResistance} R</span>
          <span className="text-muted-foreground">/</span>
          <span className="text-success font-bold">{summary.pairsInSupport} S</span>
        </div>
        
        {summary.activeAlerts > 0 && (
          <div className="flex items-center gap-2 text-warning font-bold bg-warning/10 px-2 py-1 rounded">
            <AlertTriangle className="w-4 h-4" />
            <span>АКТИВНЫЕ СИГНАЛЫ: {summary.activeAlerts}</span>
          </div>
        )}
      </div>
    </div>
  );
}
