create table if not exists public.aff_accreditation_records (
  id bigserial primary key,
  accreditation_number text not null unique,
  academy_name text not null default 'Academy for Financial Future',
  division_name text not null default 'Academy for Financial Future',
  accreditation_scope text not null,
  accreditation_status text not null default 'Active',
  issued_by text not null default 'Academy for Financial Future Accreditation & Licensing Division',
  issue_date date not null default current_date,
  expiration_date date,
  compliance_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint aff_accreditation_status_check check (accreditation_status in ('Active', 'Pending Review', 'Suspended', 'Expired'))
);

create table if not exists public.aff_instructor_applications (
  id bigserial primary key,
  applicant_name text not null,
  applicant_email text not null,
  phone text,
  country text,
  program_requested text not null default 'AFF Certified Forex Instructor',
  experience_summary text,
  application_status text not null default 'Submitted',
  reviewer_email text,
  reviewer_notes text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  constraint aff_instructor_applications_status_check check (application_status in ('Submitted', 'In Review', 'Approved', 'Rejected', 'Needs Documents'))
);

create table if not exists public.aff_instructor_certifications (
  id bigserial primary key,
  instructor_name text not null,
  instructor_email text not null,
  certification_number text not null unique,
  certification_level text not null default 'AFF Certified Forex Instructor',
  certification_status text not null default 'Active',
  issue_date date not null default current_date,
  expiration_date date,
  ce_required_hours numeric not null default 12,
  instructor_signature text not null default 'Dr. Jean Rene Moricette',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint aff_instructor_certifications_status_check check (certification_status in ('Active', 'Pending Renewal', 'Suspended', 'Expired', 'Revoked'))
);

create table if not exists public.aff_continuing_education_credits (
  id bigserial primary key,
  instructor_certification_id bigint references public.aff_instructor_certifications(id) on delete cascade,
  instructor_email text not null,
  course_title text not null,
  credit_hours numeric not null default 0,
  credit_status text not null default 'Approved',
  completed_at date not null default current_date,
  approved_by text not null default 'Dr. Jean Rene Moricette',
  notes text,
  created_at timestamptz not null default now(),
  constraint aff_ce_credit_hours_check check (credit_hours >= 0),
  constraint aff_ce_credit_status_check check (credit_status in ('Approved', 'Pending', 'Rejected'))
);

create table if not exists public.aff_franchise_licenses (
  id bigserial primary key,
  license_number text not null unique,
  licensee_name text not null,
  licensee_email text not null,
  territory text not null,
  license_type text not null default 'AFF Forex Training Franchise',
  license_status text not null default 'Active',
  issue_date date not null default current_date,
  renewal_due_date date,
  royalty_rate numeric not null default 0,
  compliance_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint aff_franchise_license_status_check check (license_status in ('Active', 'Pending Renewal', 'Suspended', 'Expired', 'Terminated'))
);

create table if not exists public.aff_partner_institutions (
  id bigserial primary key,
  institution_name text not null,
  institution_type text not null,
  contact_name text,
  contact_email text,
  country text,
  partnership_status text not null default 'Active',
  agreement_start_date date not null default current_date,
  agreement_end_date date,
  program_scope text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint aff_partner_institutions_status_check check (partnership_status in ('Active', 'Pending', 'Suspended', 'Expired'))
);

create table if not exists public.aff_license_renewals (
  id bigserial primary key,
  renewal_type text not null,
  related_record_type text not null,
  related_record_id bigint,
  holder_name text not null,
  holder_email text,
  renewal_status text not null default 'Pending',
  renewal_due_date date not null,
  submitted_at timestamptz,
  approved_at timestamptz,
  approved_by text,
  notes text,
  created_at timestamptz not null default now(),
  constraint aff_license_renewals_status_check check (renewal_status in ('Pending', 'Submitted', 'Approved', 'Rejected', 'Expired'))
);

create table if not exists public.aff_compliance_reviews (
  id bigserial primary key,
  review_number text not null unique,
  review_subject text not null,
  review_type text not null,
  review_status text not null default 'Compliant',
  reviewer_name text not null default 'Dr. Jean Rene Moricette',
  reviewed_at date not null default current_date,
  next_review_date date,
  findings text,
  corrective_actions text,
  created_at timestamptz not null default now(),
  constraint aff_compliance_reviews_status_check check (review_status in ('Compliant', 'Needs Attention', 'Non-Compliant', 'Resolved'))
);

create table if not exists public.aff_digital_credentials (
  id bigserial primary key,
  credential_number text not null unique,
  credential_title text not null,
  credential_type text not null,
  holder_name text not null,
  holder_email text,
  holder_role text,
  credential_status text not null default 'Active',
  issue_date date not null default current_date,
  expiration_date date,
  verification_code text not null unique,
  credential_url text,
  issued_by text not null default 'Academy for Financial Future',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint aff_digital_credentials_status_check check (credential_status in ('Active', 'Pending Renewal', 'Suspended', 'Expired', 'Revoked'))
);

alter table public.aff_accreditation_records enable row level security;
alter table public.aff_instructor_applications enable row level security;
alter table public.aff_instructor_certifications enable row level security;
alter table public.aff_continuing_education_credits enable row level security;
alter table public.aff_franchise_licenses enable row level security;
alter table public.aff_partner_institutions enable row level security;
alter table public.aff_license_renewals enable row level security;
alter table public.aff_compliance_reviews enable row level security;
alter table public.aff_digital_credentials enable row level security;

drop policy if exists "AFF administrator can manage accreditation records" on public.aff_accreditation_records;
drop policy if exists "AFF administrator can manage instructor applications" on public.aff_instructor_applications;
drop policy if exists "AFF administrator can manage instructor certifications" on public.aff_instructor_certifications;
drop policy if exists "AFF administrator can manage CE credits" on public.aff_continuing_education_credits;
drop policy if exists "AFF administrator can manage franchise licenses" on public.aff_franchise_licenses;
drop policy if exists "AFF administrator can manage partner institutions" on public.aff_partner_institutions;
drop policy if exists "AFF administrator can manage license renewals" on public.aff_license_renewals;
drop policy if exists "AFF administrator can manage compliance reviews" on public.aff_compliance_reviews;
drop policy if exists "AFF administrator can manage digital credentials" on public.aff_digital_credentials;

create policy "AFF administrator can manage accreditation records"
on public.aff_accreditation_records for all to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

create policy "AFF administrator can manage instructor applications"
on public.aff_instructor_applications for all to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

create policy "AFF administrator can manage instructor certifications"
on public.aff_instructor_certifications for all to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

create policy "AFF administrator can manage CE credits"
on public.aff_continuing_education_credits for all to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

create policy "AFF administrator can manage franchise licenses"
on public.aff_franchise_licenses for all to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

create policy "AFF administrator can manage partner institutions"
on public.aff_partner_institutions for all to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

create policy "AFF administrator can manage license renewals"
on public.aff_license_renewals for all to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

create policy "AFF administrator can manage compliance reviews"
on public.aff_compliance_reviews for all to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

create policy "AFF administrator can manage digital credentials"
on public.aff_digital_credentials for all to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

grant select, insert, update, delete on public.aff_accreditation_records to authenticated;
grant select, insert, update, delete on public.aff_instructor_applications to authenticated;
grant select, insert, update, delete on public.aff_instructor_certifications to authenticated;
grant select, insert, update, delete on public.aff_continuing_education_credits to authenticated;
grant select, insert, update, delete on public.aff_franchise_licenses to authenticated;
grant select, insert, update, delete on public.aff_partner_institutions to authenticated;
grant select, insert, update, delete on public.aff_license_renewals to authenticated;
grant select, insert, update, delete on public.aff_compliance_reviews to authenticated;
grant select, insert, update, delete on public.aff_digital_credentials to authenticated;

grant usage, select on sequence public.aff_accreditation_records_id_seq to authenticated;
grant usage, select on sequence public.aff_instructor_applications_id_seq to authenticated;
grant usage, select on sequence public.aff_instructor_certifications_id_seq to authenticated;
grant usage, select on sequence public.aff_continuing_education_credits_id_seq to authenticated;
grant usage, select on sequence public.aff_franchise_licenses_id_seq to authenticated;
grant usage, select on sequence public.aff_partner_institutions_id_seq to authenticated;
grant usage, select on sequence public.aff_license_renewals_id_seq to authenticated;
grant usage, select on sequence public.aff_compliance_reviews_id_seq to authenticated;
grant usage, select on sequence public.aff_digital_credentials_id_seq to authenticated;

insert into public.aff_accreditation_records (accreditation_number, accreditation_scope, accreditation_status, expiration_date, compliance_notes)
values ('AFF-ACC-2026-0001', 'Academy for Financial Future academic standards, instructor training, certification exams, digital credentials, and institutional partnership oversight.', 'Active', current_date + interval '1 year', 'Initial executive accreditation record for Academy for Financial Future.')
on conflict (accreditation_number) do update
set accreditation_scope = excluded.accreditation_scope,
    accreditation_status = excluded.accreditation_status,
    expiration_date = excluded.expiration_date,
    updated_at = now();

insert into public.aff_instructor_applications (applicant_name, applicant_email, phone, country, program_requested, experience_summary, application_status, reviewer_email)
values
  ('Senior Instructor Candidate', 'candidate@example.com', null, 'United States', 'AFF Certified Forex Instructor', 'Candidate submitted experience in market structure education, risk management, and student coaching.', 'Submitted', 'acafffx@gmail.com')
on conflict do nothing;

insert into public.aff_instructor_certifications (instructor_name, instructor_email, certification_number, certification_level, certification_status, expiration_date)
values ('Dr. Jean Rene Moricette', 'acafffx@gmail.com', 'AFF-INST-2026-0001', 'AFF Master Instructor and Administrator', 'Active', current_date + interval '1 year')
on conflict (certification_number) do update
set certification_status = excluded.certification_status,
    expiration_date = excluded.expiration_date,
    updated_at = now();

insert into public.aff_continuing_education_credits (instructor_email, course_title, credit_hours, credit_status, approved_by, notes)
values ('acafffx@gmail.com', 'AFF Accreditation Standards and Instructor Compliance Review', 6, 'Approved', 'Academy for Financial Future', 'Continuing education seed record for division governance.')
on conflict do nothing;

insert into public.aff_franchise_licenses (license_number, licensee_name, licensee_email, territory, license_type, license_status, renewal_due_date, royalty_rate, compliance_notes)
values ('AFF-FR-2026-0001', 'AFF Flagship Training Center', 'acafffx@gmail.com', 'United States', 'AFF Forex Training Franchise', 'Active', current_date + interval '1 year', 0, 'Flagship academy license record.')
on conflict (license_number) do update
set license_status = excluded.license_status,
    renewal_due_date = excluded.renewal_due_date,
    updated_at = now();

insert into public.aff_partner_institutions (institution_name, institution_type, contact_name, contact_email, country, partnership_status, agreement_end_date, program_scope)
values ('Academy for Financial Future Institutional Partner Network', 'Education Partner', 'Dr. Jean Rene Moricette', 'acafffx@gmail.com', 'United States', 'Active', current_date + interval '1 year', 'Forex education, workforce readiness, certification verification, and partner training pathways.')
on conflict do nothing;

insert into public.aff_license_renewals (renewal_type, related_record_type, related_record_id, holder_name, holder_email, renewal_status, renewal_due_date, notes)
values
  ('Instructor Certification Renewal', 'aff_instructor_certifications', 1, 'Dr. Jean Rene Moricette', 'acafffx@gmail.com', 'Pending', current_date + interval '11 months', 'Annual renewal tracking for instructor credential.'),
  ('Franchise License Renewal', 'aff_franchise_licenses', 1, 'AFF Flagship Training Center', 'acafffx@gmail.com', 'Pending', current_date + interval '11 months', 'Annual renewal tracking for flagship license.')
on conflict do nothing;

insert into public.aff_compliance_reviews (review_number, review_subject, review_type, review_status, next_review_date, findings, corrective_actions)
values ('AFF-COMP-2026-0001', 'Academy for Financial Future Academy for Financial Future', 'Annual Accreditation Review', 'Compliant', current_date + interval '6 months', 'Initial review confirms division records, curriculum pathway, credential controls, and verification workflow are established.', 'Continue quarterly record reviews and credential audit preparation.')
on conflict (review_number) do update
set review_status = excluded.review_status,
    next_review_date = excluded.next_review_date,
    findings = excluded.findings,
    corrective_actions = excluded.corrective_actions;

insert into public.aff_digital_credentials (credential_number, credential_title, credential_type, holder_name, holder_email, holder_role, credential_status, expiration_date, verification_code, credential_url)
values ('AFF-CRED-2026-0001', 'AFF Master Instructor Credential', 'Instructor Certification', 'Dr. Jean Rene Moricette', 'acafffx@gmail.com', 'Administrator', 'Active', current_date + interval '1 year', 'AFF-VERIFY-INST-0001', '/accreditation')
on conflict (credential_number) do update
set credential_status = excluded.credential_status,
    expiration_date = excluded.expiration_date,
    verification_code = excluded.verification_code,
    updated_at = now();

notify pgrst, 'reload schema';
