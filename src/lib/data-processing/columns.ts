export const REQUIRED_COLUMNS = [
  "Tipo",
  "Día",
  "Mes",
  "Día numérico",
  "Cargada",
  "Recorrido",
  "Contactado",
  "% Contactabilidad",
  "Citas",
  "AF",
  "MC",
  "% Efectividad",
  "Tc% AF / Citas",
  "Tc% MC / Citas",
] as const;

export type RequiredColumn = (typeof REQUIRED_COLUMNS)[number];

