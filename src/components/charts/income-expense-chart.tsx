"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatINR, formatINRShort } from "@/lib/format";
import { useAccent } from "@/components/accent-provider";
import { CHART_COLORS } from "@/lib/chart-theme";

export interface DayPoint {
  day: string;
  income: number;
  expense: number;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      <div className="mb-1 font-medium text-popover-foreground">Day {label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 capitalize text-muted-foreground">
            <span className="size-2 rounded-full" style={{ backgroundColor: p.color }} />
            {p.name}
          </span>
          <span className="tabular font-medium text-popover-foreground">{formatINR(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function IncomeExpenseChart({ data }: { data: DayPoint[] }) {
  const { accent } = useAccent();
  const colors = CHART_COLORS[accent];

  if (data.length === 0) {
    return (
      <div className="grid h-[260px] place-items-center text-sm text-muted-foreground">
        No data this month.
      </div>
    );
  }

  // Keep bars readable on phones: give the plot a minimum width and let it scroll.
  const minWidth = Math.max(320, data.length * 26);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: colors.income }} />
          Income
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: colors.expense }} />
          Expense
        </span>
        <span className="ml-auto text-muted-foreground">Tap a bar for details</span>
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth }}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
                interval="preserveStartEnd"
                minTickGap={4}
              />
              <YAxis
                width={56}
                tickFormatter={(v: number) => formatINRShort(v)}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.4 }} content={<ChartTooltip />} />
              <Bar dataKey="income" name="income" fill={colors.income} radius={[3, 3, 0, 0]} maxBarSize={22} />
              <Bar dataKey="expense" name="expense" fill={colors.expense} radius={[3, 3, 0, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
