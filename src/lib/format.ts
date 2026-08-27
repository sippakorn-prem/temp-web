const GREGORIAN_CALENDAR = "gregory";

function parseDate(value: string | number | Date): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function gregorianLocale(locale: string): string {
  return new Intl.Locale(locale, { calendar: GREGORIAN_CALENDAR }).toString();
}

export function formatDate(
  value: string | number | Date,
  locale: string,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" }
): string | null {
  const date = parseDate(value);
  if (!date) return null;
  return new Intl.DateTimeFormat(gregorianLocale(locale), options).format(date);
}

export function formatDateTime(value: string | number | Date, locale: string): string | null {
  return formatDate(value, locale, { dateStyle: "medium", timeStyle: "short" });
}

export function formatMonthYear(value: string | number | Date, locale: string): string | null {
  return formatDate(value, locale, { month: "long", year: "numeric" });
}
