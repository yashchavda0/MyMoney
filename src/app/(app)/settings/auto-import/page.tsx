import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getAccounts, getCategories } from "@/lib/queries";
import type { SmsRule } from "@/lib/supabase/types";
import { PageHeader } from "@/components/page-header";
import { SmsAutoImportPanel } from "@/components/sms/auto-import-panel";
import { SmsTrainer } from "@/components/sms/sms-trainer";
import { SmsRulesManager } from "@/components/sms/rules-manager";

export default async function AutoImportPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  const [{ data: profile }, { data: rulesData }, categories, accounts] = await Promise.all([
    supabase.from("profiles").select("sms_enabled, auto_insert").eq("user_id", auth.user!.id).maybeSingle(),
    supabase.from("sms_rules").select("*").eq("user_id", auth.user!.id).order("pattern"),
    getCategories(),
    getAccounts(),
  ]);

  const rules = (rulesData ?? []) as SmsRule[];
  const accountRefs = accounts.map((a) => ({ id: a.id, name: a.name }));

  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? (host ? `${proto}://${host}` : "");
  const webhookUrl = `${base}/api/ingest/sms`;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title="Auto-import from SMS" subtitle="Bank messages become transactions — hands-free on iPhone" />

      <SmsAutoImportPanel
        enabled={profile?.sms_enabled ?? false}
        autoInsert={profile?.auto_insert ?? true}
        webhookUrl={webhookUrl}
      />

      <SmsTrainer
        categories={categories}
        accounts={accountRefs}
        rules={rules.map((r) => ({ pattern: r.pattern, category_id: r.category_id, account_id: r.account_id }))}
      />

      <SmsRulesManager rules={rules} categories={categories} />
    </div>
  );
}
