import { redirect } from "next/navigation";
import { getUser, getAccounts, getCategories, getBookmarks } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { TransactionUIProvider } from "@/components/transaction-ui-provider";
import { AppShell } from "@/components/app-shell";
import { RecurringCatchup } from "@/components/recurring-catchup";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const [accounts, categories, bookmarks, pending] = await Promise.all([
    getAccounts(),
    getCategories(),
    getBookmarks(),
    supabase.from("sms_inbox").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  return (
    <TransactionUIProvider accounts={accounts} categories={categories} bookmarks={bookmarks}>
      <RecurringCatchup />
      <AppShell email={user.email ?? ""} pendingCount={pending.count ?? 0}>
        {children}
      </AppShell>
    </TransactionUIProvider>
  );
}
