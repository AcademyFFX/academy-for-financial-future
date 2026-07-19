begin;

create extension if not exists pgcrypto;

create table if not exists public.lesson_notes (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  course_id bigint not null references public.courses(id) on delete cascade,
  lesson_id bigint not null references public.lessons(id) on delete cascade,
  note_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lesson_notes_unique_student_lesson unique (auth_user_id, course_id, lesson_id)
);

alter table public.lesson_notes add column if not exists auth_user_id uuid references auth.users(id) on delete cascade;
alter table public.lesson_notes add column if not exists course_id bigint references public.courses(id) on delete cascade;
alter table public.lesson_notes add column if not exists lesson_id bigint references public.lessons(id) on delete cascade;
alter table public.lesson_notes add column if not exists note_text text;
alter table public.lesson_notes add column if not exists created_at timestamptz not null default now();
alter table public.lesson_notes add column if not exists updated_at timestamptz not null default now();

create unique index if not exists lesson_notes_auth_course_lesson_unique
on public.lesson_notes (auth_user_id, course_id, lesson_id);

create index if not exists lesson_notes_auth_user_idx
on public.lesson_notes (auth_user_id, updated_at desc);

alter table public.lesson_notes enable row level security;

grant select, insert, update, delete on public.lesson_notes to authenticated;

drop policy if exists "Students can read own lesson notes" on public.lesson_notes;
drop policy if exists "Students can create own lesson notes" on public.lesson_notes;
drop policy if exists "Students can update own lesson notes" on public.lesson_notes;
drop policy if exists "Students can delete own lesson notes" on public.lesson_notes;

create policy "Students can read own lesson notes"
on public.lesson_notes
for select
to authenticated
using (auth.uid() = auth_user_id);

create policy "Students can create own lesson notes"
on public.lesson_notes
for insert
to authenticated
with check (auth.uid() = auth_user_id);

create policy "Students can update own lesson notes"
on public.lesson_notes
for update
to authenticated
using (auth.uid() = auth_user_id)
with check (auth.uid() = auth_user_id);

create policy "Students can delete own lesson notes"
on public.lesson_notes
for delete
to authenticated
using (auth.uid() = auth_user_id);

notify pgrst, 'reload schema';

commit;
