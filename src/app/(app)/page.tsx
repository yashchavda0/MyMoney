import { Suspense } from "react";
import { getTransactions } from "@/lib/queries";
import { todayISO, currentMonthISO, monthBounds, formatMonthLong } from "@/lib/format";
import { totals } from "@/lib/aggregate";
import { BalanceCard } from "@/components/balance-card";
import { ViewTabs } from "@/components/view-tabs";
import { DayNav } from "@/components/day-nav";
import { DateSwipe } from "@/components/date-swipe";
import { ViewSwipe } from "@/components/view-swipe";
import { TransactionList } from "@/components/transaction-list";
import { Card } from "@/components/ui/card";
import { DashboardSkeleton } from "@/components/dashboard-skeleton";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}) {
  const { d } = await searchParams;
  const day = d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : todayISO();

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent day={day} />
    </Suspense>
  );
}

async function DashboardContent({ day }: { day: string }) {
  const month = currentMonthISO();
  const { start: mStart, end: mEnd } = monthBounds(month);

  const [dayTxns, monthTxns] = await Promise.all([
    getTransactions({ start: day, end: day }),
    getTransactions({ start: mStart, end: mEnd }),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <DateSwipe unit="day" value={day}>
        <BalanceCard data={totals(monthTxns)} label={formatMonthLong(month)} />
        <div className="mt-3 space-y-3">
          <ViewTabs />
          <DayNav day={day} />
        </div>
      </DateSwipe>

      <ViewSwipe day={day}>
        <div className="space-y-3">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-border bg-muted/30 px-3 py-2">
              <span className="text-sm font-medium">Transactions</span>
              <span className="rounded-full border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground">
                {dayTxns.length} {dayTxns.length === 1 ? "entry" : "entries"}
              </span>
            </div>
            <TransactionList
              transactions={dayTxns}
              showDate={false}
              emptyLabel="Nothing on this day. Tap + to add."
            />
          </Card>
        </div>
      </ViewSwipe>
    </div>
  );
}
