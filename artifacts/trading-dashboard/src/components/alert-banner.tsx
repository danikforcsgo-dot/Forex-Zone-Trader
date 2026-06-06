import { useGetAlerts } from "@workspace/api-client-react";
import { AlertCircle, ExternalLink } from "lucide-react";
import { Link } from "wouter";

export function AlertBanner() {
  const { data: alerts } = useGetAlerts({
    query: { refetchInterval: 5000 }
  });

  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="bg-card border-b border-border">
      {alerts.map((alert, i) => {
        const isShort = alert.signal === "short";
        return (
          <div
            key={`${alert.symbol}-${i}`}
            className={`px-4 py-2.5 flex items-center justify-between border-l-4 ${
              isShort
                ? "bg-destructive/10 border-destructive"
                : "bg-success/10 border-success"
            }`}
          >
            <div className="flex items-center gap-3">
              <AlertCircle className={`w-4 h-4 flex-shrink-0 ${isShort ? "text-destructive" : "text-success"}`} />
              <span className={`font-bold text-base tracking-wider ${isShort ? "text-destructive" : "text-success"}`}>
                {alert.displayName}
              </span>
              <span className={`text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded ${
                isShort ? "bg-destructive/20 text-destructive" : "bg-success/20 text-success"
              }`}>
                {isShort ? "ПРОДАЖА" : "ПОКУПКА"}
              </span>
              <span className="text-xs text-muted-foreground hidden md:inline">{alert.message}</span>
            </div>

            <Link
              href={`/pair/${alert.symbol}`}
              className="flex items-center gap-1.5 bg-background/60 hover:bg-background/90 px-3 py-1.5 rounded text-xs font-bold transition-colors text-foreground"
            >
              <ExternalLink className="w-3 h-3" />
              ОТКРЫТЬ
            </Link>
          </div>
        );
      })}
    </div>
  );
}
