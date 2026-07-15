begin;

create extension if not exists pgcrypto;

create table if not exists public.aff_admin_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'administrator',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id),
  unique (email)
);

insert into public.aff_admin_users (user_id, email, role, is_active)
select id, lower(email), 'administrator', true
from auth.users
where lower(email) = 'acafffx@gmail.com'
on conflict (email) do update
set user_id = excluded.user_id,
    role = 'administrator',
    is_active = true,
    updated_at = now();

alter table public.aff_admin_users enable row level security;

create or replace function public.is_aff_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.aff_admin_users admin_user
    where admin_user.user_id = auth.uid()
      and admin_user.is_active = true
  );
$$;

revoke all on function public.is_aff_admin() from public;
grant execute on function public.is_aff_admin() to authenticated;

drop policy if exists "AFF admins can read admin role records" on public.aff_admin_users;
drop policy if exists "AFF admins can manage admin role records" on public.aff_admin_users;
create policy "AFF admins can read admin role records"
on public.aff_admin_users
for select
to authenticated
using (public.is_aff_admin());

create policy "AFF admins can manage admin role records"
on public.aff_admin_users
for all
to authenticated
using (public.is_aff_admin())
with check (public.is_aff_admin());

create or replace function public.get_aff_student_directory()
returns table (
  student_id text,
  full_name text,
  email text,
  enrollment_date text,
  certification_level text,
  enrollment_status text,
  active_membership_plan text,
  membership_status text
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if not public.is_aff_admin() then
    raise exception 'AFF administrator access required for student directory.'
      using errcode = '42501';
  end if;

  return query
  select
    s.student_id::text,
    s.full_name::text,
    s.email::text,
    s.enrollment_date::text,
    s.certification_level::text,
    s.status::text as enrollment_status,
    coalesce(sm.active_membership_plan, s.membership_plan, 'Free Trial')::text as active_membership_plan,
    coalesce(sm.membership_status, 'Pending Payment')::text as membership_status
  from public.students s
  left join public.student_memberships sm
    on s.auth_user_id = sm.student_id
  where lower(trim(coalesce(s.status, ''))) = 'active'
  order by s.full_name asc;
end;
$$;

revoke all on function public.get_aff_student_directory() from public;
revoke execute on function public.get_aff_student_directory() from anon;
revoke execute on function public.get_aff_student_directory() from authenticated;
grant execute on function public.get_aff_student_directory() to service_role;

alter table public.students enable row level security;
alter table public.student_applications enable row level security;
alter table public.student_memberships enable row level security;
alter table public.enrollments enable row level security;
alter table public.assignments enable row level security;
alter table public.homework_submissions enable row level security;
alter table public.certificates enable row level security;

grant select, insert, update on public.students to authenticated;
grant select, insert, update on public.student_applications to authenticated;
grant select, insert, update on public.student_memberships to authenticated;
grant select, insert, update on public.enrollments to authenticated;
grant select, insert, update on public.assignments to authenticated;
grant select, insert, update on public.homework_submissions to authenticated;
grant select, insert on public.certificates to authenticated;

drop policy if exists "Students can read own student account" on public.students;
drop policy if exists "AFF admin can update students for approval sync" on public.students;
drop policy if exists "AFF admins can manage student accounts" on public.students;
create policy "Students can read own student account"
on public.students
for select
to authenticated
using (
  auth.uid() = auth_user_id
  or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  or public.is_aff_admin()
);

create policy "AFF admins can manage student accounts"
on public.students
for all
to authenticated
using (public.is_aff_admin())
with check (public.is_aff_admin());

drop policy if exists "Students can read own enrollment application" on public.student_applications;
drop policy if exists "Students can read own dashboard application" on public.student_applications;
drop policy if exists "Students can create own dashboard application" on public.student_applications;
drop policy if exists "Students can create own enrollment application" on public.student_applications;
drop policy if exists "AFF admin can approve enrollment applications" on public.student_applications;
drop policy if exists "AFF admin can manage dashboard applications" on public.student_applications;
drop policy if exists "AFF admins can manage enrollment applications" on public.student_applications;
create policy "Students can read own enrollment application"
on public.student_applications
for select
to authenticated
using (
  auth.uid() = auth_user_id
  or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  or public.is_aff_admin()
);

create policy "Students can create own enrollment application"
on public.student_applications
for insert
to authenticated
with check (auth.uid() = auth_user_id);

create policy "AFF admins can manage enrollment applications"
on public.student_applications
for all
to authenticated
using (public.is_aff_admin())
with check (public.is_aff_admin());

drop policy if exists "Students can read own student membership" on public.student_memberships;
drop policy if exists "Students can create own membership record" on public.student_memberships;
drop policy if exists "Students can manage own membership record" on public.student_memberships;
drop policy if exists "AFF admin can manage student memberships" on public.student_memberships;
drop policy if exists "AFF admins can manage student memberships" on public.student_memberships;
create policy "Students can read own student membership"
on public.student_memberships
for select
to authenticated
using (auth.uid() = student_id or public.is_aff_admin());

create policy "Students can create own membership record"
on public.student_memberships
for insert
to authenticated
with check (auth.uid() = student_id);

create policy "AFF admins can manage student memberships"
on public.student_memberships
for all
to authenticated
using (public.is_aff_admin())
with check (public.is_aff_admin());

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
      and (s.auth_user_id = auth.uid() or lower(s.email) = lower(coalesce(auth.jwt() ->> 'email', '')))
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
  )
);

create policy "Students can update own enrollments"
on public.enrollments
for update
to authenticated
using (
  exists (
    select 1
    from public.students s
    where s.id = enrollments.student_id
      and s.auth_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.students s
    where s.id = enrollments.student_id
      and s.auth_user_id = auth.uid()
  )
);

create policy "AFF admins can manage enrollments"
on public.enrollments
for all
to authenticated
using (public.is_aff_admin())
with check (public.is_aff_admin());

drop policy if exists "Students can read own assignments" on public.assignments;
drop policy if exists "Students can create own assignment submissions" on public.assignments;
drop policy if exists "AFF admins can manage assignments" on public.assignments;
create policy "Students can read own assignments"
on public.assignments
for select
to authenticated
using (auth.uid() = student_id or public.is_aff_admin());

create policy "Students can create own assignment submissions"
on public.assignments
for insert
to authenticated
with check (auth.uid() = student_id);

create policy "AFF admins can manage assignments"
on public.assignments
for all
to authenticated
using (public.is_aff_admin())
with check (public.is_aff_admin());

drop policy if exists "Students can manage own dashboard homework" on public.homework_submissions;
drop policy if exists "Students can manage own homework submissions" on public.homework_submissions;
drop policy if exists "AFF admin can manage dashboard homework" on public.homework_submissions;
drop policy if exists "AFF admins can manage homework submissions" on public.homework_submissions;
create policy "Students can manage own homework submissions"
on public.homework_submissions
for all
to authenticated
using (auth.uid() = student_id)
with check (auth.uid() = student_id);

create policy "AFF admins can manage homework submissions"
on public.homework_submissions
for all
to authenticated
using (public.is_aff_admin())
with check (public.is_aff_admin());

drop policy if exists "Students can read own dashboard certificates" on public.certificates;
drop policy if exists "Students can create own dashboard certificates" on public.certificates;
drop policy if exists "Students can read own certificates" on public.certificates;
drop policy if exists "Students can create own certificates" on public.certificates;
drop policy if exists "AFF admin can manage dashboard certificates" on public.certificates;
drop policy if exists "AFF admins can manage certificates" on public.certificates;
create policy "Students can read own certificates"
on public.certificates
for select
to authenticated
using (auth.uid() = student_id or public.is_aff_admin());

create policy "Students can create own certificates"
on public.certificates
for insert
to authenticated
with check (auth.uid() = student_id);

create policy "AFF admins can manage certificates"
on public.certificates
for all
to authenticated
using (public.is_aff_admin())
with check (public.is_aff_admin());

do $$
begin
  if to_regclass('public.exams') is not null then
    execute 'alter table public.exams enable row level security';
    execute 'grant select, insert, update on public.exams to authenticated';
    execute 'drop policy if exists "Students can read own exams" on public.exams';
    execute 'drop policy if exists "Students can manage own exams" on public.exams';
    execute 'drop policy if exists "AFF admins can manage exams" on public.exams';
    execute 'create policy "Students can manage own exams" on public.exams for all to authenticated using (auth.uid()::text = student_id::text) with check (auth.uid()::text = student_id::text)';
    execute 'create policy "AFF admins can manage exams" on public.exams for all to authenticated using (public.is_aff_admin()) with check (public.is_aff_admin())';
  end if;

  if to_regclass('public.quiz_attempts') is not null then
    execute 'alter table public.quiz_attempts enable row level security';
    execute 'grant select, insert, update on public.quiz_attempts to authenticated';
    execute 'drop policy if exists "Students can manage own quiz attempts" on public.quiz_attempts';
    execute 'drop policy if exists "AFF admins can manage quiz attempts" on public.quiz_attempts';
    execute 'create policy "Students can manage own quiz attempts" on public.quiz_attempts for all to authenticated using (auth.uid()::text = student_id::text) with check (auth.uid()::text = student_id::text)';
    execute 'create policy "AFF admins can manage quiz attempts" on public.quiz_attempts for all to authenticated using (public.is_aff_admin()) with check (public.is_aff_admin())';
  end if;
end $$;

notify pgrst, 'reload schema';

commit;
