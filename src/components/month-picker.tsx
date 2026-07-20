"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, parse, format } from "date-fns";
import { Button } from "@/components/ui/button";
import { formatMonthLong } from "@/lib/format";
import { cn } from "@/lib/utils";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Prev/next month plus a popover to jump to any month/year directly. */
export function MonthPicker({ month }: { month: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  const [y, m] = month.split("-").map(Number);
  const [viewYear, setViewYear] = React.useState(y);

  React.useEffect(() => {
    if (open) setViewYear(y);
  }, [open, y]);

  function goTo(target: string) {
    router.push(`${pathname}?m=${target}`);
  }
  function step(delta: number) {
    const d = parse(`${month}-01`, "yyyy-MM-dd", new Date());
    goTo(format(addMonths(d, delta), "yyyy-MM"));
  }
  function pick(monthIndex: number) {
    goTo(`${viewYear}-${String(monthIndex + 1).padStart(2, "0")}`);
    setOpen(false);
  }

  // Swipe left/right to step months. Ignored while the popover is open, and
  // only fires when the gesture is clearly horizontal (not a vertical scroll).
  const touchStart = React.useRef<{ x: number; y: number } | null>(null);
  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  }
  function onTouchEnd(e: React.TouchEvent) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || open) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx > 0 ? -1 : 1);
  }

  return (
    <div
      className="relative flex w-full items-center gap-1 sm:w-auto"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <Button variant="outline" size="icon-sm" aria-label="Previous month" onClick={() => step(-1)}>
        <ChevronLeft className="size-4" />
      </Button>

      <button
        onClick={() => setOpen((o) => !o)}
        className="flex-1 rounded-md border border-border px-2 py-1 text-center text-sm font-medium transition-colors hover:bg-accent sm:min-w-[8.5rem] sm:flex-none"
      >
        {formatMonthLong(month)}
      </button>

      <Button variant="outline" size="icon-sm" aria-label="Next month" onClick={() => step(1)}>
        <ChevronRight className="size-4" />
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-50 w-64 rounded-xl border border-border bg-popover p-3 shadow-xl">
            <div className="mb-2 flex items-center justify-between">
              <Button variant="ghost" size="icon-sm" aria-label="Previous year" onClick={() => setViewYear((v) => v - 1)}>
                <ChevronLeft className="size-4" />
              </Button>
              <span className="text-sm font-semibold">{viewYear}</span>
              <Button variant="ghost" size="icon-sm" aria-label="Next year" onClick={() => setViewYear((v) => v + 1)}>
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {MONTHS.map((name, i) => {
                const selected = viewYear === y && i + 1 === m;
                return (
                  <button
                    key={name}
                    onClick={() => pick(i)}
                    className={cn(
                      "rounded-md py-2 text-sm font-medium transition-colors",
                      selected ? "bg-primary text-primary-foreground" : "hover:bg-accent",
                    )}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
