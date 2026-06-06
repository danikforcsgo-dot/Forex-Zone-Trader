import { PairSummary } from "@workspace/api-client-react";
import { Link } from "wouter";
import { ArrowUpRight, ArrowDownRight, Activity } from "lucide-react";
import { PatternBadge } from "@/components/pattern-badge";
import { AdrBar } from "@/components/adr-bar";

interface PairCardProps {
  pair: PairSummary;
}

export function PairCard({ pair }: PairCardProps) {
  const isShort = pair.signal === "short";
  const isLong = pair.signal === "long";
  const isNearResistance = pair.zoneStatus === "near_resistance";
  const isNearSupport = pair.zoneStatus === "near_support";

  let cardBorder = "border-border";
  let cardBg = "bg-card";
  let glow = "";

  if (isShort) {
    cardBorder = "border-destructive shadow-[0_0_15px_rgba(244,71,83,0.3)]";
    cardBg = "bg-destructive/10";
  } else if (isLong) {
    cardBorder = "border-success shadow-[0_0_15px_rgba(38,166,154,0.3)]";
    cardBg = "bg-success/10";
  } else if (isNearResistance || isNearSupport) {
    cardBorder = "border-warning/50";
    glow = "shadow-[0_0_10px_rgba(255,165,0,0.15)]";
  }

  return (
    <Link
      href={`/pair/${pair.symbol}`}
      className={`block rounded-lg border ${cardBorder} ${cardBg} ${glow} p-4 transition-all hover:brightness-110 hover:-translate-y-1`}
      data-testid={`card-pair-${pair.symbol}`}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">{pair.displayName}</h2>
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <Activity className="w-3 h-3" />
            M15 ТАЙМФРЕЙМ
          </div>
        </div>
        <div className={`text-right ${pair.change >= 0 ? "text-success" : "text-destructive"}`}>
          <div className="flex items-center justify-end font-bold text-lg">
            {pair.change >= 0 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
            {pair.changePct > 0 ? "+" : ""}{pair.changePct.toFixed(2)}%
          </div>
          <div className="text-xs opacity-80">
            {pair.change > 0 ? "+" : ""}{pair.change.toFixed(5)}
          </div>
        </div>
      </div>

      <div className="text-3xl font-black text-foreground tracking-tight my-3" data-testid={`text-price-${pair.symbol}`}>
        {pair.currentPrice.toFixed(5)}
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground bg-background/50 p-2 rounded mb-3">
        <div>
          <div className="uppercase opacity-70 mb-1">Bid</div>
          <div className="font-mono text-foreground">{pair.bid.toFixed(5)}</div>
        </div>
        <div>
          <div className="uppercase opacity-70 mb-1">Ask</div>
          <div className="font-mono text-foreground">{pair.ask.toFixed(5)}</div>
        </div>
      </div>

      {/* ADR compact bar */}
      <div className="mb-3">
        <AdrBar
          adrPips={pair.adrPips}
          todayRangePips={pair.todayRangePips}
          adrPercent={pair.adrPercent}
          adrRisk={pair.adrRisk}
          compact
        />
      </div>

      {/* Pattern badge */}
      {pair.pattern && pair.pattern !== "none" && (
        <div className="mb-3">
          <PatternBadge pattern={pair.pattern} />
        </div>
      )}

      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
        <span className="text-muted-foreground">СТАТУС ЗОНЫ:</span>
        <span className={
          isShort ? "text-destructive" :
          isLong  ? "text-success" :
          (isNearResistance || isNearSupport) ? "text-warning" : "text-muted-foreground"
        }>
          {pair.zoneStatus.replace(/_/g, " ")}
        </span>
      </div>
    </Link>
  );
}
