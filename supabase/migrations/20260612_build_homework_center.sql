create table if not exists public.homework_submissions (
  id bigserial primary key,
  student_id uuid not null references auth.users(id) on delete cascade,
  student_name text,
  student_email text,
  title text not null,
  course_module text,
  lesson_title text,
  homework_type text not null default 'General Homework',
  student_notes text,
  pdf_url text,
  pdf_path text,
  docx_url text,
  docx_path text,
  screenshot_url text,
  screenshot_path text,
  chart_analysis_url text,
  chart_analysis_path text,
  status text not null default 'Submitted',
  score numeric check (score is null or (score >= 0 and score <= 100)),
  instructor_comments text,
  corrections text,
  graded_by text,
  graded_at timestamptz,
  completion_date date,
  grading_history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint homework_submissions_status_check check (status in ('Submitted', 'In Review', 'Approved', 'Returned', 'Needs Corrections'))
);

alter table public.homework_submissions
  add column if not exists student_name text,
  add column if not exists student_email text,
  add column if not exists course_module text,
  add column if not exists lesson_title text,
  add column if not exists homework_type text not null default 'General Homework',
  add column if not exists student_notes text,
  add column if not exists pdf_url text,
  add column if not exists pdf_path text,
  add column if not exists docx_url text,
  add column if not exists docx_path text,
  add column if not exists screenshot_url text,
  add column if not exists screenshot_path text,
  add column if not exists chart_analysis_url text,
  add column if not exists chart_analysis_path text,
  add column if not exists status text not null default 'Submitted',
  add column if not exists score numeric,
  add column if not exists instructor_comments text,
  add column if not exists corrections text,
  add column if not exists graded_by text,
  add column if not exists graded_at timestamptz,
  add column if not exists completion_date date,
  add column if not exists grading_history jsonb not null default '[]'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists homework_submissions_student_idx
  on public.homework_submissions (student_id, created_at desc);

create index if not exists homework_submissions_status_idx
  on public.homework_submissions (status, created_at desc);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'homework-center',
  'homework-center',
  true,
  52428800,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg',
    'image/webp'
  ]
)
on conflict (id) do update
set public = true,
    file_size_limit = 52428800,
    allowed_mime_types = excluded.allowed_mime_types;

alter table public.homework_submissions enable row level security;

grant select, insert, update, delete on public.homework_submissions to authenticated;
grant usage, select on sequence public.homework_submissions_id_seq to authenticated;

drop policy if exists "Students can read own homework submissions" on public.homework_submissions;
drop policy if exists "Students can create own homework submissions" on public.homework_submissions;
drop policy if exists "Students can update returned homework submissions" on public.homework_submissions;
drop policy if exists "AFF administrator can manage homework submissions" on public.homework_submissions;

create policy "Students can read own homework submissions"
on public.homework_submissions
for select
to authenticated
using (
  auth.uid() = student_id
  or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com'
);

create policy "Students can create own homework submissions"
on public.homework_submissions
for insert
to authenticated
with check (auth.uid() = student_id);

create policy "Students can update returned homework submissions"
on public.homework_submissions
for update
to authenticated
using (auth.uid() = student_id and status in ('Returned', 'Needs Corrections'))
with check (auth.uid() = student_id);

create policy "AFF administrator can manage homework submissions"
on public.homework_submissions
for all
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Students can upload own homework files" on storage.objects;
drop policy if exists "Students can read own homework files" on storage.objects;
drop policy if exists "AFF administrator can read homework files" on storage.objects;

create policy "Students can upload own homework files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'homework-center'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Students can read own homework files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'homework-center'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "AFF administrator can read homework files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'homework-center'
  and lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com'
);

notify pgrst, 'reload schema';
