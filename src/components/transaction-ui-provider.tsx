"use client";

import * as React from "react";
import { Star, Plus } from "lucide-react";
import type { Account, Category, TransactionWithRefs, TxnType } from "@/lib/supabase/types";
import { Modal } from "@/components/ui/modal";
import { TransactionForm } from "@/components/transaction-form";
import { formatINR } from "@/lib/format";

type Mode =
  | { kind: "closed" }
  | { kind: "add"; type?: TxnType }
  | { kind: "edit"; txn: TransactionWithRefs }
  | { kind: "duplicate"; txn: TransactionWithRefs }
  | { kind: "bookmarks" };

interface Ctx {
  add: (type?: TxnType) => void;
  edit: (txn: TransactionWithRefs) => void;
  duplicate: (txn: TransactionWithRefs) => void;
  bookmarks: () => void;
}

const TransactionUIContext = React.createContext<Ctx | null>(null);

export function useTransactionUI() {
  const ctx = React.useContext(TransactionUIContext);
  if (!ctx) throw new Error("useTransactionUI must be used within TransactionUIProvider");
  return ctx;
}

export function TransactionUIProvider({
  accounts,
  categories,
  bookmarks,
  children,
}: {
  accounts: Account[];
  categories: Category[];
  bookmarks: TransactionWithRefs[];
  children: React.ReactNode;
}) {
  const [mode, setMode] = React.useState<Mode>({ kind: "closed" });
  const close = React.useCallback(() => setMode({ kind: "closed" }), []);

  const api = React.useMemo<Ctx>(
    () => ({
      add: (type?: TxnType) => setMode({ kind: "add", type }),
      edit: (txn) => setMode({ kind: "edit", txn }),
      duplicate: (txn) => setMode({ kind: "duplicate", txn }),
      bookmarks: () => setMode({ kind: "bookmarks" }),
    }),
    [],
  );

  const formMode = mode.kind === "add" || mode.kind === "edit" || mode.kind === "duplicate";
  const title =
    mode.kind === "edit" ? "Edit transaction" : mode.kind === "duplicate" ? "Duplicate transaction" : "Add transaction";

  return (
    <TransactionUIContext.Provider value={api}>
      {children}

      <Modal open={formMode} onClose={close} title={title}>
        {formMode && (
          <TransactionForm
            accounts={accounts}
            categories={categories}
            initial={mode.kind === "add" ? null : mode.txn}
            defaultType={mode.kind === "add" ? mode.type : undefined}
            duplicate={mode.kind === "duplicate"}
            onDone={close}
          />
        )}
      </Modal>

      <Modal
        open={mode.kind === "bookmarks"}
        onClose={close}
        title="Quick add from bookmarks"
        description="Tap a saved template to add it with today's date."
      >
        <div className="max-h-[60vh] space-y-1.5 overflow-y-auto">
          {bookmarks.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No bookmarks yet. Star a transaction to save it as a template.
            </p>
          )}
          {bookmarks.map((b) => (
            <button
              key={b.id}
              onClick={() => setMode({ kind: "duplicate", txn: b })}
              className="flex w-full items-center gap-3 rounded-md border border-border p-2.5 text-left transition-colors hover:bg-accent"
            >
              <Star className="size-4 shrink-0 fill-primary text-primary" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{b.note || b.category?.name || "Transaction"}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {b.category?.name ?? "—"} · {b.account?.name ?? "—"}
                </span>
              </span>
              <span className={`tabular text-sm font-semibold ${b.type === "income" ? "text-income" : "text-expense"}`}>
                {formatINR(b.amount)}
              </span>
              <Plus className="size-4 shrink-0 text-muted-foreground" />
            </button>
          ))}
        </div>
      </Modal>
    </TransactionUIContext.Provider>
  );
}
