import { createClient } from "@/lib/supabase/server";
import { getAccounts, getCategories } from "@/lib/queries";
import type { SmsInboxWithRefs } from "@/lib/supabase/types";
import { PageHeader } from "@/components/page-header";
import { ReviewList } from "@/components/sms/review-list";

export default async function ReviewPage() {
  const supabase = await createClient();
  const [{ data: inbox }, categories, accounts] = await Promise.all([
    supabase
      .from("sms_inbox")
      .select("*, category:categories(id,name,color), account:accounts(id,name)")
      .eq("status", "pending")
      .order("received_at", { ascending: false }),
    getCategories(),
    getAccounts(),
  ]);

  const items = (inbox as unknown as SmsInboxWithRefs[]) ?? [];
  const accountRefs = accounts.map((a) => ({ id: a.id, name: a.name }));

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader
        title="Review"
        subtitle={items.length > 0 ? `${items.length} SMS need a category` : "Incoming SMS that need a category"}
      />
      <ReviewList items={items} categories={categories} accounts={accountRefs} />
    </div>
  );
}
