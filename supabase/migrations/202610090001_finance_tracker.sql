begin;

create table if not exists public.money_incomes (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  title text not null check (length(trim(title)) between 1 and 200),
  amount numeric(14,2) not null check (amount > 0),
  category text not null check (category in ('Salary', 'Freelance', 'Monthly Allowance', 'Gift', 'Investment', 'Semester Fund', 'Other')),
  income_type text check (income_type is null or income_type in ('monthly', 'semester')),
  occurred_on date not null,
  note text check (length(note) <= 1000),
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.money_expenses (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  title text not null check (length(trim(title)) between 1 and 200),
  amount numeric(14,2) not null check (amount > 0),
  category text not null check (category in ('Food', 'Transport', 'University', 'Shopping', 'Bills', 'House Rent', 'Entertainment', 'Health', 'Other')),
  occurred_on date not null,
  note text check (length(note) <= 1000),
  is_university boolean not null default false,
  is_transport boolean not null default false,
  semester_id text,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.special_wallets (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  name text not null check (length(trim(name)) between 1 and 120),
  note text check (length(note) <= 1000),
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.special_fund_entries (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  wallet_id text not null,
  kind text not null check (kind in ('deposit', 'spend')),
  title text not null check (length(trim(title)) between 1 and 200),
  amount numeric(14,2) not null check (amount > 0),
  occurred_on date not null,
  note text check (length(note) <= 1000),
  created_at timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, wallet_id) references public.special_wallets(user_id, id) on delete cascade
);

create index if not exists money_incomes_date on public.money_incomes(user_id, occurred_on desc);
create index if not exists money_expenses_date on public.money_expenses(user_id, occurred_on desc);
create index if not exists special_fund_entries_wallet_date on public.special_fund_entries(user_id, wallet_id, occurred_on desc);

do $$
declare table_name text;
begin
  foreach table_name in array array['money_incomes', 'money_expenses', 'special_wallets', 'special_fund_entries'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from anon, authenticated', table_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
    execute format('drop policy if exists owner_read on public.%I', table_name);
    execute format('drop policy if exists owner_insert on public.%I', table_name);
    execute format('drop policy if exists owner_update on public.%I', table_name);
    execute format('drop policy if exists owner_delete on public.%I', table_name);
    execute format('create policy owner_read on public.%I for select to authenticated using ((select auth.uid()) = user_id)', table_name);
    execute format('create policy owner_insert on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', table_name);
    execute format('create policy owner_update on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', table_name);
    execute format('create policy owner_delete on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', table_name);
  end loop;
end $$;

commit;
