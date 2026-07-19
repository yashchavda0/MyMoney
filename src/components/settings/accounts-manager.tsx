"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Archive, ArchiveRestore, Loader2 } from "lucide-react";
import type { Account, AccountType, AccountUsage } from "@/lib/supabase/types";
import {
  upsertAccount,
  archiveAccount,
  deleteAccount,
} from "@/app/actions/settings";
import { formatINR } from "@/lib/format";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TYPE_OPTIONS: { value: AccountType; label: string }[] = [
  { value: "bank", label: "Bank" },
  { value: "credit_card", label: "Credit Card" },
  { value: "debit_card", label: "Debit Card" },
  { value: "cash", label: "Cash" },
  { value: "wallet", label: "Wallet" },
  { value: "other", label: "Other" },
];

const TYPE_LABEL: Record<AccountType, string> = {
  bank: "Bank",
  credit_card: "Credit Card",
  debit_card: "Debit Card",
  cash: "Cash",
  wallet: "Wallet",
  other: "Other",
};

const USAGE_OPTIONS: { value: AccountUsage; label: string }[] = [
  { value: "both", label: "Income & Expense" },
  { value: "expense", label: "Expense only" },
  { value: "income", label: "Income only" },
];
const USAGE_BADGE: Record<AccountUsage, string | null> = {
  both: null,
  expense: "Expense only",
  income: "Income only",
};

export function AccountsManager({ accounts }: { accounts: Account[] }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<Account | null>(null);
  const [open, setOpen] = React.useState(false);

  function openAdd() {
    setEditing(null);
    setOpen(true);
  }
  function openEdit(a: Account) {
    setEditing(a);
    setOpen(true);
  }

  async function onArchive(a: Account) {
    await archiveAccount(a.id, !a.archived);
    router.refresh();
  }
  async function onDelete(a: Account) {
    if (!window.confirm(`Delete account "${a.name}"? Its transactions will remain but lose this account.`)) return;
    await deleteAccount(a.id);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Accounts</CardTitle>
        <Button size="sm" onClick={openAdd}>
          <Plus className="size-4" /> Add
        </Button>
      </CardHeader>
      <CardContent className="space-y-1">
        {accounts.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">No accounts yet.</p>
        )}
        {accounts.map((a) => (
          <div
            key={a.id}
            className={cn(
              "group flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-accent/50",
              a.archived && "opacity-50",
            )}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium">{a.name}</span>
                <Badge className="text-muted-foreground">{TYPE_LABEL[a.type]}</Badge>
                {USAGE_BADGE[a.usable_for] && (
                  <Badge className="text-muted-foreground">{USAGE_BADGE[a.usable_for]}</Badge>
                )}
                {a.archived && <Badge className="text-muted-foreground">Archived</Badge>}
              </div>
            </div>
            <span className="tabular shrink-0 text-sm text-muted-foreground">
              {formatINR(a.opening_balance)}
            </span>
            <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 max-md:opacity-100">
              <IconBtn label="Edit" onClick={() => openEdit(a)}>
                <Pencil className="size-3.5" />
              </IconBtn>
              <IconBtn label={a.archived ? "Unarchive" : "Archive"} onClick={() => onArchive(a)}>
                {a.archived ? <ArchiveRestore className="size-3.5" /> : <Archive className="size-3.5" />}
              </IconBtn>
              <IconBtn label="Delete" onClick={() => onDelete(a)} danger>
                <Trash2 className="size-3.5" />
              </IconBtn>
            </div>
          </div>
        ))}
      </CardContent>

      <AccountModal
        open={open}
        onClose={() => setOpen(false)}
        account={editing}
        onSaved={() => {
          setOpen(false);
          router.refresh();
        }}
      />
    </Card>
  );
}

function AccountModal({
  open,
  onClose,
  account,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  account: Account | null;
  onSaved: () => void;
}) {
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<AccountType>("bank");
  const [opening, setOpening] = React.useState("0");
  const [usableFor, setUsableFor] = React.useState<AccountUsage>("both");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setName(account?.name ?? "");
      setType(account?.type ?? "bank");
      setOpening(account ? String(account.opening_balance) : "0");
      setUsableFor(account?.usable_for ?? "both");
      setError("");
    }
  }, [open, account]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await upsertAccount(account?.id ?? null, {
      name: name.trim(),
      type,
      opening_balance: opening,
      usable_for: usableFor,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onSaved();
  }

  return (
    <Modal open={open} onClose={onClose} title={account ? "Edit account" : "Add account"}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="acct-name">Name</Label>
          <Input id="acct-name" required autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. HDFC Bank" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="acct-type">Type</Label>
            <Select id="acct-type" value={type} onChange={(e) => setType(e.target.value as AccountType)}>
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="acct-open">Opening balance (₹)</Label>
            <Input
              id="acct-open"
              type="number"
              step="0.01"
              inputMode="decimal"
              value={opening}
              onChange={(e) => setOpening(e.target.value)}
              className="tabular"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="acct-usage">Use for</Label>
          <Select id="acct-usage" value={usableFor} onChange={(e) => setUsableFor(e.target.value as AccountUsage)}>
            {USAGE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <p className="text-xs text-muted-foreground">Controls whether this account appears when adding income, expense, or both.</p>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            {account ? "Save changes" : "Add account"}
          </Button>
        </div>
      </form>
    </Modal>
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
