/** Routes that make up the "Dashboard" overview cluster. */
export const DASHBOARD_PATHS = ["/", "/monthly", "/calendar"] as const;

/**
 * The Add-transaction FAB only appears on the dashboard cluster.
 * All other pages are view-only. `pathname` is a clean path (no query),
 * as returned by Next's `usePathname()`. Matches a cluster path exactly or
 * as a path-segment prefix ("/monthly/x"), never a substring ("/monthlyx").
 */
export function shouldShowFab(pathname: string): boolean {
  return DASHBOARD_PATHS.some((p) =>
    p === "/" ? pathname === "/" : pathname === p || pathname.startsWith(p + "/"),
  );
}
