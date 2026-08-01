"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { addDays, addMonths, parse, format } from "date-fns";
import { useSwipeHandlers } from "@/lib/use-swipe";

type Unit = "day" | "month";

/**
 * Wraps a date-scoped header (balance card, tabs, picker) so a horizontal
 * swipe steps the date: a day at a time for `unit="day"`, a month at a time
 * for `unit="month"`. `value` is the current day (`yyyy-MM-dd`) or month
 * (`yyyy-MM`), matching `unit`.
 */
export function DateSwipe({
  unit,
  value,
  children,
}: {
  unit: Unit;
  value: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function step(delta: 1 | -1) {
    if (unit === "day") {
      const d = parse(value, "yyyy-MM-dd", new Date());
      router.push(`${pathname}?d=${format(addDays(d, delta), "yyyy-MM-dd")}`);
    } else {
      const d = parse(`${value}-01`, "yyyy-MM-dd", new Date());
      router.push(`${pathname}?m=${format(addMonths(d, delta), "yyyy-MM")}`);
    }
  }

  const handlers = useSwipeHandlers(step);

  return <div {...handlers}>{children}</div>;
}
