import type { Group } from "@/lib/aggregate";
import { formatINR } from "@/lib/format";

/** Horizontal proportional bars for a set of groups (category/account/note). */
export function CategoryBars<K>({
  groups,
  metric,
}: {
  groups: Group<K>[];
  metric: "expense" | "income" | "net";
}) {
  const value = (g: Group<K>) => (metric === "net" ? Math.abs(g.net) : g[metric]);
  const max = Math.max(1, ...groups.map(value));

  return (
    <div className="space-y-2.5">
      {groups.map((g) => (
        <div key={String(g.key)}>
          <div className="mb-1 flex items-center justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-1.5">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: g.color ?? "#6366f1" }}
              />
              <span className="truncate">{g.label}</span>
              <span className="shrink-0 text-xs text-muted-foreground">({g.count})</span>
            </span>
            <span className="tabular shrink-0 font-medium">{formatINR(value(g))}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(value(g) / max) * 100}%`,
                backgroundColor: g.color ?? "#6366f1",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
