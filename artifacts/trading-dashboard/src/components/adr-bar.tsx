interface AdrBarProps {
  adrPips: number | null | undefined;
  todayRangePips: number | null | undefined;
  adrPercent: number | null | undefined;
  adrRisk: string | null | undefined;
  compact?: boolean;
}

const RISK_CONFIG: Record<string, { color: string; barColor: string; label: string; tip: string }> = {
  low:       { color: "text-success",     barColor: "bg-success",     label: "НИЗКИЙ",       tip: "Хороший момент для входа" },
  medium:    { color: "text-yellow-400",  barColor: "bg-yellow-400",  label: "СРЕДНИЙ",      tip: "Можно торговать" },
  high:      { color: "text-orange-400",  barColor: "bg-orange-400",  label: "ВЫСОКИЙ",      tip: "Осторожно — ADR > 70%" },
  very_high: { color: "text-destructive", barColor: "bg-destructive", label: "ОПАСНЫЙ",      tip: "ADR > 90% — вход рискованный!" },
  unknown:   { color: "text-muted-foreground", barColor: "bg-muted",  label: "—",            tip: "Нет данных" },
};

export function AdrBar({ adrPips, todayRangePips, adrPercent, adrRisk, compact = false }: AdrBarProps) {
  const risk = adrRisk ?? "unknown";
  const cfg = RISK_CONFIG[risk] ?? RISK_CONFIG.unknown!;
  const pct = Math.min(adrPercent ?? 0, 100);

  if (compact) {
    // Compact version for pair cards
    return (
      <div className="space-y-1" title={cfg.tip} data-testid="adr-bar-compact">
        <div className="flex items-center justify-between text-[10px] font-mono">
          <span className="text-muted-foreground uppercase tracking-wider">ADR</span>
          <span className={`font-bold ${cfg.color}`}>
            {adrPercent != null ? `${adrPercent.toFixed(0)}%` : "—"}
            {adrPips != null && <span className="text-muted-foreground font-normal ml-1">({adrPips.toFixed(0)} pip)</span>}
          </span>
        </div>
        <div className="w-full h-1.5 bg-muted/30 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${cfg.barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {adrPercent != null && adrPercent >= 70 && (
          <div className={`text-[10px] font-mono font-bold ${cfg.color}`}>{cfg.tip}</div>
        )}
      </div>
    );
  }

  // Full version for pair detail sidebar
  return (
    <div className="space-y-3" data-testid="adr-bar-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          ADR (14 дней)
        </span>
        <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${cfg.color} border`}
          style={{ borderColor: "currentColor", opacity: 0.8 }}>
          {cfg.label}
        </span>
      </div>

      {/* Progress bar */}
      <div>
        <div className="w-full h-3 bg-muted/30 rounded-full overflow-hidden relative">
          <div
            className={`h-full rounded-full transition-all ${cfg.barColor}`}
            style={{ width: `${pct}%`, opacity: 0.85 }}
          />
          {/* Threshold markers */}
          <div className="absolute top-0 left-[50%] w-px h-full bg-white/20" />
          <div className="absolute top-0 left-[70%] w-px h-full bg-white/20" />
          <div className="absolute top-0 left-[90%] w-px h-full bg-white/20" />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1 font-mono">
          <span>0</span>
          <span>50%</span>
          <span>70%</span>
          <span>90%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
        <div className="bg-background/50 rounded p-2">
          <div className="text-muted-foreground mb-1">Среднее (ADR)</div>
          <div className="font-bold">{adrPips != null ? `${adrPips.toFixed(1)} pip` : "—"}</div>
        </div>
        <div className="bg-background/50 rounded p-2">
          <div className="text-muted-foreground mb-1">Сегодня</div>
          <div className={`font-bold ${cfg.color}`}>
            {todayRangePips != null ? `${todayRangePips.toFixed(1)} pip` : "—"}
          </div>
        </div>
      </div>

      {/* Warning */}
      <div className={`text-xs font-mono ${cfg.color} opacity-80`}>{cfg.tip}</div>
    </div>
  );
}
