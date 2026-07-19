import { createClient } from "@/lib/supabase/server";
import { getAccounts, getCategories } from "@/lib/queries";
import type { RecurringRule } from "@/lib/supabase/types";
import { PageHeader } from "@/components/page-header";
import { RecurringManager } from "@/components/recurring-manager";

export default async function RecurringPage() {
  const supabase = await createClient();
  const [{ data: rules }, accounts, categories] = await Promise.all([
    supabase.from("recurring_rules").select("*").order("active", { ascending: false }).order("next_run_on"),
    getAccounts(),
    getCategories(),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title="Recurring" subtitle="Transactions that post automatically on schedule" />
      <RecurringManager rules={(rules ?? []) as RecurringRule[]} accounts={accounts} categories={categories} />
    </div>
  );
}
