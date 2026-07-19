-- SMS auto-import: per-user ingest token + feature toggle, learned/keyword rules,
-- and an inbox that dedupes and holds messages needing review.

-- ---------- Where a transaction came from ----------
alter table transactions
  add column source text not null default 'manual'
  check (source in ('manual', 'sms', 'import', 'recurring'));

-- ---------- Per-user profile (feature flag + hashed ingest token) ----------
create table profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  sms_enabled boolean not null default false,
  auto_insert boolean not null default true,
  ingest_token_hash text unique,        -- sha256 of the secret the Shortcut sends
  created_at timestamptz not null default now()
);

-- ---------- Categorization rules (learned merchant memory + manual keyword rules) ----------
create table sms_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pattern text not null,                 -- lowercased merchant / keyword substring
  category_id uuid references categories(id) on delete cascade,
  account_id uuid references accounts(id) on delete set null,
  learned boolean not null default false,-- true = auto-learned from a review
  created_at timestamptz not null default now(),
  unique (user_id, pattern)
);
create index sms_rules_user_idx on sms_rules(user_id);

-- ---------- Inbox: raw + parsed SMS, deduped, with review status ----------
create table sms_inbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  raw_text text not null,
  sender text,
  received_at timestamptz not null default now(),
  amount numeric(14,2),
  type txn_type,
  account_id uuid references accounts(id) on delete set null,
  note text,
  category_id uuid references categories(id) on delete set null,
  fingerprint text not null,
  status text not null default 'pending' check (status in ('pending', 'posted', 'duplicate', 'ignored')),
  transaction_id uuid references transactions(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, fingerprint)
);
create index sms_inbox_pending_idx on sms_inbox(user_id) where status = 'pending';

-- ---------- Row Level Security ----------
alter table profiles  enable row level security;
alter table sms_rules enable row level security;
alter table sms_inbox enable row level security;

create policy "own profile" on profiles  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rules"   on sms_rules for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own inbox"   on sms_inbox for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- The ingest endpoint uses the service-role key (bypasses RLS) and scopes every
-- write to the user_id resolved from the token.
