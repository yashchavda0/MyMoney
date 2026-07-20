"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ListOrdered,
  BarChart3,
  Repeat,
  Settings,
  Plus,
  Star,
  Wallet,
  LogOut,
  X,
  Inbox,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { AccentToggle } from "@/components/accent-toggle";
import { useTransactionUI } from "@/components/transaction-ui-provider";
import { shouldShowFab } from "@/lib/nav";
import { InstallMenuItem, InstallBanner } from "@/components/install-prompt";
import { signOut } from "@/app/actions/auth";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  match?: readonly string[];
};

// Full nav (desktop sidebar). The daily/monthly/calendar overview all live
// under "Dashboard" now, reached via the in-page ViewTabs switch.
const NAV: readonly NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, match: ["/", "/monthly", "/calendar"] },
  { href: "/transactions", label: "Transactions", icon: ListOrdered },
  { href: "/review", label: "Review", icon: Inbox },
  { href: "/statistics", label: "Statistics", icon: BarChart3 },
  { href: "/recurring", label: "Recurring", icon: Repeat },
  { href: "/settings", label: "Settings", icon: Settings },
];

// Mobile bottom bar: three routes + a More button (rendered separately).
const BOTTOM_NAV = NAV.filter((n) => ["/", "/transactions", "/statistics"].includes(n.href));
// Everything else lives in the More sheet.
const MORE_NAV = NAV.filter((n) => ["/review", "/recurring", "/settings"].includes(n.href));

function isActive(pathname: string, item: NavItem) {
  const paths = item.match ?? [item.href];
  return paths.some((p) => (p === "/" ? pathname === "/" : pathname.startsWith(p)));
}

export function AppShell({
  email,
  pendingCount = 0,
  children,
}: {
  email: string;
  pendingCount?: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const ui = useTransactionUI();
  const [moreOpen, setMoreOpen] = React.useState(false);

  React.useEffect(() => setMoreOpen(false), [pathname]);

  const showFab = shouldShowFab(pathname);

  return (
    <div className="flex min-h-dvh">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-border bg-card px-3 py-4 md:flex">
        <div className="mb-6 flex items-center gap-2 px-2">
          <div className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Wallet className="size-4.5" />
          </div>
          <span className="font-semibold">Money</span>
        </div>

        <nav className="flex-1 space-y-0.5">
          {NAV.map((item) => {
            const { href, label, icon: Icon } = item;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                  isActive(pathname, item)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {label}
                {href === "/review" && pendingCount > 0 && (
                  <span className="ml-auto grid min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                    {pendingCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-2 space-y-1 border-t border-border pt-2">
          <InstallMenuItem />
          <div className="flex items-center justify-between px-1">
            <span className="truncate text-xs text-muted-foreground" title={email}>
              {email}
            </span>
            <div className="flex items-center">
              <AccentToggle />
              <ThemeToggle />
              <form action={signOut}>
                <Button variant="ghost" size="icon" aria-label="Sign out" type="submit">
                  <LogOut className="size-4" />
                </Button>
              </form>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar — brand only (no hamburger) */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/80 px-3 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] backdrop-blur md:hidden">
          <div className="flex items-center gap-1.5">
            <Wallet className="size-5 text-primary" />
            <span className="font-semibold">Money</span>
          </div>
          <Button variant="ghost" size="icon" aria-label="Bookmarks" onClick={ui.bookmarks}>
            <Star className="size-4" />
          </Button>
        </header>

        {/* First-visit iOS install banner (mobile only, self-hides otherwise) */}
        <InstallBanner />

        {/* Desktop utility bar */}
        <div className="hidden items-center justify-end gap-2 border-b border-border px-6 py-2 md:flex">
          <Button variant="outline" size="sm" onClick={ui.bookmarks}>
            <Star className="size-4" /> Bookmarks
          </Button>
        </div>

        <main className="flex-1 overflow-x-clip px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-4 md:px-6 md:pb-6">{children}</main>
      </div>

      {/* Mobile bottom nav: 3 routes + More */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-border bg-card/95 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
        {BOTTOM_NAV.map((item) => {
          const { href, label, icon: Icon } = item;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium",
                isActive(pathname, item) ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          );
        })}
        <button
          onClick={() => setMoreOpen(true)}
          aria-label="More"
          className={cn(
            "relative flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium",
            moreOpen ? "text-primary" : "text-muted-foreground",
          )}
        >
          <MoreHorizontal className="size-5" />
          More
          {pendingCount > 0 && <span className="absolute right-2 top-0 size-2 rounded-full bg-primary" />}
        </button>
      </nav>

      {/* Add FAB — dashboard cluster only, all screen sizes */}
      {showFab && (
        <button
          onClick={() => ui.add()}
          aria-label="Add transaction"
          className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-40 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 md:bottom-6"
        >
          <Plus className="size-6" />
        </button>
      )}

      {/* More bottom sheet */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMoreOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-2xl border-t border-border bg-card p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="mb-3 flex items-center justify-between px-1">
              <span className="text-sm font-semibold">More</span>
              <button
                onClick={() => setMoreOpen(false)}
                aria-label="Close"
                className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <nav className="space-y-0.5 overflow-y-auto">
              {MORE_NAV.map((item) => {
                const { href, label, icon: Icon } = item;
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-2.5 py-2.5 text-sm font-medium transition-colors",
                      isActive(pathname, item)
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4" />
                    {label}
                    {href === "/review" && pendingCount > 0 && (
                      <span className="ml-auto grid min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                        {pendingCount}
                      </span>
                    )}
                  </Link>
                );
              })}

              <button
                onClick={() => { setMoreOpen(false); ui.bookmarks(); }}
                className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Star className="size-4" />
                Bookmarks
              </button>

              <InstallMenuItem />
            </nav>

            <div className="mt-2 border-t border-border pt-2">
              <div className="flex items-center justify-between px-1">
                <span className="truncate text-xs text-muted-foreground" title={email}>
                  {email}
                </span>
                <div className="flex items-center">
                  <AccentToggle />
                  <ThemeToggle />
                  <form action={signOut}>
                    <Button variant="ghost" size="icon" aria-label="Sign out" type="submit">
                      <LogOut className="size-4" />
                    </Button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
