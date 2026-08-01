/**
 * Backstop for routes under (app) that don't yet have their own local
 * <Suspense> boundary — Next.js wraps the page segment in this automatically
 * so it still streams instead of blocking on that page's data fetch.
 */
export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl animate-pulse space-y-3">
      <div className="h-28 rounded-xl border border-border bg-card" />
      <div className="h-9 rounded-lg bg-muted" />
      <div className="h-64 rounded-xl border border-border bg-card" />
    </div>
  );
}
