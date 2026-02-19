export function formatInt(value: number) {
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(
    value,
  );
}

export function formatPct(value: number | null, digits = 1) {
  if (value === null) return "—";
  return new Intl.NumberFormat("es-ES", {
    style: "percent",
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

