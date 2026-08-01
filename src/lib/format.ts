import { formatInTimeZone } from "date-fns-tz";
import { parse, format as fnsFormat } from "date-fns";

export const TZ = "Asia/Kolkata";
export const LOCALE = "en-IN";

const inrFull = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const inrCompactNumber = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** ₹1,00,000.00 — full precision. */
export function formatINR(amount: number): string {
  return inrFull.format(amount ?? 0);
}

/** ₹1,00,000 — no decimals, for tight cells / chart axes. */
export function formatINRShort(amount: number): string {
  return "₹" + inrCompactNumber.format(Math.round(amount ?? 0));
}

function trimTrailingZero(n: number): string {
  return n.toFixed(1).replace(/\.0$/, "");
}

/** Compact magnitude format for net figures: ₹850, ₹85K, ₹1.2L, ₹1.2Cr - always short, keeps the native sign. */
export function formatINRCompact(amount: number): string {
  const n = amount ?? 0;
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs < 1_000) return `${sign}₹${Math.round(abs)}`;
  if (abs < 100_000) return `${sign}₹${trimTrailingZero(abs / 1_000)}K`;
  if (abs < 10_000_000) return `${sign}₹${trimTrailingZero(abs / 100_000)}L`;
  return `${sign}₹${trimTrailingZero(abs / 10_000_000)}Cr`;
}

/** Signed amount coloured by direction: +₹500 income, -₹500 expense. */
export function signedAmount(
  amount: number,
  type: "income" | "expense",
): string {
  const sign = type === "income" ? "+" : "-";
  return `${sign}${formatINR(Math.abs(amount))}`;
}

/** Current calendar date in IST as `yyyy-MM-dd`. */
export function todayISO(): string {
  return formatInTimeZone(new Date(), TZ, "yyyy-MM-dd");
}

/** First and last day (yyyy-MM-dd) of a given month. monthISO = `yyyy-MM`. */
export function monthBounds(monthISO: string): { start: string; end: string } {
  const [y, m] = monthISO.split("-").map(Number);
  const start = `${monthISO}-01`;
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const end = `${monthISO}-${String(last).padStart(2, "0")}`;
  return { start, end };
}

/** Current `yyyy-MM` in IST. */
export function currentMonthISO(): string {
  return formatInTimeZone(new Date(), TZ, "yyyy-MM");
}

/** Format a stored `yyyy-MM-dd` date string using a date-fns pattern. Timezone-safe (no Date shift). */
export function formatDate(iso: string, pattern = "dd/MM/yyyy"): string {
  if (!iso) return "";
  const d = parse(iso, "yyyy-MM-dd", new Date());
  return fnsFormat(d, pattern);
}

/** e.g. "Fri, 18 Jul 2026" */
export function formatDateLong(iso: string): string {
  return formatDate(iso, "EEE, dd MMM yyyy");
}

/** e.g. "July 2026" from `yyyy-MM`. */
export function formatMonthLong(monthISO: string): string {
  const d = parse(`${monthISO}-01`, "yyyy-MM-dd", new Date());
  return fnsFormat(d, "MMMM yyyy");
}
