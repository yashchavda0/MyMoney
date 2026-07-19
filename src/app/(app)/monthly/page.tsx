import { getTransactions } from "@/lib/queries";
import { monthBounds, currentMonthISO } from "@/lib/format";
import { totals, byCategory } from "@/lib/aggregate";
import { ViewTabs } from "@/components/view-tabs";
import { MonthPicker } from "@/components/month-picker";
import { SummaryTiles } from "@/components/summary-tiles";
import { CategoryBars } from "@/components/category-bars";
import { GroupedTransactions } from "@/components/grouped-transactions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default async function MonthlyPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const { m } = await searchParams;
  const month = m ?? currentMonthISO();
  const { start, end } = monthBounds(month);
  const txns = await getTransactions({ start, end });
  const expenseCats = byCategory(txns.filter((t) => t.type === "expense"));

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ViewTabs />
        <MonthPicker month={month} />
      </div>

      <SummaryTiles data={totals(txns)} />

      {expenseCats.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle>Spending by category</CardTitle>
          </CardHeader>
          <CardContent className="pt-1">
            <CategoryBars groups={expenseCats} metric="expense" />
          </CardContent>
        </Card>
      )}

      <GroupedTransactions transactions={txns} emptyLabel="No transactions this month." />
    </div>
  );
}
