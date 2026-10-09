begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(13);

insert into auth.users(id, email) values
  ('10000000-0000-4000-8000-000000000001', 'academic-test-owner@example.com'),
  ('10000000-0000-4000-8000-000000000002', 'academic-test-other@example.com')
on conflict (id) do nothing;

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';
select results_eq(
  $$insert into public.academic_semesters(user_id,id,name,status)
    values (auth.uid(),'test-semester','Spring 2025','Active') returning id$$,
  $$values ('test-semester'::text)$$, 'Owner can create a semester');
select public.academic_save_semester('test-semester', 'Spring 2025', 'Active',
  '[{"id":"reg","category":"Registration Fee","amount":30000},{"id":"exam","category":"Final Exam Fee","amount":20000},{"id":"bus","category":"Transport Fee","amount":3000}]');
select is((select sum(amount) from public.academic_semester_fees where semester_id='test-semester'), 53000::numeric, 'All required fees are recorded');
select results_eq(
  $$insert into public.academic_payments(user_id,id,semester_id,title,fee_type,amount,paid_on)
    values (auth.uid(),'test-payment','test-semester','Registration','Registration Fee',30000,'2025-02-01') returning amount$$,
  $$values (30000::numeric)$$, 'Owner can record a payment');
select is((select remaining_payable from public.academic_semester_summary where semester_id='test-semester'), 23000::numeric, 'Summary does not double-count joined rows');

set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000002';
select is_empty($$select * from public.academic_semesters where id='test-semester'$$, 'Other user cannot read a semester');
select is_empty($$select * from public.academic_payments where id='test-payment'$$, 'Other user cannot read a payment');
select is_empty($$update public.academic_payments set amount=1 where id='test-payment' returning id$$, 'Other user cannot update a payment');
select is_empty($$delete from public.academic_payments where id='test-payment' returning id$$, 'Other user cannot delete a payment');
select throws_ok(
  $$insert into public.academic_semesters(user_id,id,name) values ('10000000-0000-4000-8000-000000000001','spoof','Spoof')$$,
  '42501', null, 'Cannot insert records belonging to someone else');

reset role;
select is((select public from storage.buckets where id='academic-receipts'), false, 'Receipt bucket is private');

set local role anon;
set local request.jwt.claim.sub = '';
select throws_ok($$select * from public.academic_semesters$$, '42501', null, 'Anonymous users have no academic table access');
select throws_ok($$select * from public.academic_payments$$, '42501', null, 'Anonymous users cannot read payments');
select throws_ok($$select public.academic_save_semester('anon','Anonymous','Active','[]')$$, '42501', null, 'Anonymous users cannot invoke a save RPC');
reset role;
select * from finish();
rollback;