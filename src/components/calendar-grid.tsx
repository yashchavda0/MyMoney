"use client";

import * as React from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  parse,
  isSameMonth,
} from "date-fns";
import type { TransactionWithRefs } from "@/lib/supabase/types";
import { todayISO, formatINRCompact, formatDateLong } from "@/lib/format";
import { Modal } from "@/components/ui/modal";
import { TransactionList } from "@/components/transaction-list";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface DayAgg {
  txns: TransactionWithRefs[];
  net: number;
  count: number;
}

export function CalendarGrid({
  month,
  transactions,
}: {
  month: string; // yyyy-MM
  transactions: TransactionWithRefs[];
}) {
  const [selected, setSelected] = React.useState<string | null>(null);

  // Aggregate transactions per calendar day (keyed by yyyy-MM-dd).
  const byDate = React.useMemo(() => {
    const map = new Map<string, DayAgg>();
    for (const t of transactions) {
      let agg = map.get(t.occurred_on);
      if (!agg) {
        agg = { txns: [], net: 0, count: 0 };
        map.set(t.occurred_on, agg);
      }
      agg.txns.push(t);
      agg.net += t.type === "income" ? t.amount : -t.amount;
      agg.count++;
    }
    return map;
  }, [transactions]);

  const monthStart = parse(`${month}-01`, "yyyy-MM-dd", new Date());
  const gridStart = startOfWeek(startOfMonth(monthStart), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(monthStart), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const today = todayISO();

  const selectedAgg = selected ? byDate.get(selected) : null;

  return (
    <Card className="p-2 sm:p-3">
      <div className="mb-1 grid grid-cols-7 gap-1 sm:gap-1.5">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1 text-center text-[11px] font-medium text-muted-foreground">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {days.map((day) => {
          const iso = format(day, "yyyy-MM-dd");
          const inMonth = isSameMonth(day, monthStart);
          const agg = byDate.get(iso);
          const isToday = iso === today;
          const clickable = !!agg;

          return (
            <button
              key={iso}
              type="button"
              disabled={!clickable}
              onClick={() => clickable && setSelected(iso)}
              className={cn(
                "flex min-h-[72px] flex-col rounded-md border border-border p-1.5 text-left transition-colors",
                inMonth ? "bg-card" : "bg-transparent",
                clickable ? "cursor-pointer hover:bg-accent" : "cursor-default",
                isToday && "ring-1 ring-primary",
              )}
            >
              <span
                className={cn(
                  "text-xs font-medium",
                  inMonth ? "text-foreground" : "text-muted-foreground/50",
                  isToday && "text-primary",
                )}
              >
                {format(day, "d")}
              </span>

              {agg && (
                <span className="mt-auto space-y-0.5">
                  <span
                    className={cn(
                      "tabular block text-[11px] font-semibold leading-tight",
                      agg.net >= 0 ? "text-income" : "text-expense",
                    )}
                  >
                    {formatINRCompact(agg.net)}
                  </span>
                  <span className="block text-[10px] leading-tight text-muted-foreground">
                    {agg.count} {agg.count === 1 ? "txn" : "txns"}
                  </span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? formatDateLong(selected) : ""}
      >
        {selectedAgg && <TransactionList transactions={selectedAgg.txns} showDate={false} />}
      </Modal>
    </Card>
  );
}
