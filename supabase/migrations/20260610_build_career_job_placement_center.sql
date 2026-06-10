create table if not exists public.career_profiles (
  id bigserial primary key,
  student_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  career_goal text,
  forex_skills text,
  certification_status text not null default 'In Progress',
  resume_summary text,
  resume_url text,
  portfolio_url text,
  placement_status text not null default 'Seeking Opportunities',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id),
  constraint career_profiles_placement_status_check check (placement_status in ('Seeking Opportunities', 'Interviewing', 'Placed', 'Not Seeking'))
);

create table if not exists public.career_employers (
  id bigserial primary key,
  employer_name text not null,
  industry text not null default 'Financial Services',
  contact_name text,
  contact_email text not null,
  website_url text,
  portal_status text not null default 'Active',
  verification_access boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint career_employers_status_check check (portal_status in ('Active', 'Pending', 'Suspended', 'Archived'))
);

create table if not exists public.career_opportunities (
  id bigserial primary key,
  employer_id bigint references public.career_employers(id) on delete set null,
  employer_name text not null,
  title text not null,
  opportunity_type text not null default 'Job',
  location text,
  compensation text,
  description text not null,
  certification_required text,
  application_url text,
  status text not null default 'Open',
  posted_at timestamptz not null default now(),
  expires_at timestamptz,
  created_by text not null default 'acafffx@gmail.com',
  constraint career_opportunities_type_check check (opportunity_type in ('Internship', 'Job', 'Apprenticeship', 'Mentorship Placement', 'Workshop Placement')),
  constraint career_opportunities_status_check check (status in ('Open', 'Paused', 'Filled', 'Closed'))
);

create table if not exists public.career_applications (
  id bigserial primary key,
  student_id uuid not null references auth.users(id) on delete cascade,
  student_name text not null,
  student_email text not null,
  opportunity_id bigint references public.career_opportunities(id) on delete set null,
  opportunity_title text not null,
  employer_name text not null,
  resume_url text,
  certification_status text,
  application_status text not null default 'Submitted',
  recruiter_notes text,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint career_applications_status_check check (application_status in ('Submitted', 'Screening', 'Interview', 'Offer', 'Placed', 'Rejected', 'Withdrawn'))
);

create table if not exists public.career_mentor_matches (
  id bigserial primary key,
  student_id uuid not null references auth.users(id) on delete cascade,
  student_name text not null,
  student_email text not null,
  mentor_name text,
  mentor_email text,
  focus_area text not null,
  match_status text not null default 'Requested',
  scheduled_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint career_mentor_matches_status_check check (match_status in ('Requested', 'Matched', 'Active', 'Completed', 'Cancelled'))
);

create table if not exists public.career_placements (
  id bigserial primary key,
  student_id uuid references auth.users(id) on delete set null,
  student_name text not null,
  student_email text not null,
  employer_id bigint references public.career_employers(id) on delete set null,
  employer_name text not null,
  job_title text not null,
  placement_type text not null default 'Job',
  placement_status text not null default 'Placed',
  start_date date,
  salary_range text,
  certification_used text,
  placement_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint career_placements_status_check check (placement_status in ('Placed', 'Probation', 'Completed', 'Withdrawn')),
  constraint career_placements_type_check check (placement_type in ('Internship', 'Job', 'Mentorship', 'Apprenticeship'))
);

create table if not exists public.career_employer_verifications (
  id bigserial primary key,
  employer_id bigint references public.career_employers(id) on delete set null,
  employer_name text not null,
  verifier_email text not null,
  student_email text not null,
  credential_checked text not null,
  certificate_number text,
  verification_code text,
  verification_status text not null default 'Verified',
  verified_at timestamptz not null default now(),
  notes text,
  constraint career_employer_verifications_status_check check (verification_status in ('Verified', 'Not Found', 'Needs Review'))
);

create index if not exists career_profiles_student_idx on public.career_profiles (student_id);
create index if not exists career_opportunities_status_idx on public.career_opportunities (status, posted_at desc);
create index if not exists career_applications_student_idx on public.career_applications (student_id, submitted_at desc);
create index if not exists career_mentor_matches_student_idx on public.career_mentor_matches (student_id, created_at desc);
create index if not exists career_placements_student_idx on public.career_placements (student_id, created_at desc);

alter table public.career_profiles enable row level security;
alter table public.career_employers enable row level security;
alter table public.career_opportunities enable row level security;
alter table public.career_applications enable row level security;
alter table public.career_mentor_matches enable row level security;
alter table public.career_placements enable row level security;
alter table public.career_employer_verifications enable row level security;

drop policy if exists "Students can manage own career profile" on public.career_profiles;
drop policy if exists "AFF administrator can manage career profiles" on public.career_profiles;
drop policy if exists "Authenticated users can view active career employers" on public.career_employers;
drop policy if exists "AFF administrator can manage career employers" on public.career_employers;
drop policy if exists "Authenticated users can view open career opportunities" on public.career_opportunities;
drop policy if exists "AFF administrator can manage career opportunities" on public.career_opportunities;
drop policy if exists "Students can create own career applications" on public.career_applications;
drop policy if exists "Students can view own career applications" on public.career_applications;
drop policy if exists "AFF administrator can manage career applications" on public.career_applications;
drop policy if exists "Students can create own mentor matches" on public.career_mentor_matches;
drop policy if exists "Students can view own mentor matches" on public.career_mentor_matches;
drop policy if exists "AFF administrator can manage mentor matches" on public.career_mentor_matches;
drop policy if exists "Students can view own placements" on public.career_placements;
drop policy if exists "AFF administrator can manage placements" on public.career_placements;
drop policy if exists "AFF administrator can manage employer verifications" on public.career_employer_verifications;

create policy "Students can manage own career profile"
on public.career_profiles
for all
to authenticated
using (auth.uid() = student_id)
with check (auth.uid() = student_id);

create policy "AFF administrator can manage career profiles"
on public.career_profiles
for all
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

create policy "Authenticated users can view active career employers"
on public.career_employers
for select
to authenticated
using (portal_status = 'Active' or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

create policy "AFF administrator can manage career employers"
on public.career_employers
for all
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

create policy "Authenticated users can view open career opportunities"
on public.career_opportunities
for select
to authenticated
using (status = 'Open' or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

create policy "AFF administrator can manage career opportunities"
on public.career_opportunities
for all
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

create policy "Students can create own career applications"
on public.career_applications
for insert
to authenticated
with check (auth.uid() = student_id);

create policy "Students can view own career applications"
on public.career_applications
for select
to authenticated
using (auth.uid() = student_id);

create policy "AFF administrator can manage career applications"
on public.career_applications
for all
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

create policy "Students can create own mentor matches"
on public.career_mentor_matches
for insert
to authenticated
with check (auth.uid() = student_id);

create policy "Students can view own mentor matches"
on public.career_mentor_matches
for select
to authenticated
using (auth.uid() = student_id);

create policy "AFF administrator can manage mentor matches"
on public.career_mentor_matches
for all
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

create policy "Students can view own placements"
on public.career_placements
for select
to authenticated
using (auth.uid() = student_id);

create policy "AFF administrator can manage placements"
on public.career_placements
for all
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

create policy "AFF administrator can manage employer verifications"
on public.career_employer_verifications
for all
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

grant select, insert, update, delete on public.career_profiles to authenticated;
grant select, insert, update, delete on public.career_employers to authenticated;
grant select, insert, update, delete on public.career_opportunities to authenticated;
grant select, insert, update, delete on public.career_applications to authenticated;
grant select, insert, update, delete on public.career_mentor_matches to authenticated;
grant select, insert, update, delete on public.career_placements to authenticated;
grant select, insert, update, delete on public.career_employer_verifications to authenticated;

grant usage, select on sequence public.career_profiles_id_seq to authenticated;
grant usage, select on sequence public.career_employers_id_seq to authenticated;
grant usage, select on sequence public.career_opportunities_id_seq to authenticated;
grant usage, select on sequence public.career_applications_id_seq to authenticated;
grant usage, select on sequence public.career_mentor_matches_id_seq to authenticated;
grant usage, select on sequence public.career_placements_id_seq to authenticated;
grant usage, select on sequence public.career_employer_verifications_id_seq to authenticated;

insert into public.career_employers (employer_name, industry, contact_name, contact_email, website_url, portal_status)
values
  ('AFF Institutional Partner Desk', 'Financial Education and Market Research', 'Recruiter Relations', 'acafffx@gmail.com', null, 'Active'),
  ('Forex Research Internship Network', 'Trading Education', 'Placement Coordinator', 'acafffx@gmail.com', null, 'Active')
on conflict do nothing;

insert into public.career_opportunities (employer_name, title, opportunity_type, location, compensation, description, certification_required, status)
values
  ('AFF Institutional Partner Desk', 'Junior Forex Market Research Intern', 'Internship', 'Remote', 'Training stipend / academic credit', 'Support market structure review, economic calendar preparation, journal audits, and weekly institutional outlook research.', 'Forex Anatomy Certification preferred', 'Open'),
  ('Forex Research Internship Network', 'Trading Journal Quality Analyst', 'Job', 'Remote', 'Part-time contract', 'Review anonymized trading journals for process discipline, risk documentation, and lesson-aligned feedback standards.', 'Forex Foundations or Forex Anatomy', 'Open'),
  ('AFF Career Services', 'Certification Verification Assistant', 'Apprenticeship', 'Hybrid / Remote', 'Apprenticeship track', 'Assist with employer verification requests, digital credential records, and graduate placement documentation.', 'AFF certificate in good standing', 'Open')
on conflict do nothing;

insert into public.career_employer_verifications (employer_name, verifier_email, student_email, credential_checked, certificate_number, verification_code, verification_status, notes)
values ('AFF Institutional Partner Desk', 'acafffx@gmail.com', 'student@example.com', 'Forex Anatomy Certification', 'AFF-2026-00001', 'AFF-DEMO-VERIFY', 'Verified', 'Seed verification log for employer portal readiness.')
on conflict do nothing;

notify pgrst, 'reload schema';
