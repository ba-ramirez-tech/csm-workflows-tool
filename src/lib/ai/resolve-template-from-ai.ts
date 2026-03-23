/** Match AI recommended_template string to a published template id (fuzzy). */
export function resolveTemplateIdFromRecommended(
  recommended: string,
  templates: { id: string; name: string; slug: string }[],
): string | null {
  const raw = recommended.trim().toLowerCase();
  if (!raw || raw === "custom" || raw === "none" || raw === "n/a") return null;

  const exact = templates.find(
    (t) =>
      t.name.toLowerCase() === raw ||
      t.slug.toLowerCase() === raw ||
      t.id.toLowerCase() === raw,
  );
  if (exact) return exact.id;

  const contains = templates.find(
    (t) => raw.includes(t.name.toLowerCase()) || t.name.toLowerCase().includes(raw) || raw.includes(t.slug),
  );
  if (contains) return contains.id;

  const tokenMatch = templates.find((t) => {
    const words = raw.split(/[\s,–—-]+/).filter((w) => w.length > 3);
    return words.some((w) => t.name.toLowerCase().includes(w) || t.slug.includes(w));
  });
  return tokenMatch?.id ?? null;
}
