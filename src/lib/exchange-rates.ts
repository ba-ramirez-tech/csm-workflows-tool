/** Configurable COP cross-rates (whole COP per 1 unit of client currency). */
export const COP_PER_EUR = 4500;
export const COP_PER_USD = 4200;

export function copToClientAmount(cop: number, currency: string): number {
  const c = (currency ?? "EUR").toUpperCase();
  if (c === "COP") return Math.round(cop);
  if (c === "EUR") return Math.round(cop / COP_PER_EUR);
  if (c === "USD") return Math.round(cop / COP_PER_USD);
  return Math.round(cop / COP_PER_EUR);
}

export function clientAmountToCop(amount: number, currency: string): number {
  const c = (currency ?? "EUR").toUpperCase();
  if (c === "COP") return Math.round(amount);
  if (c === "EUR") return Math.round(amount * COP_PER_EUR);
  if (c === "USD") return Math.round(amount * COP_PER_USD);
  return Math.round(amount * COP_PER_EUR);
}
