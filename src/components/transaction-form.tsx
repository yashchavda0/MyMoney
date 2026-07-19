"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";
import type { Account, Category, TxnType, TransactionWithRefs } from "@/lib/supabase/types";
import {
  createTransaction,
  updateTransaction,
  type TxnInput,
} from "@/app/actions/transactions";
import { quickCreateCategory } from "@/app/actions/settings";
import { todayISO } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface Props {
  accounts: Account[];
  categories: Category[];
  /** Existing transaction for edit/duplicate; omit for a blank add. */
  initial?: TransactionWithRefs | null;
  /** When true, saving creates a NEW row even if `initial` is set (copy/paste duplicate). */
  duplicate?: boolean;
  /** Preset income/expense for a fresh add (e.g. the "Add income" quick action). */
  defaultType?: TxnType;
  onDone: () => void;
}

export function TransactionForm({ accounts, categories, initial, duplicate, defaultType, onDone }: Props) {
  const router = useRouter();
  const editing = !!initial && !duplicate;

  const [type, setType] = React.useState<TxnType>(initial?.type ?? defaultType ?? "expense");
  const [amount, setAmount] = React.useState(initial ? String(initial.amount) : "");
  const [date, setDate] = React.useState(duplicate ? todayISO() : initial?.occurred_on ?? todayISO());
  const [categoryId, setCategoryId] = React.useState<string>(initial?.category_id ?? "");
  const [accountId, setAccountId] = React.useState<string>(initial?.account_id ?? "");
  const [note, setNote] = React.useState(initial?.note ?? "");
  const [description, setDescription] = React.useState(initial?.description ?? "");
  const [bookmarked, setBookmarked] = React.useState(initial?.is_bookmarked ?? false);
  const [showDesc, setShowDesc] = React.useState(!!initial?.description);
  const [details, setDetails] = React.useState<Record<string, string>>(initial?.details ?? {});
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  const cats = categories.filter((c) => c.kind === type || c.kind === "both");

  // Custom fields defined on the chosen category, shown inline below it.
  const selectedCategory = categories.find((c) => c.id === categoryId) ?? null;
  const catFields = selectedCategory?.fields ?? [];

  // Only accounts applicable to this transaction type (credit cards are usually expense-only).
  // Keep the currently-selected account visible even if it no longer matches, so edits don't lose it.
  const applicable = accounts.filter((a) => a.usable_for === "both" || a.usable_for === type);
  const accountOptions =
    accountId && !applicable.some((a) => a.id === accountId)
      ? [...applicable, ...accounts.filter((a) => a.id === accountId)]
      : applicable;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");

    let finalCategoryId = categoryId;
    if (categoryId.startsWith("new:")) {
      const res = await quickCreateCategory(categoryId.slice(4), type);
      if (!res.ok) {
        setError(res.error);
        setBusy(false);
        return;
      }
      finalCategoryId = res.id;
    }

    const payload: TxnInput = {
      occurred_on: date,
      type,
      amount,
      category_id: finalCategoryId || null,
      account_id: accountId || null,
      note: note.trim(),
      description: showDesc && description.trim() ? description.trim() : null,
      is_bookmarked: bookmarked,
      // Only persist values for the selected category's fields, skipping blanks.
      details: Object.fromEntries(
        catFields
          .map((f) => [f.id, (details[f.id] ?? "").trim()] as const)
          .filter(([, v]) => v !== ""),
      ),
    };

    const res = editing
      ? await updateTransaction(initial!.id, payload)
      : await createTransaction(payload);

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
      {/* Type toggle */}
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
          <Label htmlFor="amount">Amount (₹)</Label>
          <Input
            id="amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            required
            autoFocus
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="tabular text-base"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="date">Date</Label>
          <Input id="date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="category">Category</Label>
          <Select
            id="category"
            value={categoryId}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "__new__") {
                const name = window.prompt("New category name");
                if (name?.trim()) setCategoryId(`new:${name.trim()}`);
              } else {
                setCategoryId(v);
              }
            }}
          >
            <option value="">— none —</option>
            {categoryId.startsWith("new:") && (
              <option value={categoryId}>{categoryId.slice(4)} (new)</option>
            )}
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            <option value="__new__">+ New category…</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="account">Account</Label>
          <Select id="account" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="">— none —</option>
            {accountOptions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {catFields.length > 0 && (
        <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
          <p className="text-xs font-medium text-muted-foreground">{selectedCategory?.name} details</p>
          {catFields.map((f) => (
            <div key={f.id} className="space-y-1.5">
              <Label htmlFor={`f-${f.id}`}>
                {f.label}
                {f.required && <span className="text-destructive"> *</span>}
              </Label>
              {f.type === "select" ? (
                <Select
                  id={`f-${f.id}`}
                  value={details[f.id] ?? ""}
                  required={f.required}
                  onChange={(e) => setDetails((d) => ({ ...d, [f.id]: e.target.value }))}
                >
                  <option value="">— select —</option>
                  {(f.options ?? []).map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </Select>
              ) : (
                <Input
                  id={`f-${f.id}`}
                  type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                  value={details[f.id] ?? ""}
                  required={f.required}
                  onChange={(e) => setDetails((d) => ({ ...d, [f.id]: e.target.value }))}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="note">Note</Label>
        <Input
          id="note"
          placeholder="e.g. Zomato dinner"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <button
        type="button"
        onClick={() => setShowDesc((s) => !s)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        {showDesc ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
        {showDesc ? "Hide" : "Add"} description
      </button>
      {showDesc && (
        <Textarea
          placeholder="Optional longer details…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      )}

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={bookmarked}
          onChange={(e) => setBookmarked(e.target.checked)}
          className="size-4 accent-[var(--primary)]"
        />
        Bookmark (save as reusable template)
      </label>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onDone} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {busy && <Loader2 className="size-4 animate-spin" />}
          {editing ? "Save changes" : duplicate ? "Save copy" : "Add transaction"}
        </Button>
      </div>
    </form>
  );
}
