import { LayoutDashboard, ListOrdered, BarChart3, Repeat, Settings, Inbox, MoreHorizontal, Wallet } from "lucide-react";

const NAV = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Transactions", icon: ListOrdered },
  { label: "Review", icon: Inbox },
  { label: "Statistics", icon: BarChart3 },
  { label: "Recurring", icon: Repeat },
  { label: "Settings", icon: Settings },
];

const BOTTOM_NAV = NAV.filter((n) => ["Dashboard", "Transactions", "Statistics"].includes(n.label));

/**
 * Mirrors AppShell's chrome dimensions exactly (same aside/header/nav markup)
 * so the swap to real data causes no layout shift. Shown as the Suspense
 * fallback while auth + account/category/bookmark data resolve.
 */
export function AppShellSkeleton({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-border bg-card px-3 py-4 md:flex">
        <div className="mb-6 flex items-center gap-2 px-2">
          <div className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Wallet className="size-4.5" />
          </div>
          <span className="font-semibold">Money</span>
        </div>

        <nav className="flex-1 space-y-0.5">
          {NAV.map(({ label, icon: Icon }) => (
            <div key={label} className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground/50">
              <Icon className="size-4" />
              {label}
            </div>
          ))}
        </nav>

        <div className="mt-2 space-y-1 border-t border-border pt-2">
          <div className="h-8 animate-pulse rounded-md bg-muted/40" />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/80 px-3 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] backdrop-blur md:hidden">
          <div className="flex items-center gap-1.5">
            <Wallet className="size-5 text-primary" />
            <span className="font-semibold">Money</span>
          </div>
        </header>

        <main className="flex-1 overflow-x-clip px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-4 md:px-6 md:pb-6">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-border bg-card/95 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
        {BOTTOM_NAV.map(({ label, icon: Icon }) => (
          <div key={label} className="flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium text-muted-foreground/50">
            <Icon className="size-5" />
            {label}
          </div>
        ))}
        <div className="flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium text-muted-foreground/50">
          <MoreHorizontal className="size-5" />
          More
        </div>
      </nav>
    </div>
  );
}
