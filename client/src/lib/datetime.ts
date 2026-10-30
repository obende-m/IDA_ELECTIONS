/**
 * Helpers for <input type="datetime-local"> <-> ISO-8601 UTC conversion.
 * The input's value is a *local* wall-clock time with no zone ("2026-05-01T09:30"); the API stores UTC ISO strings.
 */

const pad = (n: number) => String(n).padStart(2, '0');

/** ISO string (UTC) -> value for a datetime-local input in the viewer's timezone. Returns '' for null/invalid. */
export function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** datetime-local value (local time) -> ISO string in UTC. Returns null for '' or invalid input. */
export function localInputToIso(value: string | null | undefined): string | null {
  if (!value) return null;
  // A date-time string without an offset is parsed as local time, which is exactly what the input holds.
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** e.g. "Africa/Lagos (GMT+1)" — shown next to schedule fields so admins know which zone they are entering. */
export function timezoneLabel(at: Date = new Date()): string {
  let zone = '';
  try {
    zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    /* ignore */
  }
  const short = new Intl.DateTimeFormat(undefined, { timeZoneName: 'short' })
    .formatToParts(at)
    .find((p) => p.type === 'timeZoneName')?.value;
  if (zone && short) return `${zone} (${short})`;
  return zone || short || 'your local time';
}
