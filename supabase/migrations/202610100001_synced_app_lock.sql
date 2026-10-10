begin;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.app_lock_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  pin_hash text not null,
  is_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.app_lock_attempts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  failed_attempts integer not null default 0 check (failed_attempts between 0 and 5),
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.app_lock_settings enable row level security;
alter table public.app_lock_attempts enable row level security;
revoke all on public.app_lock_settings, public.app_lock_attempts from anon, authenticated;

create or replace function public.initialize_app_lock(p_pin text, p_enabled boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_enabled boolean;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_pin is null or p_pin !~ '^[0-9]{4}$' then raise exception 'PIN must contain exactly four digits'; end if;
  if p_enabled is null then raise exception 'Lock setting is required'; end if;
  insert into public.app_lock_settings(user_id, pin_hash, is_enabled)
  values (v_user, extensions.crypt(p_pin, extensions.gen_salt('bf', 12)), p_enabled)
  on conflict (user_id) do nothing;
  select is_enabled into v_enabled from public.app_lock_settings where user_id = v_user;
  return v_enabled;
end
$$;

create or replace function public.save_app_lock_settings(p_pin text, p_enabled boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_enabled is null then raise exception 'Lock setting is required'; end if;
  if p_pin is not null and p_pin !~ '^[0-9]{4}$' then raise exception 'PIN must contain exactly four digits'; end if;
  if p_pin is null then
    update public.app_lock_settings set is_enabled = p_enabled, updated_at = now() where user_id = v_user;
    if not found then raise exception 'App lock is not initialized. Reload and try again.'; end if;
  else
    insert into public.app_lock_settings(user_id, pin_hash, is_enabled)
    values (v_user, extensions.crypt(p_pin, extensions.gen_salt('bf', 12)), p_enabled)
    on conflict (user_id) do update set pin_hash = excluded.pin_hash, is_enabled = excluded.is_enabled, updated_at = now();
  end if;
  insert into public.app_lock_attempts(user_id, failed_attempts, locked_until)
  values (v_user, 0, null)
  on conflict (user_id) do update set failed_attempts = 0, locked_until = null, updated_at = now();
end
$$;

create or replace function public.verify_app_pin(p_pin text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_hash text;
  v_failures integer;
  v_locked_until timestamptz;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_pin is null or p_pin !~ '^[0-9]{4}$' then return false; end if;
  insert into public.app_lock_attempts(user_id) values (v_user) on conflict (user_id) do nothing;
  select failed_attempts, locked_until into v_failures, v_locked_until
  from public.app_lock_attempts where user_id = v_user for update;
  if v_locked_until is not null and v_locked_until > now() then return false; end if;
  if v_locked_until is not null then
    update public.app_lock_attempts set failed_attempts = 0, locked_until = null where user_id = v_user;
  end if;
  select pin_hash into v_hash from public.app_lock_settings where user_id = v_user;
  if v_hash is null then raise exception 'App lock is not initialized. Reload and try again.'; end if;
  if extensions.crypt(p_pin, v_hash) = v_hash then
    update public.app_lock_attempts set failed_attempts = 0, locked_until = null, updated_at = now() where user_id = v_user;
    return true;
  end if;
  v_failures := case when v_locked_until is not null then 1 else v_failures + 1 end;
  update public.app_lock_attempts
  set failed_attempts = v_failures,
      locked_until = case when v_failures >= 5 then now() + interval '5 minutes' else null end,
      updated_at = now()
  where user_id = v_user;
  return false;
end
$$;

revoke all on function public.initialize_app_lock(text, boolean) from public, anon;
revoke all on function public.save_app_lock_settings(text, boolean) from public, anon;
revoke all on function public.verify_app_pin(text) from public, anon;
grant execute on function public.initialize_app_lock(text, boolean) to authenticated;
grant execute on function public.save_app_lock_settings(text, boolean) to authenticated;
grant execute on function public.verify_app_pin(text) to authenticated;

commit;
