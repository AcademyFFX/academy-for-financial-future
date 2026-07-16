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

create table if not exists public.admin_profiles (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  display_name text,
  title text not null default 'Academy Administrator',
  phone text,
  photo_url text,
  contact_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (admin_user_id),
  unique (email)
);

insert into public.admin_profiles (admin_user_id, email, full_name, display_name, title)
select
  admin_user.user_id,
  admin_user.email,
  'Dr. Jean Rene Moricette',
  'Dr. Jean Rene Moricette',
  'Academy Administrator'
from public.aff_admin_users admin_user
where lower(admin_user.email) = 'acafffx@gmail.com'
  and admin_user.is_active = true
on conflict (email) do update
set admin_user_id = excluded.admin_user_id,
    full_name = coalesce(public.admin_profiles.full_name, excluded.full_name),
    display_name = coalesce(public.admin_profiles.display_name, excluded.display_name),
    title = coalesce(public.admin_profiles.title, excluded.title),
    updated_at = now();

alter table public.admin_profiles enable row level security;

drop policy if exists "AFF admins can read admin profiles" on public.admin_profiles;
drop policy if exists "AFF admins can manage admin profiles" on public.admin_profiles;

create policy "AFF admins can read admin profiles"
on public.admin_profiles
for select
to authenticated
using (public.is_aff_admin());

create policy "AFF admins can manage admin profiles"
on public.admin_profiles
for all
to authenticated
using (public.is_aff_admin())
with check (public.is_aff_admin());

notify pgrst, 'reload schema';

commit;

-- Audit-only queries for accidental administrator rows in student tables.
-- Run these manually in Supabase SQL Editor. Do not delete anything automatically.
--
-- select 'students' as table_name, count(*) as matching_rows
-- from public.students
-- where lower(email) = 'acafffx@gmail.com'
-- union all
-- select 'student_applications', count(*)
-- from public.student_applications
-- where lower(email) = 'acafffx@gmail.com'
-- union all
-- select 'student_memberships', count(*)
-- from public.student_memberships
-- where lower(coalesce(student_email, '')) = 'acafffx@gmail.com'
-- union all
-- select 'enrollments', count(*)
-- from public.enrollments e
-- where exists (
--   select 1
--   from public.students s
--   where s.id = e.student_id
--     and lower(s.email) = 'acafffx@gmail.com'
-- );
--
-- Safe cleanup SQL for review only, if accidental rows are confirmed:
--
-- begin;
-- update public.students
-- set status = 'Suspended',
--     updated_at = now()
-- where lower(email) = 'acafffx@gmail.com';
-- commit;
