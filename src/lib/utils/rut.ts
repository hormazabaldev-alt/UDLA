export function normalizeRut(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[.\\-\\s]/g, "");
}

