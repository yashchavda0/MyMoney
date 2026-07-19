import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import type { Totals } from "@/lib/aggregate";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Compact month balance: net headline, a proportion bar, and in/out — one card, low height. */
export function BalanceCard({ data, label }: { data: Totals; label?: string }) {
  const gross = data.income + data.expense;
  const incomePct = gross > 0 ? (data.income / gross) * 100 : 0;

  return (
    <div className="rounded-xl border border-border bg-card p-3.5">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">Net{label ? ` · ${label}` : ""}</span>
        <span className="text-[11px] text-muted-foreground">{data.count} txns</span>
      </div>

      <div
        className={cn(
          "tabular truncate text-2xl font-semibold sm:text-3xl",
          data.net >= 0 ? "text-income" : "text-expense",
        )}
      >
        {formatINR(data.net)}
      </div>

      {/* Proportion bar: income vs expense share of total flow. */}
      <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-income" style={{ width: `${incomePct}%` }} />
        <div className="h-full bg-expense" style={{ width: `${100 - incomePct}%` }} />
      </div>

      <div className="mt-2.5 flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-income">
          <ArrowDownLeft className="size-3.5" />
          <span className="tabular font-medium">{formatINR(data.income)}</span>
          <span className="text-muted-foreground">in</span>
        </span>
        <span className="flex items-center gap-1.5 text-expense">
          <span className="text-muted-foreground">out</span>
          <span className="tabular font-medium">{formatINR(data.expense)}</span>
          <ArrowUpRight className="size-3.5" />
        </span>
      </div>
    </div>
  );
}
