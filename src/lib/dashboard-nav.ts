import { DASHBOARD_PATHS } from "@/lib/nav";

/**
 * Where should swiping the dashboard's body zone take you next?
 * `delta` is -1 (swipe right -> previous tab) or 1 (swipe left -> next tab).
 * Returns null at either end of the Daily/Monthly/Calendar strip (no
 * wraparound) or if `pathname` isn't one of the three dashboard-cluster
 * routes. Pass whichever of `day`/`month` the current page already has -
 * the other is derived (day -> its month; month -> its first day).
 */
export function nextDashboardHref(
  pathname: string,
  delta: 1 | -1,
  ctx: { day?: string; month?: string },
): string | null {
  const paths: readonly string[] = DASHBOARD_PATHS;
  const index = paths.indexOf(pathname);
  if (index === -1) return null;

  const nextIndex = index + delta;
  if (nextIndex < 0 || nextIndex >= paths.length) return null;
  const target = paths[nextIndex];

  if (target === "/") {
    const day = ctx.day ?? (ctx.month ? `${ctx.month}-01` : undefined);
    return day ? `/?d=${day}` : "/";
  }

  const month = ctx.month ?? (ctx.day ? ctx.day.slice(0, 7) : undefined);
  return month ? `${target}?m=${month}` : target;
}
