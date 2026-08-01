"use client";

import * as React from "react";

/**
 * Detects a decisive horizontal swipe and ignores everything else (vertical
 * scrolls, taps, diagonal drags) so it never hijacks normal scrolling.
 * Calls `onSwipe(-1)` for a rightward swipe, `onSwipe(1)` for a leftward one.
 */
export function useSwipeHandlers(onSwipe: (delta: 1 | -1) => void) {
  const start = React.useRef<{ x: number; y: number } | null>(null);

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
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5)
      onSwipe(dx > 0 ? -1 : 1);
  }

  return { onTouchStart, onTouchEnd };
}
