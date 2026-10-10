begin;

-- Legacy schema from the first tracker iteration. The current app only reads and writes
-- academic_* , money_* and special_* tables, so these four tables are unused.
--
-- They were created before the owner-only hardening in 202608200001 / 202610090001, so they
-- still carry blanket grants for the anon role:
--   anon: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
-- They hold no rows and have no RLS policies, so today RLS defaults to deny-all and nothing
-- leaks. Removing them deletes the latent risk of a future permissive policy exposing them.

drop table if exists public.semester_payments cascade;
drop table if exists public.transactions cascade;
drop table if exists public.wallets cascade;
drop table if exists public.semesters cascade;

commit;
