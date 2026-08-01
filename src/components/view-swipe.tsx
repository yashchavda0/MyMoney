"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { nextDashboardHref } from "@/lib/dashboard-nav";
import { useSwipeHandlers } from "@/lib/use-swipe";

/**
 * Wraps a dashboard-cluster page's body (tiles + list/grid) so a horizontal
 * swipe switches between Daily, Monthly and Calendar. Pass whichever of
 * `day`/`month` the current page already has - the other is derived.
 */
export function ViewSwipe({
  day,
  month,
  children,
}: {
  day?: string;
  month?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function step(delta: 1 | -1) {
    const href = nextDashboardHref(pathname, delta, { day, month });
    if (href) router.push(href);
  }

  const handlers = useSwipeHandlers(step);

  return <div {...handlers}>{children}</div>;
}
