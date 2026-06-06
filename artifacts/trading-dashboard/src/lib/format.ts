export function formatPrice(price: number, symbol: string): string {
  const isJpy = symbol.toUpperCase().includes("JPY");
  return price.toFixed(isJpy ? 3 : 5);
}

export function formatChange(change: number, symbol: string): string {
  const isJpy = symbol.toUpperCase().includes("JPY");
  const decimals = isJpy ? 3 : 5;
  return (change > 0 ? "+" : "") + change.toFixed(decimals);
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
