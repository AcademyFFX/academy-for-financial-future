create sequence if not exists public.aff_digital_certificate_seq;

create table if not exists public.certification_catalog (
  id bigserial primary key,
  slug text not null unique,
  certificate_name text not null,
  description text,
  passing_score integer not null default 80,
  status text not null default 'Active',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.certification_exams (
  id bigserial primary key,
  certification_id bigint not null references public.certification_catalog(id) on delete cascade,
  exam_title text not null,
  scheduled_at timestamptz,
  time_limit_minutes integer not null default 45,
  max_attempts integer not null default 3,
  status text not null default 'Available',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint certification_exams_status_check check (status in ('Available', 'Scheduled', 'Closed', 'Draft'))
);

create table if not exists public.certification_exam_questions (
  id bigserial primary key,
  exam_id bigint not null references public.certification_exams(id) on delete cascade,
  question_type text not null,
  prompt text not null,
  options jsonb not null default '[]'::jsonb,
  correct_answer text,
  points integer not null default 10,
  sort_order integer not null default 0,
  requires_manual_review boolean not null default false,
  created_at timestamptz not null default now(),
  constraint certification_exam_questions_type_check check (question_type in ('Multiple Choice', 'True/False', 'Short Answer', 'Chart Analysis', 'Essay Response'))
);

create table if not exists public.certification_exam_attempts (
  id bigserial primary key,
  student_id uuid not null references auth.users(id) on delete cascade,
  student_name text not null,
  student_email text,
  aff_student_id text,
  exam_id bigint not null references public.certification_exams(id) on delete cascade,
  certification_id bigint not null references public.certification_catalog(id) on delete cascade,
  score numeric(5,2) not null default 0,
  automatic_score numeric(5,2) not null default 0,
  manual_score numeric(5,2) not null default 0,
  attempt_number integer not null default 1,
  result text not null default 'Pending Review',
  pass_fail text not null default 'Pending Review',
  status text not null default 'Submitted',
  submitted_at timestamptz not null default now(),
  reviewed_by text,
  reviewed_at timestamptz,
  instructor_comments text,
  created_at timestamptz not null default now(),
  constraint certification_exam_attempts_result_check check (result in ('Pass', 'Fail', 'Pending Review')),
  constraint certification_exam_attempts_status_check check (status in ('Submitted', 'Pending Review', 'Completed', 'Certification Approved'))
);

create table if not exists public.certification_exam_responses (
  id bigserial primary key,
  attempt_id bigint not null references public.certification_exam_attempts(id) on delete cascade,
  question_id bigint not null references public.certification_exam_questions(id) on delete cascade,
  question_type text not null,
  response text,
  auto_correct boolean,
  auto_points numeric(6,2) not null default 0,
  manual_points numeric(6,2),
  instructor_comments text,
  created_at timestamptz not null default now()
);

create table if not exists public.certification_review_queue (
  id bigserial primary key,
  attempt_id bigint not null references public.certification_exam_attempts(id) on delete cascade,
  response_id bigint references public.certification_exam_responses(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  student_name text not null,
  certification_name text not null,
  exam_title text not null,
  question_type text not null,
  prompt text not null,
  response text,
  review_status text not null default 'Pending Review',
  manual_score numeric(6,2),
  instructor_comments text,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint certification_review_queue_status_check check (review_status in ('Pending Review', 'Reviewed', 'Approved', 'Returned'))
);

create table if not exists public.digital_certificates (
  id bigserial primary key,
  student_id uuid not null references auth.users(id) on delete cascade,
  student_name text not null,
  aff_student_id text,
  certification_id bigint references public.certification_catalog(id) on delete set null,
  certificate_name text not null,
  issue_date date not null default current_date,
  certificate_number text not null unique,
  qr_verification_code text not null unique,
  verification_url text,
  status text not null default 'Valid',
  approved_by text not null default 'Dr. Jean Rene Moricette',
  created_at timestamptz not null default now(),
  constraint digital_certificates_status_check check (status in ('Valid', 'Revoked'))
);

create index if not exists certification_exams_certification_idx on public.certification_exams (certification_id, status);
create index if not exists certification_exam_questions_exam_idx on public.certification_exam_questions (exam_id, sort_order);
create index if not exists certification_exam_attempts_student_idx on public.certification_exam_attempts (student_id, submitted_at desc);
create index if not exists certification_exam_responses_attempt_idx on public.certification_exam_responses (attempt_id);
create index if not exists certification_review_queue_status_idx on public.certification_review_queue (review_status, created_at desc);
create index if not exists digital_certificates_student_idx on public.digital_certificates (student_id, issue_date desc);
create index if not exists digital_certificates_number_idx on public.digital_certificates (certificate_number);

alter table public.certification_catalog enable row level security;
alter table public.certification_exams enable row level security;
alter table public.certification_exam_questions enable row level security;
alter table public.certification_exam_attempts enable row level security;
alter table public.certification_exam_responses enable row level security;
alter table public.certification_review_queue enable row level security;
alter table public.digital_certificates enable row level security;

drop policy if exists "Authenticated students can read certification catalog" on public.certification_catalog;
drop policy if exists "AFF admin can manage certification catalog" on public.certification_catalog;
drop policy if exists "Authenticated students can read certification exams" on public.certification_exams;
drop policy if exists "AFF admin can manage certification exams" on public.certification_exams;
drop policy if exists "Authenticated students can read certification questions" on public.certification_exam_questions;
drop policy if exists "AFF admin can manage certification questions" on public.certification_exam_questions;
drop policy if exists "Students can read own certification attempts" on public.certification_exam_attempts;
drop policy if exists "Students can create own certification attempts" on public.certification_exam_attempts;
drop policy if exists "AFF admin can manage certification attempts" on public.certification_exam_attempts;
drop policy if exists "Students can read own certification responses" on public.certification_exam_responses;
drop policy if exists "Students can create own certification responses" on public.certification_exam_responses;
drop policy if exists "AFF admin can manage certification responses" on public.certification_exam_responses;
drop policy if exists "AFF admin can manage certification review queue" on public.certification_review_queue;
drop policy if exists "Students can read own digital certificates" on public.digital_certificates;
drop policy if exists "Students can create own digital certificates" on public.digital_certificates;
drop policy if exists "Public can verify digital certificates" on public.digital_certificates;
drop policy if exists "AFF admin can manage digital certificates" on public.digital_certificates;

create policy "Authenticated students can read certification catalog" on public.certification_catalog for select to authenticated using (status = 'Active' or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF admin can manage certification catalog" on public.certification_catalog for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Authenticated students can read certification exams" on public.certification_exams for select to authenticated using (status in ('Available', 'Scheduled') or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF admin can manage certification exams" on public.certification_exams for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Authenticated students can read certification questions" on public.certification_exam_questions for select to authenticated using (true);
create policy "AFF admin can manage certification questions" on public.certification_exam_questions for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Students can read own certification attempts" on public.certification_exam_attempts for select to authenticated using (auth.uid() = student_id or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Students can create own certification attempts" on public.certification_exam_attempts for insert to authenticated with check (auth.uid() = student_id);
create policy "AFF admin can manage certification attempts" on public.certification_exam_attempts for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Students can read own certification responses" on public.certification_exam_responses for select to authenticated using (exists (select 1 from public.certification_exam_attempts a where a.id = attempt_id and (a.student_id = auth.uid() or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')));
create policy "Students can create own certification responses" on public.certification_exam_responses for insert to authenticated with check (exists (select 1 from public.certification_exam_attempts a where a.id = attempt_id and a.student_id = auth.uid()));
create policy "AFF admin can manage certification responses" on public.certification_exam_responses for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF admin can manage certification review queue" on public.certification_review_queue for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Students can read own digital certificates" on public.digital_certificates for select to authenticated using (auth.uid() = student_id or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Students can create own digital certificates" on public.digital_certificates for insert to authenticated with check (auth.uid() = student_id);
create policy "Public can verify digital certificates" on public.digital_certificates for select to anon using (status = 'Valid');
create policy "AFF admin can manage digital certificates" on public.digital_certificates for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

grant select on public.certification_catalog to authenticated;
grant select on public.certification_exams to authenticated;
grant select on public.certification_exam_questions to authenticated;
grant select, insert on public.certification_exam_attempts to authenticated;
grant select, insert on public.certification_exam_responses to authenticated;
grant select, insert, update, delete on public.certification_review_queue to authenticated;
grant select, insert, update, delete on public.digital_certificates to authenticated;
grant select on public.digital_certificates to anon;
grant usage, select on sequence public.certification_catalog_id_seq to authenticated;
grant usage, select on sequence public.certification_exams_id_seq to authenticated;
grant usage, select on sequence public.certification_exam_questions_id_seq to authenticated;
grant usage, select on sequence public.certification_exam_attempts_id_seq to authenticated;
grant usage, select on sequence public.certification_exam_responses_id_seq to authenticated;
grant usage, select on sequence public.certification_review_queue_id_seq to authenticated;
grant usage, select on sequence public.digital_certificates_id_seq to authenticated;
grant usage, select on sequence public.aff_digital_certificate_seq to authenticated;

insert into public.certification_catalog (slug, certificate_name, description, passing_score, sort_order)
values
  ('forex-foundations', 'Forex Foundations Certificate', 'Core foundations in currency pairs, sessions, pips, lots, spreads, orders, and broker basics.', 80, 1),
  ('technical-analysis', 'Technical Analysis Certificate', 'Professional chart reading, trend structure, support and resistance, and technical execution readiness.', 80, 2),
  ('institutional-trading', 'Institutional Trading Certificate', 'Institutional order flow, liquidity, order blocks, market structure, and professional trade planning.', 80, 3),
  ('risk-management', 'Risk Management Certificate', 'Capital protection, risk percentage, stop placement, drawdown control, and position sizing discipline.', 80, 4),
  ('market-psychology', 'Market Psychology Certificate', 'Trading psychology, discipline, bias control, journaling, patience, and professional behavior.', 80, 5),
  ('aff-professional-trader', 'AFF Professional Trader Certification', 'Capstone professional certification combining lessons, examinations, chart analysis, risk, psychology, and instructor approval.', 85, 6)
on conflict (slug) do update
set certificate_name = excluded.certificate_name,
    description = excluded.description,
    passing_score = excluded.passing_score,
    sort_order = excluded.sort_order,
    updated_at = now();

insert into public.certification_exams (certification_id, exam_title, scheduled_at, time_limit_minutes, max_attempts, status)
select id, certificate_name || ' Examination', null, 45, 3, 'Available'
from public.certification_catalog
where not exists (
  select 1 from public.certification_exams existing where existing.certification_id = certification_catalog.id
);

insert into public.certification_exam_questions (exam_id, question_type, prompt, options, correct_answer, points, sort_order, requires_manual_review)
select exam.id, seed.question_type, seed.prompt, seed.options::jsonb, seed.correct_answer, seed.points, seed.sort_order, seed.requires_manual_review
from public.certification_exams exam
join public.certification_catalog catalog on catalog.id = exam.certification_id
cross join (
  values
    ('Multiple Choice', 'What is the primary purpose of risk management?', '["Protect trading capital","Guarantee profit","Increase spread","Avoid journaling"]', 'Protect trading capital', 20, 1, false),
    ('True/False', 'A trader should confirm risk before entering a trade.', '["True","False"]', 'True', 20, 2, false),
    ('Short Answer', 'Briefly explain why certification discipline matters for professional traders.', '[]', null, 20, 3, true),
    ('Chart Analysis', 'Describe the market structure, liquidity, and risk plan shown in your submitted chart analysis.', '[]', null, 20, 4, true),
    ('Essay Response', 'Explain how AFF principles connect technical skill, risk management, and trading psychology.', '[]', null, 20, 5, true)
) as seed(question_type, prompt, options, correct_answer, points, sort_order, requires_manual_review)
where not exists (
  select 1
  from public.certification_exam_questions existing
  where existing.exam_id = exam.id
    and existing.prompt = seed.prompt
);

notify pgrst, 'reload schema';
