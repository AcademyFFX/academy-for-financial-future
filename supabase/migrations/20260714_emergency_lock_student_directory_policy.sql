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

alter table public.students enable row level security;

drop policy if exists "Authenticated users can view active student directory" on public.students;
drop policy if exists "Students can read their own enrollment profile" on public.students;
drop policy if exists "Students can read own student account" on public.students;
drop policy if exists "AFF administrator can manage enrollment profiles" on public.students;
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

notify pgrst, 'reload schema';

commit;
