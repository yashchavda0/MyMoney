# Transactions page redesign + dashboard swipe/display fixes

Date: 2026-07-20

## Problem

Six related issues across the Transactions page and the Daily/Monthly/Calendar dashboard cluster:

1. Transactions page is a flat list with an always-visible filter bar (search, type, account, category, 2 date fields, bookmark toggle, clear) plus Copy/Import buttons in the header — too much chrome, and income/expense/net isn't shown with any visual weight.
2. Swipe on Monthly/Calendar currently only changes the month. User wants swipe to also switch between the Daily/Monthly/Calendar tabs.
3. Daily view shows the same date twice (DayNav's date field + a redundant date line above the transaction list), and `DayNav` is a fixed-width control leaving dead space on its right, unlike the full-width `MonthPicker`.
4. The per-transaction 3-dot mobile action menu renders behind other content — its parent `Card` has `overflow-hidden`, which clips the `absolute`-positioned dropdown.
5. The balance card (green/red income-vs-expense proportion bar) only renders on Daily. Swiping to Monthly/Calendar makes it disappear instead of staying present.
6. Negative net figures at full precision (e.g. `-₹1,00,000.00`) are visually heavy/cramped, most obviously in Calendar day cells but also in the Net tile and balance card.

## Approach

### A. Zoned swipe + persistent balance card

Each dashboard-cluster page (`/`, `/monthly`, `/calendar`) is split into two independent swipe zones instead of one:

- **Header zone** — `BalanceCard` + `ViewTabs` + the day/month picker. A swipe here steps the date: day-by-day on Daily, month-by-month on Monthly/Calendar. Arrow buttons on the picker keep working exactly as today.
- **Body zone** — `SummaryTiles` + the list/grid content. A swipe here switches tabs: Daily ↔ Monthly ↔ Calendar, in that left-to-right order, clamped at both ends (no wraparound).

Generalize the existing `MonthSwipe` component into a direction-agnostic `SwipeZone`:

```ts
function SwipeZone({ onSwipe, children }: { onSwipe: (delta: 1 | -1) => void; children: React.ReactNode })
```

Same touch-start/touch-end threshold logic as today (`|dx| > 50 && |dx| > |dy| * 1.5`), just decoupled from "month" semantics. Each page supplies its own `onSwipe` for the header zone (day-step on Daily, month-step on Monthly/Calendar — identical to today's `MonthSwipe` behavior, just renamed/relocated).

New `ViewSwipe` component wraps the body zone and handles tab-switching:

- Reads current pathname to find its index in `["/", "/monthly", "/calendar"]`.
- On swipe, clamps to the next/previous index and pushes that route.
- Query param translation on switch:
  - Daily → Monthly/Calendar: `m = d.slice(0, 7)` (derive month from the currently-viewed day; falls back to current month if `d` is absent).
  - Monthly/Calendar → Daily: `d = ${m}-01`.
  - Monthly ↔ Calendar: `m` passes through unchanged.

`BalanceCard` (currently only on `DashboardPage`) is added to `MonthlyPage` and `CalendarPage` too, using each page's already-fetched month totals (`totals(txns)`) and `formatMonthLong(month)` as the label — identical data these pages already compute, no new fetch.

### B. Transactions page redesign

- `PageHeader`'s subtitle (plain text line) is replaced with a `SummaryTiles`-style highlighted row (colored Income/Expense/Net tiles), matching the visual weight used on Daily/Monthly.
- `TransactionsFilterBar` collapses to a single always-visible search input (full width) plus a "Filters" icon button. The button opens the existing `Modal` component containing the rest of the current controls (type, account, category, start/end date, bookmarked toggle, clear) — same state/URL-param logic as today, just hidden behind one tap instead of always rendered.
- `BulkTools`'s Copy and Import buttons move into a small "⋯" overflow `ActionMenu` (see below) next to the Filters button, instead of two labeled buttons sitting in the page header.
- The flat `TransactionList` on this page is replaced with `GroupedTransactions` (already used on Monthly) — transactions grouped by date, each date getting its own subtotal header, consistent with the Monthly view.

### C. Shared component/format fixes

**`ActionMenu` (new component, `src/components/ui/action-menu.tsx`)**

A small trigger + dropdown that portals its menu to `document.body` via `createPortal` (same pattern `Modal` already uses) and positions itself with `fixed` coordinates computed from the trigger button's `getBoundingClientRect()` on open. Because it portals out of any ancestor, it's immune to clipping from `overflow-hidden` parents or stacking-context issues, wherever it's used. Closes on outside click, scroll, or `Escape`.

Used for:
- The mobile 3-dot action menu in `TransactionItem` (`transaction-list.tsx`) — replaces the current `absolute`-positioned dropdown, fixing issue #4.
- The new Copy/Import overflow menu on the Transactions page.

**Net figure display: compact formatting, native sign kept**

New `formatINRCompact(amount)` in `lib/format.ts`: `₹<1000` unchanged, `₹85K` style for thousands, `₹1.2L` style for lakhs+ — always short enough to avoid wrapping/cramping, negative values keep Intl's native `-` (e.g. `-₹85K`). Confirmed with user: a `-` sign is fine once the number itself is compact; the problem was full-precision figures (`-₹1,00,000.00`), not the sign itself.

Applied to every net-figure display: `CalendarGrid`'s per-day net, `BalanceCard`'s net headline, and `SummaryTiles`' Net tile (replacing its current mobile-only `formatINRShort`/desktop `formatINR` split with `formatINRCompact` at all sizes). Red/green color coding by sign is unchanged. Income/Expense tiles and per-transaction rows are unaffected — those keep full `formatINR` and their explicit `+`/`−` prefix, not part of this fix. `formatINRShort` stays as-is for its other current callers (chart axes etc.).

**Daily picker cleanup**

- Remove the redundant `formatDateLong(day)` line from the transaction-card header on `DashboardPage` — the picker already shows the selected date. Keep the income/expense subtotal line.
- Rebuild `DayNav` to match `MonthPicker`'s layout: prev-arrow / flex-1 centered button showing the formatted day / next-arrow, instead of a fixed-width native date input with blank space to its right. The native date field can live behind the center button (opened on click) the same way `MonthPicker` opens its month/year grid on click, so keyboard/native date-jump capability isn't lost.

## Non-goals

- No changes to the underlying `getTransactions` query, filters' semantics, or the recurring/review/statistics pages.
- No changes to desktop layout/behavior beyond what naturally follows from shared component changes (desktop already shows filters inline via hover actions, not the mobile kebab — desktop hover-icon row in `TransactionItem` is untouched).
- Swipe wraparound (Calendar → back to Daily by continuing to swipe left) is explicitly out of scope — clamps at both ends.

## Testing

- `nav.test.ts`-style unit test for the new param-translation logic in `ViewSwipe` (day→month, month→day mapping).
- Manual verification on mobile viewport: swipe zones don't interfere with vertical scrolling in the body zone; 3-dot menu opens above bottom nav and any card boundary; filters modal round-trips the same URL params as today's inline bar.
