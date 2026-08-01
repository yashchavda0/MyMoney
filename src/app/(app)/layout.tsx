import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUser, getAccounts, getCategories, getBookmarks } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { TransactionUIProvider } from "@/components/transaction-ui-provider";
import { AppShell } from "@/components/app-shell";
import { AppShellSkeleton } from "@/components/app-shell-skeleton";
import { RecurringCatchup } from "@/components/recurring-catchup";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<AppShellSkeleton>{children}</AppShellSkeleton>}>
      <AppLayoutData>{children}</AppLayoutData>
    </Suspense>
  );
}

async function AppLayoutData({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const [user, accounts, categories, bookmarks, pending] = await Promise.all([
    getUser(),
    getAccounts(),
    getCategories(),
    getBookmarks(),
    supabase.from("sms_inbox").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);
  if (!user) redirect("/login");

  return (
    <TransactionUIProvider accounts={accounts} categories={categories} bookmarks={bookmarks}>
      <RecurringCatchup />
      <AppShell email={user.email ?? ""} pendingCount={pending.count ?? 0}>
        {children}
      </AppShell>
    </TransactionUIProvider>
  );
}
