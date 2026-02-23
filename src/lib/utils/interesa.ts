function normalizeInteresa(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    // Turn punctuation/underscores into spaces so "NO_VIENE" == "no viene"
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isInteresaViene(value: string | null | undefined): boolean {
  const s = normalizeInteresa(value);
  if (!s) return false;

  // Explicit negative guard.
  if (/\bno\s+viene\b/.test(s)) return false;

  // Any "viene" token counts as Cita.
  return /\bviene\b/.test(s);
}

