"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { addMonths, parse, format } from "date-fns";

/**
 * Wraps a month-scoped view so a horizontal swipe anywhere inside it steps the
 * month (left = next, right = previous), preserving the current pathname. Only
 * fires on a clearly horizontal gesture so vertical scrolling is unaffected.
 */
export function MonthSwipe({ month, children }: { month: string; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const start = React.useRef<{ x: number; y: number } | null>(null);

  function step(delta: number) {
    const d = parse(`${month}-01`, "yyyy-MM-dd", new Date());
    router.push(`${pathname}?m=${format(addMonths(d, delta), "yyyy-MM")}`);
  }

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    start.current = { x: t.clientX, y: t.clientY };
  }
  function onTouchEnd(e: React.TouchEvent) {
    const s = start.current;
    start.current = null;
    if (!s) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    // Require a decisive horizontal move so it never hijacks a vertical scroll.
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx > 0 ? -1 : 1);
  }

  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {children}
    </div>
  );
}
