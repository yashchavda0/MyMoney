# Mobile Nav, Dashboard & iOS Install Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse mobile navigation to a 4-slot bottom bar with a More sheet, make the Dashboard the single daily/monthly/calendar overview host, gate transaction-adding to the dashboard, and make the app installable to the home screen (incl. iOS).

**Architecture:** Pure-frontend change. A single `AppShell` client component owns the desktop sidebar, mobile bottom bar, More bottom-sheet, and the Add FAB. The Dashboard route `/` absorbs the daily view (with a month BalanceCard on top) and keeps `/monthly` + `/calendar`; `/daily` becomes a redirect. A new `InstallPrompt` module handles PWA install (native prompt on Chromium, instructions on iOS) plus a first-visit banner. FAB visibility is decided by a pure, unit-tested helper.

**Tech Stack:** Next.js 16.2.10 (App Router), React 19.2, TypeScript, Tailwind v4, lucide-react, vitest (node env).

## Global Constraints

- **Next.js version:** 16.2.10 — before writing route/metadata code, read the relevant guide under `node_modules/next/dist/docs/` (this version has breaking changes vs. training data). Key ones already confirmed: `apple-icon.tsx` code-generation is valid (`01-app/03-api-reference/03-file-conventions/01-metadata/app-icons.md`); `redirect()` from `next/navigation` for the `/daily` redirect.
- **Tests:** vitest runs `src/**/*.test.ts` in the **node** environment (see `vitest.config.ts`). Only pure-logic `.ts` tests are in scope — do NOT add `.tsx`/DOM tests. UI + PWA-detection tasks are gated by `npm run build` + `npm run lint` + manual verification, not unit tests.
- **Currency/brand:** app is "Money", icon is a purple `#6366f1` rounded tile with a white `₹` (match `src/app/icon.tsx`).
- **Client components:** any file using hooks/`window`/`navigator` must start with `"use client";`. Guard all `window`/`navigator`/`localStorage` access inside `useEffect` (SSR-safe).
- **Commit style:** Conventional Commits. End every commit message body with the trailer:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

---

## File Structure

New:
- `src/app/apple-icon.tsx` — 180×180 apple-touch-icon (₹ tile) so iOS home-screen uses the app icon, not a screenshot.
- `src/lib/nav.ts` — pure nav helpers: dashboard-cluster paths + `shouldShowFab(pathname)`.
- `src/lib/nav.test.ts` — unit tests for `shouldShowFab`.
- `src/components/install-prompt.tsx` — `useInstall()` hook, `<InstallMenuItem>`, `<InstallBanner>` (native prompt / iOS instructions).

Modified:
- `src/app/(app)/page.tsx` — becomes the daily overview host (BalanceCard + ViewTabs + DayNav + SummaryTiles + day list).
- `src/app/(app)/daily/page.tsx` — replaced by a `redirect("/")`.
- `src/components/view-tabs.tsx` — "Daily" now links to `/`; active when `pathname === "/"`.
- `src/components/app-shell.tsx` — 4-slot bottom bar, More sheet, remove hamburger/drawer + sidebar Add button, FAB gating (all screen sizes, dashboard cluster only), mount InstallBanner + InstallMenuItem.

Unchanged: `/monthly`, `/calendar`, `/transactions`, `/statistics`, `/review`, `/recurring`, `/settings`, all queries, actions, data components, `manifest.ts`, `layout.tsx` (`appleWebApp.capable` already set).

---

### Task 1: apple-icon for iOS home screen

**Files:**
- Create: `src/app/apple-icon.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: a build-time `/apple-icon` route emitting `<link rel="apple-touch-icon" ...>` (Next handles the tag automatically).

- [ ] **Step 1: Create the apple-icon route**

`src/app/apple-icon.tsx`:

```tsx
import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS home-screen icon: purple rounded tile with a white ₹ (matches icon.tsx).
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#6366f1",
          color: "#ffffff",
          fontSize: 120,
          fontWeight: 700,
        }}
      >
        ₹
      </div>
    ),
    size,
  );
}
```

Note: no `borderRadius` — iOS masks the icon corners itself; a baked-in radius would show black corners.

- [ ] **Step 2: Verify it builds and serves**

Run: `npm run build`
Expected: build succeeds; output lists `/apple-icon` as a generated route (a static/prerendered entry). No type errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/apple-icon.tsx
git commit -m "feat: add apple-touch-icon for iOS home screen"
```

---

### Task 2: FAB-visibility helper (pure, TDD)

**Files:**
- Create: `src/lib/nav.ts`
- Test: `src/lib/nav.test.ts`

**Interfaces:**
- Produces:
  - `export const DASHBOARD_PATHS: readonly string[]` — `["/", "/monthly", "/calendar"]`.
  - `export function shouldShowFab(pathname: string): boolean` — true only on the dashboard cluster.

- [ ] **Step 1: Write the failing test**

`src/lib/nav.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { shouldShowFab } from "@/lib/nav";

describe("shouldShowFab", () => {
  it("shows on the dashboard root", () => {
    expect(shouldShowFab("/")).toBe(true);
  });

  it("shows on monthly and calendar", () => {
    expect(shouldShowFab("/monthly")).toBe(true);
    expect(shouldShowFab("/calendar")).toBe(true);
  });

  it("hides on view-only pages", () => {
    expect(shouldShowFab("/transactions")).toBe(false);
    expect(shouldShowFab("/statistics")).toBe(false);
    expect(shouldShowFab("/review")).toBe(false);
    expect(shouldShowFab("/recurring")).toBe(false);
    expect(shouldShowFab("/settings")).toBe(false);
  });
});
```

Note: `usePathname()` returns a path WITHOUT the query string, so the helper matches on clean pathnames (that's why prefix matching on `/monthly` / `/calendar` is safe).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/nav.test.ts`
Expected: FAIL — cannot resolve `@/lib/nav` / `shouldShowFab` is not defined.

- [ ] **Step 3: Implement the helper**

`src/lib/nav.ts`:

```ts
/** Routes that make up the "Dashboard" overview cluster. */
export const DASHBOARD_PATHS = ["/", "/monthly", "/calendar"] as const;

/**
 * The Add-transaction FAB only appears on the dashboard cluster.
 * All other pages are view-only. `pathname` is a clean path (no query),
 * as returned by Next's `usePathname()`.
 */
export function shouldShowFab(pathname: string): boolean {
  if (pathname === "/") return true;
  return pathname.startsWith("/monthly") || pathname.startsWith("/calendar");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/nav.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/nav.ts src/lib/nav.test.ts
git commit -m "feat: add shouldShowFab dashboard-cluster nav helper"
```

---

### Task 3: Install-prompt module (native prompt + iOS instructions + banner)

**Files:**
- Create: `src/components/install-prompt.tsx`

**Interfaces:**
- Consumes: `Modal` from `@/components/ui/modal`; lucide icons `Share`, `Plus`, `Download`, `X`.
- Produces:
  - `export function InstallMenuItem(props: { className?: string })` — a full-width button styled like a nav row, label "Add to Home Screen". Renders `null` when already installed. Click → native prompt (Chromium) or opens the iOS instruction modal.
  - `export function InstallBanner()` — dismissible first-visit banner; renders `null` unless iOS Safari + not installed + not previously dismissed.

- [ ] **Step 1: Create the module**

`src/components/install-prompt.tsx`:

```tsx
"use client";

import * as React from "react";
import { Share, Plus, Download, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "money.iosInstallDismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function detectStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const mm = window.matchMedia?.("(display-mode: standalone)").matches ?? false;
  // iOS Safari exposes navigator.standalone instead of display-mode.
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return mm || iosStandalone;
}

function detectIOS(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua);
}

/** Shared install state: native-prompt availability + platform + installed flag. */
export function useInstall() {
  const [installed, setInstalled] = React.useState(false);
  const [isIOS, setIsIOS] = React.useState(false);
  const deferred = React.useRef<BeforeInstallPromptEvent | null>(null);
  const [canPrompt, setCanPrompt] = React.useState(false);

  React.useEffect(() => {
    setInstalled(detectStandalone());
    setIsIOS(detectIOS());

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferred.current = e as BeforeInstallPromptEvent;
      setCanPrompt(true);
    };
    const onInstalled = () => {
      setInstalled(true);
      setCanPrompt(false);
      deferred.current = null;
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = React.useCallback(async () => {
    const evt = deferred.current;
    if (!evt) return false;
    await evt.prompt();
    await evt.userChoice;
    deferred.current = null;
    setCanPrompt(false);
    return true;
  }, []);

  return { installed, isIOS, canPrompt, promptInstall };
}

function IOSInstructions() {
  return (
    <ol className="space-y-3 text-sm">
      <li className="flex items-center gap-2">
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">1</span>
        Tap the <Share className="mx-1 inline size-4 align-text-bottom" /> Share button in the browser toolbar.
      </li>
      <li className="flex items-center gap-2">
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">2</span>
        Choose <span className="font-medium">Add to Home Screen</span>.
      </li>
      <li className="flex items-center gap-2">
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">3</span>
        Tap <span className="font-medium">Add</span> — Money appears on your home screen.
      </li>
    </ol>
  );
}

/** Menu row for the More sheet / sidebar footer. Hidden once installed. */
export function InstallMenuItem({ className }: { className?: string }) {
  const { installed, isIOS, canPrompt, promptInstall } = useInstall();
  const [showHelp, setShowHelp] = React.useState(false);

  if (installed) return null;
  // If not installable natively and not iOS, there is nothing useful to offer.
  if (!canPrompt && !isIOS) return null;

  const onClick = () => {
    if (canPrompt) void promptInstall();
    else setShowHelp(true);
  };

  return (
    <>
      <button
        onClick={onClick}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
          className,
        )}
      >
        <Download className="size-4" />
        Add to Home Screen
      </button>
      <Modal open={showHelp} onClose={() => setShowHelp(false)} title="Add Money to your Home Screen">
        <IOSInstructions />
      </Modal>
    </>
  );
}

/** First-visit dismissible banner for iOS Safari users who haven't installed. */
export function InstallBanner() {
  const { installed, isIOS, canPrompt } = useInstall();
  const [dismissed, setDismissed] = React.useState(true); // default hidden until we confirm
  const [showHelp, setShowHelp] = React.useState(false);

  React.useEffect(() => {
    setDismissed(window.localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  // Native-installable platforms use the menu item; the banner is iOS-only.
  if (installed || dismissed || !isIOS || canPrompt) return null;

  const close = () => {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <>
      <div className="mx-4 mt-3 flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-sm shadow-sm md:hidden">
        <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
          <Plus className="size-4" />
        </div>
        <button className="min-w-0 flex-1 text-left" onClick={() => setShowHelp(true)}>
          <span className="block font-medium">Install Money</span>
          <span className="block truncate text-xs text-muted-foreground">Add to your Home Screen for quick access.</span>
        </button>
        <button onClick={close} aria-label="Dismiss" className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-accent">
          <X className="size-4" />
        </button>
      </div>
      <Modal open={showHelp} onClose={() => setShowHelp(false)} title="Add Money to your Home Screen">
        <IOSInstructions />
      </Modal>
    </>
  );
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors. (`tsc` script isn't defined; invoke the binary directly.)

- [ ] **Step 3: Commit**

```bash
git add src/components/install-prompt.tsx
git commit -m "feat: add PWA install prompt (native + iOS instructions + banner)"
```

---

### Task 4: Dashboard becomes the daily overview host

**Files:**
- Modify: `src/app/(app)/page.tsx` (full rewrite)
- Modify: `src/app/(app)/daily/page.tsx` (full rewrite → redirect)
- Modify: `src/components/view-tabs.tsx:8-12,27` (Daily href + active check)

**Interfaces:**
- Consumes: `getTransactions`, `todayISO`, `formatDateLong`, `formatINR`, `currentMonthISO`, `monthBounds`, `formatMonthLong` from `@/lib/format` + `@/lib/queries`; `totals` from `@/lib/aggregate`; `BalanceCard`, `ViewTabs`, `DayNav`, `SummaryTiles`, `TransactionList`, `Card`.
- Produces: `/` renders the daily view with a month BalanceCard on top; `ViewTabs` "Daily" points to `/`.

- [ ] **Step 1: Rewrite the dashboard page**

`src/app/(app)/page.tsx` (replace entire file):

```tsx
import { getTransactions } from "@/lib/queries";
import {
  todayISO,
  formatDateLong,
  formatINR,
  currentMonthISO,
  monthBounds,
  formatMonthLong,
} from "@/lib/format";
import { totals } from "@/lib/aggregate";
import { BalanceCard } from "@/components/balance-card";
import { ViewTabs } from "@/components/view-tabs";
import { DayNav } from "@/components/day-nav";
import { SummaryTiles } from "@/components/summary-tiles";
import { TransactionList } from "@/components/transaction-list";
import { Card } from "@/components/ui/card";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}) {
  const { d } = await searchParams;
  const day = d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : todayISO();

  const month = currentMonthISO();
  const { start: mStart, end: mEnd } = monthBounds(month);

  const [dayTxns, monthTxns] = await Promise.all([
    getTransactions({ start: day, end: day }),
    getTransactions({ start: mStart, end: mEnd }),
  ]);
  const t = totals(dayTxns);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <BalanceCard data={totals(monthTxns)} label={formatMonthLong(month)} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ViewTabs />
        <DayNav day={day} />
      </div>

      <SummaryTiles data={t} />

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/30 px-3 py-2">
          <span className="truncate text-sm font-medium">{formatDateLong(day)}</span>
          <span className="flex shrink-0 gap-2.5 text-xs">
            {t.income > 0 && <span className="tabular text-income">+{formatINR(t.income)}</span>}
            {t.expense > 0 && <span className="tabular text-expense">−{formatINR(t.expense)}</span>}
          </span>
        </div>
        <TransactionList transactions={dayTxns} showDate={false} emptyLabel="Nothing on this day. Tap + to add." />
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Replace the `/daily` route with a redirect**

`src/app/(app)/daily/page.tsx` (replace entire file):

```tsx
import { redirect } from "next/navigation";

// The daily view now lives at the dashboard root. Preserve old links.
export default function DailyRedirect() {
  redirect("/");
}
```

- [ ] **Step 3: Point ViewTabs "Daily" at `/`**

In `src/components/view-tabs.tsx`, change the TABS `href` for Daily from `/daily` to `/` (lines 8-12):

```tsx
const TABS = [
  { href: "/", label: "Daily", icon: CalendarDays },
  { href: "/monthly", label: "Monthly", icon: CalendarRange },
  { href: "/calendar", label: "Calendar", icon: Calendar },
] as const;
```

The existing active check is `const active = pathname === href;` (line 27) — this already works for `/` (exact match). Leave it unchanged. The `suffix` (`?m=`) logic is unchanged; on `/` there is no `m` param so `suffix` is `""`.

- [ ] **Step 4: Build + manual verify**

Run: `npm run build`
Expected: builds clean; `/daily` still appears as a route (now a redirect).

Manual (`npm run dev`):
- `/` shows the month BalanceCard, then the Daily/Monthly/Calendar switch, then today's day card.
- Clicking "Monthly"/"Calendar" navigates to `/monthly` / `/calendar`; "Daily" returns to `/`.
- Visiting `/daily` redirects to `/`.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/page.tsx" "src/app/(app)/daily/page.tsx" src/components/view-tabs.tsx
git commit -m "feat: make dashboard the daily overview host, redirect /daily"
```

---

### Task 5: AppShell rework — bottom bar, More sheet, FAB gating, install wiring

**Files:**
- Modify: `src/components/app-shell.tsx` (full rewrite)

**Interfaces:**
- Consumes: `shouldShowFab` from `@/lib/nav`; `InstallMenuItem`, `InstallBanner` from `@/components/install-prompt`; existing `useTransactionUI`, `signOut`, `AccentToggle`, `ThemeToggle`, `Button`, lucide icons.
- Produces: the new shell (no interface consumed by others).

- [ ] **Step 1: Rewrite AppShell**

`src/components/app-shell.tsx` (replace entire file):

```tsx
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
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/80 px-3 py-2.5 backdrop-blur md:hidden">
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

        <main className="flex-1 overflow-x-clip px-4 pb-24 pt-4 md:px-6 md:pb-6">{children}</main>
      </div>

      {/* Mobile bottom nav: 3 routes + More */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-border bg-card/95 py-1.5 backdrop-blur md:hidden">
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
          className="fixed bottom-20 right-4 z-40 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 md:bottom-6"
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
```

Key changes vs. the old file: removed `Menu`, `CalendarDays` imports and the hamburger button + left drawer; removed both "Add transaction" buttons; added `MoreHorizontal` More tab + bottom sheet; FAB now gated by `shouldShowFab` and visible on all sizes (`md:bottom-6`, no `md:hidden`); `InstallBanner` mounted after the top bar; `InstallMenuItem` in both the sidebar footer and the More sheet.

- [ ] **Step 2: Typecheck + lint + build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: no type/lint errors; build succeeds.

- [ ] **Step 3: Manual verification (`npm run dev`)**

Mobile viewport (DevTools device toolbar):
- Bottom bar shows exactly 4 slots: Dashboard, Transactions, Statistics, More. No hamburger in the top bar.
- "More" opens a bottom sheet with Review (badge if pending), Recurring, Settings, Bookmarks, Add to Home Screen (if applicable), email + sign out, theme/accent toggles. Backdrop tap and item tap close it.
- FAB `+` visible on `/`, `/monthly`, `/calendar`; absent on `/transactions`, `/statistics`, `/review`, `/recurring`, `/settings`.
- Tapping `+` opens the Add-transaction modal.

Desktop viewport:
- Sidebar has NO "Add transaction" button; nav lists Dashboard, Transactions, Review, Statistics, Recurring, Settings; footer shows Add to Home Screen (if installable) + email + toggles + sign out.
- FAB `+` visible on the dashboard cluster only.

- [ ] **Step 4: Commit**

```bash
git add src/components/app-shell.tsx
git commit -m "feat: 4-slot mobile bottom bar with More sheet, gated FAB, install entry"
```

---

## Verification (whole feature)

After all tasks:

- [ ] `npm run test` — existing suite + `nav.test.ts` green.
- [ ] `npm run lint` — clean.
- [ ] `npm run build` — clean; routes include `/`, `/daily` (redirect), `/apple-icon`.
- [ ] Manual pass of the mobile + desktop checklists in Tasks 4 & 5.
- [ ] PWA: in Chrome DevTools → Application → Manifest, "Add to Home Screen" item triggers the install prompt; installed window opens standalone. On a real iOS device (or note as untestable locally), the banner appears once for Safari, the instructions modal is correct, and the installed icon is the ₹ tile.

## Notes / risks

- iOS install cannot be triggered programmatically — instructions-only is the correct and only approach; verify copy matches current Safari UI ("Add to Home Screen").
- `beforeinstallprompt` fires only over HTTPS/localhost and only when Chromium deems the app installable (valid manifest + served icons). The `/apple-icon` + existing `manifest.ts` satisfy this.
- FAB bottom offset: mobile `bottom-20` clears the bottom bar; desktop `md:bottom-6` sits at the corner (no bottom bar there).
```
