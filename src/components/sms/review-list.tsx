"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, X } from "lucide-react";
import type { Account, Category, SmsInboxWithRefs, TxnType } from "@/lib/supabase/types";
import { confirmPending, ignorePending } from "@/app/actions/sms";
import { formatINR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ReviewList({
  items,
  categories,
  accounts,
}: {
  items: SmsInboxWithRefs[];
  categories: Category[];
  accounts: Pick<Account, "id" | "name">[];
}) {
  if (items.length === 0) {
    return (
      <Card className="p-10 text-center text-sm text-muted-foreground">
        Nothing to review. SMS with a known category post automatically; unknown ones land here.
      </Card>
    );
  }
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <ReviewItem key={item.id} item={item} categories={categories} accounts={accounts} />
      ))}
    </div>
  );
}

function ReviewItem({
  item,
  categories,
  accounts,
}: {
  item: SmsInboxWithRefs;
  categories: Category[];
  accounts: Pick<Account, "id" | "name">[];
}) {
  const router = useRouter();
  const [type, setType] = React.useState<TxnType>(item.type ?? "expense");
  const [amount, setAmount] = React.useState(String(item.amount ?? ""));
  const [note, setNote] = React.useState(item.note ?? "");
  const [categoryId, setCategoryId] = React.useState(item.category_id ?? "");
  const [accountId, setAccountId] = React.useState(item.account_id ?? "");
  const [date, setDate] = React.useState(item.received_at.slice(0, 10));
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  const cats = categories.filter((c) => c.kind === type || c.kind === "both");

  async function onConfirm() {
    if (!categoryId) return setError("Pick a category");
    setBusy(true);
    setError("");
    const res = await confirmPending(item.id, {
      category_id: categoryId,
      account_id: accountId || null,
      amount,
      note: note.trim(),
      occurred_on: date,
      type,
    });
    if (!res.ok) {
      setError(res.error);
      setBusy(false);
      return;
    }
    router.refresh();
  }

  async function onIgnore() {
    setBusy(true);
    await ignorePending(item.id);
    router.refresh();
  }

  return (
    <Card className={cn("space-y-3 p-3", busy && "opacity-50")}>
      <p className="line-clamp-2 rounded-md bg-muted/30 px-2 py-1.5 font-mono text-[11px] text-muted-foreground">
        {item.raw_text}
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div className="col-span-2 grid grid-cols-2 gap-1.5 sm:col-span-1">
          {(["expense", "income"] as TxnType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setType(t); setCategoryId(""); }}
              className={cn(
                "h-9 rounded-md border text-xs font-medium capitalize",
                type === t
                  ? t === "expense" ? "border-expense bg-expense/10 text-expense" : "border-income bg-income/10 text-income"
                  : "border-border text-muted-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="tabular" aria-label="Amount" />
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date" />
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note" className="col-span-2 sm:col-span-1" aria-label="Note" />
        <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-label="Category">
          <option value="">— category —</option>
          {cats.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
        <Select value={accountId} onChange={(e) => setAccountId(e.target.value)} aria-label="Account">
          <option value="">— account —</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </Select>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex items-center justify-between">
        <span className="tabular text-sm font-semibold">{formatINR(Number(amount) || 0)}</span>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onIgnore} disabled={busy}>
            <X className="size-4" /> Ignore
          </Button>
          <Button size="sm" onClick={onConfirm} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            Add & learn
          </Button>
        </div>
      </div>
    </Card>
  );
}
