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

  return (
    <div className="relative flex items-center gap-1">
      <Button variant="outline" size="icon-sm" aria-label="Previous month" onClick={() => step(-1)}>
        <ChevronLeft className="size-4" />
      </Button>

      <button
        onClick={() => setOpen((o) => !o)}
        className="min-w-[8.5rem] rounded-md border border-border px-2 py-1 text-center text-sm font-medium transition-colors hover:bg-accent"
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
