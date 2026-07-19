"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2 } from "lucide-react";
import type { Category, SmsRule } from "@/lib/supabase/types";
import { saveRule, deleteRule } from "@/app/actions/sms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function SmsRulesManager({ rules, categories }: { rules: SmsRule[]; categories: Category[] }) {
  const router = useRouter();
  const [pattern, setPattern] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  const catName = (id: string | null) => categories.find((c) => c.id === id)?.name ?? "—";

  async function onAdd() {
    if (!pattern.trim() || !categoryId) return;
    setBusy(true);
    setError("");
    const res = await saveRule({ pattern: pattern.trim(), category_id: categoryId });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setPattern("");
    router.refresh();
  }

  async function onDelete(id: string) {
    await deleteRule(id);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle>Category rules</CardTitle>
        <p className="text-xs text-muted-foreground">
          A keyword found in the SMS → category. Learned rules come from your Review confirmations.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[8rem] flex-1 space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Keyword</span>
            <Input placeholder="e.g. bigbasket" value={pattern} onChange={(e) => setPattern(e.target.value)} />
          </div>
          <div className="min-w-[8rem] flex-1 space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Category</span>
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">— pick —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </div>
          <Button onClick={onAdd} disabled={busy || !pattern.trim() || !categoryId}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Add
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}

        {rules.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">No rules yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {rules.map((r) => (
              <div key={r.id} className="flex items-center gap-2 py-2 text-sm">
                <code className="rounded bg-muted/50 px-1.5 py-0.5 text-xs">{r.pattern}</code>
                <span className="text-muted-foreground">→</span>
                <span className="flex-1 truncate font-medium">{catName(r.category_id)}</span>
                {r.learned && <Badge className="text-muted-foreground">learned</Badge>}
                <button
                  onClick={() => onDelete(r.id)}
                  aria-label="Delete rule"
                  className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
