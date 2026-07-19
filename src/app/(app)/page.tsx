import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getTransactions } from "@/lib/queries";
import { monthBounds, currentMonthISO, formatMonthLong } from "@/lib/format";
import { totals } from "@/lib/aggregate";
import { BalanceCard } from "@/components/balance-card";
import { GroupedTransactions } from "@/components/grouped-transactions";

export default async function DashboardPage() {
  const month = currentMonthISO();
  const { start, end } = monthBounds(month);
  const monthTxns = await getTransactions({ start, end });

  return (
    <div className="mx-auto max-w-2xl space-y-3.5">
      <BalanceCard data={totals(monthTxns)} label={formatMonthLong(month)} />

      {/* This month's transactions — the main thing */}
      <div className="flex items-center justify-between px-0.5">
        <h2 className="text-sm font-semibold">This month</h2>
        <Link href="/monthly" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          Open monthly <ArrowRight className="size-3" />
        </Link>
      </div>
      <GroupedTransactions transactions={monthTxns} emptyLabel="No transactions yet this month. Tap + to add one." />
    </div>
  );
}
