import { useGetCalendar } from "@workspace/api-client-react";
import { CalendarDays, Loader2 } from "lucide-react";

const IMPACT_COLOR: Record<string, string> = {
  High:            "text-destructive bg-destructive/10 border-destructive/30",
  Medium:          "text-warning bg-warning/10 border-warning/30",
  Low:             "text-muted-foreground bg-muted/10 border-border",
  Holiday:         "text-blue-400 bg-blue-400/10 border-blue-400/30",
  "Non-Economic":  "text-muted-foreground/40 bg-transparent border-transparent",
};

const IMPACT_DOT: Record<string, string> = {
  High:   "bg-destructive",
  Medium: "bg-warning",
  Low:    "bg-muted-foreground",
};

const FLAG: Record<string, string> = {
  USD: "🇺🇸", GBP: "🇬🇧", EUR: "🇪🇺", JPY: "🇯🇵",
  AUD: "🇦🇺", NZD: "🇳🇿", CAD: "🇨🇦", CHF: "🇨🇭",
};

const DAY_RU = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

function utcLabel(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function dayKey(dateStr: string): string {
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

function dayLabel(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return `${DAY_RU[d.getUTCDay()]} ${d.toLocaleDateString("ru-RU", {
    day: "2-digit", month: "2-digit", timeZone: "UTC",
  })}`;
}

export function EconomicCalendar() {
  const { data, isLoading } = useGetCalendar({
    query: { refetchInterval: 5 * 60 * 1000 },
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-xs font-mono py-4 justify-center">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Загрузка календаря...
      </div>
    );
  }

  const events = (data ?? []).filter(
    (e) => e.impact === "High" || e.impact === "Medium"
  );

  if (events.length === 0) {
    return (
      <div className="text-xs text-muted-foreground font-mono py-3 text-center">
        Нет важных событий на этой неделе
      </div>
    );
  }

  // Group by UTC date
  const grouped = new Map<string, typeof events>();
  for (const ev of events) {
    const k = dayKey(ev.date);
    if (!grouped.has(k)) grouped.set(k, []);
    grouped.get(k)!.push(ev);
  }
  const sortedDays = [...grouped.entries()].sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  const nowTs = Date.now();

  return (
    <div className="space-y-4">
      {sortedDays.map(([day, dayEvents]) => (
        <div key={day}>
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
            {dayLabel(dayEvents[0].date)}
          </div>
          <div className="space-y-1">
            {dayEvents.map((ev, i) => {
              const evTs = new Date(ev.date).getTime();
              const isPast = evTs < nowTs;
              const isSoon = !isPast && evTs - nowTs < 60 * 60 * 1000;
              return (
                <div
                  key={i}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs font-mono border transition-all ${
                    IMPACT_COLOR[ev.impact] ?? IMPACT_COLOR.Low
                  } ${isPast ? "opacity-40" : ""} ${
                    isSoon ? "ring-1 ring-warning/40" : ""
                  }`}
                >
                  {/* Impact dot */}
                  <span
                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      IMPACT_DOT[ev.impact] ?? "bg-muted-foreground"
                    }`}
                  />
                  {/* Time UTC */}
                  <span className="w-10 flex-shrink-0 text-muted-foreground">
                    {utcLabel(ev.date)}
                  </span>
                  {/* Flag + currency */}
                  <span className="flex-shrink-0">
                    {FLAG[ev.country] ?? "🌐"} {ev.country}
                  </span>
                  {/* Title */}
                  <span className="flex-1 truncate">{ev.title}</span>
                  {/* Forecast/Previous */}
                  {(ev.forecast || ev.previous) && (
                    <span className="flex-shrink-0 text-muted-foreground text-[9px]">
                      {ev.forecast ? `П: ${ev.forecast}` : ""}
                      {ev.forecast && ev.previous ? " / " : ""}
                      {ev.previous ? `Пр: ${ev.previous}` : ""}
                    </span>
                  )}
                  {/* Actual if available */}
                  {ev.actual && (
                    <span className="flex-shrink-0 font-bold">{ev.actual}</span>
                  )}
                  {isSoon && (
                    <span className="flex-shrink-0 text-warning text-[9px] font-bold animate-pulse">
                      СКОРО
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
