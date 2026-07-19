-- Adds: per-account income/expense applicability, user-defined category fields,
-- and per-transaction structured detail values.

-- ---------- Accounts: which transaction types can use this account ----------
alter table accounts
  add column usable_for text not null default 'both'
  check (usable_for in ('income', 'expense', 'both'));

-- Credit cards default to expense-only (you spend from them); flip to 'both' if you
-- track refunds/cashback as income.
update accounts set usable_for = 'expense' where type = 'credit_card';

-- ---------- Categories: user-defined custom fields ----------
-- fields = jsonb array of { id, label, type: text|number|date|select, options?, required? }
alter table categories
  add column fields jsonb not null default '[]'::jsonb;

-- ---------- Transactions: values for the selected category's fields ----------
-- details = jsonb object mapping field id -> value
alter table transactions
  add column details jsonb not null default '{}'::jsonb;

-- ---------- Refresh the new-user seed to set credit-card applicability ----------
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into accounts (user_id, name, type, sort_order, usable_for) values
    (new.id, 'Bank',        'bank',        1, 'both'),
    (new.id, 'Cash',        'cash',        2, 'both'),
    (new.id, 'Credit Card', 'credit_card', 3, 'expense'),
    (new.id, 'Debit Card',  'debit_card',  4, 'both');

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
