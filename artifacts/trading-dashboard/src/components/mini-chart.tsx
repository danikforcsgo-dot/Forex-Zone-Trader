import { PairDetail } from "@workspace/api-client-react";
import { ResponsiveContainer, ComposedChart, XAxis, YAxis, Tooltip, ReferenceArea, ReferenceLine, CartesianGrid, Line } from "recharts";

interface MiniChartProps {
  detail: PairDetail;
}

export function MiniChart({ detail }: MiniChartProps) {
  // Format data for simple line chart representing close prices
  const data = detail.candles.map(c => ({
    time: new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    price: c.close,
    open: c.open,
    high: c.high,
    low: c.low
  }));

  // Domain for Y axis to ensure zones fit
  const minPrice = Math.min(...data.map(d => d.price));
  const maxPrice = Math.max(...data.map(d => d.price));
  
  // Try to include at least nearest zones in domain
  const yMin = Math.min(minPrice, ...(detail.supportZones.map(z => z.bot) || [minPrice])) * 0.9995;
  const yMax = Math.max(maxPrice, ...(detail.resistanceZones.map(z => z.top) || [maxPrice])) * 1.0005;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis 
          dataKey="time" 
          stroke="hsl(var(--muted-foreground))" 
          fontSize={12}
          tickMargin={10}
          minTickGap={30}
        />
        <YAxis 
          domain={[yMin, yMax]} 
          stroke="hsl(var(--muted-foreground))" 
          fontSize={12}
          tickFormatter={(val) => val.toFixed(5)}
          orientation="right"
        />
        <Tooltip 
          contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '4px' }}
          itemStyle={{ color: 'hsl(var(--foreground))' }}
          labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '4px' }}
          formatter={(value: number) => [value.toFixed(5), 'Price']}
        />
        
        {/* Draw Support Zones (Green) */}
        {detail.supportZones.map((zone, i) => (
          <ReferenceArea 
            key={`sz-${i}`}
            y1={zone.bot} 
            y2={zone.top} 
            fill="hsl(var(--success))" 
            fillOpacity={0.15} 
            stroke="hsl(var(--success))"
            strokeOpacity={0.3}
          />
        ))}

        {/* Draw Resistance Zones (Red) */}
        {detail.resistanceZones.map((zone, i) => (
          <ReferenceArea 
            key={`rz-${i}`}
            y1={zone.bot} 
            y2={zone.top} 
            fill="hsl(var(--destructive))" 
            fillOpacity={0.15}
            stroke="hsl(var(--destructive))"
            strokeOpacity={0.3}
          />
        ))}

        {/* Current Price Line */}
        <ReferenceLine 
          y={detail.currentPrice} 
          stroke="hsl(var(--primary))" 
          strokeDasharray="3 3" 
          label={{ position: 'left', value: 'CURRENT', fill: 'hsl(var(--primary))', fontSize: 10 }} 
        />

        {/* Price Line */}
        <Line 
          type="monotone" 
          dataKey="price" 
          stroke="hsl(var(--foreground))" 
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: 'hsl(var(--primary))' }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
