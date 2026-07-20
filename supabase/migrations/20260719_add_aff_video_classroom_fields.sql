begin;

create extension if not exists pgcrypto;

alter table public.lessons
  add column if not exists video_provider text,
  add column if not exists video_title text,
  add column if not exists video_duration_seconds integer,
  add column if not exists video_thumbnail_url text,
  add column if not exists transcript_text text,
  add column if not exists learning_objectives text,
  add column if not exists chapter_markers jsonb not null default '[]'::jsonb;

alter table public.lessons
  drop constraint if exists lessons_video_provider_check;

alter table public.lessons
  add constraint lessons_video_provider_check
  check (
    video_provider is null
    or lower(video_provider) in ('youtube', 'vimeo', 'mp4', 'uploaded_video', 'bunny', 'embed', 'none')
  );

create table if not exists public.video_progress (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  course_id bigint not null references public.courses(id) on delete cascade,
  lesson_id bigint not null references public.lessons(id) on delete cascade,
  watched_seconds integer not null default 0,
  duration_seconds integer not null default 0,
  percent_watched numeric not null default 0,
  completed boolean not null default false,
  last_watched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint video_progress_unique_student_lesson unique (auth_user_id, course_id, lesson_id),
  constraint video_progress_watched_nonnegative check (watched_seconds >= 0),
  constraint video_progress_duration_nonnegative check (duration_seconds >= 0),
  constraint video_progress_percent_range check (percent_watched >= 0 and percent_watched <= 100)
);

alter table public.video_progress add column if not exists auth_user_id uuid references auth.users(id) on delete cascade;
alter table public.video_progress add column if not exists course_id bigint references public.courses(id) on delete cascade;
alter table public.video_progress add column if not exists lesson_id bigint references public.lessons(id) on delete cascade;
alter table public.video_progress add column if not exists watched_seconds integer not null default 0;
alter table public.video_progress add column if not exists duration_seconds integer not null default 0;
alter table public.video_progress add column if not exists percent_watched numeric not null default 0;
alter table public.video_progress add column if not exists completed boolean not null default false;
alter table public.video_progress add column if not exists last_watched_at timestamptz;
alter table public.video_progress add column if not exists created_at timestamptz not null default now();
alter table public.video_progress add column if not exists updated_at timestamptz not null default now();

create unique index if not exists video_progress_auth_course_lesson_unique
on public.video_progress (auth_user_id, course_id, lesson_id);

create index if not exists video_progress_auth_updated_idx
on public.video_progress (auth_user_id, updated_at desc);

alter table public.video_progress enable row level security;

grant select, insert, update, delete on public.video_progress to authenticated;

drop policy if exists "Students can read own video progress" on public.video_progress;
drop policy if exists "Students can create own video progress" on public.video_progress;
drop policy if exists "Students can update own video progress" on public.video_progress;
drop policy if exists "Students can delete own video progress" on public.video_progress;

create policy "Students can read own video progress"
on public.video_progress
for select
to authenticated
using (auth.uid() = auth_user_id);

create policy "Students can create own video progress"
on public.video_progress
for insert
to authenticated
with check (auth.uid() = auth_user_id);

create policy "Students can update own video progress"
on public.video_progress
for update
to authenticated
using (auth.uid() = auth_user_id)
with check (auth.uid() = auth_user_id);

create policy "Students can delete own video progress"
on public.video_progress
for delete
to authenticated
using (auth.uid() = auth_user_id);

notify pgrst, 'reload schema';

commit;
