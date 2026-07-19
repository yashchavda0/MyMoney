"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Star, Copy, Pencil, Trash2, MoreVertical } from "lucide-react";
import type { TransactionWithRefs } from "@/lib/supabase/types";
import { useTransactionUI } from "@/components/transaction-ui-provider";
import { deleteTransaction, toggleBookmark } from "@/app/actions/transactions";
import { formatINR, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

function TransactionItem({ txn, showDate }: { txn: TransactionWithRefs; showDate?: boolean }) {
  const ui = useTransactionUI();
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);

  async function onDelete() {
    if (!window.confirm("Delete this transaction?")) return;
    setBusy(true);
    await deleteTransaction(txn.id);
    router.refresh();
  }

  async function onStar() {
    setBusy(true);
    await toggleBookmark(txn.id, !txn.is_bookmarked);
    router.refresh();
    setBusy(false);
  }

  // "Employer: Acme · Month: July" from the category's custom fields.
  const detailStr = (txn.category?.fields ?? [])
    .filter((f) => txn.details?.[f.id])
    .map((f) => `${f.label}: ${txn.details[f.id]}`)
    .join(" · ");

  const actions = [
    { label: txn.is_bookmarked ? "Remove bookmark" : "Bookmark", icon: Star, onClick: onStar, active: txn.is_bookmarked },
    { label: "Duplicate", icon: Copy, onClick: () => ui.duplicate(txn) },
    { label: "Edit", icon: Pencil, onClick: () => ui.edit(txn) },
    { label: "Delete", icon: Trash2, onClick: onDelete, danger: true },
  ];

  return (
    <div className={cn("group flex items-center gap-2.5 px-3 py-2 transition-colors hover:bg-accent/50", busy && "opacity-50")}>
      <span
        className="grid size-8 shrink-0 place-items-center rounded-md text-xs font-semibold"
        style={{
          backgroundColor: (txn.category?.color ?? "#64748b") + "22",
          color: txn.category?.color ?? "#94a3b8",
        }}
        title={txn.category?.name ?? "Uncategorized"}
      >
        {(txn.category?.name ?? txn.note ?? "?").charAt(0).toUpperCase()}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium">{txn.note || txn.category?.name || "Transaction"}</span>
          {txn.is_bookmarked && <Star className="size-3 shrink-0 fill-primary text-primary" />}
        </div>
        <div className="truncate text-xs text-muted-foreground">
          {txn.category?.name ?? "Uncategorized"}
          {txn.account && <> · {txn.account.name}</>}
          {showDate && <> · {formatDate(txn.occurred_on)}</>}
          {detailStr && <> · {detailStr}</>}
          {txn.description && <> · {txn.description}</>}
        </div>
      </div>

      <span className={cn("tabular shrink-0 text-sm font-semibold", txn.type === "income" ? "text-income" : "text-expense")}>
        {txn.type === "income" ? "+" : "−"}
        {formatINR(txn.amount)}
      </span>

      {/* Desktop: inline icons on hover */}
      <div className="hidden shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 md:flex">
        {actions.map((a) => (
          <IconBtn key={a.label} label={a.label} onClick={a.onClick} danger={a.danger}>
            <a.icon className={cn("size-3.5", a.active && "fill-primary text-primary")} />
          </IconBtn>
        ))}
      </div>

      {/* Mobile: single kebab → dropdown (keeps rows narrow, no horizontal scroll) */}
      <div className="relative shrink-0 md:hidden">
        <IconBtn label="Actions" onClick={() => setMenuOpen((o) => !o)}>
          <MoreVertical className="size-4" />
        </IconBtn>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-8 z-50 w-40 overflow-hidden rounded-lg border border-border bg-popover py-1 shadow-xl">
              {actions.map((a) => (
                <button
                  key={a.label}
                  onClick={() => {
                    setMenuOpen(false);
                    a.onClick();
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
                    a.danger && "text-destructive",
                  )}
                >
                  <a.icon className={cn("size-4", a.active && "fill-primary text-primary")} />
                  {a.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function IconBtn({
  children,
  label,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent",
        danger ? "hover:text-destructive" : "hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

/** Flat list of transactions. */
export function TransactionList({
  transactions,
  showDate = true,
  emptyLabel = "No transactions.",
}: {
  transactions: TransactionWithRefs[];
  showDate?: boolean;
  emptyLabel?: string;
}) {
  if (transactions.length === 0) {
    return <p className="px-3 py-8 text-center text-sm text-muted-foreground">{emptyLabel}</p>;
  }
  return (
    <div className="divide-y divide-border">
      {transactions.map((t) => (
        <TransactionItem key={t.id} txn={t} showDate={showDate} />
      ))}
    </div>
  );
}
