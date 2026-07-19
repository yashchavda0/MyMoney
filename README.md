# Money — Personal Expense Tracker

A private, single-user income & expense tracker. Next.js 16 (App Router) + Supabase (Postgres, Auth, RLS), deployed on Vercel. Dark, data-dense, installable on phone.

## Features

- **Transactions** — date, amount, type (income/expense), category, account, note, optional description. Add / edit / delete / **duplicate**.
- **Accounts** — Bank, Cash, Credit Card, Debit Card, Wallet… (fully editable) with live balances.
- **Categories** — user-defined, colored, income/expense/both, create-on-the-fly.
- **Recurring** — daily / weekday / weekend / weekly (pick days) / monthly / yearly, with interval + end date. Due transactions post **automatically** and stay editable.
- **Bookmarks** — star a transaction to reuse it as a one-tap template *and* filter the saved set.
- **Copy / paste** — duplicate a single transaction, **bulk paste** spreadsheet rows to import, and **copy** rows out as TSV.
- **Views** — Dashboard, Daily (diary), Monthly, Calendar, Transactions (searchable/filterable list).
- **Statistics** — income vs expense over time, and breakdowns by **category**, **account**, and **note**.
- INR (`₹`, en-IN formatting), `Asia/Kolkata` dates, light/dark toggle.

## 1. Create the Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, paste and run the contents of [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql). This creates all tables, RLS policies, indexes, and a trigger that seeds default accounts + categories for each new user.
3. **Authentication → Providers → Email**: keep it enabled (magic links work with the default Email provider).
4. **Authentication → URL Configuration**:
   - **Site URL**: `http://localhost:3000` for local dev (change to your Vercel URL in production).
   - **Redirect URLs**: add `http://localhost:3000/auth/callback` (and your production `https://<app>.vercel.app/auth/callback`).

## 2. Configure environment

```bash
cp .env.local.example .env.local
```

Fill in from **Project Settings → API**:

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` public key |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` locally |
| `CRON_SECRET` | any long random string (only needed for the deployed cron) |
| `SUPABASE_SERVICE_ROLE_KEY` | *(optional)* service-role key — only for the Vercel cron; **never** expose to the browser |

## 3. Run locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000>, enter your email, and click the magic link. On first sign-in the trigger seeds your default accounts and categories.

> **Tip (local email):** Supabase sends the magic link by email. During development you can also grab the link from the Supabase dashboard under **Authentication → Logs**.

## 4. Recurring transactions — how they post

- **In-app catch-up (primary):** whenever you open the app, any due recurring transactions up to today are materialized automatically. No extra setup.
- **Vercel Cron (optional):** [`vercel.json`](vercel.json) schedules `/api/cron/generate-recurring` daily at 00:00 IST. It requires `CRON_SECRET` (Vercel sends it as a Bearer token) and `SUPABASE_SERVICE_ROLE_KEY` to run across users. For a single user the in-app catch-up already covers everything.

Generation is idempotent — a unique index on `(recurring_rule_id, occurred_on)` plus per-rule `next_run_on` tracking prevents duplicates.

## 5. Auto-import from SMS (iPhone, zero-touch)

Bank/UPI/card SMS become transactions on their own. iOS blocks apps from reading SMS, so an **iOS "Message" Personal Automation** forwards the message text to the app's webhook; the server parses, categorizes, dedupes, and inserts.

**Setup:**
1. Run [`supabase/migrations/0003_sms_ingest.sql`](supabase/migrations/0003_sms_ingest.sql) in the SQL editor (adds `profiles`, `sms_rules`, `sms_inbox`, `transactions.source`).
2. Set `SUPABASE_SERVICE_ROLE_KEY` in env (the webhook writes with RLS bypassed, scoped to the user resolved from the token).
3. In the app: **Settings → Auto-import from SMS → Enable**. Copy the **webhook URL** and **token** (shown once).
4. On iPhone, build the Shortcut + Personal Automation shown on that page (Message trigger by bank sender/phrase → POST `{ text, token }` → turn **Ask Before Running** off).

**How it works:**
- **Parse** (`src/lib/sms/parse.ts`): amount, debit/credit → type, account last-4, merchant/payee → note, ref id, date.
- **Categorize** (`src/lib/sms/categorize.ts`): merchant memory + keyword rules (seeded, editable in Settings); unknown → held in **Review** where you set the category once and it's learned.
- **Dedup** (`src/lib/sms/fingerprint.ts`): the bank + card-network double-SMS share a fingerprint → the second is ignored. Unique index `(user_id, fingerprint)` enforces it.
- **Endpoint**: `POST /api/ingest/sms` — `{ text, sender?, token }`, returns `{status: posted|pending|duplicate|unparsed, message}`.

Android later: the same webhook works from Tasker/MacroDroid (which can read SMS).

## 6. Deploy to Vercel

1. Push this repo to GitHub and import it in Vercel.
2. Add the env vars from step 2 (set `NEXT_PUBLIC_SITE_URL` to your Vercel URL; add `CRON_SECRET`, and `SUPABASE_SERVICE_ROLE_KEY` if you want the cron).
3. Update the Supabase **Site URL** and **Redirect URLs** to the Vercel domain.
4. Deploy. The cron in `vercel.json` is picked up automatically.

## Tests

```bash
npm test         # recurring-engine + SMS-parser unit tests (vitest)
npx tsc --noEmit # typecheck
```

## Project structure

```
src/
  app/
    (app)/            authed shell + pages: dashboard, daily, monthly, calendar,
                      transactions, statistics, recurring, settings
    login/            magic-link sign-in
    auth/callback/    exchanges the magic-link code for a session
    api/cron/…        daily recurring generator
    actions/          server actions (transactions, settings, recurring, auth)
  components/         UI primitives, forms, charts, app shell
  lib/
    supabase/         browser/server/admin clients + schema types
    recurring/        pure rule engine (generate) + runner + describe (+ tests)
    aggregate.ts      totals & group-by helpers
    format.ts         INR / date / IST helpers
  proxy.ts            session refresh + route guard (Next 16 "proxy" convention)
supabase/migrations/  schema + RLS + seed
```
