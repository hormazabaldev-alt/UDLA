export const CAMPUS_SEDE_BY_CODE = {
  ME: "Melipilla",
  LF: "La Florida",
  OL: "Online",
  MP: "Maipú",
  PR: "Providencia",
  SC: "Santiago Centro",
  VL: "Viña del Mar",
  CO: "Concepción",
  CV: "Campus Virtual Nacional",
} as const;

type CampusSedeCode = keyof typeof CAMPUS_SEDE_BY_CODE;

function isCampusSedeCode(value: string): value is CampusSedeCode {
  return value in CAMPUS_SEDE_BY_CODE;
}

export function toCampusFullName(value: string | null | undefined): string {
  const raw = (value ?? "").trim();
  if (!raw) return "Sin Campus";

  const upper = raw.toUpperCase();
  if (upper === "SIN CAMPUS") return "Sin Campus";

  if (isCampusSedeCode(upper)) return CAMPUS_SEDE_BY_CODE[upper];

  // If it looks like a code but isn't valid, flag it; otherwise treat as free text.
  if (/^[A-Z]{2,3}$/.test(upper)) return `SEDE inválida (${upper})`;

  return raw;
}

