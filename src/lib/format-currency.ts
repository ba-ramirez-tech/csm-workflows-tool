/** Formats integer COP with dot thousands separator, e.g. 850000 → "$850.000 COP". */
export function formatCop(cop: number): string {
  const n = Math.trunc(cop);
  const abs = Math.abs(n);
  const str = abs.toString();
  const withDots = str.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const signed = n < 0 ? `-${withDots}` : withDots;
  return `$${signed} COP`;
}
