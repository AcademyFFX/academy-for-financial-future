-- REVIEW ONLY. Do not execute on production until all membership writers are migrated.
begin;
alter table public.student_memberships enable row level security;
revoke all privileges on table public.student_memberships from public, anon, authenticated;
do $$
declare cols text;
begin
 select string_agg(quote_ident(attname), ', ') into cols from pg_attribute
 where attrelid='public.student_memberships'::regclass and attnum>0 and not attisdropped;
 execute format('revoke all privileges (%s) on table public.student_memberships from public, anon, authenticated', cols);
end $$;
grant select on public.student_memberships to authenticated;
grant select, insert, update, delete on public.student_memberships to service_role;
revoke all on sequence public.student_memberships_id_seq from public, anon, authenticated;
grant usage, select on sequence public.student_memberships_id_seq to service_role;
drop policy if exists "Students can create their membership" on public.student_memberships;
drop policy if exists "Students can update their membership checkout state" on public.student_memberships;
drop policy if exists "AFF administrators can manage memberships" on public.student_memberships;
drop policy if exists "Students can read their membership" on public.student_memberships;
create policy "Students can read their membership" on public.student_memberships for select to authenticated
using ((select auth.uid()) = student_id or (select public.is_aff_admin()));
-- Fail closed if inherited privileges remain.
do $$
declare r text; p text;
begin
 foreach r in array array['anon','authenticated'] loop
  foreach p in array array['INSERT','UPDATE','DELETE','TRUNCATE','TRIGGER','REFERENCES'] loop
   if has_table_privilege(r,'public.student_memberships',p) then raise exception 'Unexpected % privilege for %',p,r; end if;
  end loop;
  if has_any_column_privilege(r,'public.student_memberships','INSERT') or has_any_column_privilege(r,'public.student_memberships','UPDATE') then
   raise exception 'Unexpected column write privilege for %',r;
  end if;
 end loop;
 if has_any_column_privilege('anon','public.student_memberships','SELECT') then raise exception 'Unexpected anonymous read privilege'; end if;
 if not has_table_privilege('authenticated','public.student_memberships','SELECT') or not has_table_privilege('service_role','public.student_memberships','INSERT') or not has_table_privilege('service_role','public.student_memberships','UPDATE') then raise exception 'Required privileges missing'; end if;
end $$;
notify pgrst, 'reload schema';
commit;
