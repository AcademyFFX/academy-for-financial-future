-- Build the student assignment submission module on public.assignments.
-- Run this in Supabase SQL Editor if the live table does not yet have these columns.

alter table public.assignments
  add column if not exists student_id uuid references auth.users(id) on delete cascade,
  add column if not exists course_module text,
  add column if not exists student_notes text,
  add column if not exists file_url text,
  add column if not exists submission_date date not null default current_date;

alter table public.assignments enable row level security;

grant select, insert on public.assignments to authenticated;

drop policy if exists "Students can read own assignments" on public.assignments;
drop policy if exists "Students can create own assignment submissions" on public.assignments;

create policy "Students can read own assignments"
on public.assignments
for select
to authenticated
using (auth.uid() = student_id);

create policy "Students can create own assignment submissions"
on public.assignments
for insert
to authenticated
with check (auth.uid() = student_id);

notify pgrst, 'reload schema';
