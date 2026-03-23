/** Formats minutes as e.g. "2h30", "45m", "1h". */
export function formatMinutesToLabel(totalMinutes: number | null | undefined): string {
  if (totalMinutes == null || totalMinutes < 0) return "—";
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h${m.toString().padStart(2, "0")}`;
}
