import { getTransactions } from "@/lib/queries";
import { monthBounds, currentMonthISO, formatINR } from "@/lib/format";
import { totals, byCategory, byAccount, byNote, byDay } from "@/lib/aggregate";
import { PageHeader } from "@/components/page-header";
import { MonthPicker } from "@/components/month-picker";
import { SummaryTiles } from "@/components/summary-tiles";
import { CategoryBars } from "@/components/category-bars";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { IncomeExpenseChart } from "@/components/charts/income-expense-chart";
import { CategoryDonut } from "@/components/charts/category-pie";
import { NoteStats } from "@/components/charts/note-stats";

export default async function StatisticsPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const { m } = await searchParams;
  const month = m ?? currentMonthISO();
  const { start, end } = monthBounds(month);
  const txns = await getTransactions({ start, end });

  const monthTotals = totals(txns);

  // Income vs expense per day, ascending by date.
  const dayPoints = byDay(txns)
    .slice()
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((g) => ({
      day: String(Number(g.key.slice(8, 10))),
      income: g.income,
      expense: g.expense,
    }));

  const expenseCategories = byCategory(txns.filter((t) => t.type === "expense"));
  const pieData = expenseCategories.map((g) => ({
    label: g.label,
    value: g.expense,
    color: g.color ?? "#6366f1",
  }));

  const accounts = byAccount(txns);
  const notes = byNote(txns);

  return (
    <div className="space-y-4">
      <PageHeader title="Statistics" subtitle="Where your money moves" actions={<MonthPicker month={month} />} />

      <SummaryTiles data={monthTotals} />

      <Card>
        <CardHeader>
          <CardTitle>Income vs expense</CardTitle>
        </CardHeader>
        <CardContent>
          <IncomeExpenseChart data={dayPoints} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Expenses by category</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {expenseCategories.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No expenses this month.</p>
          ) : (
            <>
              <CategoryDonut data={pieData} />
              <div className="border-t border-border pt-4">
                <CategoryBars groups={expenseCategories} metric="expense" />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>By account</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pt-0">
          {accounts.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No transactions this month.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="px-4 py-2 text-left font-medium">Account</th>
                    <th className="px-4 py-2 text-right font-medium">Income</th>
                    <th className="px-4 py-2 text-right font-medium">Expense</th>
                    <th className="px-4 py-2 text-right font-medium">Net</th>
                    <th className="px-4 py-2 text-right font-medium">Txns</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {accounts.map((g) => (
                    <tr key={g.key}>
                      <td className="px-4 py-2 font-medium">{g.label}</td>
                      <td className="tabular px-4 py-2 text-right text-income">
                        {g.income ? formatINR(g.income) : "—"}
                      </td>
                      <td className="tabular px-4 py-2 text-right text-expense">
                        {g.expense ? formatINR(g.expense) : "—"}
                      </td>
                      <td
                        className={`tabular px-4 py-2 text-right font-medium ${g.net < 0 ? "text-expense" : "text-income"}`}
                      >
                        {formatINR(g.net)}
                      </td>
                      <td className="tabular px-4 py-2 text-right text-muted-foreground">{g.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>By note</CardTitle>
          <p className="text-xs text-muted-foreground">
            Search any note to see how much it totals — e.g. a specific merchant or bill.
          </p>
        </CardHeader>
        <CardContent>
          {notes.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No notes this month. Add notes to your transactions to track them here.
            </p>
          ) : (
            <NoteStats groups={notes} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
