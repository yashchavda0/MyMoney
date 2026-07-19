"use client";

import * as React from "react";
import type { Group } from "@/lib/aggregate";
import { formatINR } from "@/lib/format";
import { Input } from "@/components/ui/input";

export function NoteStats({ groups }: { groups: Group<string>[] }) {
  const [q, setQ] = React.useState("");

  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = needle ? groups.filter((g) => g.label.toLowerCase().includes(needle)) : groups;
    return list.slice(0, 50);
  }, [groups, q]);

  return (
    <div className="space-y-3">
      <Input
        placeholder="Search a note to total it… (e.g. Zomato)"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No matching notes.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[26rem] text-sm">
            <thead>
              <tr className="border-b border-border text-xs font-medium text-muted-foreground">
                <th className="py-1.5 pr-3 text-left font-medium">Note</th>
                <th className="w-24 px-3 py-1.5 text-right font-medium">Income</th>
                <th className="w-24 px-3 py-1.5 text-right font-medium">Expense</th>
                <th className="w-24 py-1.5 pl-3 text-right font-medium">Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((g) => (
                <tr key={g.key}>
                  <td className="max-w-0 py-1.5 pr-3">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate">{g.label}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">({g.count})</span>
                    </span>
                  </td>
                  <td className="tabular w-24 px-3 py-1.5 text-right text-income">
                    {g.income ? formatINR(g.income) : "—"}
                  </td>
                  <td className="tabular w-24 px-3 py-1.5 text-right text-expense">
                    {g.expense ? formatINR(g.expense) : "—"}
                  </td>
                  <td
                    className={`tabular w-24 py-1.5 pl-3 text-right font-medium ${
                      g.net < 0 ? "text-expense" : "text-income"
                    }`}
                  >
                    {formatINR(g.net)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
