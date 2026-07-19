"use client";

import * as React from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { formatINR } from "@/lib/format";

export interface PieSlice {
  label: string;
  value: number;
  color: string;
}

/**
 * Donut chart with a tappable legend — works on touch (no hover needed).
 * Tap a slice or a legend row to highlight it; the center shows its amount and share.
 */
export function CategoryDonut({ data }: { data: PieSlice[] }) {
  const [active, setActive] = React.useState<number | null>(null);

  const total = data.reduce((s, d) => s + d.value, 0);

  if (data.length === 0 || total === 0) {
    return (
      <div className="grid h-[220px] place-items-center text-sm text-muted-foreground">
        No expenses to chart.
      </div>
    );
  }

  const activeSlice = active !== null ? data[active] : null;
  const centerLabel = activeSlice ? activeSlice.label : "Total";
  const centerValue = activeSlice ? activeSlice.value : total;
  const centerPct = activeSlice ? Math.round((activeSlice.value / total) * 100) : 100;

  function toggle(i: number) {
    setActive((cur) => (cur === i ? null : i));
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="relative mx-auto w-full max-w-[240px] shrink-0">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={62}
              outerRadius={92}
              paddingAngle={2}
              strokeWidth={0}
              onClick={(_, i) => toggle(i)}
            >
              {data.map((slice, i) => (
                <Cell
                  key={slice.label}
                  fill={slice.color}
                  fillOpacity={active === null || active === i ? 1 : 0.28}
                  className="cursor-pointer outline-none"
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="max-w-[7rem] truncate text-xs text-muted-foreground">{centerLabel}</span>
          <span className="tabular text-lg font-semibold">{formatINR(centerValue)}</span>
          <span className="text-xs text-muted-foreground">{centerPct}%</span>
        </div>
      </div>

      <ul className="flex-1 space-y-1">
        {data.map((slice, i) => {
          const pct = Math.round((slice.value / total) * 100);
          const dim = active !== null && active !== i;
          return (
            <li key={slice.label}>
              <button
                type="button"
                onClick={() => toggle(i)}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors hover:bg-accent ${
                  dim ? "opacity-40" : ""
                }`}
              >
                <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: slice.color }} />
                <span className="min-w-0 flex-1 truncate text-left">{slice.label}</span>
                <span className="tabular shrink-0 font-medium">{formatINR(slice.value)}</span>
                <span className="tabular w-9 shrink-0 text-right text-xs text-muted-foreground">{pct}%</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
