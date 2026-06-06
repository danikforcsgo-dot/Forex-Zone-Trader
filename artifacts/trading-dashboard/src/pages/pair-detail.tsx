import { useGetPairDetail, getGetPairDetailQueryKey } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { ArrowLeft, Loader2, Target, TrendingUp, TrendingDown } from "lucide-react";
import { MiniChart } from "@/components/mini-chart";

export default function PairDetail() {
  const params = useParams<{ symbol: string }>();
  const symbol = params.symbol;

  const { data: detail, isLoading } = useGetPairDetail(symbol || "", {
    query: { 
      enabled: !!symbol, 
      queryKey: getGetPairDetailQueryKey(symbol || ""),
      refetchInterval: 5000 
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-3 font-mono">ЗАГРУЗКА ТЕРМИНАЛА...</span>
      </div>
    );
  }

  if (!detail) return <div className="text-destructive font-mono">Данные не найдены</div>;

  const isShort = detail.signal === "short";
  const isLong = detail.signal === "long";

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-black tracking-tight">{detail.displayName}</h1>
            <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
              <span>{detail.symbol}</span>
              <span>•</span>
              <span className={detail.change >= 0 ? "text-success" : "text-destructive"}>
                {detail.changePct > 0 ? "+" : ""}{detail.changePct.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-4xl font-mono font-black text-primary">
            {detail.currentPrice.toFixed(5)}
          </div>
          <div className="text-xs text-muted-foreground mt-1 uppercase">Текущая цена</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar / Stats */}
        <div className="space-y-6">
          <div className={`p-6 rounded-lg border ${
            isShort ? "border-destructive bg-destructive/10" :
            isLong ? "border-success bg-success/10" :
            "border-border bg-card"
          }`}>
            <h3 className="text-xs font-bold text-muted-foreground uppercase mb-4 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Торговый Сигнал
            </h3>
            
            <div className="mb-6">
              <div className="text-3xl font-black uppercase tracking-widest mb-1">
                {isShort ? <span className="text-destructive">ПРОДАЖА</span> : 
                 isLong ? <span className="text-success">ПОКУПКА</span> : 
                 <span className="text-muted-foreground">НЕЙТРАЛЬНО</span>}
              </div>
              <div className="text-sm opacity-80">
                Статус зоны: {detail.zoneStatus}
              </div>
            </div>

            <div className="space-y-3 font-mono text-sm">
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-muted-foreground">BID</span>
                <span>{detail.bid.toFixed(5)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-muted-foreground">ASK</span>
                <span>{detail.ask.toFixed(5)}</span>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-lg border border-border bg-card">
             <h3 className="text-xs font-bold text-muted-foreground uppercase mb-4">Ближайшие зоны</h3>
             <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-destructive mb-1 text-sm font-bold">
                    <TrendingDown className="w-4 h-4" /> СОПРОТИВЛЕНИЕ
                  </div>
                  {detail.resistanceZones.slice(0, 3).map((z, i) => (
                    <div key={i} className="font-mono text-sm flex justify-between py-1 border-b border-border/50 last:border-0">
                      <span>{z.bot.toFixed(5)} - {z.top.toFixed(5)}</span>
                      <span className="text-muted-foreground text-xs">СИЛА: {z.strength.toFixed(0)}</span>
                    </div>
                  ))}
                  {detail.resistanceZones.length === 0 && <div className="text-sm text-muted-foreground">Нет зон</div>}
                </div>
                
                <div className="pt-2">
                  <div className="flex items-center gap-2 text-success mb-1 text-sm font-bold">
                    <TrendingUp className="w-4 h-4" /> ПОДДЕРЖКА
                  </div>
                  {detail.supportZones.slice(0, 3).map((z, i) => (
                    <div key={i} className="font-mono text-sm flex justify-between py-1 border-b border-border/50 last:border-0">
                      <span>{z.bot.toFixed(5)} - {z.top.toFixed(5)}</span>
                      <span className="text-muted-foreground text-xs">СИЛА: {z.strength.toFixed(0)}</span>
                    </div>
                  ))}
                  {detail.supportZones.length === 0 && <div className="text-sm text-muted-foreground">Нет зон</div>}
                </div>
             </div>
          </div>
        </div>

        {/* Chart */}
        <div className="lg:col-span-2 rounded-lg border border-border bg-card p-4 min-h-[500px] flex flex-col">
          <h3 className="text-xs font-bold text-muted-foreground uppercase mb-4">M15 График и Зоны S&R</h3>
          <div className="flex-1 w-full min-h-[400px]">
            <MiniChart detail={detail} />
          </div>
        </div>
      </div>
    </div>
  );
}
