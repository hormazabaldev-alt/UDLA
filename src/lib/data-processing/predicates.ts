export function normalizeConectaValue(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

export function isRecorridoConecta(value: string | null | undefined): boolean {
  const conecta = normalizeConectaValue(value);
  return conecta === "conecta" || conecta === "no conecta";
}

export function isContactadoConecta(value: string | null | undefined): boolean {
  return normalizeConectaValue(value) === "conecta";
}

export function isNoGestionadoConecta(value: string | null | undefined): boolean {
  return normalizeConectaValue(value) === "no gestionado";
}

export function isAfluenciaValue(value: string | null | undefined): boolean {
  const af = value?.trim().toUpperCase() ?? "";
  return af === "A" || af === "MC" || af === "M";
}

export function isMatriculaValue(value: string | null | undefined): boolean {
  const mc = value?.trim().toUpperCase() ?? "";
  return mc === "M" || mc === "MC";
}
