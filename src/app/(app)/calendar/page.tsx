import { getTransactions } from "@/lib/queries";
import { monthBounds, currentMonthISO } from "@/lib/format";
import { totals } from "@/lib/aggregate";
import { ViewTabs } from "@/components/view-tabs";
import { MonthPicker } from "@/components/month-picker";
import { MonthSwipe } from "@/components/month-swipe";
import { SummaryTiles } from "@/components/summary-tiles";
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
    <MonthSwipe month={month}>
      <div className="space-y-3">
        <ViewTabs />
        <MonthPicker month={month} />
        <SummaryTiles data={totals(txns)} />
        <CalendarGrid month={month} transactions={txns} />
      </div>
    </MonthSwipe>
  );
}
