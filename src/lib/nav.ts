/** Routes that make up the "Dashboard" overview cluster. */
export const DASHBOARD_PATHS = ["/", "/monthly", "/calendar"] as const;

/**
 * The Add-transaction FAB only appears on the dashboard cluster.
 * All other pages are view-only. `pathname` is a clean path (no query),
 * as returned by Next's `usePathname()`.
 */
export function shouldShowFab(pathname: string): boolean {
  if (pathname === "/") return true;
  return pathname.startsWith("/monthly") || pathname.startsWith("/calendar");
}
