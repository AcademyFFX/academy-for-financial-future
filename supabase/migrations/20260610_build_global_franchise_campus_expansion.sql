create table if not exists public.campus_directory (
  id bigserial primary key,
  campus_name text not null,
  region text not null,
  country text not null,
  city text,
  campus_status text not null default 'Active',
  director_name text,
  director_email text,
  enrollment_count integer not null default 0,
  monthly_revenue numeric not null default 0,
  accreditation_status text not null default 'Pending Review',
  opened_at date default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campus_directory_status_check check (campus_status in ('Active', 'Pending Launch', 'Candidate', 'Suspended', 'Closed'))
);

create table if not exists public.campus_franchise_applications (
  id bigserial primary key,
  applicant_user_id uuid references auth.users(id) on delete set null,
  applicant_name text not null,
  applicant_email text not null,
  phone text,
  country text,
  territory_requested text not null,
  investment_readiness text not null default 'Exploring',
  experience_summary text,
  application_status text not null default 'Submitted',
  reviewer_notes text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  constraint campus_franchise_applications_status_check check (application_status in ('Submitted', 'In Review', 'Approved', 'Rejected', 'Needs Documents'))
);

create table if not exists public.campus_regional_directors (
  id bigserial primary key,
  director_name text not null,
  director_email text not null,
  region text not null,
  territory_count integer not null default 0,
  director_status text not null default 'Active',
  created_at timestamptz not null default now(),
  constraint campus_regional_directors_status_check check (director_status in ('Active', 'Pending', 'Suspended', 'Archived'))
);

create table if not exists public.campus_instructor_certifications (
  id bigserial primary key,
  campus_id bigint references public.campus_directory(id) on delete cascade,
  campus_name text not null,
  instructor_name text not null,
  instructor_email text not null,
  certification_number text not null unique,
  certification_status text not null default 'Active',
  expiration_date date,
  created_at timestamptz not null default now(),
  constraint campus_instructor_certifications_status_check check (certification_status in ('Active', 'Pending Renewal', 'Expired', 'Suspended'))
);

create table if not exists public.campus_enrollment_reports (
  id bigserial primary key,
  campus_id bigint references public.campus_directory(id) on delete cascade,
  campus_name text not null,
  reporting_period text not null,
  active_students integer not null default 0,
  new_enrollments integer not null default 0,
  certification_candidates integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.campus_revenue_reports (
  id bigserial primary key,
  campus_id bigint references public.campus_directory(id) on delete cascade,
  campus_name text not null,
  reporting_period text not null,
  gross_revenue numeric not null default 0,
  royalty_due numeric not null default 0,
  report_status text not null default 'Submitted',
  created_at timestamptz not null default now(),
  constraint campus_revenue_reports_status_check check (report_status in ('Submitted', 'Reviewed', 'Approved', 'Needs Review'))
);

create table if not exists public.campus_territories (
  id bigserial primary key,
  territory_name text not null,
  region text not null,
  country text not null,
  regional_director text,
  territory_status text not null default 'Available',
  campus_id bigint references public.campus_directory(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint campus_territories_status_check check (territory_status in ('Available', 'Reserved', 'Licensed', 'Protected', 'Closed'))
);

create table if not exists public.campus_local_events (
  id bigserial primary key,
  campus_id bigint references public.campus_directory(id) on delete cascade,
  campus_name text not null,
  event_title text not null,
  event_date date not null,
  event_status text not null default 'Scheduled',
  expected_attendance integer not null default 0,
  created_at timestamptz not null default now(),
  constraint campus_local_events_status_check check (event_status in ('Scheduled', 'Completed', 'Cancelled'))
);

create table if not exists public.campus_partner_institutions (
  id bigserial primary key,
  campus_id bigint references public.campus_directory(id) on delete set null,
  campus_name text not null,
  institution_name text not null,
  partnership_status text not null default 'Active',
  program_scope text,
  created_at timestamptz not null default now(),
  constraint campus_partner_institutions_status_check check (partnership_status in ('Active', 'Pending', 'Suspended', 'Expired'))
);

create table if not exists public.campus_franchise_renewals (
  id bigserial primary key,
  campus_id bigint references public.campus_directory(id) on delete cascade,
  campus_name text not null,
  renewal_due_date date not null,
  renewal_status text not null default 'Pending',
  notes text,
  created_at timestamptz not null default now(),
  constraint campus_franchise_renewals_status_check check (renewal_status in ('Pending', 'Submitted', 'Approved', 'Rejected', 'Expired'))
);

alter table public.campus_directory enable row level security;
alter table public.campus_franchise_applications enable row level security;
alter table public.campus_regional_directors enable row level security;
alter table public.campus_instructor_certifications enable row level security;
alter table public.campus_enrollment_reports enable row level security;
alter table public.campus_revenue_reports enable row level security;
alter table public.campus_territories enable row level security;
alter table public.campus_local_events enable row level security;
alter table public.campus_partner_institutions enable row level security;
alter table public.campus_franchise_renewals enable row level security;

drop policy if exists "Authenticated users can view campus directory" on public.campus_directory;
drop policy if exists "AFF administrator can manage campus directory" on public.campus_directory;
drop policy if exists "Applicants can create franchise applications" on public.campus_franchise_applications;
drop policy if exists "Applicants can view own franchise applications" on public.campus_franchise_applications;
drop policy if exists "AFF administrator can manage franchise applications" on public.campus_franchise_applications;
drop policy if exists "Authenticated users can view regional directors" on public.campus_regional_directors;
drop policy if exists "AFF administrator can manage regional directors" on public.campus_regional_directors;
drop policy if exists "AFF administrator can manage campus instructor certifications" on public.campus_instructor_certifications;
drop policy if exists "AFF administrator can manage campus enrollment reports" on public.campus_enrollment_reports;
drop policy if exists "AFF administrator can manage campus revenue reports" on public.campus_revenue_reports;
drop policy if exists "AFF administrator can manage campus territories" on public.campus_territories;
drop policy if exists "AFF administrator can manage campus local events" on public.campus_local_events;
drop policy if exists "AFF administrator can manage campus partner institutions" on public.campus_partner_institutions;
drop policy if exists "AFF administrator can manage campus renewals" on public.campus_franchise_renewals;

create policy "Authenticated users can view campus directory" on public.campus_directory for select to authenticated using (campus_status in ('Active', 'Pending Launch', 'Candidate') or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF administrator can manage campus directory" on public.campus_directory for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

create policy "Applicants can create franchise applications" on public.campus_franchise_applications for insert to authenticated with check (auth.uid() = applicant_user_id);
create policy "Applicants can view own franchise applications" on public.campus_franchise_applications for select to authenticated using (auth.uid() = applicant_user_id);
create policy "AFF administrator can manage franchise applications" on public.campus_franchise_applications for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

create policy "Authenticated users can view regional directors" on public.campus_regional_directors for select to authenticated using (director_status = 'Active' or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF administrator can manage regional directors" on public.campus_regional_directors for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

create policy "AFF administrator can manage campus instructor certifications" on public.campus_instructor_certifications for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF administrator can manage campus enrollment reports" on public.campus_enrollment_reports for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF administrator can manage campus revenue reports" on public.campus_revenue_reports for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF administrator can manage campus territories" on public.campus_territories for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF administrator can manage campus local events" on public.campus_local_events for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF administrator can manage campus partner institutions" on public.campus_partner_institutions for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF administrator can manage campus renewals" on public.campus_franchise_renewals for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

grant select, insert, update, delete on public.campus_directory to authenticated;
grant select, insert, update, delete on public.campus_franchise_applications to authenticated;
grant select, insert, update, delete on public.campus_regional_directors to authenticated;
grant select, insert, update, delete on public.campus_instructor_certifications to authenticated;
grant select, insert, update, delete on public.campus_enrollment_reports to authenticated;
grant select, insert, update, delete on public.campus_revenue_reports to authenticated;
grant select, insert, update, delete on public.campus_territories to authenticated;
grant select, insert, update, delete on public.campus_local_events to authenticated;
grant select, insert, update, delete on public.campus_partner_institutions to authenticated;
grant select, insert, update, delete on public.campus_franchise_renewals to authenticated;
grant usage, select on all sequences in schema public to authenticated;

insert into public.campus_directory (campus_name, region, country, city, campus_status, director_name, director_email, enrollment_count, monthly_revenue, accreditation_status)
values
  ('AFF Global Online Campus', 'Global', 'United States', 'Online', 'Active', 'Dr. Jean Rene Moricette', 'acafffx@gmail.com', 248, 42000, 'Active'),
  ('AFF Caribbean Expansion Candidate Campus', 'Caribbean', 'Haiti', 'Port-au-Prince', 'Candidate', 'Regional Director Pending', 'acafffx@gmail.com', 0, 0, 'Pending Review')
on conflict do nothing;

insert into public.campus_regional_directors (director_name, director_email, region, territory_count, director_status)
values ('Dr. Jean Rene Moricette', 'acafffx@gmail.com', 'Global', 3, 'Active')
on conflict do nothing;

insert into public.campus_territories (territory_name, region, country, regional_director, territory_status)
values
  ('Global Online Territory', 'Global', 'United States', 'Dr. Jean Rene Moricette', 'Licensed'),
  ('Caribbean Expansion Territory', 'Caribbean', 'Haiti', 'Dr. Jean Rene Moricette', 'Reserved')
on conflict do nothing;

insert into public.campus_enrollment_reports (campus_name, reporting_period, active_students, new_enrollments, certification_candidates)
values ('AFF Global Online Campus', '2026-Q2', 248, 37, 84)
on conflict do nothing;

insert into public.campus_revenue_reports (campus_name, reporting_period, gross_revenue, royalty_due, report_status)
values ('AFF Global Online Campus', '2026-Q2', 42000, 0, 'Submitted')
on conflict do nothing;

insert into public.campus_instructor_certifications (campus_name, instructor_name, instructor_email, certification_number, certification_status, expiration_date)
values ('AFF Global Online Campus', 'Dr. Jean Rene Moricette', 'acafffx@gmail.com', 'AFF-CAMP-INST-2026-0001', 'Active', current_date + interval '1 year')
on conflict (certification_number) do update set certification_status = excluded.certification_status, expiration_date = excluded.expiration_date;

insert into public.campus_local_events (campus_name, event_title, event_date, event_status, expected_attendance)
values ('AFF Global Online Campus', 'Global Forex Future Campus Open House', current_date + interval '30 days', 'Scheduled', 150)
on conflict do nothing;

insert into public.campus_partner_institutions (campus_name, institution_name, partnership_status, program_scope)
values ('AFF Global Online Campus', 'Academy for Financial Future Institutional Partner Network', 'Active', 'Campus expansion, career placement, events, and accreditation alignment.')
on conflict do nothing;

insert into public.campus_franchise_renewals (campus_name, renewal_due_date, renewal_status, notes)
values ('AFF Global Online Campus', current_date + interval '1 year', 'Pending', 'Annual flagship campus renewal monitoring.')
on conflict do nothing;

notify pgrst, 'reload schema';
