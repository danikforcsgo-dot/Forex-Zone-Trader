import { useGetAlerts } from "@workspace/api-client-react";
import { AlertCircle } from "lucide-react";
import { Link } from "wouter";

export function AlertBanner() {
  const { data: alerts } = useGetAlerts({
    query: { refetchInterval: 30000 }
  });

  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="bg-card border-b border-border">
      {alerts.map((alert, i) => (
        <div 
          key={`${alert.symbol}-${i}`}
          className={`px-4 py-3 flex items-center justify-between border-l-4 ${
            alert.signal === "short" 
              ? "bg-destructive/10 border-destructive text-destructive-foreground" 
              : "bg-success/10 border-success text-success-foreground"
          }`}
        >
          <div className="flex items-center gap-3">
            <AlertCircle className={`w-5 h-5 ${alert.signal === "short" ? "text-destructive" : "text-success"}`} />
            <span className="font-bold text-lg tracking-wider">{alert.displayName}</span>
            <span className="text-sm opacity-90 hidden sm:inline">{alert.message}</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-xs opacity-70">СИГНАЛ</div>
              <div className={`font-bold uppercase tracking-widest ${alert.signal === "short" ? "text-destructive" : "text-success"}`}>
                {alert.signal === "short" ? "ПРОДАЖА (SHORT)" : "ПОКУПКА (LONG)"}
              </div>
            </div>
            
            <Link href={`/pair/${alert.symbol}`} className="bg-background/50 hover:bg-background/80 px-4 py-2 rounded text-sm font-bold transition-colors">
              ТЕРМИНАЛ
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
