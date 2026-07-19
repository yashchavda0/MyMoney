import type { TransactionWithRefs } from "@/lib/supabase/types";

export interface Totals {
  income: number;
  expense: number;
  net: number;
  count: number;
}

export function totals(txns: TransactionWithRefs[]): Totals {
  let income = 0;
  let expense = 0;
  for (const t of txns) {
    if (t.type === "income") income += t.amount;
    else expense += t.amount;
  }
  return { income, expense, net: income - expense, count: txns.length };
}

export interface Group<K> {
  key: K;
  label: string;
  color?: string;
  income: number;
  expense: number;
  net: number;
  count: number;
}

function bucket<K>(
  txns: TransactionWithRefs[],
  keyOf: (t: TransactionWithRefs) => K,
  metaOf: (t: TransactionWithRefs) => { label: string; color?: string },
): Group<K>[] {
  const map = new Map<K, Group<K>>();
  for (const t of txns) {
    const k = keyOf(t);
    let g = map.get(k);
    if (!g) {
      const meta = metaOf(t);
      g = { key: k, label: meta.label, color: meta.color, income: 0, expense: 0, net: 0, count: 0 };
      map.set(k, g);
    }
    if (t.type === "income") g.income += t.amount;
    else g.expense += t.amount;
    g.net = g.income - g.expense;
    g.count++;
  }
  return [...map.values()];
}

/** Group by day (yyyy-MM-dd), sorted descending. */
export function byDay(txns: TransactionWithRefs[]): Group<string>[] {
  return bucket(txns, (t) => t.occurred_on, (t) => ({ label: t.occurred_on })).sort((a, b) =>
    b.key.localeCompare(a.key),
  );
}

export function byCategory(txns: TransactionWithRefs[]): Group<string>[] {
  return bucket(
    txns,
    (t) => t.category?.id ?? "none",
    (t) => ({ label: t.category?.name ?? "Uncategorized", color: t.category?.color ?? "#64748b" }),
  ).sort((a, b) => b.expense + b.income - (a.expense + a.income));
}

export function byAccount(txns: TransactionWithRefs[]): Group<string>[] {
  return bucket(
    txns,
    (t) => t.account?.id ?? "none",
    (t) => ({ label: t.account?.name ?? "No account" }),
  ).sort((a, b) => b.expense + b.income - (a.expense + a.income));
}

/** Group by note text (case-insensitive, trimmed). Blank notes excluded. */
export function byNote(txns: TransactionWithRefs[]): Group<string>[] {
  return bucket(
    txns.filter((t) => t.note.trim()),
    (t) => t.note.trim().toLowerCase(),
    (t) => ({ label: t.note.trim() }),
  ).sort((a, b) => b.expense + b.income - (a.expense + a.income));
}
