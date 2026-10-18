begin;

create table if not exists public.certification_catalog (
  id bigserial primary key,
  slug text not null unique,
  certificate_name text not null,
  description text,
  passing_score integer not null default 80,
  status text not null default 'Active',
  sort_order integer not null default 0,
  course_id bigint references public.courses(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.certification_catalog
  add column if not exists course_id bigint references public.courses(id) on delete set null;

create table if not exists public.certification_exams (
  id bigserial primary key,
  certification_id bigint not null references public.certification_catalog(id) on delete cascade,
  exam_title text not null,
  exam_code text,
  scheduled_at timestamptz,
  time_limit_minutes integer not null default 45,
  max_attempts integer not null default 3,
  status text not null default 'Available',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.certification_exams add column if not exists exam_code text;

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
  created_at timestamptz not null default now()
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
  created_at timestamptz not null default now()
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
  created_at timestamptz not null default now()
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
  created_at timestamptz not null default now()
);

create unique index if not exists certification_exams_exam_code_unique
  on public.certification_exams (exam_code)
  where exam_code is not null;
create index if not exists certification_catalog_course_idx on public.certification_catalog (course_id);
create index if not exists certification_questions_exam_idx on public.certification_exam_questions (exam_id, sort_order);
create index if not exists certification_attempts_student_idx on public.certification_exam_attempts (student_id, submitted_at desc);
create index if not exists certification_responses_attempt_idx on public.certification_exam_responses (attempt_id);
alter table public.certification_catalog enable row level security;
alter table public.certification_exams enable row level security;
alter table public.certification_exam_questions enable row level security;
alter table public.certification_exam_attempts enable row level security;
alter table public.certification_exam_responses enable row level security;
alter table public.certification_review_queue enable row level security;
alter table public.digital_certificates enable row level security;

grant select on public.certification_catalog, public.certification_exams, public.certification_exam_questions to authenticated;
grant select, insert on public.certification_exam_attempts, public.certification_exam_responses to authenticated;
grant select, insert on public.digital_certificates to authenticated;
grant select, insert, update, delete on public.certification_review_queue to authenticated;
grant usage, select on sequence public.certification_catalog_id_seq to authenticated;
grant usage, select on sequence public.certification_exams_id_seq to authenticated;
grant usage, select on sequence public.certification_exam_questions_id_seq to authenticated;
grant usage, select on sequence public.certification_exam_attempts_id_seq to authenticated;
grant usage, select on sequence public.certification_exam_responses_id_seq to authenticated;
grant usage, select on sequence public.certification_review_queue_id_seq to authenticated;
grant usage, select on sequence public.digital_certificates_id_seq to authenticated;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'certification_catalog' and policyname = 'AFF students read active certification catalog') then
    create policy "AFF students read active certification catalog" on public.certification_catalog for select to authenticated using (status = 'Active' or public.is_aff_admin());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'certification_exams' and policyname = 'AFF students read available certification exams') then
    create policy "AFF students read available certification exams" on public.certification_exams for select to authenticated using (status in ('Available', 'Scheduled') or public.is_aff_admin());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'certification_exam_questions' and policyname = 'AFF students read available exam questions') then
    create policy "AFF students read available exam questions" on public.certification_exam_questions for select to authenticated using (exists (select 1 from public.certification_exams exam where exam.id = exam_id and (exam.status in ('Available', 'Scheduled') or public.is_aff_admin())));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'certification_exam_attempts' and policyname = 'AFF students manage own certification attempts') then
    create policy "AFF students manage own certification attempts" on public.certification_exam_attempts for all to authenticated using (student_id = auth.uid() or public.is_aff_admin()) with check (student_id = auth.uid() or public.is_aff_admin());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'certification_exam_responses' and policyname = 'AFF students manage own certification responses') then
    create policy "AFF students manage own certification responses" on public.certification_exam_responses for all to authenticated using (exists (select 1 from public.certification_exam_attempts attempt where attempt.id = attempt_id and (attempt.student_id = auth.uid() or public.is_aff_admin()))) with check (exists (select 1 from public.certification_exam_attempts attempt where attempt.id = attempt_id and (attempt.student_id = auth.uid() or public.is_aff_admin())));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'certification_review_queue' and policyname = 'AFF admins manage certification reviews') then
    create policy "AFF admins manage certification reviews" on public.certification_review_queue for all to authenticated using (public.is_aff_admin()) with check (public.is_aff_admin());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'digital_certificates' and policyname = 'AFF students read own digital certificates') then
    create policy "AFF students read own digital certificates" on public.digital_certificates for select to authenticated using (student_id = auth.uid() or public.is_aff_admin());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'digital_certificates' and policyname = 'AFF students issue own digital certificates') then
    create policy "AFF students issue own digital certificates" on public.digital_certificates for insert to authenticated with check (student_id = auth.uid());
  end if;
end $$;

do $$
declare
  foundations_course_id bigint;
  foundations_certification_id bigint;
  foundations_exam_id bigint;
begin
  select id into foundations_course_id
  from public.courses
  where lower(trim(course_name)) = 'forex foundations'
  order by id
  limit 1;

  if foundations_course_id is null then
    raise exception 'Forex Foundations course was not found; certification data was not changed.';
  end if;

  insert into public.certification_catalog (slug, certificate_name, description, passing_score, status, sort_order, course_id)
  values ('forex-foundations', 'Forex Foundations Certificate', 'Certification in currency pairs, exchange rates, sessions, execution, broker interfaces, position sizing, and capital survival.', 80, 'Active', 1, foundations_course_id)
  on conflict (slug) do update
  set certificate_name = excluded.certificate_name,
      description = excluded.description,
      passing_score = excluded.passing_score,
      status = 'Active',
      sort_order = excluded.sort_order,
      course_id = excluded.course_id,
      updated_at = now()
  returning id into foundations_certification_id;

  select id into foundations_exam_id
  from public.certification_exams
  where exam_code = 'AFF-FX-FOUNDATIONS-CERT'
  order by id
  limit 1;

  if foundations_exam_id is null then
    insert into public.certification_exams (certification_id, exam_title, exam_code, time_limit_minutes, max_attempts, status)
    values (foundations_certification_id, 'Forex Foundations Certification Examination', 'AFF-FX-FOUNDATIONS-CERT', 45, 3, 'Available')
    returning id into foundations_exam_id;
  else
    update public.certification_exams
    set certification_id = foundations_certification_id,
        exam_title = 'Forex Foundations Certification Examination',
        time_limit_minutes = 45,
        max_attempts = 3,
        status = 'Available',
        updated_at = now()
    where id = foundations_exam_id;
  end if;

  insert into public.certification_exam_questions (exam_id, question_type, prompt, options, correct_answer, points, sort_order, requires_manual_review)
  select foundations_exam_id, seed.question_type, seed.prompt, seed.options::jsonb, seed.correct_answer, 10, seed.sort_order, false
  from (values
    ('Multiple Choice', 'In EUR/USD, which currency is the base currency?', '["EUR","USD","Both","Neither"]', 'EUR', 1),
    ('Multiple Choice', 'What primarily determines an exchange rate in a competitive market?', '["Supply and Demand","Chart color","Broker logo","Weekend hours"]', 'Supply and Demand', 2),
    ('Multiple Choice', 'Which trading session is generally associated with the major European trading period?', '["London","Tokyo","Sydney only","Weekend session"]', 'London', 3),
    ('Multiple Choice', 'What does a pip measure in forex trading?', '["A standardized price movement","Account ownership","Broker regulation","News frequency"]', 'A standardized price movement', 4),
    ('Multiple Choice', 'What does position sizing determine?', '["The trade size based on planned risk","The market closing time","The currency symbol","The broker password"]', 'The trade size based on planned risk', 5),
    ('Multiple Choice', 'Which order is designed to limit loss when price reaches a predefined level?', '["Stop loss","Take profit","Market watch","Deposit order"]', 'Stop loss', 6),
    ('Multiple Choice', 'Why should a trader calculate risk before entering a trade?', '["To protect trading capital","To guarantee profit","To remove all volatility","To avoid using a plan"]', 'To protect trading capital', 7),
    ('Multiple Choice', 'What is the spread?', '["The difference between bid and ask prices","The number of open charts","The account balance","The trading session duration"]', 'The difference between bid and ask prices', 8),
    ('True/False', 'Higher leverage can increase both potential gains and potential losses.', '["True","False"]', 'True', 9),
    ('True/False', 'Completing a trade plan removes the need for risk management.', '["True","False"]', 'False', 10)
  ) as seed(question_type, prompt, options, correct_answer, sort_order)
  where not exists (
    select 1 from public.certification_exam_questions existing
    where existing.exam_id = foundations_exam_id and lower(trim(existing.prompt)) = lower(trim(seed.prompt))
  );
end $$;

notify pgrst, 'reload schema';

commit;
