-- Personal Expense Tracker — initial schema
-- Single-user-per-account model. Every row is owned by auth.uid() and protected by RLS.

-- ---------- Enums ----------
create type account_type as enum ('bank', 'credit_card', 'debit_card', 'cash', 'wallet', 'other');
create type category_kind as enum ('income', 'expense', 'both');
create type txn_type as enum ('income', 'expense');
create type frequency as enum ('daily', 'weekday', 'weekend', 'weekly', 'monthly', 'yearly');

-- ---------- Tables ----------
create table accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type account_type not null default 'bank',
  opening_balance numeric(14,2) not null default 0,
  archived boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kind category_kind not null default 'expense',
  color text not null default '#6366f1',
  icon text,
  parent_id uuid references categories(id) on delete set null,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table recurring_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type txn_type not null,
  amount numeric(14,2) not null,
  category_id uuid references categories(id) on delete set null,
  account_id uuid references accounts(id) on delete set null,
  note text not null default '',
  description text,
  frequency frequency not null,
  interval int not null default 1 check (interval >= 1),
  weekdays smallint[],           -- 0=Sun..6=Sat, used by weekly/weekday/weekend
  day_of_month smallint,         -- used by monthly/yearly
  start_date date not null,
  end_date date,
  next_run_on date not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  occurred_on date not null,
  type txn_type not null,
  amount numeric(14,2) not null check (amount >= 0),
  category_id uuid references categories(id) on delete set null,
  account_id uuid references accounts(id) on delete set null,
  note text not null default '',
  description text,
  is_bookmarked boolean not null default false,
  recurring_rule_id uuid references recurring_rules(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Indexes ----------
create index accounts_user_idx on accounts(user_id) where not archived;
create index categories_user_idx on categories(user_id) where not archived;
create index transactions_user_date_idx on transactions(user_id, occurred_on desc);
create index transactions_user_cat_idx on transactions(user_id, category_id);
create index transactions_user_acct_idx on transactions(user_id, account_id);
create index transactions_bookmark_idx on transactions(user_id) where is_bookmarked;
-- Prevent a recurring rule from materializing the same day twice.
-- Plain unique index: NULLs are distinct in Postgres, so manually-added
-- transactions (recurring_rule_id IS NULL) are unaffected. Non-partial so it
-- can back an ON CONFLICT upsert during generation.
create unique index transactions_rule_day_uniq
  on transactions(recurring_rule_id, occurred_on);
create index recurring_due_idx on recurring_rules(user_id, next_run_on) where active;

-- ---------- updated_at trigger ----------
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger transactions_updated_at
  before update on transactions
  for each row execute function set_updated_at();

-- ---------- Row Level Security ----------
alter table accounts        enable row level security;
alter table categories      enable row level security;
alter table transactions    enable row level security;
alter table recurring_rules enable row level security;

create policy "own accounts"   on accounts        for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own categories" on categories      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own txns"       on transactions    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rules"      on recurring_rules for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- Seed defaults for each new user ----------
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into accounts (user_id, name, type, sort_order) values
    (new.id, 'Bank',        'bank',        1),
    (new.id, 'Cash',        'cash',        2),
    (new.id, 'Credit Card', 'credit_card', 3),
    (new.id, 'Debit Card',  'debit_card',  4);

  insert into categories (user_id, name, kind, color) values
    (new.id, 'Salary',    'income',  '#22c55e'),
    (new.id, 'Interest',  'income',  '#10b981'),
    (new.id, 'Other Income','income','#14b8a6'),
    (new.id, 'Food',      'expense', '#f97316'),
    (new.id, 'Groceries', 'expense', '#f59e0b'),
    (new.id, 'Rent',      'expense', '#ef4444'),
    (new.id, 'Bills',     'expense', '#e11d48'),
    (new.id, 'Transport', 'expense', '#3b82f6'),
    (new.id, 'Shopping',  'expense', '#a855f7'),
    (new.id, 'Health',    'expense', '#06b6d4'),
    (new.id, 'Entertainment','expense','#ec4899'),
    (new.id, 'Transfer',  'both',    '#64748b');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
