import { TrendingUp, TrendingDown, Minus } from "lucide-react";

type Pattern =
  | "none"
  | "pin_bar_bullish"
  | "pin_bar_bearish"
  | "engulfing_bullish"
  | "engulfing_bearish"
  | "doji";

interface PatternBadgeProps {
  pattern: Pattern | string;
}

const CONFIG: Record<string, { label: string; color: string; Icon: typeof TrendingUp | typeof Minus }> = {
  pin_bar_bullish:    { label: "Пин-бар ↑",     color: "bg-success/20 text-success border border-success/40",       Icon: TrendingUp },
  pin_bar_bearish:    { label: "Пин-бар ↓",     color: "bg-destructive/20 text-destructive border border-destructive/40", Icon: TrendingDown },
  engulfing_bullish:  { label: "Поглощение ↑",  color: "bg-success/20 text-success border border-success/40",       Icon: TrendingUp },
  engulfing_bearish:  { label: "Поглощение ↓",  color: "bg-destructive/20 text-destructive border border-destructive/40", Icon: TrendingDown },
  doji:               { label: "Доджи",          color: "bg-warning/20 text-warning border border-warning/40",       Icon: Minus },
};

export function PatternBadge({ pattern }: PatternBadgeProps) {
  if (!pattern || pattern === "none") return null;
  const cfg = CONFIG[pattern];
  if (!cfg) return null;
  const { label, color, Icon } = cfg;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono font-bold ${color}`}
      data-testid={`badge-pattern-${pattern}`}
    >
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}
