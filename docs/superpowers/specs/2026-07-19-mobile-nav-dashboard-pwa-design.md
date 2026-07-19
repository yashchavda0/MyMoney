# Mobile nav, dashboard rework & iOS install — Design

Date: 2026-07-19
Status: Approved (pending spec review)

## Goal

Simplify mobile navigation, make the Dashboard the single overview home,
restrict transaction-adding to the dashboard, and make the app installable to
the iOS/Android home screen.

## Scope

Frontend only. No schema, query, or server-action changes. Touches nav shell,
the overview routes, and PWA metadata/UI. Desktop layout stays intact except
the sidebar loses its Add button.

---

## 1. Bottom bar — 4 slots (mobile)

Replace the current 4 nav tabs + hamburger drawer with exactly four slots:

`Dashboard` · `Transactions` · `Statistics` · `More`

- Remove the mobile top-bar **hamburger** and the entire **left slide-in
  drawer**.
- Keep a slim mobile top bar showing only the "Money" brand/logo. Bookmarks +
  theme/accent toggles move into the **More** sheet (see §3).
- "Dashboard" tab is active on `/`, `/monthly`, `/calendar` (the overview
  cluster). "Transactions" on `/transactions`. "Statistics" on `/statistics`.
- "More" opens the bottom sheet (§3); it is not a route.

## 2. Dashboard = overview host (default daily)

The old `/` dashboard (BalanceCard + this-month list) is retired as a distinct
page. `/` becomes the overview host:

- `/` renders the **daily** view by default (today), with the existing
  `ViewTabs` segmented control (Daily / Monthly / Calendar) at the top.
- The month **BalanceCard** sits above the daily content (kept per decision A).
- Daily page content moves to `/`. `/monthly` and `/calendar` routes stay.
  `ViewTabs` "Daily" now links to `/` (was `/daily`). The `/daily` route is
  removed; add a redirect `/daily` → `/` so old links/bookmarks survive.
- `?d=` (day) and `?m=` (month) query params are preserved as today.

Components reused unchanged: `ViewTabs`, `DayNav`, `MonthPicker`,
`SummaryTiles`, `TransactionList`, `GroupedTransactions`, `CategoryBars`,
`CalendarGrid`, `BalanceCard`.

## 3. More = slide-up bottom sheet (mobile)

Tapping "More" opens a sheet sliding up from the bottom. Backdrop tap or any
item selection closes it. Contents:

- **Nav links**: Review (with pending-count badge), Recurring, Settings.
- **Add to Home Screen** item (§5) — hidden when already installed.
- **Bookmarks** action (opens the bookmarks UI via `useTransactionUI`).
- Theme toggle + accent toggle.
- Footer: signed-in email + Sign out.

Reuses the existing item styling from the retired drawer. Sheet is
`md:hidden`; closes on route change.

## 4. Add transaction — dashboard cluster only

- The `+` **FAB** shows only on the dashboard cluster: `/`, `/monthly`,
  `/calendar`. Hidden on Transactions, Statistics, Review, Recurring, Settings
  (view-only pages).
- FAB shows on **all screen sizes** now (was `md:hidden`) — it is the single
  add affordance (decision B).
- Remove the "Add transaction" button from the desktop **sidebar** and from the
  (now-deleted) mobile drawer.
- Gating is by pathname inside `AppShell` (client component already has
  `usePathname`).

## 5. iOS / PWA install

### 5a. apple-icon (bug fix)

Add `src/app/apple-icon.tsx` (180×180, same ₹ purple tile as `icon.tsx`) so
iOS uses the app icon instead of a page screenshot on the home screen.
`appleWebApp.capable` is already set in `layout.tsx`.

### 5b. Install affordance

New client component `InstallPrompt` (or `add-to-home-screen`):

- **Detect state**: `display-mode: standalone` (or iOS `navigator.standalone`)
  → already installed, render nothing.
- **Android / desktop Chromium**: listen for `beforeinstallprompt`, prevent
  default, stash the event. The "Add to Home Screen" item calls
  `prompt()` on it.
- **iOS Safari** (no `beforeinstallprompt`): the item opens a small instruction
  panel — "Tap the Share icon, then **Add to Home Screen**" with the Share
  glyph. Cannot be triggered programmatically; instructions only.

### 5c. Placement (decision C — both)

- **Menu item**: in the More sheet (mobile) and desktop sidebar footer.
- **First-visit hint banner**: a dismissible banner shown once to iOS-Safari,
  not-yet-installed users pointing at the Share → Add to Home Screen flow.
  Dismissal persisted in `localStorage`; never shown again after dismiss or
  after install.

---

## Files

New:
- `src/app/apple-icon.tsx`
- `src/components/install-prompt.tsx` (menu item + banner + iOS instructions)

Changed:
- `src/components/app-shell.tsx` — drop hamburger/drawer; 4-slot bottom bar +
  More sheet; slim top bar; FAB gating + all-size FAB; remove sidebar Add
  button; wire InstallPrompt into More sheet + sidebar footer.
- `src/app/(app)/page.tsx` — becomes daily overview host (BalanceCard +
  ViewTabs + DayNav + SummaryTiles + day list).
- `src/components/view-tabs.tsx` — "Daily" links to `/` instead of `/daily`;
  active check for `/`.
- `src/app/(app)/daily/` — remove page; add `/daily` → `/` redirect.

Unchanged: monthly, calendar, transactions, statistics, review, recurring,
settings pages; all queries, actions, and data components.

## Testing

- Manual: bottom bar shows 4 slots on mobile; More sheet opens/closes; each
  More item routes correctly; FAB only on `/`, `/monthly`, `/calendar`.
- Dashboard defaults to daily with BalanceCard; ViewTabs switches views;
  `/daily` redirects to `/`.
- Desktop: sidebar has no Add button; FAB present on dashboard cluster only.
- PWA: manifest still valid; apple-icon served at build; installed app uses ₹
  tile; iOS banner shows once then respects dismissal; Android install prompt
  fires from the menu item.
- Existing `vitest` suite stays green (no logic touched).

## Non-goals

- No changes to SMS import, recurring engine, statistics content, or auth.
- No offline/service-worker caching (install ≠ offline; out of scope).
- No desktop nav restructure beyond removing the Add button.

## Next.js caveat

Per `AGENTS.md`, this Next version has breaking changes. Before implementing,
read the relevant guides in `node_modules/next/dist/docs/` (metadata /
`apple-icon` conventions, redirects, `usePathname`) rather than relying on
prior knowledge.
