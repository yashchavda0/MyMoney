# Transactions Page Redesign + Dashboard Swipe/Display Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Transactions page (grouped-by-date list, highlighted totals, collapsed filters), repurpose the dashboard's swipe gesture into two zones (date-step vs tab-switch), keep the balance card visible across Daily/Monthly/Calendar, fix the 3-dot menu clipping behind cards, and compact net-figure formatting.

**Architecture:** Two new small client-side primitives (`useSwipeHandlers` gesture hook, `nextDashboardHref` pure routing function) get composed into two swipe-wrapper components (`DateSwipe`, `ViewSwipe`) that each dashboard page wires around its own header/body. A new portal-based `ActionMenu` replaces the clipped `absolute` dropdown pattern everywhere a kebab/overflow menu is needed. The Transactions page is rebuilt to reuse components (`SummaryTiles`, `GroupedTransactions`) that Monthly already uses, plus a collapsed filter sheet built on the existing `Modal`.

**Tech Stack:** Next.js 16 (App Router, async `searchParams`), React 19, TypeScript, Tailwind, `date-fns`, `lucide-react`, Vitest (pure-logic unit tests only — no React Testing Library in this repo).

## Global Constraints

- Server components (`page.tsx` files) receive `searchParams: Promise<...>` and must `await` it — this is the existing, required pattern in this codebase (see current `monthly/page.tsx`, `calendar/page.tsx`, `(app)/page.tsx`); do not change it.
- No new npm dependencies. Reuse `date-fns`, `lucide-react`, and the existing UI primitives (`Modal`, `Card`, `Button`, `Input`, `Select`) in `src/components/ui/`.
- Automated tests are Vitest, pure-logic only, matching `vitest.config.ts`'s `include: ["src/**/*.test.ts"]` (note: `.ts`, not `.tsx` — no component tests run in this repo; the only existing example is `src/lib/nav.test.ts`). There is no React Testing Library installed, so gesture/dropdown/page-layout behavior is verified manually in the browser (`npm run dev`), not via automated component tests.
- Currency/locale formatting is centralized in `src/lib/format.ts` (`en-IN` locale, `Asia/Kolkata` timezone) — add to it, don't duplicate it.
- Commit after each task.

---

### Task 1: `formatINRCompact` — compact net-figure formatting

**Files:**
- Modify: `src/lib/format.ts`
- Test: `src/lib/format.test.ts` (new)

**Interfaces:**
- Produces: `formatINRCompact(amount: number): string` — e.g. `formatINRCompact(85000) === "₹85K"`, `formatINRCompact(-85000) === "-₹85K"`. Used by Tasks 6, 7, 9.

- [ ] **Step 1: Write the failing test**

Create `src/lib/format.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { formatINRCompact } from "@/lib/format";

describe("formatINRCompact", () => {
  it("shows plain rupees under 1,000", () => {
    expect(formatINRCompact(850)).toBe("₹850");
    expect(formatINRCompact(0)).toBe("₹0");
  });

  it("uses K for thousands", () => {
    expect(formatINRCompact(85000)).toBe("₹85K");
    expect(formatINRCompact(11600)).toBe("₹11.6K");
  });

  it("uses L for lakhs", () => {
    expect(formatINRCompact(120000)).toBe("₹1.2L");
  });

  it("uses Cr for crores", () => {
    expect(formatINRCompact(12000000)).toBe("₹1.2Cr");
  });

  it("keeps the native minus sign for negative amounts", () => {
    expect(formatINRCompact(-85000)).toBe("-₹85K");
    expect(formatINRCompact(-500)).toBe("-₹500");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/format.test.ts`
Expected: FAIL with `formatINRCompact is not a function` (or similar — the export doesn't exist yet).

- [ ] **Step 3: Implement `formatINRCompact`**

Add to `src/lib/format.ts`, after `formatINRShort`:

```ts
function trimTrailingZero(n: number): string {
  return n.toFixed(1).replace(/\.0$/, "");
}

/** Compact magnitude format for net figures: ₹850, ₹85K, ₹1.2L, ₹1.2Cr — always short, keeps the native sign. */
export function formatINRCompact(amount: number): string {
  const n = amount ?? 0;
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs < 1_000) return `${sign}₹${Math.round(abs)}`;
  if (abs < 100_000) return `${sign}₹${trimTrailingZero(abs / 1_000)}K`;
  if (abs < 10_000_000) return `${sign}₹${trimTrailingZero(abs / 100_000)}L`;
  return `${sign}₹${trimTrailingZero(abs / 10_000_000)}Cr`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/format.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/format.ts src/lib/format.test.ts
git commit -m "feat: add formatINRCompact for cramped net-figure displays"
```

---

### Task 2: `useSwipeHandlers` — shared horizontal-swipe gesture hook

**Files:**
- Create: `src/lib/use-swipe.ts`

**Interfaces:**
- Produces: `useSwipeHandlers(onSwipe: (delta: 1 | -1) => void): { onTouchStart, onTouchEnd }` (React `TouchEvent` handlers, spreadable onto any `div`). `delta = -1` on a rightward swipe (previous), `delta = 1` on a leftward swipe (next) — matches the existing `MonthSwipe` convention being replaced. Used by Tasks 4 (`DateSwipe`, `ViewSwipe`).

No automated test for this one (it's a DOM gesture hook; this repo has no React Testing Library — see Global Constraints). Verified manually once wired into a page in later tasks.

- [ ] **Step 1: Implement the hook**

Create `src/lib/use-swipe.ts`:

```ts
"use client";

import * as React from "react";

/**
 * Detects a decisive horizontal swipe and ignores everything else (vertical
 * scrolls, taps, diagonal drags) so it never hijacks normal scrolling.
 * Calls `onSwipe(-1)` for a rightward swipe, `onSwipe(1)` for a leftward one.
 */
export function useSwipeHandlers(onSwipe: (delta: 1 | -1) => void) {
  const start = React.useRef<{ x: number; y: number } | null>(null);

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    start.current = { x: t.clientX, y: t.clientY };
  }

  function onTouchEnd(e: React.TouchEvent) {
    const s = start.current;
    start.current = null;
    if (!s) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    // Require a decisive horizontal move so it never hijacks a vertical scroll.
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) onSwipe(dx > 0 ? -1 : 1);
  }

  return { onTouchStart, onTouchEnd };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/use-swipe.ts
git commit -m "feat: add shared horizontal-swipe gesture hook"
```

---

### Task 3: `nextDashboardHref` — pure routing logic for tab-switch swipe

**Files:**
- Create: `src/lib/dashboard-nav.ts`
- Test: `src/lib/dashboard-nav.test.ts`

**Interfaces:**
- Consumes: `DASHBOARD_PATHS` from `src/lib/nav.ts` (already exists: `readonly ["/", "/monthly", "/calendar"]`).
- Produces: `nextDashboardHref(pathname: string, delta: 1 | -1, ctx: { day?: string; month?: string }): string | null`. Used by Task 4 (`ViewSwipe`).

- [ ] **Step 1: Write the failing tests**

Create `src/lib/dashboard-nav.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { nextDashboardHref } from "@/lib/dashboard-nav";

describe("nextDashboardHref", () => {
  it("steps from Daily to Monthly, deriving month from day", () => {
    expect(nextDashboardHref("/", 1, { day: "2026-07-18" })).toBe("/monthly?m=2026-07");
  });

  it("steps from Monthly to Calendar, keeping month", () => {
    expect(nextDashboardHref("/monthly", 1, { month: "2026-07" })).toBe("/calendar?m=2026-07");
  });

  it("steps from Calendar back to Monthly, keeping month", () => {
    expect(nextDashboardHref("/calendar", -1, { month: "2026-07" })).toBe("/monthly?m=2026-07");
  });

  it("steps from Monthly back to Daily, deriving day from month", () => {
    expect(nextDashboardHref("/monthly", -1, { month: "2026-07" })).toBe("/?d=2026-07-01");
  });

  it("clamps at the right end — Calendar can't go further", () => {
    expect(nextDashboardHref("/calendar", 1, { month: "2026-07" })).toBeNull();
  });

  it("clamps at the left end — Daily can't go further back", () => {
    expect(nextDashboardHref("/", -1, { day: "2026-07-18" })).toBeNull();
  });

  it("returns null for routes outside the dashboard cluster", () => {
    expect(nextDashboardHref("/transactions", 1, {})).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/dashboard-nav.test.ts`
Expected: FAIL — module `@/lib/dashboard-nav` does not exist.

- [ ] **Step 3: Implement `nextDashboardHref`**

Create `src/lib/dashboard-nav.ts`:

```ts
import { DASHBOARD_PATHS } from "@/lib/nav";

/**
 * Where should swiping the dashboard's body zone take you next?
 * `delta` is -1 (swipe right → previous tab) or 1 (swipe left → next tab).
 * Returns null at either end of the Daily/Monthly/Calendar strip (no
 * wraparound) or if `pathname` isn't one of the three dashboard-cluster
 * routes. Pass whichever of `day`/`month` the current page already has —
 * the other is derived (day → its month; month → its first day).
 */
export function nextDashboardHref(
  pathname: string,
  delta: 1 | -1,
  ctx: { day?: string; month?: string },
): string | null {
  const paths: readonly string[] = DASHBOARD_PATHS;
  const index = paths.indexOf(pathname);
  if (index === -1) return null;

  const nextIndex = index + delta;
  if (nextIndex < 0 || nextIndex >= paths.length) return null;
  const target = paths[nextIndex];

  if (target === "/") {
    const day = ctx.day ?? (ctx.month ? `${ctx.month}-01` : undefined);
    return day ? `/?d=${day}` : "/";
  }
  const month = ctx.month ?? (ctx.day ? ctx.day.slice(0, 7) : undefined);
  return month ? `${target}?m=${month}` : target;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/dashboard-nav.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/dashboard-nav.ts src/lib/dashboard-nav.test.ts
git commit -m "feat: add pure routing logic for dashboard tab-switch swipe"
```

---

### Task 4: `DateSwipe` + `ViewSwipe` components; retire `MonthSwipe`

**Files:**
- Create: `src/components/date-swipe.tsx`
- Create: `src/components/view-swipe.tsx`
- Delete: `src/components/month-swipe.tsx`
- Modify: `src/app/(app)/monthly/page.tsx` (swap `MonthSwipe` import/usage for `DateSwipe`)
- Modify: `src/app/(app)/calendar/page.tsx` (swap `MonthSwipe` import/usage for `DateSwipe`)

**Interfaces:**
- Consumes: `useSwipeHandlers` (Task 2), `nextDashboardHref` (Task 3).
- Produces: `<DateSwipe unit="day" | "month" value={string}>` (steps the date on swipe) and `<ViewSwipe day?={string} month?={string}>` (switches tabs on swipe). Both used by Tasks 6, 7, 8.

This task keeps `MonthSwipe`'s current whole-page wrapping behavior on Monthly/Calendar (just renamed/generalized) so the app stays in a working, buildable state. The header/body zone split and Daily-page wiring happen in Tasks 6–8.

- [ ] **Step 1: Create `DateSwipe`**

Create `src/components/date-swipe.tsx`:

```tsx
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

  function step(delta: number) {
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
```

- [ ] **Step 2: Create `ViewSwipe`**

Create `src/components/view-swipe.tsx`:

```tsx
"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { nextDashboardHref } from "@/lib/dashboard-nav";
import { useSwipeHandlers } from "@/lib/use-swipe";

/**
 * Wraps a dashboard-cluster page's body (tiles + list/grid) so a horizontal
 * swipe switches between Daily, Monthly and Calendar. Pass whichever of
 * `day`/`month` the current page already has — the other is derived.
 */
export function ViewSwipe({
  day,
  month,
  children,
}: {
  day?: string;
  month?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function step(delta: 1 | -1) {
    const href = nextDashboardHref(pathname, delta, { day, month });
    if (href) router.push(href);
  }

  const handlers = useSwipeHandlers(step);

  return <div {...handlers}>{children}</div>;
}
```

- [ ] **Step 3: Delete `month-swipe.tsx` and update Monthly page**

Delete `src/components/month-swipe.tsx`.

In `src/app/(app)/monthly/page.tsx`, change the import and usage:

```ts
// before: import { MonthSwipe } from "@/components/month-swipe";
import { DateSwipe } from "@/components/date-swipe";
```

```tsx
// before: <MonthSwipe month={month}>...</MonthSwipe>
<DateSwipe unit="month" value={month}>
  <div className="mx-auto max-w-2xl space-y-3">
    <ViewTabs />
    <MonthPicker month={month} />

    <SummaryTiles data={totals(txns)} />

    {expenseCats.length > 0 && (
      <Card>
        <CardHeader className="py-3">
          <CardTitle>Spending by category</CardTitle>
        </CardHeader>
        <CardContent className="pt-1">
          <CategoryBars groups={expenseCats} metric="expense" />
        </CardContent>
      </Card>
    )}

    <GroupedTransactions transactions={txns} emptyLabel="No transactions this month." />
  </div>
</DateSwipe>
```

- [ ] **Step 4: Update Calendar page the same way**

In `src/app/(app)/calendar/page.tsx`:

```ts
// before: import { MonthSwipe } from "@/components/month-swipe";
import { DateSwipe } from "@/components/date-swipe";
```

```tsx
// before: <MonthSwipe month={month}>...</MonthSwipe>
<DateSwipe unit="month" value={month}>
  <div className="space-y-3">
    <ViewTabs />
    <MonthPicker month={month} />
    <SummaryTiles data={totals(txns)} />
    <CalendarGrid month={month} transactions={txns} />
  </div>
</DateSwipe>
```

- [ ] **Step 5: Verify the build**

Run: `npx tsc --noEmit`
Expected: no errors (no remaining references to `month-swipe`).

- [ ] **Step 6: Manual check**

Run `npm run dev`, open `/monthly` on a narrow (mobile-width) browser window, swipe left/right on the page — month should still change exactly as it did before this task (this task is a rename/generalization, not a behavior change yet).

- [ ] **Step 7: Commit**

```bash
git add src/components/date-swipe.tsx src/components/view-swipe.tsx src/app/\(app\)/monthly/page.tsx src/app/\(app\)/calendar/page.tsx
git rm src/components/month-swipe.tsx
git commit -m "refactor: generalize MonthSwipe into DateSwipe, add ViewSwipe"
```

---

### Task 5: Rebuild `DayNav` to match `MonthPicker`'s full-width layout

**Files:**
- Modify: `src/components/day-nav.tsx` (whole file)

**Interfaces:**
- Produces: `<DayNav day={string} />` — same public props as before, only internal layout changes. Used by Task 6.

- [ ] **Step 1: Rewrite `DayNav`**

Replace the full contents of `src/components/day-nav.tsx`:

```tsx
"use client";

import { useRouter, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, parse, format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Prev/next day + a native date field to jump to any day. Full-width, matching MonthPicker's layout. */
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
    <div className="flex w-full items-center gap-1">
      <Button variant="outline" size="icon-sm" aria-label="Previous day" onClick={() => step(-1)}>
        <ChevronLeft className="size-4" />
      </Button>
      <Input
        type="date"
        aria-label="Pick a day"
        value={day}
        onChange={(e) => e.target.value && goTo(e.target.value)}
        className="h-8 flex-1 text-center tabular"
      />
      <Button variant="outline" size="icon-sm" aria-label="Next day" onClick={() => step(1)}>
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/day-nav.tsx
git commit -m "fix: make DayNav full-width, matching MonthPicker's layout"
```

---

### Task 6: Rewire Daily page — zoned swipe, persistent balance card, no duplicate date

**Files:**
- Modify: `src/app/(app)/page.tsx` (whole file)

**Interfaces:**
- Consumes: `DateSwipe` (Task 4), `ViewSwipe` (Task 4), `DayNav` (Task 5).

- [ ] **Step 1: Rewrite `DashboardPage`**

Replace the full contents of `src/app/(app)/page.tsx`:

```tsx
import { getTransactions } from "@/lib/queries";
import { todayISO, formatINR, currentMonthISO, monthBounds, formatMonthLong } from "@/lib/format";
import { totals } from "@/lib/aggregate";
import { BalanceCard } from "@/components/balance-card";
import { ViewTabs } from "@/components/view-tabs";
import { DayNav } from "@/components/day-nav";
import { DateSwipe } from "@/components/date-swipe";
import { ViewSwipe } from "@/components/view-swipe";
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
    <div className="mx-auto max-w-2xl space-y-3">
      <DateSwipe unit="day" value={day}>
        <BalanceCard data={totals(monthTxns)} label={formatMonthLong(month)} />
        <div className="mt-3 space-y-3">
          <ViewTabs />
          <DayNav day={day} />
        </div>
      </DateSwipe>

      <ViewSwipe day={day}>
        <div className="space-y-3">
          <SummaryTiles data={t} />

          <Card className="overflow-hidden">
            <div className="flex items-center justify-end gap-2.5 border-b border-border bg-muted/30 px-3 py-2 text-xs">
              {t.income > 0 && <span className="tabular text-income">+{formatINR(t.income)}</span>}
              {t.expense > 0 && <span className="tabular text-expense">−{formatINR(t.expense)}</span>}
            </div>
            <TransactionList
              transactions={dayTxns}
              showDate={false}
              emptyLabel="Nothing on this day. Tap + to add."
            />
          </Card>
        </div>
      </ViewSwipe>
    </div>
  );
}
```

Note what changed from before: the redundant `formatDateLong(day)` line in the card header is gone (the picker already shows the date, per user feedback); the subtotal row is now right-aligned since it's the only thing left in that header; the page is split into a `DateSwipe` header zone (day-step) and a `ViewSwipe` body zone (tab-switch).

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual check**

Run `npm run dev`, open `/` on a narrow browser window:
- Confirm the date appears exactly once (in the `DayNav` field), not also as a text line above the transaction list.
- Swipe left/right over the `BalanceCard`/tabs/picker area → the day changes (URL `?d=` updates, list updates).
- Swipe left/right over the tiles/transaction-list area → navigates to `/monthly` or does nothing (already at the left end), never both.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/page.tsx
git commit -m "feat: zone Daily view's swipe, drop duplicate date, keep balance card in sync"
```

---

### Task 7: Rewire Monthly page — persistent balance card + zoned swipe

**Files:**
- Modify: `src/app/(app)/monthly/page.tsx` (whole file)

**Interfaces:**
- Consumes: `DateSwipe`, `ViewSwipe` (Task 4), `BalanceCard` (existing).

- [ ] **Step 1: Rewrite `MonthlyPage`**

Replace the full contents of `src/app/(app)/monthly/page.tsx`:

```tsx
import { getTransactions } from "@/lib/queries";
import { monthBounds, currentMonthISO, formatMonthLong } from "@/lib/format";
import { totals, byCategory } from "@/lib/aggregate";
import { ViewTabs } from "@/components/view-tabs";
import { MonthPicker } from "@/components/month-picker";
import { DateSwipe } from "@/components/date-swipe";
import { ViewSwipe } from "@/components/view-swipe";
import { BalanceCard } from "@/components/balance-card";
import { SummaryTiles } from "@/components/summary-tiles";
import { CategoryBars } from "@/components/category-bars";
import { GroupedTransactions } from "@/components/grouped-transactions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default async function MonthlyPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const { m } = await searchParams;
  const month = m ?? currentMonthISO();
  const { start, end } = monthBounds(month);
  const txns = await getTransactions({ start, end });
  const expenseCats = byCategory(txns.filter((t) => t.type === "expense"));

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <DateSwipe unit="month" value={month}>
        <BalanceCard data={totals(txns)} label={formatMonthLong(month)} />
        <div className="mt-3 space-y-3">
          <ViewTabs />
          <MonthPicker month={month} />
        </div>
      </DateSwipe>

      <ViewSwipe month={month}>
        <div className="space-y-3">
          <SummaryTiles data={totals(txns)} />

          {expenseCats.length > 0 && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle>Spending by category</CardTitle>
              </CardHeader>
              <CardContent className="pt-1">
                <CategoryBars groups={expenseCats} metric="expense" />
              </CardContent>
            </Card>
          )}

          <GroupedTransactions transactions={txns} emptyLabel="No transactions this month." />
        </div>
      </ViewSwipe>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual check**

Run `npm run dev`, open `/monthly`:
- The green/red balance card is now visible here too (previously only on Daily).
- Swipe over the balance-card/picker area → month changes.
- Swipe over the tiles/category-bars/list area → switches to `/calendar` (or `/` going the other way).

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/monthly/page.tsx
git commit -m "feat: keep balance card visible on Monthly, zone its swipe"
```

---

### Task 8: Rewire Calendar page — persistent balance card + zoned swipe

**Files:**
- Modify: `src/app/(app)/calendar/page.tsx` (whole file)

**Interfaces:**
- Consumes: `DateSwipe`, `ViewSwipe` (Task 4), `BalanceCard` (existing).

- [ ] **Step 1: Rewrite `CalendarPage`**

Replace the full contents of `src/app/(app)/calendar/page.tsx`:

```tsx
import { getTransactions } from "@/lib/queries";
import { monthBounds, currentMonthISO, formatMonthLong } from "@/lib/format";
import { totals } from "@/lib/aggregate";
import { ViewTabs } from "@/components/view-tabs";
import { MonthPicker } from "@/components/month-picker";
import { DateSwipe } from "@/components/date-swipe";
import { ViewSwipe } from "@/components/view-swipe";
import { BalanceCard } from "@/components/balance-card";
import { SummaryTiles } from "@/components/summary-tiles";
import { CalendarGrid } from "@/components/calendar-grid";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const { m } = await searchParams;
  const month = m ?? currentMonthISO();
  const { start, end } = monthBounds(month);
  const txns = await getTransactions({ start, end });

  return (
    <div className="space-y-3">
      <DateSwipe unit="month" value={month}>
        <BalanceCard data={totals(txns)} label={formatMonthLong(month)} />
        <div className="mt-3 space-y-3">
          <ViewTabs />
          <MonthPicker month={month} />
        </div>
      </DateSwipe>

      <ViewSwipe month={month}>
        <div className="space-y-3">
          <SummaryTiles data={totals(txns)} />
          <CalendarGrid month={month} transactions={txns} />
        </div>
      </ViewSwipe>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual check**

Run `npm run dev`, open `/calendar`:
- Balance card visible here too.
- Swipe over balance-card/picker area → month changes, grid updates.
- Swipe over the tiles/grid area → switches to `/monthly` (or does nothing — Calendar is the rightmost tab, so a leftward swipe there should be a no-op).

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/calendar/page.tsx
git commit -m "feat: keep balance card visible on Calendar, zone its swipe"
```

---

### Task 9: Apply `formatINRCompact` to every net-figure display

**Files:**
- Modify: `src/components/balance-card.tsx:1-4,18-25`
- Modify: `src/components/summary-tiles.tsx` (whole file)
- Modify: `src/components/calendar-grid.tsx:15,105-112`

**Interfaces:**
- Consumes: `formatINRCompact` (Task 1).

- [ ] **Step 1: Update `BalanceCard`'s net headline**

In `src/components/balance-card.tsx`, change the import:

```ts
// before: import { formatINR } from "@/lib/format";
import { formatINR, formatINRCompact } from "@/lib/format";
```

And change the net headline (currently `{formatINR(data.net)}`):

```tsx
<div
  className={cn(
    "tabular truncate text-2xl font-semibold sm:text-3xl",
    data.net >= 0 ? "text-income" : "text-expense",
  )}
>
  {formatINRCompact(data.net)}
</div>
```

(The income/expense line below stays on `formatINR` — unaffected.)

- [ ] **Step 2: Update `SummaryTiles`' Net tile to always use compact formatting**

Replace the full contents of `src/components/summary-tiles.tsx`:

```tsx
import { ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react";
import { formatINR, formatINRShort, formatINRCompact } from "@/lib/format";
import type { Totals } from "@/lib/aggregate";
import { cn } from "@/lib/utils";

export function SummaryTiles({ data, className }: { data: Totals; className?: string }) {
  return (
    <div className={cn("grid grid-cols-3 gap-2 sm:gap-3", className)}>
      <Tile label="Income" value={data.income} icon={<ArrowDownLeft className="size-4" />} tone="income" />
      <Tile label="Expense" value={data.expense} icon={<ArrowUpRight className="size-4" />} tone="expense" />
      <Tile
        label="Net"
        value={data.net}
        icon={<Wallet className="size-4" />}
        tone={data.net >= 0 ? "income" : "expense"}
        compact
      />
    </div>
  );
}

function Tile({
  label,
  value,
  icon,
  tone,
  compact,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "income" | "expense";
  compact?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-card p-2.5 sm:p-3">
      <div className="mb-1 flex items-center justify-between gap-1">
        <span className="truncate text-[11px] font-medium text-muted-foreground sm:text-xs">{label}</span>
        <span className={cn("shrink-0", tone === "income" ? "text-income" : "text-expense")}>{icon}</span>
      </div>
      <div
        className={cn(
          "tabular truncate text-sm font-semibold sm:text-lg",
          tone === "income" ? "text-income" : "text-expense",
        )}
        title={formatINR(value)}
      >
        {compact ? (
          formatINRCompact(value)
        ) : (
          <>
            <span className="sm:hidden">{formatINRShort(value)}</span>
            <span className="hidden sm:inline">{formatINR(value)}</span>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update `CalendarGrid`'s per-day net**

In `src/components/calendar-grid.tsx`, change the import:

```ts
// before: import { todayISO, formatINRShort, formatDateLong } from "@/lib/format";
import { todayISO, formatINRCompact, formatDateLong } from "@/lib/format";
```

And change the day-cell net display (currently `{formatINRShort(agg.net)}`):

```tsx
<span
  className={cn(
    "tabular block text-[11px] font-semibold leading-tight",
    agg.net >= 0 ? "text-income" : "text-expense",
  )}
>
  {formatINRCompact(agg.net)}
</span>
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual check**

Run `npm run dev`, open `/calendar` for a month with a day that has a 5-6 digit net (or temporarily add a large test transaction) — confirm the figure now reads like `₹1.2L` instead of a cramped `₹1,00,000`-style string, still colored red/green, with the `-` sign kept for negative days.

- [ ] **Step 6: Commit**

```bash
git add src/components/balance-card.tsx src/components/summary-tiles.tsx src/components/calendar-grid.tsx
git commit -m "feat: use compact formatting for net figures across dashboard views"
```

---

### Task 10: `ActionMenu` — portal-based dropdown that can't be clipped

**Files:**
- Create: `src/components/ui/action-menu.tsx`

**Interfaces:**
- Produces:
  ```ts
  interface ActionMenuItem {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    onClick: () => void;
    danger?: boolean;
    active?: boolean;
    disabled?: boolean;
  }
  function ActionMenu(props: {
    items: ActionMenuItem[];
    trigger: React.ReactNode;
    label: string;
    align?: "end" | "start";
    triggerClassName?: string;
  }): JSX.Element
  ```
  Used by Tasks 11, 12.

No automated test (portal positioning is a DOM/browser concern; no React Testing Library in this repo — see Global Constraints). Verified manually once wired into Tasks 11/12.

- [ ] **Step 1: Implement `ActionMenu`**

Create `src/components/ui/action-menu.tsx`:

```tsx
"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export interface ActionMenuItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  danger?: boolean;
  active?: boolean;
  disabled?: boolean;
}

const DEFAULT_TRIGGER_CLASS =
  "grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";

const MENU_WIDTH = 160;

/**
 * Icon trigger + dropdown menu. The menu portals to `document.body` and
 * positions itself with `fixed` coordinates from the trigger's bounding
 * rect, so it is never clipped by an ancestor's `overflow-hidden` or
 * stacking context — unlike an `absolute`-positioned dropdown.
 */
export function ActionMenu({
  items,
  trigger,
  label,
  align = "end",
  triggerClassName = DEFAULT_TRIGGER_CLASS,
}: {
  items: ActionMenuItem[];
  trigger: React.ReactNode;
  label: string;
  align?: "end" | "start";
  triggerClassName?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null);
  const btnRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  function openMenu() {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    setPos({
      top: r.bottom + 4,
      left: align === "end" ? r.right - MENU_WIDTH : r.left,
    });
    setOpen(true);
  }

  React.useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || btnRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onDismiss() {
      setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("scroll", onDismiss, true);
    window.addEventListener("resize", onDismiss);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("scroll", onDismiss, true);
      window.removeEventListener("resize", onDismiss);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openMenu())}
        className={triggerClassName}
      >
        {trigger}
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ position: "fixed", top: pos.top, left: pos.left, width: MENU_WIDTH }}
            className="z-50 overflow-hidden rounded-lg border border-border bg-popover py-1 shadow-xl"
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50",
                  item.danger && "text-destructive",
                )}
              >
                <item.icon className={cn("size-4", item.active && "fill-primary text-primary")} />
                {item.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/action-menu.tsx
git commit -m "feat: add portal-based ActionMenu that can't be clipped by overflow-hidden"
```

---

### Task 11: Fix the 3-dot menu clipping in `TransactionItem`

**Files:**
- Modify: `src/components/transaction-list.tsx:1-16,86-114`

**Interfaces:**
- Consumes: `ActionMenu` (Task 10).

- [ ] **Step 1: Wire `ActionMenu` into `TransactionItem`**

In `src/components/transaction-list.tsx`, update the imports (drop `MoreVertical`'s old dropdown usage's now-unneeded pieces, add `ActionMenu`):

```ts
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Star, Copy, Pencil, Trash2, MoreVertical } from "lucide-react";
import type { TransactionWithRefs } from "@/lib/supabase/types";
import { useTransactionUI } from "@/components/transaction-ui-provider";
import { deleteTransaction, toggleBookmark } from "@/app/actions/transactions";
import { formatINR, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ActionMenu } from "@/components/ui/action-menu";
```

Remove the `menuOpen` state (no longer needed):

```ts
// delete this line:
// const [menuOpen, setMenuOpen] = React.useState(false);
```

Replace the mobile dropdown block (the `{/* Mobile: single kebab → dropdown ... */}` `<div className="relative shrink-0 md:hidden">...</div>` block) with:

```tsx
      {/* Mobile: single kebab → dropdown, portaled so it can't be clipped by a card's overflow-hidden */}
      <div className="shrink-0 md:hidden">
        <ActionMenu label="Actions" trigger={<MoreVertical className="size-4" />} items={actions} />
      </div>
```

The existing `actions` array (label/icon/onClick/active/danger) already matches `ActionMenuItem`'s shape, so no other changes are needed in this file. `IconBtn` and the desktop hover-icon row stay exactly as they are.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual check**

Run `npm run dev`, open `/transactions` (or `/monthly`, which already uses `GroupedTransactions`) on a narrow browser window near the bottom of a long list. Tap a row's 3-dot button — the menu must appear fully visible above the mobile bottom nav bar, not clipped by the card or hidden behind anything.

- [ ] **Step 4: Commit**

```bash
git add src/components/transaction-list.tsx
git commit -m "fix: portal the per-transaction action menu so it can't be clipped"
```

---

### Task 12: Move Copy/Import into an `ActionMenu` overflow button

**Files:**
- Modify: `src/components/bulk-tools.tsx:1-64`

**Interfaces:**
- Consumes: `ActionMenu` (Task 10).

- [ ] **Step 1: Replace the two labeled buttons with an overflow menu**

In `src/components/bulk-tools.tsx`, update the imports:

```ts
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Upload, Download, Loader2, Check, MoreVertical } from "lucide-react";
import type { Account, Category, TransactionWithRefs } from "@/lib/supabase/types";
import { parseImport, type ParsedRow } from "@/lib/parse-import";
import { bulkCreateTransactions } from "@/app/actions/transactions";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { ActionMenu } from "@/components/ui/action-menu";
import { formatDate } from "@/lib/format";
```

Replace the `BulkTools` function's `return` block (currently the two `<Button>` elements plus `<ImportModal />`):

```tsx
  return (
    <>
      <ActionMenu
        label="Bulk actions"
        trigger={<MoreVertical className="size-4" />}
        triggerClassName="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-transparent text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
        items={[
          {
            label: copied ? "Copied" : "Copy",
            icon: copied ? Check : Download,
            onClick: onExport,
            disabled: transactions.length === 0,
          },
          {
            label: "Import",
            icon: Upload,
            onClick: () => setImportOpen(true),
          },
        ]}
      />
      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        accounts={accounts}
        categories={categories}
      />
    </>
  );
```

`ImportModal` and everything below it in the file is unchanged.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual check**

Run `npm run dev`, open `/transactions`. Confirm the header now shows a single "⋯" button (instead of separate "Copy"/"Import" buttons), and both actions still work from its dropdown.

- [ ] **Step 4: Commit**

```bash
git add src/components/bulk-tools.tsx
git commit -m "refactor: collapse Copy/Import into a single overflow menu"
```

---

### Task 13: Transactions page — highlighted totals + date-grouped list

**Files:**
- Modify: `src/app/(app)/transactions/page.tsx` (whole file)

**Interfaces:**
- Consumes: `SummaryTiles` (existing, updated in Task 9), `GroupedTransactions` (existing).

- [ ] **Step 1: Rewrite the Transactions page**

Replace the full contents of `src/app/(app)/transactions/page.tsx`:

```tsx
import { getTransactions, getAccounts, getCategories } from "@/lib/queries";
import type { TxnType } from "@/lib/supabase/types";
import { totals } from "@/lib/aggregate";
import { PageHeader } from "@/components/page-header";
import { TransactionsFilterBar } from "@/components/transactions-filter-bar";
import { GroupedTransactions } from "@/components/grouped-transactions";
import { SummaryTiles } from "@/components/summary-tiles";
import { BulkTools } from "@/components/bulk-tools";

interface SP {
  q?: string;
  type?: string;
  account?: string;
  category?: string;
  start?: string;
  end?: string;
  bookmarked?: string;
}

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const [accounts, categories, txns] = await Promise.all([
    getAccounts(),
    getCategories(),
    getTransactions({
      search: sp.q,
      type: sp.type === "income" || sp.type === "expense" ? (sp.type as TxnType) : undefined,
      accountId: sp.account,
      categoryId: sp.category,
      start: sp.start,
      end: sp.end,
      bookmarked: sp.bookmarked === "1",
      limit: 500,
    }),
  ]);

  const t = totals(txns);

  return (
    <div className="space-y-3">
      <PageHeader
        title="Transactions"
        subtitle={`${t.count} shown`}
        actions={<BulkTools accounts={accounts} categories={categories} transactions={txns} />}
      />

      <TransactionsFilterBar accounts={accounts} categories={categories} />

      <SummaryTiles data={t} />

      <GroupedTransactions transactions={txns} emptyLabel="No transactions match these filters." />
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. (Task 14, next, still needs to update `TransactionsFilterBar`'s internals — this task only changes the page around it.)

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/transactions/page.tsx
git commit -m "feat: highlight totals and group Transactions page by date"
```

---

### Task 14: Collapse the Transactions filter bar into search + Filters sheet

**Files:**
- Modify: `src/components/transactions-filter-bar.tsx` (whole file)

**Interfaces:**
- Consumes: `Modal` (existing `src/components/ui/modal.tsx`).

- [ ] **Step 1: Rewrite `TransactionsFilterBar`**

Replace the full contents of `src/components/transactions-filter-bar.tsx`:

```tsx
"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import type { Account, Category } from "@/lib/supabase/types";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

const ADVANCED_KEYS = ["type", "account", "category", "start", "end", "bookmarked"];

export function TransactionsFilterBar({
  accounts,
  categories,
}: {
  accounts: Account[];
  categories: Category[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [search, setSearch] = React.useState(params.get("q") ?? "");
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  const set = React.useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      router.push(`${pathname}?${next.toString()}`);
    },
    [params, pathname, router],
  );

  // Debounced search.
  React.useEffect(() => {
    const id = setTimeout(() => {
      if ((params.get("q") ?? "") !== search) set("q", search);
    }, 350);
    return () => clearTimeout(id);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeCount = ADVANCED_KEYS.filter((k) => params.get(k)).length;

  function clearAdvanced() {
    const next = new URLSearchParams(params.toString());
    ADVANCED_KEYS.forEach((k) => next.delete(k));
    router.push(`${pathname}?${next.toString()}`);
    setFiltersOpen(false);
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search note or description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        <Button
          variant={activeCount > 0 ? "default" : "outline"}
          size="icon"
          aria-label="Filters"
          className="relative shrink-0"
          onClick={() => setFiltersOpen(true)}
        >
          <SlidersHorizontal className="size-4" />
          {activeCount > 0 && (
            <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
              {activeCount}
            </span>
          )}
        </Button>
      </div>

      <Modal open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filters">
        <div className="space-y-3">
          <Select value={params.get("type") ?? ""} onChange={(e) => set("type", e.target.value)}>
            <option value="">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </Select>

          <Select value={params.get("account") ?? ""} onChange={(e) => set("account", e.target.value)}>
            <option value="">All accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>

          <Select value={params.get("category") ?? ""} onChange={(e) => set("category", e.target.value)}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>

          <div className="flex items-center gap-2">
            <Input
              type="date"
              aria-label="From date"
              value={params.get("start") ?? ""}
              onChange={(e) => set("start", e.target.value)}
            />
            <Input
              type="date"
              aria-label="To date"
              value={params.get("end") ?? ""}
              onChange={(e) => set("end", e.target.value)}
            />
          </div>

          <Button
            variant={params.get("bookmarked") ? "default" : "outline"}
            className="w-full"
            onClick={() => set("bookmarked", params.get("bookmarked") ? "" : "1")}
          >
            ★ Bookmarked only
          </Button>

          {activeCount > 0 && (
            <Button variant="ghost" className="w-full" onClick={clearAdvanced}>
              <X className="size-4" /> Clear filters
            </Button>
          )}
        </div>
      </Modal>
    </>
  );
}
```

Behavior notes: the search box stays inline and independent of the sheet (matches the "directly list transactions" request — search is a one-tap primary action). Everything else (type, account, category, date range, bookmarked) lives behind the "Filters" icon button, which shows a small count badge when any are active. "Clear filters" clears only the advanced keys, not the search text.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual check**

Run `npm run dev`, open `/transactions`:
- Default view shows only the search input + a small Filters icon button — no long always-visible row of selects/dates.
- Tapping Filters opens a sheet with all the advanced controls; changing one updates the URL and the list, same as before.
- Setting a filter shows a count badge on the Filters button; "Clear filters" resets it.

- [ ] **Step 4: Commit**

```bash
git add src/components/transactions-filter-bar.tsx
git commit -m "feat: collapse transaction filters behind a Filters sheet"
```

---

## Self-Review Notes

- **Spec coverage:** all six issues from the design doc map to tasks — transactions redesign (13, 14, 12), zoned swipe (4, 6, 7, 8), persistent balance card (6, 7, 8), daily picker duplicate date + full-width (5, 6), 3-dot clipping (10, 11), compact net figures with native sign kept (1, 9).
- **Type consistency checked:** `ActionMenuItem` (Task 10) shape matches the `actions` array already built in `TransactionItem` (Task 11) and the items array built in `BulkTools` (Task 12) — same `{ label, icon, onClick, danger?, active? }` fields, `disabled` added and used only where needed. `nextDashboardHref`'s `{ day?, month?}` ctx shape (Task 3) matches `ViewSwipe`'s props (Task 4) matches how Tasks 6/7/8 call `<ViewSwipe day={day}>` / `<ViewSwipe month={month}>`.
- **No placeholders:** every step has complete, exact code or an exact command with expected output.
