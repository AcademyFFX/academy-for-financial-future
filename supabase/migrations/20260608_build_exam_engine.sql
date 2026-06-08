alter table public.exams
  add column if not exists exam_id text,
  add column if not exists question_bank jsonb not null default '[]'::jsonb,
  add column if not exists passed boolean not null default false,
  add column if not exists passing_score integer not null default 80,
  add column if not exists attempt_number integer not null default 1,
  add column if not exists max_attempts integer not null default 3,
  add column if not exists time_limit_minutes integer not null default 30,
  add column if not exists duration_seconds integer not null default 0;

update public.exams
set exam_id = coalesce(exam_id, lower(replace(exam_title, ' ', '-'))),
    passed = coalesce(passed, result = 'Pass'),
    passing_score = coalesce(passing_score, 80),
    max_attempts = coalesce(max_attempts, 3),
    time_limit_minutes = coalesce(time_limit_minutes, 30),
    duration_seconds = coalesce(duration_seconds, 0);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'exams_passing_score_check'
      and conrelid = 'public.exams'::regclass
  ) then
    alter table public.exams
      add constraint exams_passing_score_check
      check (passing_score between 1 and 100);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'exams_attempt_number_check'
      and conrelid = 'public.exams'::regclass
  ) then
    alter table public.exams
      add constraint exams_attempt_number_check
      check (attempt_number >= 1);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'exams_time_limit_check'
      and conrelid = 'public.exams'::regclass
  ) then
    alter table public.exams
      add constraint exams_time_limit_check
      check (time_limit_minutes > 0 and duration_seconds >= 0);
  end if;
end $$;

alter table public.exams enable row level security;

grant select, insert on public.exams to authenticated;

drop policy if exists "Students can read own exam results" on public.exams;
drop policy if exists "Students can create own exam results" on public.exams;
drop policy if exists "Admins can read exam attempts" on public.exams;

create policy "Students can read own exam results"
on public.exams
for select
to authenticated
using (auth.uid() = student_id);

create policy "Students can create own exam results"
on public.exams
for insert
to authenticated
with check (auth.uid() = student_id);

create policy "Admins can read exam attempts"
on public.exams
for select
to authenticated
using (lower(auth.jwt() ->> 'email') = 'acafffx@gmail.com');

notify pgrst, 'reload schema';
