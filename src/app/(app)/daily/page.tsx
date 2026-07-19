import { getTransactions } from "@/lib/queries";
import { todayISO, formatDateLong, formatINR } from "@/lib/format";
import { totals } from "@/lib/aggregate";
import { ViewTabs } from "@/components/view-tabs";
import { DayNav } from "@/components/day-nav";
import { SummaryTiles } from "@/components/summary-tiles";
import { TransactionList } from "@/components/transaction-list";
import { Card } from "@/components/ui/card";

export default async function DailyPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}) {
  const { d } = await searchParams;
  const day = d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : todayISO();
  const txns = await getTransactions({ start: day, end: day });
  const t = totals(txns);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ViewTabs />
        <DayNav day={day} />
      </div>

      <SummaryTiles data={t} />

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/30 px-3 py-2">
          <span className="truncate text-sm font-medium">{formatDateLong(day)}</span>
          <span className="flex shrink-0 gap-2.5 text-xs">
            {t.income > 0 && <span className="tabular text-income">+{formatINR(t.income)}</span>}
            {t.expense > 0 && <span className="tabular text-expense">−{formatINR(t.expense)}</span>}
          </span>
        </div>
        <TransactionList transactions={txns} showDate={false} emptyLabel="Nothing on this day. Tap + to add." />
      </Card>
    </div>
  );
}
