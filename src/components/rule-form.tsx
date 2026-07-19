"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { Account, Category, TxnType, Frequency, RecurringRule } from "@/lib/supabase/types";
import { createRule, updateRule, type RuleInput } from "@/app/actions/recurring";
import { todayISO } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const FREQS: { value: Frequency; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekday", label: "Every weekday (Mon–Fri)" },
  { value: "weekend", label: "Every weekend (Sat–Sun)" },
  { value: "weekly", label: "Weekly (pick days)" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

export function RuleForm({
  accounts,
  categories,
  initial,
  onDone,
}: {
  accounts: Account[];
  categories: Category[];
  initial?: RecurringRule | null;
  onDone: () => void;
}) {
  const router = useRouter();
  const editing = !!initial;

  const [type, setType] = React.useState<TxnType>(initial?.type ?? "expense");
  const [amount, setAmount] = React.useState(initial ? String(initial.amount) : "");
  const [categoryId, setCategoryId] = React.useState(initial?.category_id ?? "");
  const [accountId, setAccountId] = React.useState(initial?.account_id ?? "");
  const [note, setNote] = React.useState(initial?.note ?? "");
  const [frequency, setFrequency] = React.useState<Frequency>(initial?.frequency ?? "monthly");
  const [interval, setInterval] = React.useState(String(initial?.interval ?? 1));
  const [weekdays, setWeekdays] = React.useState<number[]>(initial?.weekdays ?? [1]);
  const [dayOfMonth, setDayOfMonth] = React.useState(String(initial?.day_of_month ?? new Date().getDate()));
  const [startDate, setStartDate] = React.useState(initial?.start_date ?? todayISO());
  const [endDate, setEndDate] = React.useState(initial?.end_date ?? "");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  const cats = categories.filter((c) => c.kind === type || c.kind === "both");
  const applicable = accounts.filter((a) => a.usable_for === "both" || a.usable_for === type);
  const accountOptions =
    accountId && !applicable.some((a) => a.id === accountId)
      ? [...applicable, ...accounts.filter((a) => a.id === accountId)]
      : applicable;

  function toggleDay(d: number) {
    setWeekdays((w) => (w.includes(d) ? w.filter((x) => x !== d) : [...w, d].sort((a, b) => a - b)));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const payload: RuleInput = {
      type,
      amount,
      category_id: categoryId || null,
      account_id: accountId || null,
      note: note.trim(),
      frequency,
      interval,
      weekdays: frequency === "weekly" ? weekdays : null,
      day_of_month: frequency === "monthly" || frequency === "yearly" ? Number(dayOfMonth) : null,
      start_date: startDate,
      end_date: endDate || null,
    };
    const res = editing ? await updateRule(initial!.id, payload) : await createRule(payload);
    if (!res.ok) {
      setError(res.error);
      setBusy(false);
      return;
    }
    router.refresh();
    onDone();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {(["expense", "income"] as TxnType[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setType(t);
              setCategoryId("");
            }}
            className={cn(
              "h-10 rounded-md border text-sm font-medium capitalize transition-colors",
              type === t
                ? t === "expense"
                  ? "border-expense bg-expense/10 text-expense"
                  : "border-income bg-income/10 text-income"
                : "border-border text-muted-foreground hover:bg-accent",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="r-amount">Amount (₹)</Label>
          <Input id="r-amount" type="number" step="0.01" min="0" required value={amount} onChange={(e) => setAmount(e.target.value)} className="tabular" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="r-note">Note</Label>
          <Input id="r-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Rent" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="r-cat">Category</Label>
          <Select id="r-cat" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">— none —</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="r-acct">Account</Label>
          <Select id="r-acct" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="">— none —</option>
            {accountOptions.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </Select>
        </div>
      </div>

      <div className="rounded-lg border border-border p-3 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="r-freq">Repeat</Label>
            <Select id="r-freq" value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)}>
              {FREQS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </Select>
          </div>
          {(frequency === "daily" || frequency === "weekly" || frequency === "monthly" || frequency === "yearly") && (
            <div className="space-y-1.5">
              <Label htmlFor="r-int">
                Every N {frequency === "daily" ? "days" : frequency === "weekly" ? "weeks" : frequency === "monthly" ? "months" : "years"}
              </Label>
              <Input id="r-int" type="number" min="1" value={interval} onChange={(e) => setInterval(e.target.value)} />
            </div>
          )}
        </div>

        {frequency === "weekly" && (
          <div className="space-y-1.5">
            <Label>On days</Label>
            <div className="flex flex-wrap gap-1">
              {DOW.map((d, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={cn(
                    "h-8 w-10 rounded-md border text-xs font-medium transition-colors",
                    weekdays.includes(i) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-accent",
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}

        {(frequency === "monthly" || frequency === "yearly") && (
          <div className="space-y-1.5">
            <Label htmlFor="r-dom">Day of month</Label>
            <Input id="r-dom" type="number" min="1" max="31" value={dayOfMonth} onChange={(e) => setDayOfMonth(e.target.value)} className="w-24" />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="r-start">Start date</Label>
            <Input id="r-start" type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-end">End date (optional)</Label>
            <Input id="r-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone} disabled={busy}>Cancel</Button>
        <Button type="submit" disabled={busy}>
          {busy && <Loader2 className="size-4 animate-spin" />}
          {editing ? "Save rule" : "Create rule"}
        </Button>
      </div>
    </form>
  );
}
