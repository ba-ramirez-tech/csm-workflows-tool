/** Client-facing template / quote currencies — EUR is the default for CSM clients. */
export const CLIENT_CURRENCY_CODES = ["EUR", "GBP", "USD", "CAD", "OTHER", "COP"] as const;
export type ClientCurrencyCode = (typeof CLIENT_CURRENCY_CODES)[number];

export const DEFAULT_CLIENT_CURRENCY: ClientCurrencyCode = "EUR";

export const CLIENT_CURRENCY_OPTIONS: { code: ClientCurrencyCode; label: string }[] = [
  { code: "EUR", label: "EUR — Euro (default)" },
  { code: "GBP", label: "GBP — British pound" },
  { code: "USD", label: "USD — US dollar" },
  { code: "CAD", label: "CAD — Canadian dollar" },
  { code: "OTHER", label: "Other" },
  { code: "COP", label: "COP — Colombian peso (rare)" },
];

export function parseClientCurrency(raw: string | null | undefined): ClientCurrencyCode {
  const u = String(raw ?? "").trim().toUpperCase();
  if (CLIENT_CURRENCY_CODES.includes(u as ClientCurrencyCode)) return u as ClientCurrencyCode;
  return DEFAULT_CLIENT_CURRENCY;
}

export function formatClientPrice(amount: number | null | undefined, currency: string | null | undefined): string {
  if (amount == null) return "—";
  const n = Math.trunc(amount);
  const cur = (currency ?? DEFAULT_CLIENT_CURRENCY).toUpperCase();
  if (cur === "COP") {
    const abs = Math.abs(n);
    const str = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    const signed = n < 0 ? `-${str}` : str;
    return `$${signed} COP`;
  }
  if (cur === "OTHER") {
    return `${n.toLocaleString("fr-FR")} (other)`;
  }
  try {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: cur,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${n.toLocaleString("fr-FR")} ${cur}`;
  }
}
