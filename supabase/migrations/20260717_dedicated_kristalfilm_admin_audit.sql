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

do $$
begin
  if not exists (select 1 from auth.users where lower(email) = 'kristalfilm@icloud.com') then
    raise notice 'kristalfilm@icloud.com does not exist in auth.users. Create this account in Supabase Authentication before running the admin promotion successfully.';
  end if;
end $$;

with target_admin as (
  select id, lower(email) as email
  from auth.users
  where lower(email) = 'kristalfilm@icloud.com'
),
updated_admin as (
  update public.aff_admin_users admin_user
  set user_id = target_admin.id,
      email = target_admin.email,
      role = 'administrator',
      is_active = true,
      updated_at = now()
  from target_admin
  where admin_user.user_id = target_admin.id
     or lower(admin_user.email) = target_admin.email
  returning admin_user.id
)
insert into public.aff_admin_users (user_id, email, role, is_active)
select target_admin.id, target_admin.email, 'administrator', true
from target_admin
where not exists (select 1 from updated_admin);

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
      and admin_user.role = 'administrator'
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

with target_admin as (
  select id, lower(email) as email
  from auth.users
  where lower(email) = 'kristalfilm@icloud.com'
),
updated_profile as (
  update public.admin_profiles profile
  set admin_user_id = target_admin.id,
      email = target_admin.email,
      title = coalesce(profile.title, 'Academy Administrator'),
      updated_at = now()
  from target_admin
  where profile.admin_user_id = target_admin.id
     or lower(profile.email) = target_admin.email
  returning profile.id
)
insert into public.admin_profiles (admin_user_id, email, full_name, display_name, title)
select target_admin.id, target_admin.email, 'Academy Administrator', 'Academy Administrator', 'Academy Administrator'
from target_admin
where not exists (select 1 from updated_profile);

alter table public.aff_admin_users enable row level security;
alter table public.admin_profiles enable row level security;

drop policy if exists "AFF admins can read admin role records" on public.aff_admin_users;
create policy "AFF admins can read admin role records"
on public.aff_admin_users
for select
to authenticated
using (public.is_aff_admin());

drop policy if exists "AFF admins can manage admin profiles" on public.admin_profiles;
create policy "AFF admins can manage admin profiles"
on public.admin_profiles
for all
to authenticated
using (public.is_aff_admin())
with check (public.is_aff_admin());

notify pgrst, 'reload schema';

commit;

select
  'kristalfilm auth user' as audit_area,
  id as auth_user_id,
  lower(email) as email,
  created_at,
  last_sign_in_at
from auth.users
where lower(email) = 'kristalfilm@icloud.com';

select
  'kristalfilm admin role' as audit_area,
  user_id,
  lower(email) as email,
  role,
  is_active,
  created_at,
  updated_at
from public.aff_admin_users
where lower(email) = 'kristalfilm@icloud.com';

select
  'kristalfilm accidental students rows' as audit_area,
  id,
  auth_user_id,
  student_id,
  full_name,
  email,
  enrollment_date,
  status,
  membership_plan
from public.students
where lower(email) = 'kristalfilm@icloud.com'
   or auth_user_id in (select id from auth.users where lower(email) = 'kristalfilm@icloud.com');

select
  'kristalfilm accidental student_profiles rows' as audit_area,
  *
from public.student_profiles
where lower(email) = 'kristalfilm@icloud.com'
   or auth_user_id in (select id from auth.users where lower(email) = 'kristalfilm@icloud.com');

select
  'kristalfilm accidental membership rows' as audit_area,
  *
from public.student_memberships
where student_id in (select id from auth.users where lower(email) = 'kristalfilm@icloud.com');

select
  'kristalfilm accidental enrollment rows' as audit_area,
  enrollments.*
from public.enrollments enrollments
join public.students students on students.id = enrollments.student_id
where lower(students.email) = 'kristalfilm@icloud.com'
   or students.auth_user_id in (select id from auth.users where lower(email) = 'kristalfilm@icloud.com');

select
  'acaff auth user' as audit_area,
  id as auth_user_id,
  lower(email) as email,
  created_at,
  last_sign_in_at
from auth.users
where lower(email) = 'acafffx@gmail.com';

select
  'acaff admin role' as audit_area,
  user_id,
  lower(email) as email,
  role,
  is_active,
  created_at,
  updated_at
from public.aff_admin_users
where lower(email) = 'acafffx@gmail.com';

select
  'acaff students rows' as audit_area,
  id,
  auth_user_id,
  student_id,
  full_name,
  email,
  enrollment_date,
  status,
  membership_plan
from public.students
where lower(email) = 'acafffx@gmail.com'
   or auth_user_id in (select id from auth.users where lower(email) = 'acafffx@gmail.com');

select
  'acaff student_profiles rows' as audit_area,
  *
from public.student_profiles
where lower(email) = 'acafffx@gmail.com'
   or auth_user_id in (select id from auth.users where lower(email) = 'acafffx@gmail.com');

select
  'acaff student_memberships rows' as audit_area,
  *
from public.student_memberships
where student_id in (select id from auth.users where lower(email) = 'acafffx@gmail.com');

select
  'acaff enrollments rows' as audit_area,
  enrollments.*
from public.enrollments enrollments
join public.students students on students.id = enrollments.student_id
where lower(students.email) = 'acafffx@gmail.com'
   or students.auth_user_id in (select id from auth.users where lower(email) = 'acafffx@gmail.com');
