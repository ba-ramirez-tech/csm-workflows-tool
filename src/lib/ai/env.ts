/**
 * Reads ANTHROPIC_API_KEY with normalization for common .env issues (quotes, CRLF, BOM, invisible chars).
 * Never log the return value.
 */
export function getAnthropicApiKey(): string | null {
  const raw = process.env.ANTHROPIC_API_KEY;
  if (raw == null) return null;
  // Strip BOM, CR, zero-width / unicode junk often introduced by Windows editors or copy-paste
  let s = raw
    .replace(/^\uFEFF/, "")
    .replace(/\r/g, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim();
  // Repeatedly strip matching outer quotes (ASCII or curly)
  for (let i = 0; i < 3; i++) {
    if (s.length < 2) break;
    const a = s[0];
    const b = s[s.length - 1];
    const paired =
      (a === '"' && b === '"') ||
      (a === "'" && b === "'") ||
      (a === "\u201c" && b === "\u201d") ||
      (a === "\u2018" && b === "\u2019");
    if (paired) {
      s = s.slice(1, -1).trim();
    } else {
      break;
    }
  }
  // Keys are sk-ant-api03-... — no spaces inside
  s = s.replace(/\s+/g, "").trim();
  return s.length > 0 ? s : null;
}
