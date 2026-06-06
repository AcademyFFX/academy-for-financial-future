-- Build the certification exams module on public.exams.
-- Run this in Supabase SQL Editor before using /exams in production.

create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  exam_title text not null,
  answers jsonb not null default '{}'::jsonb,
  score integer not null check (score between 0 and 100),
  result text not null check (result in ('Pass', 'Fail')),
  submitted_at timestamptz not null default now()
);

alter table public.exams
  add column if not exists student_id uuid references auth.users(id) on delete cascade,
  add column if not exists exam_title text,
  add column if not exists answers jsonb not null default '{}'::jsonb,
  add column if not exists score integer,
  add column if not exists result text,
  add column if not exists submitted_at timestamptz not null default now();

alter table public.exams
  alter column student_id set not null,
  alter column exam_title set not null,
  alter column score set not null,
  alter column result set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'exams_score_check'
      and conrelid = 'public.exams'::regclass
  ) then
    alter table public.exams
      add constraint exams_score_check
      check (score between 0 and 100);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'exams_result_check'
      and conrelid = 'public.exams'::regclass
  ) then
    alter table public.exams
      add constraint exams_result_check
      check (result in ('Pass', 'Fail'));
  end if;
end $$;

alter table public.exams enable row level security;

grant select, insert on public.exams to authenticated;

drop policy if exists "Students can read own exam results" on public.exams;
drop policy if exists "Students can create own exam results" on public.exams;

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

notify pgrst, 'reload schema';
