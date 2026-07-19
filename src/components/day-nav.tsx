"use client";

import { useRouter, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, parse, format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Prev/next day + a native date field to jump to any day. */
export function DayNav({ day }: { day: string }) {
  const router = useRouter();
  const pathname = usePathname();

  function goTo(target: string) {
    router.push(`${pathname}?d=${target}`);
  }
  function step(delta: number) {
    const d = parse(day, "yyyy-MM-dd", new Date());
    goTo(format(addDays(d, delta), "yyyy-MM-dd"));
  }

  return (
    <div className="flex items-center gap-1">
      <Button variant="outline" size="icon-sm" aria-label="Previous day" onClick={() => step(-1)}>
        <ChevronLeft className="size-4" />
      </Button>
      <Input
        type="date"
        aria-label="Pick a day"
        value={day}
        onChange={(e) => e.target.value && goTo(e.target.value)}
        className="h-8 w-[9.5rem] tabular"
      />
      <Button variant="outline" size="icon-sm" aria-label="Next day" onClick={() => step(1)}>
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
