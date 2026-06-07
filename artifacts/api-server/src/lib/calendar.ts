import { logger } from "./logger";

const CALENDAR_URL =
  "https://nfs.faireconomy.media/ff_calendar_thisweek.json";

const OUR_CURRENCIES = new Set([
  "GBP", "NZD", "EUR", "AUD", "JPY", "CHF", "CAD", "USD",
]);

export interface CalendarEvent {
  title: string;
  country: string;
  date: string;
  impact: string;
  forecast: string;
  previous: string;
  actual: string;
}

interface CacheEntry {
  data: CalendarEvent[];
  fetchedAt: number;
}

let cache: CacheEntry | null = null;
const TTL_MS = 30 * 60 * 1000;

export async function fetchCalendar(): Promise<CalendarEvent[]> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < TTL_MS) return cache.data;

  try {
    const resp = await fetch(CALENDAR_URL, {
      headers: { "User-Agent": "Mozilla/5.0 ForexDashboard/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const raw = (await resp.json()) as CalendarEvent[];
    const filtered = raw.filter((e) =>
      OUR_CURRENCIES.has((e.country ?? "").toUpperCase())
    );
    cache = { data: filtered, fetchedAt: now };
    return filtered;
  } catch (err) {
    logger.warn({ err }, "Calendar fetch failed, using cache");
    return cache?.data ?? [];
  }
}
