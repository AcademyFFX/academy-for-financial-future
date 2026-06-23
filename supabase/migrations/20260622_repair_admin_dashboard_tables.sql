create extension if not exists pgcrypto;

create table if not exists public.student_applications (
  id bigserial primary key,
  auth_user_id uuid references auth.users(id) on delete set null,
  student_id text,
  first_name text not null default '',
  last_name text not null default '',
  full_name text not null default '',
  email text not null default '',
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
  updated_at timestamptz not null default now()
);

alter table public.student_applications
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null,
  add column if not exists student_id text,
  add column if not exists first_name text not null default '',
  add column if not exists last_name text not null default '',
  add column if not exists full_name text not null default '',
  add column if not exists email text not null default '',
  add column if not exists phone text,
  add column if not exists country text,
  add column if not exists program_interest text not null default 'Academy for Financial Future',
  add column if not exists membership_plan text not null default 'Free Trial',
  add column if not exists goal_statement text,
  add column if not exists application_status text not null default 'Pending Review',
  add column if not exists reviewed_by text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_notes text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  course_id bigint,
  course_name text,
  enrollment_status text not null default 'Active',
  progress_percentage numeric(5,2) not null default 0,
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.enrollments
  add column if not exists student_id uuid references auth.users(id) on delete cascade,
  add column if not exists course_id bigint,
  add column if not exists course_name text,
  add column if not exists enrollment_status text not null default 'Active',
  add column if not exists progress_percentage numeric(5,2) not null default 0,
  add column if not exists enrolled_at timestamptz not null default now(),
  add column if not exists completed_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  certificate_number text,
  student_id uuid not null references auth.users(id) on delete cascade,
  student_name text not null default 'Student',
  course_name text not null default 'Academy for Financial Future',
  score numeric(5,2) not null default 100,
  issue_date date not null default current_date,
  verification_code text,
  created_at timestamptz not null default now()
);

alter table public.certificates
  add column if not exists certificate_number text,
  add column if not exists student_id uuid references auth.users(id) on delete cascade,
  add column if not exists student_name text not null default 'Student',
  add column if not exists course_name text not null default 'Academy for Financial Future',
  add column if not exists score numeric(5,2) not null default 100,
  add column if not exists issue_date date not null default current_date,
  add column if not exists verification_code text,
  add column if not exists created_at timestamptz not null default now();

create table if not exists public.homework_submissions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  student_name text,
  student_email text,
  title text not null default 'Homework Submission',
  course_module text,
  lesson_title text,
  homework_type text not null default 'General Homework',
  student_notes text,
  pdf_url text,
  pdf_path text,
  docx_url text,
  docx_path text,
  screenshot_url text,
  screenshot_path text,
  chart_analysis_url text,
  chart_analysis_path text,
  status text not null default 'Submitted',
  score numeric(5,2),
  instructor_comments text,
  corrections text,
  graded_by text,
  graded_at timestamptz,
  completion_date date,
  grading_history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.homework_submissions
  add column if not exists student_id uuid references auth.users(id) on delete cascade,
  add column if not exists student_name text,
  add column if not exists student_email text,
  add column if not exists title text not null default 'Homework Submission',
  add column if not exists course_module text,
  add column if not exists lesson_title text,
  add column if not exists homework_type text not null default 'General Homework',
  add column if not exists student_notes text,
  add column if not exists pdf_url text,
  add column if not exists pdf_path text,
  add column if not exists docx_url text,
  add column if not exists docx_path text,
  add column if not exists screenshot_url text,
  add column if not exists screenshot_path text,
  add column if not exists chart_analysis_url text,
  add column if not exists chart_analysis_path text,
  add column if not exists status text not null default 'Submitted',
  add column if not exists score numeric(5,2),
  add column if not exists instructor_comments text,
  add column if not exists corrections text,
  add column if not exists graded_by text,
  add column if not exists graded_at timestamptz,
  add column if not exists completion_date date,
  add column if not exists grading_history jsonb not null default '[]'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.live_class_sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'AFF Live Class',
  description text,
  instructor_name text not null default 'Dr. Jean Rene Moricette',
  session_date timestamptz not null default now(),
  duration_minutes integer not null default 60,
  meeting_id text,
  passcode text,
  join_url text,
  recording_url text,
  class_notes_title text,
  class_notes_url text,
  homework_title text,
  homework_instructions text,
  homework_due_date date,
  homework_url text,
  status text not null default 'Scheduled',
  created_by text not null default 'acafffx@gmail.com',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.live_class_sessions
  add column if not exists title text not null default 'AFF Live Class',
  add column if not exists description text,
  add column if not exists instructor_name text not null default 'Dr. Jean Rene Moricette',
  add column if not exists session_date timestamptz not null default now(),
  add column if not exists duration_minutes integer not null default 60,
  add column if not exists meeting_id text,
  add column if not exists passcode text,
  add column if not exists join_url text,
  add column if not exists recording_url text,
  add column if not exists class_notes_title text,
  add column if not exists class_notes_url text,
  add column if not exists homework_title text,
  add column if not exists homework_instructions text,
  add column if not exists homework_due_date date,
  add column if not exists homework_url text,
  add column if not exists status text not null default 'Scheduled',
  add column if not exists created_by text not null default 'acafffx@gmail.com',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists student_applications_status_created_idx on public.student_applications (application_status, created_at desc);
create index if not exists enrollments_student_created_idx on public.enrollments (student_id, created_at desc);
create unique index if not exists certificates_number_unique_idx on public.certificates (certificate_number) where certificate_number is not null;
create unique index if not exists certificates_verification_unique_idx on public.certificates (verification_code) where verification_code is not null;
create index if not exists homework_submissions_student_created_idx on public.homework_submissions (student_id, created_at desc);
create index if not exists live_class_sessions_status_date_idx on public.live_class_sessions (status, session_date);

alter table public.student_applications enable row level security;
alter table public.enrollments enable row level security;
alter table public.certificates enable row level security;
alter table public.homework_submissions enable row level security;
alter table public.live_class_sessions enable row level security;

grant select, insert, update, delete on public.student_applications to authenticated;
grant select, insert, update, delete on public.enrollments to authenticated;
grant select, insert, update, delete on public.certificates to authenticated;
grant select on public.certificates to anon;
grant select, insert, update, delete on public.homework_submissions to authenticated;
grant select, insert, update, delete on public.live_class_sessions to authenticated;

do $$
begin
  if to_regclass('public.student_applications_id_seq') is not null then
    execute 'grant usage, select on sequence public.student_applications_id_seq to authenticated';
  end if;
  if to_regclass('public.homework_submissions_id_seq') is not null then
    execute 'grant usage, select on sequence public.homework_submissions_id_seq to authenticated';
  end if;
end $$;

drop policy if exists "Students can create own dashboard application" on public.student_applications;
drop policy if exists "Students can read own dashboard application" on public.student_applications;
drop policy if exists "AFF admin can manage dashboard applications" on public.student_applications;
create policy "Students can create own dashboard application" on public.student_applications for insert to authenticated
with check (auth.uid()::text = auth_user_id::text);
create policy "Students can read own dashboard application" on public.student_applications for select to authenticated
using (auth.uid()::text = auth_user_id::text or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF admin can manage dashboard applications" on public.student_applications for all to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Students can manage own enrollments" on public.enrollments;
drop policy if exists "AFF admin can manage enrollments" on public.enrollments;
create policy "Students can manage own enrollments" on public.enrollments for all to authenticated
using (auth.uid()::text = student_id::text)
with check (auth.uid()::text = student_id::text);
create policy "AFF admin can manage enrollments" on public.enrollments for all to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Public can verify dashboard certificates" on public.certificates;
drop policy if exists "Students can read own dashboard certificates" on public.certificates;
drop policy if exists "Students can create own dashboard certificates" on public.certificates;
drop policy if exists "AFF admin can manage dashboard certificates" on public.certificates;
create policy "Public can verify dashboard certificates" on public.certificates for select to anon using (true);
create policy "Students can read own dashboard certificates" on public.certificates for select to authenticated
using (auth.uid()::text = student_id::text or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Students can create own dashboard certificates" on public.certificates for insert to authenticated
with check (auth.uid()::text = student_id::text);
create policy "AFF admin can manage dashboard certificates" on public.certificates for all to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Students can manage own dashboard homework" on public.homework_submissions;
drop policy if exists "AFF admin can manage dashboard homework" on public.homework_submissions;
create policy "Students can manage own dashboard homework" on public.homework_submissions for all to authenticated
using (auth.uid()::text = student_id::text)
with check (auth.uid()::text = student_id::text);
create policy "AFF admin can manage dashboard homework" on public.homework_submissions for all to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Students can read live class sessions" on public.live_class_sessions;
drop policy if exists "AFF admin can manage live class sessions" on public.live_class_sessions;
create policy "Students can read live class sessions" on public.live_class_sessions for select to authenticated
using (status <> 'Cancelled' or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF admin can manage live class sessions" on public.live_class_sessions for all to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

notify pgrst, 'reload schema';
