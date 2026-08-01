import { getTransactions } from "@/lib/queries";
import { monthBounds, currentMonthISO, formatMonthLong } from "@/lib/format";
import { totals } from "@/lib/aggregate";
import { ViewTabs } from "@/components/view-tabs";
import { MonthPicker } from "@/components/month-picker";
import { DateSwipe } from "@/components/date-swipe";
import { ViewSwipe } from "@/components/view-swipe";
import { BalanceCard } from "@/components/balance-card";
import { CalendarGrid } from "@/components/calendar-grid";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const { m } = await searchParams;
  const month = m ?? currentMonthISO();
  const { start, end } = monthBounds(month);
  const txns = await getTransactions({ start, end });

  return (
    <div className="space-y-3">
      <DateSwipe unit="month" value={month}>
        <BalanceCard data={totals(txns)} label={formatMonthLong(month)} />
        <div className="mt-3 space-y-3">
          <ViewTabs />
          <MonthPicker month={month} />
        </div>
      </DateSwipe>

      <ViewSwipe month={month}>
        <div className="space-y-3">
          <CalendarGrid month={month} transactions={txns} />
        </div>
      </ViewSwipe>
    </div>
  );
}
