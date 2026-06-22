create table if not exists public.lms_courses (
  id bigserial primary key,
  course_code text not null unique,
  course_name text not null,
  description text,
  instructor_name text not null default 'Dr. Jean Rene Moricette',
  thumbnail_url text,
  credit_hours numeric(5,2) not null default 1,
  status text not null default 'Draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lms_course_status_check check (status in ('Draft', 'Published', 'Archived'))
);

create table if not exists public.lms_modules (
  id bigserial primary key,
  course_id bigint not null references public.lms_courses(id) on delete cascade,
  module_title text not null,
  module_description text,
  module_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, module_order)
);

create table if not exists public.lms_lessons (
  id bigserial primary key,
  course_id bigint not null references public.lms_courses(id) on delete cascade,
  module_id bigint not null references public.lms_modules(id) on delete cascade,
  lesson_title text not null,
  lesson_description text,
  video_url text,
  pdf_notes_url text,
  lesson_order integer not null default 1,
  estimated_minutes integer not null default 20,
  status text not null default 'Published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (module_id, lesson_order)
);

create table if not exists public.lms_homework_assignments (
  id bigserial primary key,
  course_id bigint not null references public.lms_courses(id) on delete cascade,
  module_id bigint references public.lms_modules(id) on delete cascade,
  lesson_id bigint references public.lms_lessons(id) on delete cascade,
  assignment_title text not null,
  instructions text,
  assignment_file_url text,
  due_days integer not null default 7,
  status text not null default 'Published',
  created_at timestamptz not null default now()
);

create table if not exists public.lms_quizzes (
  id bigserial primary key,
  course_id bigint not null references public.lms_courses(id) on delete cascade,
  module_id bigint references public.lms_modules(id) on delete cascade,
  lesson_id bigint references public.lms_lessons(id) on delete cascade,
  quiz_title text not null,
  questions jsonb not null default '[]'::jsonb,
  passing_score integer not null default 80,
  status text not null default 'Published',
  created_at timestamptz not null default now(),
  constraint lms_quiz_passing_score_check check (passing_score between 0 and 100)
);

create table if not exists public.lms_enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  course_id bigint not null references public.lms_courses(id) on delete cascade,
  enrollment_status text not null default 'Active',
  progress_percentage integer not null default 0,
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (student_id, course_id),
  constraint lms_enrollment_progress_check check (progress_percentage between 0 and 100)
);

create table if not exists public.lms_lesson_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  course_id bigint not null references public.lms_courses(id) on delete cascade,
  lesson_id bigint not null references public.lms_lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique (student_id, lesson_id)
);

create table if not exists public.lms_quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  course_id bigint not null references public.lms_courses(id) on delete cascade,
  quiz_id bigint not null references public.lms_quizzes(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  score integer not null,
  result text not null,
  submitted_at timestamptz not null default now(),
  constraint lms_attempt_score_check check (score between 0 and 100),
  constraint lms_attempt_result_check check (result in ('Pass', 'Fail'))
);

create table if not exists public.lms_course_certificates (
  id uuid primary key default gen_random_uuid(),
  certificate_number text not null unique,
  student_id uuid not null references auth.users(id) on delete cascade,
  course_id bigint not null references public.lms_courses(id) on delete cascade,
  course_name text not null,
  student_name text not null,
  completion_date date not null default current_date,
  verification_code text not null unique,
  created_at timestamptz not null default now(),
  unique (student_id, course_id)
);

create index if not exists lms_modules_course_idx on public.lms_modules (course_id, module_order);
create index if not exists lms_lessons_course_module_idx on public.lms_lessons (course_id, module_id, lesson_order);
create index if not exists lms_progress_student_course_idx on public.lms_lesson_progress (student_id, course_id);
create index if not exists lms_enrollments_student_idx on public.lms_enrollments (student_id, enrollment_status);

alter table public.lms_courses enable row level security;
alter table public.lms_modules enable row level security;
alter table public.lms_lessons enable row level security;
alter table public.lms_homework_assignments enable row level security;
alter table public.lms_quizzes enable row level security;
alter table public.lms_enrollments enable row level security;
alter table public.lms_lesson_progress enable row level security;
alter table public.lms_quiz_attempts enable row level security;
alter table public.lms_course_certificates enable row level security;

create policy "Authenticated users can read published LMS courses" on public.lms_courses for select to authenticated using (status = 'Published' or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF admin can manage LMS courses" on public.lms_courses for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Authenticated users can read LMS modules" on public.lms_modules for select to authenticated using (true);
create policy "AFF admin can manage LMS modules" on public.lms_modules for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Authenticated users can read LMS lessons" on public.lms_lessons for select to authenticated using (status = 'Published' or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF admin can manage LMS lessons" on public.lms_lessons for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Authenticated users can read LMS homework" on public.lms_homework_assignments for select to authenticated using (status = 'Published' or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF admin can manage LMS homework" on public.lms_homework_assignments for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Authenticated users can read LMS quizzes" on public.lms_quizzes for select to authenticated using (status = 'Published' or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF admin can manage LMS quizzes" on public.lms_quizzes for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Students manage own LMS enrollments" on public.lms_enrollments for all to authenticated using (auth.uid() = student_id or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (auth.uid() = student_id or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Students manage own LMS lesson progress" on public.lms_lesson_progress for all to authenticated using (auth.uid() = student_id or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (auth.uid() = student_id or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Students manage own LMS quiz attempts" on public.lms_quiz_attempts for all to authenticated using (auth.uid() = student_id or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (auth.uid() = student_id or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Students read own LMS certificates" on public.lms_course_certificates for select to authenticated using (auth.uid() = student_id or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Students create own LMS certificates" on public.lms_course_certificates for insert to authenticated with check (auth.uid() = student_id or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

grant select, insert, update, delete on public.lms_courses, public.lms_modules, public.lms_lessons, public.lms_homework_assignments, public.lms_quizzes, public.lms_enrollments, public.lms_lesson_progress, public.lms_quiz_attempts, public.lms_course_certificates to authenticated;
grant usage, select on sequence public.lms_courses_id_seq, public.lms_modules_id_seq, public.lms_lessons_id_seq, public.lms_homework_assignments_id_seq, public.lms_quizzes_id_seq to authenticated;

insert into public.lms_courses (course_code, course_name, description, instructor_name, credit_hours, status)
values ('AFF-FX-101', 'Forex Foundations LMS', 'A database-managed introduction to currency markets, execution, sessions, and disciplined learning workflows.', 'Dr. Jean Rene Moricette', 3, 'Published')
on conflict (course_code) do update set course_name = excluded.course_name, description = excluded.description, status = excluded.status;

with selected_course as (select id from public.lms_courses where course_code = 'AFF-FX-101')
insert into public.lms_modules (course_id, module_title, module_description, module_order)
select id, 'Module 1: Market Foundations', 'Core market map, currency pairs, sessions, and execution.', 1 from selected_course
on conflict (course_id, module_order) do update set module_title = excluded.module_title, module_description = excluded.module_description;

with selected_module as (
  select m.id as module_id, m.course_id from public.lms_modules m join public.lms_courses c on c.id = m.course_id where c.course_code = 'AFF-FX-101' and m.module_order = 1
)
insert into public.lms_lessons (course_id, module_id, lesson_title, lesson_description, lesson_order, estimated_minutes, status)
select course_id, module_id, seed.title, seed.description, seed.lesson_order, 25, 'Published'
from selected_module
cross join (values
  ('The Forex Market Map', 'Understand participants, liquidity, sessions, and the global market structure.', 1),
  ('Currency Pairs and Quote Anatomy', 'Learn base currency, quote currency, bid, ask, and spread.', 2)
) as seed(title, description, lesson_order)
on conflict (module_id, lesson_order) do update set lesson_title = excluded.lesson_title, lesson_description = excluded.lesson_description;

notify pgrst, 'reload schema';
