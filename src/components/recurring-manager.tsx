"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Pause, Play, Repeat } from "lucide-react";
import type { Account, Category, RecurringRule } from "@/lib/supabase/types";
import { setRuleActive, deleteRule } from "@/app/actions/recurring";
import { describeRule } from "@/lib/recurring/describe";
import { formatINR, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Card } from "@/components/ui/card";
import { RuleForm } from "@/components/rule-form";
import { cn } from "@/lib/utils";

export function RecurringManager({
  rules,
  accounts,
  categories,
}: {
  rules: RecurringRule[];
  accounts: Account[];
  categories: Category[];
}) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<RecurringRule | null | undefined>(undefined);
  const open = editing !== undefined;

  async function onToggle(rule: RecurringRule) {
    await setRuleActive(rule.id, !rule.active);
    router.refresh();
  }
  async function onDelete(rule: RecurringRule) {
    if (!window.confirm("Delete this recurring rule? Already-added transactions stay.")) return;
    await deleteRule(rule.id);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => setEditing(null)}>
          <Plus className="size-4" /> Add rule
        </Button>
      </div>

      {rules.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-10 text-center">
          <Repeat className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No recurring rules yet. Add one so repeating transactions post automatically.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => (
            <Card key={rule.id} className={cn("flex items-center gap-3 p-3", !rule.active && "opacity-60")}>
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-md",
                  rule.type === "income" ? "bg-income/15 text-income" : "bg-expense/15 text-expense",
                )}
              >
                <Repeat className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{rule.note || "Recurring transaction"}</span>
                  {!rule.active && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">Paused</span>}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {describeRule(rule)} · next {formatDate(rule.next_run_on)}
                </div>
              </div>
              <span className={cn("tabular shrink-0 text-sm font-semibold", rule.type === "income" ? "text-income" : "text-expense")}>
                {formatINR(rule.amount)}
              </span>
              <div className="flex shrink-0 items-center gap-0.5">
                <IconBtn label={rule.active ? "Pause" : "Resume"} onClick={() => onToggle(rule)}>
                  {rule.active ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                </IconBtn>
                <IconBtn label="Edit" onClick={() => setEditing(rule)}>
                  <Pencil className="size-3.5" />
                </IconBtn>
                <IconBtn label="Delete" onClick={() => onDelete(rule)} danger>
                  <Trash2 className="size-3.5" />
                </IconBtn>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setEditing(undefined)} title={editing ? "Edit recurring rule" : "New recurring rule"}>
        {open && (
          <RuleForm accounts={accounts} categories={categories} initial={editing} onDone={() => setEditing(undefined)} />
        )}
      </Modal>
    </div>
  );
}

function IconBtn({ children, label, onClick, danger }: { children: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
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
