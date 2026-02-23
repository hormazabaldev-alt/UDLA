import { parse, isValid } from "date-fns";

type ParseOptions = {
  minYear?: number;
  maxYear?: number;
  minDate?: Date;
  maxDate?: Date;
};

function isReasonableYear(d: Date, opts?: ParseOptions) {
  const year = d.getFullYear();
  const minYear = opts?.minYear ?? 2018;
  const maxYear = opts?.maxYear ?? new Date().getFullYear() + 1;
  return year >= minYear && year <= maxYear;
}

function isWithinDateRange(d: Date, opts?: ParseOptions) {
  const t = d.getTime();
  const min = opts?.minDate ? opts.minDate.getTime() : null;
  const max = opts?.maxDate ? opts.maxDate.getTime() : null;
  if (min !== null && t < min) return false;
  if (max !== null && t > max) return false;
  return true;
}

/**
 * Parses dates coming from XLSX/JSON with a "best effort" strategy.
 * - Handles ISO (yyyy-MM-dd) with optional time.
 * - Handles numeric day/month/year with optional time (CL default d/M).
 * - Handles Excel serial numbers.
 * - Applies a sanity year range to avoid weird centuries (e.g. 1925).
 */
export function parseLooseDate(value: unknown, opts?: ParseOptions): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    if (!isValid(value)) return null;
    return isReasonableYear(value, opts) && isWithinDateRange(value, opts) ? value : null;
  }

  if (typeof value === "number") {
    const date = new Date(Math.round((value - 25569) * 86400 * 1000));
    if (!isValid(date)) return null;
    return isReasonableYear(date, opts) && isWithinDateRange(date, opts) ? date : null;
  }

  if (typeof value !== "string") return null;
  const s = value.trim();
  if (!s) return null;

  // ISO-like (yyyy-MM-dd) with optional time
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    const d = new Date(year, month - 1, day);
    if (isValid(d) && d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day) {
      return isReasonableYear(d, opts) && isWithinDateRange(d, opts) ? d : null;
    }
  }

  // Numeric (d/M/yyyy or M/d/yyyy), optional time suffix
  const numeric = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})(?:[ T].*)?$/);
  if (numeric) {
    const a = Number(numeric[1]);
    const b = Number(numeric[2]);
    let year = Number(numeric[3]);
    if (year < 100) year += 2000;

    let day = a;
    let month = b;
    if (a <= 12 && b > 12) {
      // M/d
      day = b;
      month = a;
    }

    const d = new Date(year, month - 1, day);
    if (isValid(d) && d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day) {
      return isReasonableYear(d, opts) && isWithinDateRange(d, opts) ? d : null;
    }
  }

  // date-fns fallback (strip time if present)
  const datePart = s.split(/[T ]/)[0] ?? s;
  const formats = [
    "dd-MM-yyyy",
    "dd/MM/yyyy",
    "d/M/yyyy",
    "yyyy-MM-dd",
    "dd-MM-yy",
    "dd/MM/yy",
    "d/M/yy",
  ];
  for (const fmt of formats) {
    const parsed = parse(datePart, fmt, new Date());
    if (isValid(parsed) && isReasonableYear(parsed, opts) && isWithinDateRange(parsed, opts)) return parsed;
  }

  // Excel serial as string
  const num = Number(s);
  if (!Number.isNaN(num) && num > 10000 && num < 100000) {
    const d = new Date(Math.round((num - 25569) * 86400 * 1000));
    if (isValid(d) && isReasonableYear(d, opts) && isWithinDateRange(d, opts)) return d;
  }

  return null;
}
