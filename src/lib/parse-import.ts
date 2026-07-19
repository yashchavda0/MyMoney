import type { Account, Category, TxnType } from "@/lib/supabase/types";
import type { TxnInput } from "@/app/actions/transactions";

export interface ParsedRow {
  row: TxnInput;
  // Human-readable resolved values for the preview.
  display: { date: string; type: TxnType; amount: string; category: string; account: string; note: string };
  errors: string[];
}

function normDate(raw: string): string | null {
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // dd/mm/yyyy or dd-mm-yyyy
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = "20" + y;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

const HEADER_WORDS = ["date", "amount", "type", "category", "account", "note", "description"];

/**
 * Parse pasted TSV/CSV into transaction rows.
 * Column order: Date, Amount, Type, Category, Account, Note, Description.
 * A header row is auto-detected and skipped. Type may be blank (defaults to expense;
 * a leading "-" on the amount forces expense, "+" forces income).
 */
export function parseImport(
  text: string,
  accounts: Account[],
  categories: Category[],
): ParsedRow[] {
  const accByName = new Map(accounts.map((a) => [a.name.trim().toLowerCase(), a]));
  const catByName = new Map(categories.map((c) => [c.name.trim().toLowerCase(), c]));

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  const first = lines[0].toLowerCase().split(delimiter).map((s) => s.trim());
  const hasHeader = first.filter((c) => HEADER_WORDS.includes(c)).length >= 2;
  const dataLines = hasHeader ? lines.slice(1) : lines;

  return dataLines.map((line) => {
    const cols = line.split(delimiter).map((c) => c.trim());
    const [dateRaw = "", amountRaw = "", typeRaw = "", catRaw = "", acctRaw = "", note = "", desc = ""] = cols;
    const errors: string[] = [];

    const date = normDate(dateRaw);
    if (!date) errors.push(`bad date "${dateRaw}"`);

    let type: TxnType = "expense";
    const tl = typeRaw.toLowerCase();
    if (tl.startsWith("inc") || tl === "in" || tl === "credit") type = "income";
    else if (tl.startsWith("exp") || tl === "out" || tl === "debit") type = "expense";
    else if (amountRaw.trim().startsWith("+")) type = "income";
    else if (amountRaw.trim().startsWith("-")) type = "expense";

    const amount = Math.abs(Number(amountRaw.replace(/[₹,+\s]/g, "")));
    if (!isFinite(amount) || amount <= 0) errors.push(`bad amount "${amountRaw}"`);

    const cat = catRaw ? catByName.get(catRaw.toLowerCase()) : undefined;
    const acct = acctRaw ? accByName.get(acctRaw.toLowerCase()) : undefined;

    return {
      row: {
        occurred_on: date ?? "",
        type,
        amount,
        category_id: cat?.id ?? null,
        account_id: acct?.id ?? null,
        note,
        description: desc || null,
      },
      display: {
        date: date ?? dateRaw,
        type,
        amount: isFinite(amount) ? String(amount) : amountRaw,
        category: cat ? cat.name : catRaw ? `${catRaw} (?)` : "—",
        account: acct ? acct.name : acctRaw ? `${acctRaw} (?)` : "—",
        note,
      },
      errors,
    };
  });
}
