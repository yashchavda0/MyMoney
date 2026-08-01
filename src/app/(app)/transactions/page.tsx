import { getTransactions, getAccounts, getCategories } from "@/lib/queries";
import type { TxnType } from "@/lib/supabase/types";
import { totals } from "@/lib/aggregate";
import { PageHeader } from "@/components/page-header";
import { TransactionsFilterBar } from "@/components/transactions-filter-bar";
import { GroupedTransactions } from "@/components/grouped-transactions";
import { SummaryTiles } from "@/components/summary-tiles";
import { BulkTools } from "@/components/bulk-tools";

interface SP {
  q?: string;
  type?: string;
  account?: string;
  category?: string;
  start?: string;
  end?: string;
  bookmarked?: string;
}

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const [accounts, categories, txns] = await Promise.all([
    getAccounts(),
    getCategories(),
    getTransactions({
      search: sp.q,
      type: sp.type === "income" || sp.type === "expense" ? (sp.type as TxnType) : undefined,
      accountId: sp.account,
      categoryId: sp.category,
      start: sp.start,
      end: sp.end,
      bookmarked: sp.bookmarked === "1",
      limit: 500,
    }),
  ]);

  const t = totals(txns);

  return (
    <div className="space-y-3">
      <PageHeader
        title="Transactions"
        subtitle={`${t.count} shown`}
        actions={<BulkTools accounts={accounts} categories={categories} transactions={txns} />}
      />

      <TransactionsFilterBar accounts={accounts} categories={categories} />

      <SummaryTiles data={t} />

      <GroupedTransactions transactions={txns} emptyLabel="No transactions match these filters." />
    </div>
  );
}
