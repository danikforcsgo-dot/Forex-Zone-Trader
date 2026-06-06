export function priceDecimals(symbol: string): number {
  return symbol.toUpperCase().includes("JPY") ? 3 : 5;
}

export function formatPrice(price: number, symbol: string): string {
  return price.toFixed(priceDecimals(symbol));
}

export function formatChange(change: number, symbol: string): string {
  return (change > 0 ? "+" : "") + change.toFixed(priceDecimals(symbol));
}

export const ZONE_STATUS_RU: Record<string, string> = {
  neutral:         "Нейтрально",
  resistance:      "В сопротивлении",
  support:         "В поддержке",
  near_resistance: "Рядом с сопротивлением",
  near_support:    "Рядом с поддержкой",
};

export function zoneStatusRu(status: string): string {
  return ZONE_STATUS_RU[status] ?? status;
}
