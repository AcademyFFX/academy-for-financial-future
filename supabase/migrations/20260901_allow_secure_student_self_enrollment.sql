begin;

create or replace function public.aff_course_available_for_self_enrollment(p_course_id bigint)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_has_publication_status boolean;
  v_has_status boolean;
  v_available boolean := false;
begin
  if p_course_id is null then
    return false;
  end if;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'courses'
      and column_name = 'publication_status'
  ) into v_has_publication_status;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'courses'
      and column_name = 'status'
  ) into v_has_status;

  if v_has_publication_status then
    execute
      'select exists (
         select 1
         from public.courses
         where id = $1
           and lower(trim(coalesce(publication_status, ''''))) in (''published'', ''active'', ''available'')
       )'
    into v_available
    using p_course_id;
  elsif v_has_status then
    execute
      'select exists (
         select 1
         from public.courses
         where id = $1
           and lower(trim(coalesce(status, ''''))) in (''published'', ''active'', ''available'')
       )'
    into v_available
    using p_course_id;
  else
    select exists (
      select 1
      from public.courses
      where id = p_course_id
    ) into v_available;
  end if;

  return coalesce(v_available, false);
end;
$$;

revoke all on function public.aff_course_available_for_self_enrollment(bigint) from public;
grant execute on function public.aff_course_available_for_self_enrollment(bigint) to authenticated;

alter table public.enrollments enable row level security;

grant select, insert, update on public.enrollments to authenticated;

drop policy if exists "Students can read own enrollments" on public.enrollments;
drop policy if exists "Students can create own enrollments" on public.enrollments;
drop policy if exists "Students can update own enrollments" on public.enrollments;
drop policy if exists "Students can manage own enrollments" on public.enrollments;
drop policy if exists "AFF admin can manage enrollments" on public.enrollments;
drop policy if exists "AFF admin can manage approval enrollments" on public.enrollments;
drop policy if exists "AFF admins can manage enrollments" on public.enrollments;

create policy "Students can read own enrollments"
on public.enrollments
for select
to authenticated
using (
  exists (
    select 1
    from public.students s
    where s.id = enrollments.student_id
      and s.auth_user_id = auth.uid()
  )
  or public.is_aff_admin()
);

create policy "Students can create own enrollments"
on public.enrollments
for insert
to authenticated
with check (
  exists (
    select 1
    from public.students s
    where s.id = enrollments.student_id
      and s.auth_user_id = auth.uid()
      and lower(trim(coalesce(s.status, ''))) in ('active', 'graduated')
  )
  and public.aff_course_available_for_self_enrollment(enrollments.course_id)
  and lower(trim(coalesce(enrollments.enrollment_status, 'active'))) in ('active', 'enrolled', 'in progress')
);

create policy "AFF admins can manage enrollments"
on public.enrollments
for all
to authenticated
using (public.is_aff_admin())
with check (public.is_aff_admin());

do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'enrollments_student_course_unique'
  )
  and not exists (
    select 1
    from public.enrollments
    where course_id is not null
    group by student_id, course_id
    having count(*) > 1
  ) then
    create unique index enrollments_student_course_unique
    on public.enrollments (student_id, course_id)
    where course_id is not null;
  end if;
end $$;

notify pgrst, 'reload schema';

commit;
