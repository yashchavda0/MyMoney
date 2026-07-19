import { getTransactions } from "@/lib/queries";
import { monthBounds, currentMonthISO } from "@/lib/format";
import { totals } from "@/lib/aggregate";
import { ViewTabs } from "@/components/view-tabs";
import { MonthPicker } from "@/components/month-picker";
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
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ViewTabs />
        <MonthPicker month={month} />
      </div>
      <SummaryTiles data={totals(txns)} />
      <CalendarGrid month={month} transactions={txns} />
    </div>
  );
}
