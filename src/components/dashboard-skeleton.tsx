/**
 * Approximates BalanceCard + ViewTabs/DayNav + the transaction list card's
 * dimensions so swapping in real data causes minimal layout shift.
 */
export function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-2xl animate-pulse space-y-3">
      <div className="rounded-xl border border-border bg-card p-3.5">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <div className="h-3 w-24 rounded bg-muted" />
          <div className="h-3 w-10 rounded bg-muted" />
        </div>
        <div className="h-8 w-40 rounded bg-muted" />
        <div className="mt-3 h-1.5 rounded-full bg-muted" />
        <div className="mt-2.5 flex items-center justify-between">
          <div className="h-3 w-16 rounded bg-muted" />
          <div className="h-3 w-16 rounded bg-muted" />
        </div>
      </div>

      <div className="mt-3 space-y-3">
        <div className="h-9 w-full rounded-lg bg-muted" />
        <div className="h-8 w-full rounded-md bg-muted" />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border bg-muted/30 px-3 py-2">
          <div className="h-4 w-24 rounded bg-muted" />
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 px-3" />
          ))}
        </div>
      </div>
    </div>
  );
}
