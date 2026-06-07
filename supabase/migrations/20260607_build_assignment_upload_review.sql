alter table public.assignments
  add column if not exists course_id text,
  add column if not exists lesson_id text,
  add column if not exists lesson_title text,
  add column if not exists file_path text,
  add column if not exists status text not null default 'Submitted',
  add column if not exists grade numeric check (grade is null or (grade >= 0 and grade <= 100)),
  add column if not exists instructor_feedback text,
  add column if not exists reviewed_by text,
  add column if not exists reviewed_at timestamptz;

insert into storage.buckets (id, name, public, file_size_limit)
values ('assignment-submissions', 'assignment-submissions', true, 52428800)
on conflict (id) do update
set public = true,
    file_size_limit = 52428800;

alter table public.assignments enable row level security;

grant select, insert, update on public.assignments to authenticated;

drop policy if exists "Students can read own assignments" on public.assignments;
drop policy if exists "Students can create own assignment submissions" on public.assignments;
drop policy if exists "Admins can read assignment submissions" on public.assignments;
drop policy if exists "Admins can review assignment submissions" on public.assignments;

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

create policy "Admins can read assignment submissions"
on public.assignments
for select
to authenticated
using (lower(auth.jwt() ->> 'email') = 'acafffx@gmail.com');

create policy "Admins can review assignment submissions"
on public.assignments
for update
to authenticated
using (lower(auth.jwt() ->> 'email') = 'acafffx@gmail.com')
with check (lower(auth.jwt() ->> 'email') = 'acafffx@gmail.com');

drop policy if exists "Students can upload own assignment files" on storage.objects;
drop policy if exists "Students can read own assignment files" on storage.objects;
drop policy if exists "Admins can read assignment files" on storage.objects;

create policy "Students can upload own assignment files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'assignment-submissions'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Students can read own assignment files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'assignment-submissions'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Admins can read assignment files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'assignment-submissions'
  and lower(auth.jwt() ->> 'email') = 'acafffx@gmail.com'
);

notify pgrst, 'reload schema';
