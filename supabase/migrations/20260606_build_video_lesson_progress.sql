create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null,
  lesson_id text not null,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, course_id, lesson_id)
);

alter table public.lesson_progress enable row level security;

drop policy if exists "Students can read own lesson progress" on public.lesson_progress;
drop policy if exists "Students can create own lesson progress" on public.lesson_progress;
drop policy if exists "Students can update own lesson progress" on public.lesson_progress;

create policy "Students can read own lesson progress"
on public.lesson_progress
for select
using (auth.uid() = student_id);

create policy "Students can create own lesson progress"
on public.lesson_progress
for insert
with check (auth.uid() = student_id);

create policy "Students can update own lesson progress"
on public.lesson_progress
for update
using (auth.uid() = student_id)
with check (auth.uid() = student_id);

