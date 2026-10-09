begin;

create table if not exists public.academic_semesters (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null check (id ~ '^[A-Za-z0-9_-]+$'),
  name text not null check (length(trim(name)) between 1 and 120),
  status text not null default 'Active' check (status in ('Active', 'Completed', 'Upcoming')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.academic_semester_fees (
  user_id uuid not null,
  id text not null,
  semester_id text not null,
  category text not null check (category in ('Registration Fee', 'Final Exam Fee', 'Transport Fee', 'Other Fee')),
  amount numeric(14,2) not null check (amount >= 0),
  due_date date,
  created_at timestamptz not null default now(),
  primary key (user_id, id),
  unique (user_id, semester_id, category),
  foreign key (user_id, semester_id) references public.academic_semesters(user_id, id) on delete cascade
);

create table if not exists public.academic_payments (
  user_id uuid not null,
  id text not null check (id ~ '^[A-Za-z0-9_-]+$'),
  semester_id text not null,
  title text not null check (length(trim(title)) between 1 and 200),
  fee_type text not null check (fee_type in ('Registration Fee', 'Final Exam Fee', 'Transport Fee', 'Other Fee')),
  amount numeric(14,2) not null check (amount > 0),
  paid_on date not null,
  payment_method text not null default 'Other' check (payment_method in ('bKash', 'CellFin', 'Bank', 'Cash', 'Other')),
  reference text check (length(reference) <= 120),
  note text check (length(note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  unique (user_id, id, semester_id),
  foreign key (user_id, semester_id) references public.academic_semesters(user_id, id) on delete cascade
);

create table if not exists public.academic_receipts (
  user_id uuid not null,
  id text not null,
  payment_id text not null,
  semester_id text not null,
  original_name text not null check (length(original_name) between 1 and 160),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
  size_bytes bigint not null check (size_bytes between 1 and 5242880),
  storage_path text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, id),
  unique (storage_path),
  foreign key (user_id, payment_id, semester_id) references public.academic_payments(user_id, id, semester_id) on delete cascade,
  check (split_part(storage_path, '/', 1) = user_id::text
    and split_part(storage_path, '/', 2) = semester_id
    and split_part(storage_path, '/', 3) = payment_id
    and split_part(storage_path, '/', 4) <> '')
);

create index if not exists academic_payments_semester_date on public.academic_payments(user_id, semester_id, paid_on desc);
create index if not exists academic_receipts_payment on public.academic_receipts(user_id, payment_id);
create index if not exists academic_fees_semester on public.academic_semester_fees(user_id, semester_id);

-- Separate policies for every operation; owner-qualified foreign keys prevent cross-user linking.
do $$
declare table_name text;
begin
  foreach table_name in array array['academic_semesters', 'academic_semester_fees', 'academic_payments', 'academic_receipts'] loop
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

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('academic-receipts', 'academic-receipts', false, 5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists academic_receipt_read on storage.objects;
drop policy if exists academic_receipt_upload on storage.objects;
drop policy if exists academic_receipt_delete on storage.objects;
create policy academic_receipt_read on storage.objects for select to authenticated
using (bucket_id = 'academic-receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy academic_receipt_upload on storage.objects for insert to authenticated
with check (bucket_id = 'academic-receipts' and (storage.foldername(name))[1] = (select auth.uid())::text
  and array_length(storage.foldername(name), 1) = 3 and storage.extension(name) in ('jpg', 'png', 'webp', 'pdf'));
create policy academic_receipt_delete on storage.objects for delete to authenticated
using (bucket_id = 'academic-receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);
-- Protect this bucket even if the host project already has broad permissive storage policies.
drop policy if exists academic_receipt_owner_guard on storage.objects;
create policy academic_receipt_owner_guard on storage.objects as restrictive for all to public
using (bucket_id <> 'academic-receipts' or (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id <> 'academic-receipts' or (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists academic_receipt_no_overwrite on storage.objects;
create policy academic_receipt_no_overwrite on storage.objects as restrictive for update to public
using (bucket_id <> 'academic-receipts') with check (bucket_id <> 'academic-receipts');
-- Replacements get a new random path; no overwrite policy is granted.

create or replace function public.academic_save_semester(p_id text, p_name text, p_status text, p_fees jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare v_user uuid := auth.uid(); v_fee jsonb;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_fees is null or jsonb_typeof(p_fees) <> 'array' or jsonb_array_length(p_fees) > 4 then raise exception 'Invalid fee breakdown'; end if;
  insert into public.academic_semesters(user_id, id, name, status) values (v_user, p_id, trim(p_name), p_status)
  on conflict (user_id, id) do update set name = excluded.name, status = excluded.status, updated_at = now();
  delete from public.academic_semester_fees where user_id = v_user and semester_id = p_id;
  for v_fee in select value from jsonb_array_elements(p_fees) loop
    insert into public.academic_semester_fees(user_id, id, semester_id, category, amount, due_date)
    values (v_user, v_fee->>'id', p_id, v_fee->>'category', (v_fee->>'amount')::numeric, nullif(v_fee->>'due_date', '')::date);
  end loop;
end $$;

create or replace function public.academic_save_payment(p_payment jsonb, p_receipts jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare v_user uuid := auth.uid(); v_receipt jsonb; v_id text := p_payment->>'id'; v_sem text := p_payment->>'semester_id';
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_receipts is null or jsonb_typeof(p_receipts) <> 'array' or jsonb_array_length(p_receipts) > 5 then raise exception 'Maximum five receipts per payment'; end if;
  insert into public.academic_payments(user_id, id, semester_id, title, fee_type, amount, paid_on, payment_method, reference, note)
  values (v_user, v_id, v_sem, trim(p_payment->>'title'), p_payment->>'fee_type', (p_payment->>'amount')::numeric,
    (p_payment->>'paid_on')::date, coalesce(p_payment->>'payment_method', 'Other'), p_payment->>'reference', p_payment->>'note')
  on conflict (user_id, id) do update set semester_id = excluded.semester_id, title = excluded.title, fee_type = excluded.fee_type,
    amount = excluded.amount, paid_on = excluded.paid_on, payment_method = excluded.payment_method,
    reference = excluded.reference, note = excluded.note, updated_at = now();
  delete from public.academic_receipts where user_id = v_user and payment_id = v_id
    and id not in (select value->>'id' from jsonb_array_elements(p_receipts));
  for v_receipt in select value from jsonb_array_elements(p_receipts) loop
    if not exists (select 1 from storage.objects where bucket_id = 'academic-receipts' and name = v_receipt->>'storage_path') then
      raise exception 'Receipt file must be uploaded before recording it';
    end if;
    insert into public.academic_receipts(user_id, id, payment_id, semester_id, original_name, mime_type, size_bytes, storage_path)
    values (v_user, v_receipt->>'id', v_id, v_sem, v_receipt->>'original_name', v_receipt->>'mime_type',
      (v_receipt->>'size_bytes')::bigint, v_receipt->>'storage_path')
    on conflict (user_id, id) do update set original_name = excluded.original_name;
  end loop;
end $$;

revoke all on function public.academic_save_semester(text, text, text, jsonb) from public, anon;
revoke all on function public.academic_save_payment(jsonb, jsonb) from public, anon;
grant execute on function public.academic_save_semester(text, text, text, jsonb) to authenticated;
grant execute on function public.academic_save_payment(jsonb, jsonb) to authenticated;

-- Lock the semester before checking for payments, so another device cannot add
-- a payment between the empty-semester check and deletion.
create or replace function public.academic_delete_empty_semester(p_id text)
returns void language plpgsql security invoker set search_path = '' as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  perform 1 from public.academic_semesters where user_id = v_user and id = p_id for update;
  if not found then raise exception 'Semester not found'; end if;
  if exists (select 1 from public.academic_payments where user_id = v_user and semester_id = p_id) then
    raise exception 'Delete this semester''s payment records first';
  end if;
  delete from public.academic_semesters where user_id = v_user and id = p_id;
end $$;
revoke all on function public.academic_delete_empty_semester(text) from public, anon;
grant execute on function public.academic_delete_empty_semester(text) to authenticated;

create or replace view public.academic_semester_summary with (security_invoker = true) as
select s.user_id, s.id as semester_id, s.name,
  coalesce(f.required, 0) as total_required_fee,
  coalesce(p.paid, 0) as total_paid,
  greatest(0, coalesce(f.required, 0) - coalesce(p.paid, 0)) as remaining_payable
from public.academic_semesters s
left join lateral (select sum(amount) as required from public.academic_semester_fees where user_id = s.user_id and semester_id = s.id) f on true
left join lateral (select sum(amount) as paid from public.academic_payments where user_id = s.user_id and semester_id = s.id) p on true;
revoke all on public.academic_semester_summary from anon;
grant select on public.academic_semester_summary to authenticated;

commit;