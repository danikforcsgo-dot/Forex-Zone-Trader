import { PairSummary } from "@workspace/api-client-react";
import { Link } from "wouter";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { PatternBadge } from "@/components/pattern-badge";
import { AdrBar } from "@/components/adr-bar";
import { formatPrice, formatChange } from "@/lib/format";

interface PairCardProps {
  pair: PairSummary;
}

function ZoneFooter({ pair }: { pair: PairSummary }) {
  const isShort = pair.signal === "short";
  const isLong = pair.signal === "long";
  const isNearResistance = pair.zoneStatus === "near_resistance";
  const isNearSupport = pair.zoneStatus === "near_support";

  if (isShort) {
    return (
      <div className="flex items-center justify-between text-xs font-bold">
        <span className="text-destructive uppercase tracking-wider">ШОРТ — В СОПРОТИВЛЕНИИ</span>
        <span className="text-destructive">▼</span>
      </div>
    );
  }
  if (isLong) {
    return (
      <div className="flex items-center justify-between text-xs font-bold">
        <span className="text-success uppercase tracking-wider">ЛОНГ — В ПОДДЕРЖКЕ</span>
        <span className="text-success">▲</span>
      </div>
    );
  }
  if (isNearResistance && pair.distanceToNearestZonePct != null) {
    return (
      <div className="flex items-center justify-between text-xs text-warning font-mono">
        <span className="uppercase tracking-wider">Рядом с сопротивлением</span>
        <span>{pair.distanceToNearestZonePct.toFixed(2)}%</span>
      </div>
    );
  }
  if (isNearSupport && pair.distanceToNearestZonePct != null) {
    return (
      <div className="flex items-center justify-between text-xs text-warning font-mono">
        <span className="uppercase tracking-wider">Рядом с поддержкой</span>
        <span>{pair.distanceToNearestZonePct.toFixed(2)}%</span>
      </div>
    );
  }
  // Neutral — show distances to nearest zones
  const lines = [];
  if (pair.nearestResistance != null) {
    const dist = ((pair.nearestResistance - pair.currentPrice) / pair.currentPrice * 100).toFixed(2);
    lines.push(
      <div key="r" className="flex justify-between">
        <span className="text-destructive/70">↑ Сопр.</span>
        <span className="font-mono">{formatPrice(pair.nearestResistance, pair.symbol)} <span className="text-muted-foreground">+{dist}%</span></span>
      </div>
    );
  }
  if (pair.nearestSupport != null) {
    const dist = ((pair.currentPrice - pair.nearestSupport) / pair.currentPrice * 100).toFixed(2);
    lines.push(
      <div key="s" className="flex justify-between">
        <span className="text-success/70">↓ Подд.</span>
        <span className="font-mono">{formatPrice(pair.nearestSupport, pair.symbol)} <span className="text-muted-foreground">-{dist}%</span></span>
      </div>
    );
  }
  if (lines.length === 0) {
    return <div className="text-xs text-muted-foreground">Зоны не найдены</div>;
  }
  return <div className="text-xs space-y-1">{lines}</div>;
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
      {/* Header */}
      <div className="flex justify-between items-start mb-2">
        <div>
          <h2 className="text-xl font-bold text-foreground">{pair.displayName}</h2>
          <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">M15 · {pair.symbol}</div>
        </div>
        <div className={`text-right ${pair.change >= 0 ? "text-success" : "text-destructive"}`}>
          <div className="flex items-center justify-end font-bold text-base">
            {pair.change >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            {pair.changePct > 0 ? "+" : ""}{pair.changePct.toFixed(2)}%
          </div>
          <div className="text-[10px] opacity-80 font-mono">
            {formatChange(pair.change, pair.symbol)}
          </div>
        </div>
      </div>

      {/* Price */}
      <div className="text-3xl font-black text-foreground tracking-tight mb-3 font-mono" data-testid={`text-price-${pair.symbol}`}>
        {formatPrice(pair.currentPrice, pair.symbol)}
      </div>

      {/* Bid/Ask spread */}
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-mono bg-background/40 px-2 py-1.5 rounded mb-3">
        <span>Bid <span className="text-foreground">{formatPrice(pair.bid, pair.symbol)}</span></span>
        <span className="text-border">|</span>
        <span>Ask <span className="text-foreground">{formatPrice(pair.ask, pair.symbol)}</span></span>
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

      {/* Footer: zone info */}
      <div className="border-t border-border/40 pt-2 mt-2">
        <ZoneFooter pair={pair} />
      </div>
    </Link>
  );
}
