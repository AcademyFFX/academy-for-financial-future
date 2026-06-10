create table if not exists public.global_regional_directors (
  id bigserial primary key,
  director_name text not null,
  director_email text not null,
  region text not null,
  territory_count integer not null default 0,
  director_status text not null default 'Active',
  created_at timestamptz not null default now()
);

create table if not exists public.global_country_directors (
  id bigserial primary key,
  director_name text not null,
  director_email text not null,
  region text not null,
  country text not null,
  director_status text not null default 'Active',
  created_at timestamptz not null default now()
);

create table if not exists public.global_campus_directory (
  id bigserial primary key,
  campus_name text not null,
  region text not null,
  country text not null,
  city text,
  campus_status text not null default 'Candidate',
  director_name text,
  active_students integer not null default 0,
  certification_candidates integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.global_student_recruitment (
  id bigserial primary key,
  student_id uuid references auth.users(id) on delete set null,
  student_name text not null,
  student_email text not null,
  country text not null,
  preferred_language text not null default 'English',
  program_interest text not null default 'Forex Training Division',
  recruitment_status text not null default 'Inquiry',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.global_franchise_applications (
  id bigserial primary key,
  applicant_user_id uuid references auth.users(id) on delete set null,
  applicant_name text not null,
  applicant_email text not null,
  country text not null,
  territory_requested text not null,
  application_status text not null default 'Submitted',
  reviewer_notes text,
  submitted_at timestamptz not null default now()
);

create table if not exists public.global_partner_universities (
  id bigserial primary key,
  university_name text not null,
  country text not null,
  partnership_status text not null default 'Active',
  program_scope text,
  created_at timestamptz not null default now()
);

create table if not exists public.global_language_localization (
  id bigserial primary key,
  language_name text not null,
  locale_code text not null,
  localization_status text not null default 'Planned',
  translated_modules integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.global_international_events (
  id bigserial primary key,
  event_title text not null,
  region text not null,
  country text not null,
  event_date date not null default current_date,
  event_status text not null default 'Scheduled',
  expected_attendance integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.global_certification_standards (
  id bigserial primary key,
  standard_name text not null,
  standard_level text not null default 'Global',
  standard_status text not null default 'Active',
  requirements text,
  created_at timestamptz not null default now()
);

create table if not exists public.global_instructor_registry (
  id bigserial primary key,
  instructor_name text not null,
  instructor_email text not null,
  region text not null,
  country text not null,
  certification_level text not null default 'Forex Training Division',
  registry_status text not null default 'Certified',
  created_at timestamptz not null default now()
);

create table if not exists public.global_campus_performance (
  id bigserial primary key,
  campus_name text not null,
  region text not null,
  country text not null,
  reporting_period text not null,
  active_students integer not null default 0,
  certification_candidates integer not null default 0,
  event_attendance integer not null default 0,
  performance_score integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.global_regional_directors enable row level security;
alter table public.global_country_directors enable row level security;
alter table public.global_campus_directory enable row level security;
alter table public.global_student_recruitment enable row level security;
alter table public.global_franchise_applications enable row level security;
alter table public.global_partner_universities enable row level security;
alter table public.global_language_localization enable row level security;
alter table public.global_international_events enable row level security;
alter table public.global_certification_standards enable row level security;
alter table public.global_instructor_registry enable row level security;
alter table public.global_campus_performance enable row level security;

drop policy if exists "Authenticated users can read global directors" on public.global_regional_directors;
create policy "Authenticated users can read global directors" on public.global_regional_directors for select to authenticated using (true);
drop policy if exists "Admin can manage global regional directors" on public.global_regional_directors;
create policy "Admin can manage global regional directors" on public.global_regional_directors for all to authenticated using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com') with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read country directors" on public.global_country_directors;
create policy "Authenticated users can read country directors" on public.global_country_directors for select to authenticated using (true);
drop policy if exists "Admin can manage global country directors" on public.global_country_directors;
create policy "Admin can manage global country directors" on public.global_country_directors for all to authenticated using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com') with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read global campuses" on public.global_campus_directory;
create policy "Authenticated users can read global campuses" on public.global_campus_directory for select to authenticated using (true);
drop policy if exists "Admin can manage global campuses" on public.global_campus_directory;
create policy "Admin can manage global campuses" on public.global_campus_directory for all to authenticated using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com') with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

drop policy if exists "Students can read own global recruitment" on public.global_student_recruitment;
create policy "Students can read own global recruitment" on public.global_student_recruitment for select to authenticated using (auth.uid() = student_id or (auth.jwt() ->> 'email') = 'acafffx@gmail.com');
drop policy if exists "Students can insert own global recruitment" on public.global_student_recruitment;
create policy "Students can insert own global recruitment" on public.global_student_recruitment for insert to authenticated with check (auth.uid() = student_id);
drop policy if exists "Admin can manage global recruitment" on public.global_student_recruitment;
create policy "Admin can manage global recruitment" on public.global_student_recruitment for all to authenticated using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com') with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

drop policy if exists "Applicants can read own global franchise applications" on public.global_franchise_applications;
create policy "Applicants can read own global franchise applications" on public.global_franchise_applications for select to authenticated using (auth.uid() = applicant_user_id or (auth.jwt() ->> 'email') = 'acafffx@gmail.com');
drop policy if exists "Applicants can insert global franchise applications" on public.global_franchise_applications;
create policy "Applicants can insert global franchise applications" on public.global_franchise_applications for insert to authenticated with check (auth.uid() = applicant_user_id);
drop policy if exists "Admin can manage global franchise applications" on public.global_franchise_applications;
create policy "Admin can manage global franchise applications" on public.global_franchise_applications for all to authenticated using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com') with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read partner universities" on public.global_partner_universities;
create policy "Authenticated users can read partner universities" on public.global_partner_universities for select to authenticated using (true);
drop policy if exists "Admin can manage partner universities" on public.global_partner_universities;
create policy "Admin can manage partner universities" on public.global_partner_universities for all to authenticated using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com') with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read localization" on public.global_language_localization;
create policy "Authenticated users can read localization" on public.global_language_localization for select to authenticated using (true);
drop policy if exists "Admin can manage localization" on public.global_language_localization;
create policy "Admin can manage localization" on public.global_language_localization for all to authenticated using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com') with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read international events" on public.global_international_events;
create policy "Authenticated users can read international events" on public.global_international_events for select to authenticated using (true);
drop policy if exists "Admin can manage international events" on public.global_international_events;
create policy "Admin can manage international events" on public.global_international_events for all to authenticated using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com') with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read global standards" on public.global_certification_standards;
create policy "Authenticated users can read global standards" on public.global_certification_standards for select to authenticated using (true);
drop policy if exists "Admin can manage global standards" on public.global_certification_standards;
create policy "Admin can manage global standards" on public.global_certification_standards for all to authenticated using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com') with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read global instructors" on public.global_instructor_registry;
create policy "Authenticated users can read global instructors" on public.global_instructor_registry for select to authenticated using (true);
drop policy if exists "Admin can manage global instructors" on public.global_instructor_registry;
create policy "Admin can manage global instructors" on public.global_instructor_registry for all to authenticated using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com') with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read campus performance" on public.global_campus_performance;
create policy "Authenticated users can read campus performance" on public.global_campus_performance for select to authenticated using (true);
drop policy if exists "Admin can manage campus performance" on public.global_campus_performance;
create policy "Admin can manage campus performance" on public.global_campus_performance for all to authenticated using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com') with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

grant select, insert, update, delete on public.global_regional_directors to authenticated;
grant select, insert, update, delete on public.global_country_directors to authenticated;
grant select, insert, update, delete on public.global_campus_directory to authenticated;
grant select, insert, update, delete on public.global_student_recruitment to authenticated;
grant select, insert, update, delete on public.global_franchise_applications to authenticated;
grant select, insert, update, delete on public.global_partner_universities to authenticated;
grant select, insert, update, delete on public.global_language_localization to authenticated;
grant select, insert, update, delete on public.global_international_events to authenticated;
grant select, insert, update, delete on public.global_certification_standards to authenticated;
grant select, insert, update, delete on public.global_instructor_registry to authenticated;
grant select, insert, update, delete on public.global_campus_performance to authenticated;
grant usage, select on all sequences in schema public to authenticated;

insert into public.global_regional_directors (director_name, director_email, region, territory_count)
values
  ('Dr. Jean Rene Moricette', 'acafffx@gmail.com', 'Global', 12),
  ('AFF Caribbean Regional Office', 'acafffx@gmail.com', 'Caribbean', 5)
on conflict do nothing;

insert into public.global_country_directors (director_name, director_email, region, country)
values
  ('AFF United States Country Desk', 'acafffx@gmail.com', 'North America', 'United States'),
  ('AFF Haiti Country Desk', 'acafffx@gmail.com', 'Caribbean', 'Haiti'),
  ('AFF Canada Country Desk', 'acafffx@gmail.com', 'North America', 'Canada')
on conflict do nothing;

insert into public.global_campus_directory (campus_name, region, country, city, campus_status, director_name, active_students, certification_candidates)
values
  ('AFF Global Online Campus', 'Global', 'United States', 'Online', 'Active', 'Dr. Jean Rene Moricette', 248, 84),
  ('AFF Caribbean Candidate Campus', 'Caribbean', 'Haiti', 'Port-au-Prince', 'Candidate', 'AFF Caribbean Regional Office', 0, 0),
  ('AFF North America Partner Campus', 'North America', 'United States', 'Miami', 'Pending Launch', 'AFF United States Country Desk', 32, 12)
on conflict do nothing;

insert into public.global_partner_universities (university_name, country, partnership_status, program_scope)
values
  ('AFF Global University Partner Network', 'United States', 'Active', 'Professional certifications, career pathways, events, and campus expansion.'),
  ('Caribbean Financial Literacy Academic Partner', 'Haiti', 'Pending', 'Youth financial literacy, civic leadership, and Forex foundations.')
on conflict do nothing;

insert into public.global_language_localization (language_name, locale_code, localization_status, translated_modules)
values
  ('English', 'en-US', 'Active', 12),
  ('French', 'fr-FR', 'In Progress', 4),
  ('Haitian Creole', 'ht-HT', 'Planned', 0),
  ('Spanish', 'es-ES', 'Planned', 0)
on conflict do nothing;

insert into public.global_international_events (event_title, region, country, event_date, event_status, expected_attendance)
values
  ('AFF Global Campus Orientation', 'Global', 'United States', current_date + interval '21 days', 'Scheduled', 200),
  ('Caribbean Forex and Civic Leadership Forum', 'Caribbean', 'Haiti', current_date + interval '45 days', 'Scheduled', 120)
on conflict do nothing;

insert into public.global_certification_standards (standard_name, standard_level, standard_status, requirements)
values
  ('AFF Forex Training Division Global Standard', 'Professional Certification', 'Active', 'Lessons, assignments, journal, certification exam, and ethical trading standards.'),
  ('AFF Instructor International Registry Standard', 'Instructor Certification', 'Active', 'Instructor certification, continuing education, compliance, and campus governance review.')
on conflict do nothing;

insert into public.global_instructor_registry (instructor_name, instructor_email, region, country, certification_level, registry_status)
values
  ('Dr. Jean Rene Moricette', 'acafffx@gmail.com', 'Global', 'United States', 'Master Instructor', 'Certified')
on conflict do nothing;

insert into public.global_campus_performance (campus_name, region, country, reporting_period, active_students, certification_candidates, event_attendance, performance_score)
values
  ('AFF Global Online Campus', 'Global', 'United States', '2026-Q2', 248, 84, 200, 92),
  ('AFF North America Partner Campus', 'North America', 'United States', '2026-Q2', 32, 12, 75, 81)
on conflict do nothing;

notify pgrst, 'reload schema';
