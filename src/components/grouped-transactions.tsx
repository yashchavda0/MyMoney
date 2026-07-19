import type { TransactionWithRefs } from "@/lib/supabase/types";
import { totals } from "@/lib/aggregate";
import { formatDateLong, formatINR } from "@/lib/format";
import { TransactionList } from "@/components/transaction-list";
import { Card } from "@/components/ui/card";

/** Transactions grouped by date — each day a card with weekday header + income/expense subtotal. */
export function GroupedTransactions({
  transactions,
  emptyLabel = "No transactions.",
}: {
  transactions: TransactionWithRefs[];
  emptyLabel?: string;
}) {
  const groups: { date: string; txns: TransactionWithRefs[] }[] = [];
  const index = new Map<string, TransactionWithRefs[]>();
  for (const t of transactions) {
    let arr = index.get(t.occurred_on);
    if (!arr) {
      arr = [];
      index.set(t.occurred_on, arr);
      groups.push({ date: t.occurred_on, txns: arr });
    }
    arr.push(t);
  }

  if (groups.length === 0) {
    return <Card className="p-8 text-center text-sm text-muted-foreground">{emptyLabel}</Card>;
  }

  return (
    <div className="space-y-3">
      {groups.map(({ date, txns }) => {
        const t = totals(txns);
        return (
          <Card key={date} className="overflow-hidden">
            <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/30 px-3 py-2">
              <span className="truncate text-sm font-medium">{formatDateLong(date)}</span>
              <span className="flex shrink-0 gap-2.5 text-xs">
                {t.income > 0 && <span className="tabular text-income">+{formatINR(t.income)}</span>}
                {t.expense > 0 && <span className="tabular text-expense">−{formatINR(t.expense)}</span>}
              </span>
            </div>
            <TransactionList transactions={txns} showDate={false} />
          </Card>
        );
      })}
    </div>
  );
}
