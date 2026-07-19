"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Wand2 } from "lucide-react";
import type { Account, Category } from "@/lib/supabase/types";
import { parseSms } from "@/lib/sms/parse";
import { resolveCategory, type RuleLike } from "@/lib/sms/categorize";
import { resolveAccount } from "@/lib/sms/resolve-account";
import { saveRule } from "@/app/actions/sms";
import { formatINR, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export function SmsTrainer({
  categories,
  accounts,
  rules,
}: {
  categories: Category[];
  accounts: Pick<Account, "id" | "name">[];
  rules: RuleLike[];
}) {
  const router = useRouter();
  const [text, setText] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState("");

  const parsed = text.trim() ? parseSms(text) : null;
  const resolvedCat = parsed ? resolveCategory(parsed.merchant, text, rules).category_id : null;
  const resolvedAcct = parsed ? resolveAccount(parsed.accountLast4, text, accounts) : null;
  const acctName = accounts.find((a) => a.id === resolvedAcct)?.name;
  const knownCatName = categories.find((c) => c.id === resolvedCat)?.name;

  React.useEffect(() => {
    if (resolvedCat) setCategoryId(resolvedCat);
  }, [resolvedCat]);

  async function onSave() {
    if (!parsed?.merchant || !categoryId) return;
    setBusy(true);
    setMsg("");
    const res = await saveRule({ pattern: parsed.merchant.toLowerCase(), category_id: categoryId });
    setBusy(false);
    if (!res.ok) return setMsg(res.error);
    setMsg(`Learned: “${parsed.merchant}” → ${categories.find((c) => c.id === categoryId)?.name}`);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle>Train on a sample SMS</CardTitle>
        <p className="text-xs text-muted-foreground">
          Paste a real bank/UPI message. Check what the app reads, then teach it the category so future ones auto-file.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          rows={3}
          className="font-mono text-xs"
          placeholder="Rs.500 debited from A/c XX1234 on 18-07-26 to SWIGGY Ref 123456"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        {parsed && (
          <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3 text-sm">
            {!parsed.ok ? (
              <p className="text-expense">No amount found — this doesn&apos;t look like a transaction SMS.</p>
            ) : (
              <>
                <Field label="Amount" value={formatINR(parsed.amount ?? 0)} />
                <Field label="Type" value={parsed.type} />
                <Field label="Merchant / note" value={parsed.merchant ?? "—"} />
                <Field label="Account" value={acctName ?? (parsed.accountLast4 ? `••${parsed.accountLast4} (untagged)` : "—")} />
                <Field label="Date" value={formatDate(parsed.date)} />
                <Field label="Category" value={knownCatName ?? "Unknown → will go to Review"} />
              </>
            )}
          </div>
        )}

        {parsed?.ok && parsed.merchant && (
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[10rem] flex-1 space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Teach category for “{parsed.merchant}”</span>
              <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">— pick —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </div>
            <Button onClick={onSave} disabled={busy || !categoryId}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
              Learn
            </Button>
          </div>
        )}

        {msg && <p className="text-xs text-income">{msg}</p>}
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="tabular truncate text-right font-medium capitalize">{value}</span>
    </div>
  );
}
