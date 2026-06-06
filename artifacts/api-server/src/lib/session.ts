export type Session =
  | "Sydney"
  | "Tokyo"
  | "London"
  | "New_York"
  | "Overlap_London_NY"
  | "Overlap_Tokyo_London"
  | "Closed";

/**
 * Returns the current forex trading session based on UTC time.
 * Sessions (UTC):
 *   Sydney    22:00 – 07:00
 *   Tokyo     00:00 – 09:00
 *   London    08:00 – 17:00
 *   New York  13:00 – 22:00
 *
 * Overlaps:
 *   Tokyo/London  08:00 – 09:00
 *   London/NY     13:00 – 17:00
 */
export function getCurrentSession(): { session: Session; sessionTime: string } {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcMin = now.getUTCMinutes();
  const utcTotal = utcHour + utcMin / 60;

  const pad = (n: number) => String(n).padStart(2, "0");
  const sessionTime = `${pad(utcHour)}:${pad(utcMin)} UTC`;

  let session: Session;

  const inRange = (start: number, end: number) => {
    if (start <= end) return utcTotal >= start && utcTotal < end;
    // wraps midnight
    return utcTotal >= start || utcTotal < end;
  };

  if (inRange(8, 9)) {
    session = "Overlap_Tokyo_London";
  } else if (inRange(13, 17)) {
    session = "Overlap_London_NY";
  } else if (inRange(8, 17)) {
    session = "London";
  } else if (inRange(13, 22)) {
    session = "New_York";
  } else if (inRange(0, 9)) {
    session = "Tokyo";
  } else if (inRange(22, 24) || inRange(0, 7)) {
    session = "Sydney";
  } else {
    session = "Closed";
  }

  return { session, sessionTime };
}
