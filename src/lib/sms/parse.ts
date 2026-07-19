import { parse, format, isValid } from "date-fns";
import type { TxnType } from "@/lib/supabase/types";
import { todayISO } from "@/lib/format";

export interface ParsedSms {
  /** True when at least an amount was found. */
  ok: boolean;
  amount: number | null;
  type: TxnType;
  /** Last 3–4 digits of the account/card the SMS references, if any. */
  accountLast4: string | null;
  /** Merchant / payee extracted from the message — used as the note. */
  merchant: string | null;
  /** Bank reference / UPI id, when present — the strongest dedup signal. */
  refId: string | null;
  /** Transaction date as yyyy-MM-dd (parsed from the SMS, else today in IST). */
  date: string;
}

const DEBIT_WORDS = /\b(debited|spent|withdrawn|withdrawal|sent|paid|purchase|deducted|debit)\b/i;
const CREDIT_WORDS = /\b(credited|received|deposited|refund|credit)\b/i;

/** Money amount after Rs / INR / ₹ (or a bare 1,234.56). */
function parseAmount(text: string): number | null {
  const m =
    text.match(/(?:rs|inr|₹)\.?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i) ??
    text.match(/([0-9][0-9,]*\.\d{2})\b/);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ""));
  return isFinite(n) && n > 0 ? n : null;
}

/** Debit words win when both appear (money left your account). */
function parseType(text: string): TxnType {
  if (DEBIT_WORDS.test(text)) return "expense";
  if (CREDIT_WORDS.test(text)) return "income";
  return "expense";
}

/** Last 3–4 digits from "A/c XX1234", "Card ending 5678", "Ac no. 1234", "x1234". */
function parseAccountLast4(text: string): string | null {
  const m =
    text.match(/(?:a\/c|acct?|account|card)\s*(?:no\.?|number|ending|ending\s*in)?\s*[:#]?\s*[xX*]*\s*(\d{3,4})\b/i) ??
    text.match(/[xX*]{2,}\s*(\d{3,4})\b/i);
  return m ? m[1] : null;
}

const STOPWORDS = new Set([
  "your", "you", "a", "an", "the", "account", "acct", "bank", "vpa", "ac", "card",
  "upi", "rs", "inr", "avl", "bal", "no", "ref",
]);

const END =
  "(?=\\s*(?:$|[.,;])|\\s+(?:on|ref|upi|txn|avl|info|dated|via|bal|not|thru)\\b)";
const NAME = "([A-Za-z0-9][A-Za-z0-9 &._'@-]{1,40}?)";

/** Merchant / payee: "VPA x@y", "to/at X", "from X" (credit), "by X", "Info: X". */
function parseMerchant(text: string): string | null {
  const patterns = [
    /\bVPA[:\s]+([a-z0-9._-]+@[a-z0-9.-]+)/i,
    new RegExp(`\\b(?:to|at)\\s+${NAME}${END}`, "i"),
    new RegExp(`\\bfrom\\s+${NAME}${END}`, "i"),
    new RegExp(`\\bby\\s+${NAME}${END}`, "i"),
    /\bInfo[:\s]+([A-Za-z0-9][A-Za-z0-9 &._/'-]{1,40})/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (!m) continue;
    const cleaned = cleanMerchant(m[1]);
    const lower = cleaned.toLowerCase();
    const looksLikeAccount = /^a\/?c\b|x{2,}\s*\d|^\d+$/i.test(cleaned);
    if (cleaned && !looksLikeAccount && !STOPWORDS.has(lower)) return cleaned;
  }
  return null;
}

function cleanMerchant(raw: string): string {
  const s = raw.trim().replace(/\s+/g, " ").replace(/[.,;]+$/, "");
  // VPA / handle → keep as-is; plain text → Title Case if it's ALLCAPS.
  if (s.includes("@")) return s.toLowerCase();
  return s === s.toUpperCase()
    ? s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
    : s;
}

function parseRefId(text: string): string | null {
  const m =
    text.match(/\b(?:ref(?:erence)?|txn|transaction|utr)\s*(?:no\.?|id|#)?[:\s]*([A-Za-z0-9]{4,})/i) ??
    text.match(/\bUPI[:\s]*([0-9]{6,})/i);
  return m ? m[1] : null;
}

/** Try several Indian date shapes; fall back to today (IST). */
function parseDate(text: string): string {
  const patterns = [
    /\b(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b/, // 18-07-26, 18/07/2026
    /\b(\d{1,2}[-\s]?[A-Za-z]{3}[-\s]?\d{2,4})\b/, // 18-Jul-26, 18Jul2026
    /\b(\d{4}-\d{2}-\d{2})\b/, // 2026-07-18
  ];
  const formats = ["dd-MM-yy", "dd-MM-yyyy", "dd/MM/yy", "dd/MM/yyyy", "dd-MMM-yy", "dd-MMM-yyyy", "ddMMMyy", "ddMMMyyyy", "yyyy-MM-dd"];
  for (const re of patterns) {
    const m = text.match(re);
    if (!m) continue;
    const raw = m[1].replace(/\s/g, "-");
    for (const fmt of formats) {
      const d = parse(raw, fmt, new Date());
      if (isValid(d) && d.getFullYear() > 2000 && d.getFullYear() < 2100) {
        return format(d, "yyyy-MM-dd");
      }
    }
  }
  return todayISO();
}

export function parseSms(text: string): ParsedSms {
  const clean = text.replace(/\s+/g, " ").trim();
  const amount = parseAmount(clean);
  return {
    ok: amount !== null,
    amount,
    type: parseType(clean),
    accountLast4: parseAccountLast4(clean),
    merchant: parseMerchant(clean),
    refId: parseRefId(clean),
    date: parseDate(clean),
  };
}
