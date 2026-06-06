-- Build AFF Instructor Admin Dashboard database support.
-- Run this in Supabase SQL Editor after the core student tables exist.

alter table public.profiles
  add column if not exists email text,
  add column if not exists certification_level text not null default 'Forex Training Division';

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.assignments enable row level security;
alter table public.exams enable row level security;
alter table public.certificates enable row level security;
alter table public.announcements enable row level security;

grant select on public.profiles to authenticated;
grant select on public.assignments to authenticated;
grant select on public.exams to authenticated;
grant select on public.certificates to authenticated;
grant select, insert, update, delete on public.announcements to authenticated;

drop policy if exists "Admins can read all profiles" on public.profiles;
drop policy if exists "Admins can read all assignments" on public.assignments;
drop policy if exists "Admins can read all exams" on public.exams;
drop policy if exists "Admins can read all certificates" on public.certificates;
drop policy if exists "Admins can manage announcements" on public.announcements;

create policy "Admins can read all profiles"
on public.profiles
for select
to authenticated
using (public.is_admin());

create policy "Admins can read all assignments"
on public.assignments
for select
to authenticated
using (public.is_admin());

create policy "Admins can read all exams"
on public.exams
for select
to authenticated
using (public.is_admin());

create policy "Admins can read all certificates"
on public.certificates
for select
to authenticated
using (public.is_admin());

create policy "Admins can manage announcements"
on public.announcements
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

notify pgrst, 'reload schema';
