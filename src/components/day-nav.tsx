"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, parse, format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDateLong } from "@/lib/format";

/** Prev/next day + a native date field to jump to any day. */
export function DayNav({ day }: { day: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  function goTo(target: string) {
    router.push(`${pathname}?d=${target}`);
  }
  function step(delta: number) {
    const d = parse(day, "yyyy-MM-dd", new Date());
    goTo(format(addDays(d, delta), "yyyy-MM-dd"));
  }

  return (
    <div className="relative grid w-full grid-cols-[2rem_1fr_2rem] items-center gap-1">
      <Button variant="outline" size="icon-sm" className="h-8 w-8" aria-label="Previous day" onClick={() => step(-1)}>
        <ChevronLeft className="size-4" />
      </Button>

      <button
        type="button"
        aria-label="Pick a day"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="h-8 w-full rounded-md border border-border px-2 text-center text-sm font-medium tabular transition-colors hover:bg-accent"
      >
        {formatDateLong(day)}
      </button>

      <Button variant="outline" size="icon-sm" className="h-8 w-8" aria-label="Next day" onClick={() => step(1)}>
        <ChevronRight className="size-4" />
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-10 z-50 rounded-xl border border-border bg-popover p-3 shadow-xl">
            <div className="space-y-2">
              <Input
                type="date"
                aria-label="Choose day"
                value={day}
                onChange={(e) => {
                  if (!e.target.value) return;
                  goTo(e.target.value);
                  setOpen(false);
                }}
                className="h-8 w-full tabular"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
