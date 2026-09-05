begin;

alter table public.exams
  add column if not exists auth_user_id uuid references auth.users(id) on delete cascade,
  add column if not exists exam_id text,
  add column if not exists question_bank jsonb not null default '[]'::jsonb,
  add column if not exists passed boolean not null default false,
  add column if not exists passing_score integer not null default 80,
  add column if not exists attempt_number integer not null default 1,
  add column if not exists max_attempts integer not null default 3,
  add column if not exists duration_seconds integer not null default 0,
  add column if not exists course_id bigint references public.courses(id) on delete set null,
  add column if not exists lesson_id bigint references public.lessons(id) on delete set null,
  add column if not exists quiz_id text,
  add column if not exists selected_answers jsonb not null default '[]'::jsonb,
  add column if not exists total_points integer not null default 0,
  add column if not exists earned_points integer not null default 0,
  add column if not exists percentage numeric(5,2) not null default 0;

update public.exams e
set auth_user_id = coalesce(
  e.auth_user_id,
  case
    when e.student_id::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then e.student_id::text::uuid
    else null
  end,
  s.auth_user_id
)
from public.students s
where e.auth_user_id is null
  and (
    s.auth_user_id::text = e.student_id::text
    or s.id::text = e.student_id::text
  );

update public.exams
set
  quiz_id = coalesce(quiz_id, exam_id::text, exam_title),
  question_bank = coalesce(question_bank, '[]'::jsonb),
  selected_answers = coalesce(selected_answers, '[]'::jsonb),
  total_points = coalesce(total_points, 0),
  earned_points = coalesce(earned_points, score),
  percentage = coalesce(percentage, score),
  passing_score = coalesce(passing_score, 80),
  attempt_number = coalesce(attempt_number, 1),
  max_attempts = coalesce(max_attempts, 3),
  duration_seconds = coalesce(duration_seconds, 0),
  passed = coalesce(passed, result = 'Pass')
where quiz_id is null
   or question_bank is null
   or selected_answers is null
   or total_points is null
   or earned_points is null
   or percentage is null
   or passing_score is null
   or attempt_number is null
   or max_attempts is null
   or duration_seconds is null
   or passed is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'exams_total_points_nonnegative'
      and conrelid = 'public.exams'::regclass
  ) then
    alter table public.exams
      add constraint exams_total_points_nonnegative
      check (total_points >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'exams_earned_points_nonnegative'
      and conrelid = 'public.exams'::regclass
  ) then
    alter table public.exams
      add constraint exams_earned_points_nonnegative
      check (earned_points >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'exams_percentage_range'
      and conrelid = 'public.exams'::regclass
  ) then
    alter table public.exams
      add constraint exams_percentage_range
      check (percentage >= 0 and percentage <= 100);
  end if;
end $$;

create index if not exists exams_auth_user_quiz_idx
on public.exams (auth_user_id, course_id, quiz_id, submitted_at desc);

create index if not exists exams_student_course_quiz_idx
on public.exams (student_id, course_id, quiz_id, submitted_at desc);

alter table public.exams enable row level security;

grant select, insert on public.exams to authenticated;

drop policy if exists "Students can read own exam results" on public.exams;
drop policy if exists "Students can create own exam results" on public.exams;
drop policy if exists "Students can read own exams" on public.exams;
drop policy if exists "Students can manage own exams" on public.exams;
drop policy if exists "Admins can read exam attempts" on public.exams;
drop policy if exists "AFF admins can manage exams" on public.exams;
drop policy if exists "Students can read own LMS quiz attempts" on public.exams;
drop policy if exists "Students can insert own LMS quiz attempts" on public.exams;
drop policy if exists "AFF admins can manage LMS quiz attempts" on public.exams;

create policy "Students can read own LMS quiz attempts"
on public.exams
for select
to authenticated
using (
  auth_user_id = auth.uid()
  or student_id::text = auth.uid()::text
  or exists (
    select 1
    from public.students s
    where s.auth_user_id = auth.uid()
      and s.id::text = public.exams.student_id::text
  )
);

create policy "Students can insert own LMS quiz attempts"
on public.exams
for insert
to authenticated
with check (
  auth_user_id = auth.uid()
  or student_id::text = auth.uid()::text
  or exists (
    select 1
    from public.students s
    where s.auth_user_id = auth.uid()
      and s.id::text = public.exams.student_id::text
  )
);

create policy "AFF admins can manage LMS quiz attempts"
on public.exams
for all
to authenticated
using (public.is_aff_admin())
with check (public.is_aff_admin());

notify pgrst, 'reload schema';

commit;
