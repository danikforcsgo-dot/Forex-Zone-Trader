import { useGetPairs, useGetAlerts } from "@workspace/api-client-react";
import { PairCard } from "@/components/pair-card";
import { EconomicCalendar } from "@/components/economic-calendar";
import { Loader2, CalendarDays } from "lucide-react";
import { useSoundAlert } from "@/hooks/use-sound-alert";

export default function Dashboard() {
  const { data: pairs, isLoading } = useGetPairs({
    query: { refetchInterval: 5000 },
  });
  const { data: alerts } = useGetAlerts({ query: { refetchInterval: 5000 } });
  useSoundAlert(alerts);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-3 font-mono">ЗАГРУЗКА ДАННЫХ РЫНКА...</span>
      </div>
    );
  }

  if (!pairs) return <div className="text-destructive font-mono">Ошибка загрузки данных</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">ОБЗОР РЫНКА</h1>
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
          </span>
          LIVE
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {pairs.map((pair) => (
          <PairCard key={pair.symbol} pair={pair} />
        ))}
      </div>

      {/* Economic Calendar */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
          <CalendarDays className="w-4 h-4" />
          Экономический Календарь — Эта Неделя (HIGH + MEDIUM)
        </h2>
        <EconomicCalendar />
      </div>
    </div>
  );
}
