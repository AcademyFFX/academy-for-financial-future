create extension if not exists pgcrypto;

create table if not exists public.academic_degree_programs (
  id bigserial primary key,
  degree_id text not null unique,
  degree_name text not null unique,
  degree_level text not null,
  description text,
  credits_required numeric(6,2) not null default 0,
  program_status text not null default 'Active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.course_credits (
  id bigserial primary key,
  course_code text not null unique,
  course_title text not null,
  course_category text not null default 'Financial Markets',
  credits numeric(6,2) not null default 0,
  grade_scale text not null default 'A-F',
  created_at timestamptz not null default now()
);

create table if not exists public.student_credits (
  id bigserial primary key,
  student_id uuid not null references auth.users(id) on delete cascade,
  student_name text,
  aff_student_id text,
  course_credit_id bigint references public.course_credits(id) on delete set null,
  course_title text not null,
  credits_earned numeric(6,2) not null default 0,
  grade text not null default 'In Progress',
  completion_status text not null default 'In Progress',
  completed_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_credits_status_check check (completion_status in ('In Progress', 'Completed', 'Transferred', 'Not Started'))
);

create table if not exists public.degree_requirements (
  id bigserial primary key,
  degree_program_id bigint not null references public.academic_degree_programs(id) on delete cascade,
  requirement_name text not null,
  requirement_category text not null default 'Core',
  credits_required numeric(6,2) not null default 0,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.academic_transcript_records (
  id bigserial primary key,
  transcript_id text not null unique,
  student_id uuid not null references auth.users(id) on delete cascade,
  student_name text not null,
  aff_student_id text,
  enrollment_date date,
  degree_id text,
  degree_name text,
  courses_completed integer not null default 0,
  certifications_earned integer not null default 0,
  exams_passed integer not null default 0,
  attendance_percentage numeric(5,2) not null default 0,
  gpa_equivalent numeric(4,2) not null default 0,
  credits_earned numeric(6,2) not null default 0,
  qr_verification_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
  status text not null default 'Valid',
  issued_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint academic_transcript_status_check check (status in ('Valid', 'Revoked'))
);

create table if not exists public.graduation_approvals (
  id bigserial primary key,
  student_id uuid not null references auth.users(id) on delete cascade,
  student_name text not null,
  aff_student_id text,
  degree_program_id bigint references public.academic_degree_programs(id) on delete set null,
  degree_name text not null,
  credits_required numeric(6,2) not null default 0,
  credits_completed numeric(6,2) not null default 0,
  approval_status text not null default 'Pending Review',
  approved_by text,
  approved_at timestamptz,
  comments text,
  created_at timestamptz not null default now(),
  constraint graduation_approvals_status_check check (approval_status in ('Pending Review', 'Approved', 'Rejected'))
);

create index if not exists student_credits_student_idx on public.student_credits (student_id, completed_at desc);
create index if not exists degree_requirements_degree_idx on public.degree_requirements (degree_program_id, display_order);
create index if not exists academic_transcript_student_idx on public.academic_transcript_records (student_id, issued_at desc);
create index if not exists academic_transcript_verify_idx on public.academic_transcript_records (transcript_id, degree_id);
create index if not exists graduation_approvals_student_idx on public.graduation_approvals (student_id, created_at desc);

alter table public.academic_degree_programs enable row level security;
alter table public.course_credits enable row level security;
alter table public.student_credits enable row level security;
alter table public.degree_requirements enable row level security;
alter table public.academic_transcript_records enable row level security;
alter table public.graduation_approvals enable row level security;

drop policy if exists "Authenticated users can read academic degree programs" on public.academic_degree_programs;
drop policy if exists "AFF admin can manage academic degree programs" on public.academic_degree_programs;
drop policy if exists "Authenticated users can read course credits" on public.course_credits;
drop policy if exists "AFF admin can manage course credits" on public.course_credits;
drop policy if exists "Students can read own academic credits" on public.student_credits;
drop policy if exists "AFF admin can manage student credits" on public.student_credits;
drop policy if exists "Authenticated users can read degree requirements" on public.degree_requirements;
drop policy if exists "AFF admin can manage degree requirements" on public.degree_requirements;
drop policy if exists "Students can read own transcript records" on public.academic_transcript_records;
drop policy if exists "Students can create own transcript records" on public.academic_transcript_records;
drop policy if exists "Public can verify transcript records" on public.academic_transcript_records;
drop policy if exists "AFF admin can manage transcript records" on public.academic_transcript_records;
drop policy if exists "Students can read own graduation approvals" on public.graduation_approvals;
drop policy if exists "Students can request graduation review" on public.graduation_approvals;
drop policy if exists "AFF admin can manage graduation approvals" on public.graduation_approvals;

create policy "Authenticated users can read academic degree programs" on public.academic_degree_programs for select to authenticated using (program_status = 'Active' or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF admin can manage academic degree programs" on public.academic_degree_programs for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Authenticated users can read course credits" on public.course_credits for select to authenticated using (true);
create policy "AFF admin can manage course credits" on public.course_credits for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Students can read own academic credits" on public.student_credits for select to authenticated using (auth.uid() = student_id or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF admin can manage student credits" on public.student_credits for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Authenticated users can read degree requirements" on public.degree_requirements for select to authenticated using (true);
create policy "AFF admin can manage degree requirements" on public.degree_requirements for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Students can read own transcript records" on public.academic_transcript_records for select to authenticated using (auth.uid() = student_id or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Students can create own transcript records" on public.academic_transcript_records for insert to authenticated with check (auth.uid() = student_id);
create policy "Public can verify transcript records" on public.academic_transcript_records for select to anon using (status = 'Valid');
create policy "AFF admin can manage transcript records" on public.academic_transcript_records for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Students can read own graduation approvals" on public.graduation_approvals for select to authenticated using (auth.uid() = student_id or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Students can request graduation review" on public.graduation_approvals for insert to authenticated with check (auth.uid() = student_id);
create policy "AFF admin can manage graduation approvals" on public.graduation_approvals for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

grant select, insert, update, delete on public.academic_degree_programs to authenticated;
grant select, insert, update, delete on public.course_credits to authenticated;
grant select, insert, update, delete on public.student_credits to authenticated;
grant select, insert, update, delete on public.degree_requirements to authenticated;
grant select, insert, update, delete on public.academic_transcript_records to authenticated;
grant select, insert, update, delete on public.graduation_approvals to authenticated;
grant select on public.academic_transcript_records to anon;
grant usage, select on sequence public.academic_degree_programs_id_seq to authenticated;
grant usage, select on sequence public.course_credits_id_seq to authenticated;
grant usage, select on sequence public.student_credits_id_seq to authenticated;
grant usage, select on sequence public.degree_requirements_id_seq to authenticated;
grant usage, select on sequence public.academic_transcript_records_id_seq to authenticated;
grant usage, select on sequence public.graduation_approvals_id_seq to authenticated;

insert into public.academic_degree_programs (degree_id, degree_name, degree_level, description, credits_required)
values
  ('AFF-AFM', 'Associate of Financial Markets', 'Associate', 'Foundational academic pathway in forex markets, risk discipline, technical analysis, and professional trading literacy.', 60),
  ('AFF-BATS', 'Bachelor of Applied Trading Science', 'Bachelor', 'Applied trading science degree focused on institutional market analysis, economic intelligence, and disciplined execution.', 120),
  ('AFF-MIMA', 'Master of Institutional Market Analysis', 'Master', 'Graduate-level study of institutional order flow, macroeconomic intelligence, liquidity research, and market leadership.', 36),
  ('AFF-DFCS', 'Doctorate of Financial Civilization Studies', 'Doctorate', 'Doctoral framework connecting financial literacy, economic intelligence, civic leadership, and human flourishing.', 60)
on conflict (degree_id) do update set
  degree_name = excluded.degree_name,
  degree_level = excluded.degree_level,
  description = excluded.description,
  credits_required = excluded.credits_required,
  updated_at = now();

insert into public.course_credits (course_code, course_title, course_category, credits)
values
  ('AFF-FX-101', 'Forex Foundations', 'Financial Markets', 3),
  ('AFF-TA-201', 'Technical Analysis Lab', 'Financial Markets', 3),
  ('AFF-RM-210', 'Risk and Capital Protection', 'Risk Management', 3),
  ('AFF-IS-301', 'Institutional Forex Strategy', 'Institutional Trading', 4),
  ('AFF-FA-220', 'Forex Anatomy', 'Financial Markets', 4),
  ('AFF-EI-310', 'Economic Intelligence', 'Economic Research', 3),
  ('AFF-CL-150', 'Civic and Moral Leadership', 'Civic Leadership', 3),
  ('AFF-RS-400', 'Research Methods and Publication', 'Research', 3)
on conflict (course_code) do update set
  course_title = excluded.course_title,
  course_category = excluded.course_category,
  credits = excluded.credits;

insert into public.degree_requirements (degree_program_id, requirement_name, requirement_category, credits_required, display_order)
select degree.id, seed.requirement_name, seed.requirement_category, seed.credits_required, seed.display_order
from public.academic_degree_programs degree
cross join (
  values
    ('Core Financial Markets', 'Core', 18, 1),
    ('Risk and Ethics', 'Core', 9, 2),
    ('Economic Intelligence', 'Major', 9, 3),
    ('Research or Capstone', 'Capstone', 6, 4)
) as seed(requirement_name, requirement_category, credits_required, display_order)
where not exists (
  select 1 from public.degree_requirements existing
  where existing.degree_program_id = degree.id
    and existing.requirement_name = seed.requirement_name
);

notify pgrst, 'reload schema';
