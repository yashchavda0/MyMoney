"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Upload, Download, Loader2, Check } from "lucide-react";
import type { Account, Category, TransactionWithRefs } from "@/lib/supabase/types";
import { parseImport, type ParsedRow } from "@/lib/parse-import";
import { bulkCreateTransactions } from "@/app/actions/transactions";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/format";

export function BulkTools({
  accounts,
  categories,
  transactions,
}: {
  accounts: Account[];
  categories: Category[];
  transactions: TransactionWithRefs[];
}) {
  const [importOpen, setImportOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  /** Copy current (filtered) rows to clipboard as TSV. */
  async function onExport() {
    const header = ["Date", "Amount", "Type", "Category", "Account", "Note", "Description"].join("\t");
    const body = transactions
      .map((t) =>
        [
          t.occurred_on,
          t.amount,
          t.type,
          t.category?.name ?? "",
          t.account?.name ?? "",
          t.note,
          t.description ?? "",
        ].join("\t"),
      )
      .join("\n");
    await navigator.clipboard.writeText(`${header}\n${body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={onExport} disabled={transactions.length === 0}>
        {copied ? <Check className="size-4 text-income" /> : <Download className="size-4" />}
        {copied ? "Copied" : "Copy"}
      </Button>
      <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
        <Upload className="size-4" /> Import
      </Button>
      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        accounts={accounts}
        categories={categories}
      />
    </>
  );
}

function ImportModal({
  open,
  onClose,
  accounts,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  accounts: Account[];
  categories: Category[];
}) {
  const router = useRouter();
  const [text, setText] = React.useState("");
  const [rows, setRows] = React.useState<ParsedRow[] | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  function reset() {
    setText("");
    setRows(null);
    setError("");
  }

  function onParse() {
    setError("");
    setRows(parseImport(text, accounts, categories));
  }

  const valid = rows?.filter((r) => r.errors.length === 0) ?? [];
  const invalid = rows?.filter((r) => r.errors.length > 0) ?? [];

  async function onImport() {
    setBusy(true);
    setError("");
    const res = await bulkCreateTransactions(valid.map((r) => r.row));
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    reset();
    onClose();
    router.refresh();
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Bulk import"
      description="Paste rows from a spreadsheet. Columns: Date, Amount, Type, Category, Account, Note, Description."
      className="max-w-2xl"
    >
      {!rows ? (
        <div className="space-y-3">
          <Textarea
            rows={8}
            className="font-mono text-xs"
            placeholder={"2026-07-18\t500\texpense\tFood\tCash\tLunch\n2026-07-18\t50000\tincome\tSalary\tBank\tJuly salary"}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={onParse} disabled={!text.trim()}>
              Preview
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="max-h-[45vh] overflow-auto rounded-md border border-border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="p-2 text-left font-medium">Date</th>
                  <th className="p-2 text-left font-medium">Type</th>
                  <th className="p-2 text-right font-medium">Amount</th>
                  <th className="p-2 text-left font-medium">Category</th>
                  <th className="p-2 text-left font-medium">Account</th>
                  <th className="p-2 text-left font-medium">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r, i) => (
                  <tr key={i} className={r.errors.length ? "bg-destructive/10" : ""}>
                    <td className="p-2">{r.display.date ? formatDate(r.row.occurred_on) || r.display.date : "—"}</td>
                    <td className="p-2 capitalize">{r.display.type}</td>
                    <td className="tabular p-2 text-right">{r.display.amount}</td>
                    <td className="p-2">{r.display.category}</td>
                    <td className="p-2">{r.display.account}</td>
                    <td className="p-2">{r.display.note || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {valid.length} ready{invalid.length > 0 && <span className="text-destructive"> · {invalid.length} with errors (skipped)</span>}
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setRows(null)}>
                Back
              </Button>
              <Button onClick={onImport} disabled={busy || valid.length === 0}>
                {busy && <Loader2 className="size-4 animate-spin" />}
                Import {valid.length}
              </Button>
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      )}
    </Modal>
  );
}
