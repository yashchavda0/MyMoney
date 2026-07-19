import { getTransactions, getAccounts, getCategories } from "@/lib/queries";
import type { TxnType } from "@/lib/supabase/types";
import { totals } from "@/lib/aggregate";
import { formatINR } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { TransactionsFilterBar } from "@/components/transactions-filter-bar";
import { TransactionList } from "@/components/transaction-list";
import { BulkTools } from "@/components/bulk-tools";
import { Card } from "@/components/ui/card";

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
    <div className="space-y-4">
      <PageHeader
        title="Transactions"
        subtitle={
          <>
            {t.count} shown · <span className="text-income">+{formatINR(t.income)}</span> ·{" "}
            <span className="text-expense">−{formatINR(t.expense)}</span> · net{" "}
            <span className="tabular font-medium text-foreground">{formatINR(t.net)}</span>
          </>
        }
        actions={<BulkTools accounts={accounts} categories={categories} transactions={txns} />}
      />

      <TransactionsFilterBar accounts={accounts} categories={categories} />

      <Card className="overflow-hidden">
        <TransactionList transactions={txns} showDate emptyLabel="No transactions match these filters." />
      </Card>
    </div>
  );
}
