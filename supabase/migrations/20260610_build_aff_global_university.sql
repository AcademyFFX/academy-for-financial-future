create table if not exists public.university_colleges (
  id bigserial primary key,
  college_name text not null unique,
  college_code text not null unique,
  description text,
  dean_name text not null default 'AFF Academic Council',
  display_order integer not null default 0,
  college_status text not null default 'Active',
  created_at timestamptz not null default now()
);

create table if not exists public.university_programs (
  id bigserial primary key,
  college_id bigint references public.university_colleges(id) on delete set null,
  college_name text not null,
  program_name text not null,
  credential_type text not null,
  description text,
  credit_hours_required integer not null default 0,
  program_status text not null default 'Active',
  created_at timestamptz not null default now(),
  constraint university_programs_credential_type_check check (credential_type in ('Diploma', 'Advanced Diploma', 'Professional Certification'))
);

create table if not exists public.university_degrees (
  id bigserial primary key,
  program_id bigint references public.university_programs(id) on delete set null,
  degree_name text not null,
  degree_type text not null,
  college_name text not null,
  requirements text,
  credit_hours_required integer not null default 0,
  degree_status text not null default 'Active',
  created_at timestamptz not null default now(),
  constraint university_degrees_degree_type_check check (degree_type in ('Diploma', 'Advanced Diploma', 'Professional Certification'))
);

create table if not exists public.university_transcripts (
  id bigserial primary key,
  student_id uuid not null references auth.users(id) on delete cascade,
  student_name text,
  student_email text,
  program_name text not null,
  course_title text not null,
  grade text not null default 'In Review',
  credit_hours numeric(6,2) not null default 0,
  transcript_status text not null default 'Submitted',
  notes text,
  completed_at date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.student_degree_progress (
  id bigserial primary key,
  student_id uuid not null references auth.users(id) on delete cascade,
  student_name text,
  student_email text,
  degree_name text not null,
  degree_type text not null,
  college_name text not null,
  credits_completed numeric(6,2) not null default 0,
  credits_required numeric(6,2) not null default 0,
  completion_percentage numeric(5,2) not null default 0,
  progress_status text not null default 'In Progress',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.university_honors (
  id bigserial primary key,
  student_id uuid references auth.users(id) on delete cascade,
  student_name text not null,
  student_email text,
  honor_title text not null,
  honor_level text not null default 'University Honor',
  college_name text,
  awarded_by text not null default 'Dr. Jean Rene Moricette',
  awarded_at date not null default current_date,
  created_at timestamptz not null default now()
);

alter table public.university_colleges enable row level security;
alter table public.university_programs enable row level security;
alter table public.university_degrees enable row level security;
alter table public.university_transcripts enable row level security;
alter table public.student_degree_progress enable row level security;
alter table public.university_honors enable row level security;

drop policy if exists "Authenticated users can read university colleges" on public.university_colleges;
create policy "Authenticated users can read university colleges"
on public.university_colleges for select
to authenticated
using (true);

drop policy if exists "Admin can manage university colleges" on public.university_colleges;
create policy "Admin can manage university colleges"
on public.university_colleges for all
to authenticated
using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com')
with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read university programs" on public.university_programs;
create policy "Authenticated users can read university programs"
on public.university_programs for select
to authenticated
using (true);

drop policy if exists "Admin can manage university programs" on public.university_programs;
create policy "Admin can manage university programs"
on public.university_programs for all
to authenticated
using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com')
with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read university degrees" on public.university_degrees;
create policy "Authenticated users can read university degrees"
on public.university_degrees for select
to authenticated
using (true);

drop policy if exists "Admin can manage university degrees" on public.university_degrees;
create policy "Admin can manage university degrees"
on public.university_degrees for all
to authenticated
using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com')
with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

drop policy if exists "Students can read own university transcripts" on public.university_transcripts;
create policy "Students can read own university transcripts"
on public.university_transcripts for select
to authenticated
using (auth.uid() = student_id or (auth.jwt() ->> 'email') = 'acafffx@gmail.com');

drop policy if exists "Students can insert own university transcripts" on public.university_transcripts;
create policy "Students can insert own university transcripts"
on public.university_transcripts for insert
to authenticated
with check (auth.uid() = student_id);

drop policy if exists "Admin can manage university transcripts" on public.university_transcripts;
create policy "Admin can manage university transcripts"
on public.university_transcripts for all
to authenticated
using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com')
with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

drop policy if exists "Students can read own degree progress" on public.student_degree_progress;
create policy "Students can read own degree progress"
on public.student_degree_progress for select
to authenticated
using (auth.uid() = student_id or (auth.jwt() ->> 'email') = 'acafffx@gmail.com');

drop policy if exists "Admin can manage degree progress" on public.student_degree_progress;
create policy "Admin can manage degree progress"
on public.student_degree_progress for all
to authenticated
using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com')
with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

drop policy if exists "Students can read own university honors" on public.university_honors;
create policy "Students can read own university honors"
on public.university_honors for select
to authenticated
using (auth.uid() = student_id or student_id is null or (auth.jwt() ->> 'email') = 'acafffx@gmail.com');

drop policy if exists "Admin can manage university honors" on public.university_honors;
create policy "Admin can manage university honors"
on public.university_honors for all
to authenticated
using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com')
with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

grant select, insert, update, delete on public.university_colleges to authenticated;
grant select, insert, update, delete on public.university_programs to authenticated;
grant select, insert, update, delete on public.university_degrees to authenticated;
grant select, insert, update, delete on public.university_transcripts to authenticated;
grant select, insert, update, delete on public.student_degree_progress to authenticated;
grant select, insert, update, delete on public.university_honors to authenticated;

grant usage, select on sequence public.university_colleges_id_seq to authenticated;
grant usage, select on sequence public.university_programs_id_seq to authenticated;
grant usage, select on sequence public.university_degrees_id_seq to authenticated;
grant usage, select on sequence public.university_transcripts_id_seq to authenticated;
grant usage, select on sequence public.student_degree_progress_id_seq to authenticated;
grant usage, select on sequence public.university_honors_id_seq to authenticated;

insert into public.university_colleges (college_name, college_code, description, dean_name, display_order)
values
  ('College of Financial Markets', 'CFM', 'Forex, risk, technical analysis, market structure, trading floors, and institutional execution education.', 'Dr. Jean Rene Moricette', 1),
  ('College of Economic Intelligence', 'CEI', 'Macroeconomic research, central bank intelligence, economic releases, and global currency forecasting.', 'AFF Economic Faculty', 2),
  ('College of Civic Leadership', 'CCL', 'Civic literacy, moral responsibility, constitutional studies, ethics, and community leadership.', 'AFF Civic Council', 3),
  ('College of Research & Innovation', 'CRI', 'Research publications, analyst development, AI education systems, and institutional innovation.', 'AFF Research Council', 4),
  ('College of Media & Broadcasting', 'CMB', 'AFF TV Studio, live broadcasts, educational media, masterclasses, and public communication.', 'AFF Media Faculty', 5),
  ('College of Professional Development', 'CPD', 'Career readiness, certifications, mentorship, internships, job placement, and executive professionalism.', 'AFF Career Faculty', 6)
on conflict (college_name) do update set
  college_code = excluded.college_code,
  description = excluded.description,
  dean_name = excluded.dean_name,
  display_order = excluded.display_order;

insert into public.university_programs (college_id, college_name, program_name, credential_type, description, credit_hours_required)
select id, college_name, 'Forex Anatomy Professional Certification', 'Professional Certification', 'Certification pathway covering market structure, liquidity, institutional orders, order flow, economic data, sessions, broker interface, and central banks.', 24
from public.university_colleges where college_name = 'College of Financial Markets'
on conflict do nothing;

insert into public.university_programs (college_id, college_name, program_name, credential_type, description, credit_hours_required)
select id, college_name, 'Economic Intelligence Advanced Diploma', 'Advanced Diploma', 'Advanced study of CPI, NFP, FOMC, GDP, rates, inflation, research publications, and central bank intelligence.', 36
from public.university_colleges where college_name = 'College of Economic Intelligence'
on conflict do nothing;

insert into public.university_programs (college_id, college_name, program_name, credential_type, description, credit_hours_required)
select id, college_name, 'Civic and Moral Leadership Diploma', 'Diploma', 'Leadership formation in civic literacy, moral responsibility, ethics, service, constitutional studies, and public policy.', 18
from public.university_colleges where college_name = 'College of Civic Leadership'
on conflict do nothing;

insert into public.university_programs (college_id, college_name, program_name, credential_type, description, credit_hours_required)
select id, college_name, 'Research and Innovation Professional Certification', 'Professional Certification', 'Research methods, AI learning systems, white papers, analyst rankings, and innovation governance.', 20
from public.university_colleges where college_name = 'College of Research & Innovation'
on conflict do nothing;

insert into public.university_programs (college_id, college_name, program_name, credential_type, description, credit_hours_required)
select id, college_name, 'Media and Broadcasting Diploma', 'Diploma', 'Educational media, live broadcasting, replay archives, studio controls, and public-facing academy programming.', 18
from public.university_colleges where college_name = 'College of Media & Broadcasting'
on conflict do nothing;

insert into public.university_programs (college_id, college_name, program_name, credential_type, description, credit_hours_required)
select id, college_name, 'Professional Development Advanced Diploma', 'Advanced Diploma', 'Career profiles, resume development, employer readiness, internship placement, and mentorship preparation.', 30
from public.university_colleges where college_name = 'College of Professional Development'
on conflict do nothing;

insert into public.university_degrees (program_id, degree_name, degree_type, college_name, requirements, credit_hours_required)
select id, program_name, credential_type, college_name, 'Complete required lessons, assignments, exams, transcript records, and academic review.', credit_hours_required
from public.university_programs
on conflict do nothing;

insert into public.university_honors (student_name, honor_title, honor_level, college_name)
values
  ('AFF Global University Cohort', 'Founding Academic Cohort', 'University Honor', 'AFF Global University'),
  ('Academy for Financial Future', 'Institutional Excellence Track', 'Dean Honor', 'College of Financial Markets')
on conflict do nothing;

notify pgrst, 'reload schema';
