const currencyFormatter = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  minimumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

const monthFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "long",
  timeZone: "UTC",
});

const dayMonthFormatter = new Intl.DateTimeFormat("en-CA", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

const shortMonthFormatter = new Intl.DateTimeFormat("en-CA", {
  month: "short",
  timeZone: "UTC",
});

const compactCurrencyFormatter = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const wholeCurrencyFormatter = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat("en-CA", {
  style: "percent",
  maximumFractionDigits: 0,
});

export function formatCurrency(amount: number) {
  return currencyFormatter.format(amount);
}

/** Axis-friendly amounts: `$950`, `$1.2K`, `$12K`. */
export function formatCompactCurrency(amount: number) {
  return Math.abs(amount) < 1000 ? wholeCurrencyFormatter.format(amount) : compactCurrencyFormatter.format(amount);
}

/** `0.4231` → `42%`. */
export function formatPercent(ratio: number) {
  return percentFormatter.format(ratio);
}

export function formatDate(value: string) {
  return dateFormatter.format(new Date(`${value}T00:00:00Z`));
}

/** `2026-02` → `February 2026`. */
export function formatMonth(month: string) {
  return monthFormatter.format(new Date(`${month}-01T00:00:00Z`));
}

/** `Feb 3 – Mar 13, 2026`, repeating the year only when the period crosses one. */
export function formatPeriod(start: string, end: string) {
  const startDate = new Date(`${start}T00:00:00Z`);
  const endDate = new Date(`${end}T00:00:00Z`);
  const startYear = startDate.getUTCFullYear();
  const endYear = endDate.getUTCFullYear();
  const startLabel = startYear === endYear
    ? dayMonthFormatter.format(startDate)
    : `${dayMonthFormatter.format(startDate)}, ${startYear}`;
  return `${startLabel} – ${dayMonthFormatter.format(endDate)}, ${endYear}`;
}

/** `2026-02-13` → `Feb 13`. */
export function formatDayMonth(value: string) {
  return dayMonthFormatter.format(new Date(`${value}T00:00:00Z`));
}

/** `2026-02` → `Feb`, or `Feb 2026` when `withYear`. */
export function formatShortMonth(month: string, withYear = false) {
  const date = new Date(`${month}-01T00:00:00Z`);
  return withYear ? `${shortMonthFormatter.format(date)} ${date.getUTCFullYear()}` : shortMonthFormatter.format(date);
}
