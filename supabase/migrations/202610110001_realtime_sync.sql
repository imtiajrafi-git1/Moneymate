begin;

do $$
declare
  v_table_name text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    raise exception 'Supabase Realtime publication is missing.';
  end if;

  foreach v_table_name in array array[
    'academic_semesters',
    'academic_semester_fees',
    'academic_payments',
    'academic_receipts',
    'money_incomes',
    'money_expenses',
    'special_wallets',
    'special_fund_entries'
  ] loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = v_table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', v_table_name);
    end if;
  end loop;
end $$;

commit;
