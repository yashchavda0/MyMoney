import { ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react";
import { formatINR, formatINRShort } from "@/lib/format";
import type { Totals } from "@/lib/aggregate";
import { cn } from "@/lib/utils";

export function SummaryTiles({ data, className }: { data: Totals; className?: string }) {
  return (
    <div className={cn("grid grid-cols-3 gap-2 sm:gap-3", className)}>
      <Tile label="Income" value={data.income} icon={<ArrowDownLeft className="size-4" />} tone="income" />
      <Tile label="Expense" value={data.expense} icon={<ArrowUpRight className="size-4" />} tone="expense" />
      <Tile
        label="Net"
        value={data.net}
        icon={<Wallet className="size-4" />}
        tone={data.net >= 0 ? "income" : "expense"}
      />
    </div>
  );
}

function Tile({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "income" | "expense";
}) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-card p-2.5 sm:p-3">
      <div className="mb-1 flex items-center justify-between gap-1">
        <span className="truncate text-[11px] font-medium text-muted-foreground sm:text-xs">{label}</span>
        <span className={cn("shrink-0", tone === "income" ? "text-income" : "text-expense")}>{icon}</span>
      </div>
      {/* Compact (no-decimal) amount on phones to avoid overflow; full precision on larger screens. */}
      <div
        className={cn(
          "tabular truncate text-sm font-semibold sm:text-lg",
          tone === "income" ? "text-income" : "text-expense",
        )}
        title={formatINR(value)}
      >
        <span className="sm:hidden">{formatINRShort(value)}</span>
        <span className="hidden sm:inline">{formatINR(value)}</span>
      </div>
    </div>
  );
}
