create sequence if not exists public.aff_student_id_seq;

create table if not exists public.student_applications (
  id bigserial primary key,
  auth_user_id uuid references auth.users(id) on delete set null,
  student_id text,
  first_name text not null,
  last_name text not null,
  full_name text not null,
  email text not null,
  phone text,
  country text,
  program_interest text not null default 'Academy for Financial Future',
  membership_plan text not null default 'Free Trial',
  goal_statement text,
  application_status text not null default 'Pending Review',
  reviewed_by text,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_applications_status_check check (application_status in ('Pending Review', 'Approved', 'Rejected', 'Suspended', 'Graduated'))
);

create table if not exists public.student_profiles (
  id bigserial primary key,
  auth_user_id uuid not null references auth.users(id) on delete cascade unique,
  student_id text not null,
  full_name text not null,
  email text not null,
  phone text,
  country text,
  program_interest text not null default 'Academy for Financial Future',
  membership_level text not null default 'Free Trial',
  certification_status text not null default 'Pending Review',
  enrollment_status text not null default 'Pending Review',
  profile_photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_status_history (
  id bigserial primary key,
  auth_user_id uuid references auth.users(id) on delete cascade,
  student_id text,
  previous_status text,
  new_status text not null,
  changed_by text not null default 'system',
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.student_mentor_assignments (
  id bigserial primary key,
  auth_user_id uuid references auth.users(id) on delete cascade,
  student_id text,
  mentor_name text not null,
  mentor_email text,
  assignment_status text not null default 'Assigned',
  assigned_by text not null default 'acafffx@gmail.com',
  assigned_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.students
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null,
  add column if not exists student_id text,
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists program_interest text not null default 'Academy for Financial Future',
  add column if not exists goal_statement text,
  add column if not exists membership_plan text not null default 'Free Trial',
  add column if not exists membership_status text not null default 'Active',
  add column if not exists profile_photo_url text,
  add column if not exists updated_at timestamptz not null default now();

update public.students
set student_id = 'AFF-' || extract(year from coalesce(enrollment_date, current_date))::int || '-' || lpad(nextval('public.aff_student_id_seq')::text, 5, '0')
where student_id is null or trim(student_id) = '';

alter table public.students
  alter column student_id set default ('AFF-' || extract(year from current_date)::int || '-' || lpad(nextval('public.aff_student_id_seq')::text, 5, '0')),
  alter column student_id set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'students_student_id_key'
      and conrelid = 'public.students'::regclass
  ) then
    alter table public.students add constraint students_student_id_key unique (student_id);
  end if;
end $$;

create index if not exists students_auth_user_id_idx on public.students (auth_user_id);
create index if not exists students_email_idx on public.students (lower(email));
create index if not exists students_status_membership_idx on public.students (status, membership_status);
create index if not exists student_applications_auth_user_idx on public.student_applications (auth_user_id, created_at desc);
create index if not exists student_applications_status_idx on public.student_applications (application_status, created_at desc);
create index if not exists student_profiles_auth_user_idx on public.student_profiles (auth_user_id);
create index if not exists student_status_history_auth_user_idx on public.student_status_history (auth_user_id, created_at desc);
create index if not exists student_mentor_assignments_auth_user_idx on public.student_mentor_assignments (auth_user_id, assigned_at desc);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'student-profile-photos',
  'student-profile-photos',
  true,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set public = true,
    file_size_limit = 10485760,
    allowed_mime_types = excluded.allowed_mime_types;

alter table public.students enable row level security;
alter table public.student_applications enable row level security;
alter table public.student_profiles enable row level security;
alter table public.student_memberships enable row level security;
alter table public.student_status_history enable row level security;
alter table public.student_mentor_assignments enable row level security;

grant select, insert, update on public.students to authenticated;
grant insert on public.students to anon;
grant select, insert, update on public.student_applications to authenticated;
grant select, insert, update on public.student_profiles to authenticated;
grant select, insert, update on public.student_memberships to authenticated;
grant select, insert on public.student_status_history to authenticated;
grant select, insert, update on public.student_mentor_assignments to authenticated;
grant usage, select on sequence public.aff_student_id_seq to authenticated;
grant usage, select on sequence public.aff_student_id_seq to anon;
grant usage, select on sequence public.student_applications_id_seq to authenticated;
grant usage, select on sequence public.student_profiles_id_seq to authenticated;
grant usage, select on sequence public.student_status_history_id_seq to authenticated;
grant usage, select on sequence public.student_mentor_assignments_id_seq to authenticated;

drop policy if exists "Students can read their own enrollment profile" on public.students;
drop policy if exists "Students can update their own enrollment profile" on public.students;
drop policy if exists "Authenticated users can view active student directory" on public.students;
drop policy if exists "AFF administrator can manage enrollment profiles" on public.students;

create policy "Students can read their own enrollment profile"
on public.students
for select
to authenticated
using (
  auth.uid() = auth_user_id
  or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com'
);

create policy "Students can update their own enrollment profile"
on public.students
for update
to authenticated
using (auth.uid() = auth_user_id or lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')))
with check (auth.uid() = auth_user_id or lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

create policy "Authenticated users can view active student directory"
on public.students
for select
to authenticated
using (status = 'Active');

create policy "AFF administrator can manage enrollment profiles"
on public.students
for all
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Students can create own application" on public.student_applications;
drop policy if exists "Students can read own application" on public.student_applications;
drop policy if exists "AFF administrator can manage student applications" on public.student_applications;
drop policy if exists "Students can read own student profile" on public.student_profiles;
drop policy if exists "Students can update own student profile photo" on public.student_profiles;
drop policy if exists "AFF administrator can manage student profiles" on public.student_profiles;
drop policy if exists "Students can read own status history" on public.student_status_history;
drop policy if exists "AFF administrator can manage status history" on public.student_status_history;
drop policy if exists "Students can read own mentor assignment" on public.student_mentor_assignments;
drop policy if exists "AFF administrator can manage mentor assignments" on public.student_mentor_assignments;

create policy "Students can create own application"
on public.student_applications
for insert
to authenticated
with check (auth.uid() = auth_user_id);

create policy "Students can read own application"
on public.student_applications
for select
to authenticated
using (auth.uid() = auth_user_id or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

create policy "AFF administrator can manage student applications"
on public.student_applications
for all
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

create policy "Students can read own student profile"
on public.student_profiles
for select
to authenticated
using (auth.uid() = auth_user_id or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

create policy "Students can update own student profile photo"
on public.student_profiles
for update
to authenticated
using (auth.uid() = auth_user_id)
with check (auth.uid() = auth_user_id);

create policy "AFF administrator can manage student profiles"
on public.student_profiles
for all
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

create policy "Students can read own status history"
on public.student_status_history
for select
to authenticated
using (auth.uid() = auth_user_id or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

create policy "AFF administrator can manage status history"
on public.student_status_history
for all
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

create policy "Students can read own mentor assignment"
on public.student_mentor_assignments
for select
to authenticated
using (auth.uid() = auth_user_id or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

create policy "AFF administrator can manage mentor assignments"
on public.student_mentor_assignments
for all
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Students can create their enrollment membership" on public.student_memberships;
drop policy if exists "Students can update their enrollment membership" on public.student_memberships;

create policy "Students can create their enrollment membership"
on public.student_memberships
for insert
to authenticated
with check (auth.uid() = student_id);

create policy "Students can update their enrollment membership"
on public.student_memberships
for update
to authenticated
using (auth.uid() = student_id)
with check (auth.uid() = student_id);

drop policy if exists "Students can upload own profile photo" on storage.objects;
drop policy if exists "Students can read profile photos" on storage.objects;
drop policy if exists "Students can update own profile photo" on storage.objects;
drop policy if exists "AFF administrator can manage profile photos" on storage.objects;

create policy "Students can upload own profile photo"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'student-profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Students can read profile photos"
on storage.objects
for select
to authenticated
using (bucket_id = 'student-profile-photos');

create policy "Students can update own profile photo"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'student-profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'student-profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "AFF administrator can manage profile photos"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'student-profile-photos'
  and lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com'
)
with check (
  bucket_id = 'student-profile-photos'
  and lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com'
);

notify pgrst, 'reload schema';
