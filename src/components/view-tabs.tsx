"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { CalendarDays, CalendarRange, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Daily", icon: CalendarDays },
  { href: "/monthly", label: "Monthly", icon: CalendarRange },
  { href: "/calendar", label: "Calendar", icon: Calendar },
] as const;

/** Segmented switch between the three time views, preserving the selected month. */
export function ViewTabs() {
  const pathname = usePathname();
  const params = useSearchParams();
  const m = params.get("m");
  const suffix = m ? `?m=${m}` : "";

  return (
    <div className="grid w-full grid-cols-3 gap-1 rounded-lg border border-border bg-muted/40 p-1 sm:inline-flex sm:w-auto">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={`${href}${suffix}`}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors sm:px-4",
              active
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
