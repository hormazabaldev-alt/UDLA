export function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replaceAll(".", "").replaceAll(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

export function toPercent(value: unknown): number | null {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return value > 1 ? value / 100 : value;
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withoutSymbol = trimmed.endsWith("%")
    ? trimmed.slice(0, -1).trim()
    : trimmed;
  const n = toFiniteNumber(withoutSymbol);
  if (n === null) return null;
  return n > 1 ? n / 100 : n;
}

