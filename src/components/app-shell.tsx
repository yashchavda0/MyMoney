"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  ListOrdered,
  BarChart3,
  Repeat,
  Settings,
  Plus,
  Star,
  Wallet,
  LogOut,
  Menu,
  X,
  Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { AccentToggle } from "@/components/accent-toggle";
import { useTransactionUI } from "@/components/transaction-ui-provider";
import { signOut } from "@/app/actions/auth";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  match?: readonly string[]; // extra paths that also mark this item active
};

const NAV: readonly NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/daily", label: "Overview", icon: CalendarDays, match: ["/daily", "/monthly", "/calendar"] },
  { href: "/transactions", label: "Transactions", icon: ListOrdered },
  { href: "/review", label: "Review", icon: Inbox },
  { href: "/statistics", label: "Statistics", icon: BarChart3 },
  { href: "/recurring", label: "Recurring", icon: Repeat },
  { href: "/settings", label: "Settings", icon: Settings },
];

// Primary tabs shown in the mobile bottom bar.
const MOBILE_NAV = NAV.filter((n) =>
  ["/", "/daily", "/transactions", "/statistics"].includes(n.href),
);

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
  const [menuOpen, setMenuOpen] = React.useState(false);

  // Close the mobile drawer whenever the route changes.
  React.useEffect(() => setMenuOpen(false), [pathname]);

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

        <Button className="mb-4" onClick={() => ui.add()}>
          <Plus className="size-4" /> Add transaction
        </Button>

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
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/80 px-3 py-2.5 backdrop-blur md:hidden">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setMenuOpen(true)}
              aria-label="Menu"
              className="relative grid size-9 place-items-center rounded-md text-foreground hover:bg-accent"
            >
              <Menu className="size-5" />
              {pendingCount > 0 && (
                <span className="absolute right-1 top-1 size-2 rounded-full bg-primary" />
              )}
            </button>
            <Wallet className="size-5 text-primary" />
            <span className="font-semibold">Money</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" aria-label="Bookmarks" onClick={ui.bookmarks}>
              <Star className="size-4" />
            </Button>
            <AccentToggle />
            <ThemeToggle />
          </div>
        </header>

        {/* Desktop utility bar */}
        <div className="hidden items-center justify-end gap-2 border-b border-border px-6 py-2 md:flex">
          <Button variant="outline" size="sm" onClick={ui.bookmarks}>
            <Star className="size-4" /> Bookmarks
          </Button>
        </div>

        <main className="flex-1 overflow-x-clip px-4 pb-24 pt-4 md:px-6 md:pb-6">{children}</main>
      </div>

      {/* Mobile bottom nav + FAB */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-border bg-card/95 py-1.5 backdrop-blur md:hidden">
        {MOBILE_NAV.map((item) => {
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
      </nav>
      <button
        onClick={() => ui.add()}
        aria-label="Add transaction"
        className="fixed bottom-16 right-4 z-40 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 md:hidden"
      >
        <Plus className="size-6" />
      </button>

      {/* Mobile nav drawer — full menu incl. Recurring & Settings */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <div className="absolute left-0 top-0 flex h-full w-72 max-w-[82%] flex-col border-r border-border bg-card p-3">
            <div className="mb-4 flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <div className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
                  <Wallet className="size-4.5" />
                </div>
                <span className="font-semibold">Money</span>
              </div>
              <button
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <Button className="mb-4" onClick={() => { setMenuOpen(false); ui.add(); }}>
              <Plus className="size-4" /> Add transaction
            </Button>

            <nav className="flex-1 space-y-0.5 overflow-y-auto">
              {NAV.map((item) => {
                const { href, label, icon: Icon } = item;
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMenuOpen(false)}
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
