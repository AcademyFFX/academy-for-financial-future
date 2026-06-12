alter table public.zoom_class_sessions
  add column if not exists instructor_name text not null default 'Dr. Jean Rene Moricette',
  add column if not exists class_notes_title text,
  add column if not exists class_notes_url text,
  add column if not exists homework_title text,
  add column if not exists homework_instructions text,
  add column if not exists homework_due_date date,
  add column if not exists homework_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'live-classroom-notes',
  'live-classroom-notes',
  true,
  52428800,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/png',
    'image/jpeg'
  ]
)
on conflict (id) do update
set public = true,
    file_size_limit = 52428800,
    allowed_mime_types = excluded.allowed_mime_types;

alter table public.zoom_class_sessions enable row level security;
alter table public.zoom_attendance enable row level security;

grant select, insert, update, delete on public.zoom_class_sessions to authenticated;
grant select, insert, update, delete on public.zoom_attendance to authenticated;

drop policy if exists "AFF live classroom students can read classes" on public.zoom_class_sessions;
drop policy if exists "AFF live classroom admin can manage classes" on public.zoom_class_sessions;
drop policy if exists "AFF live classroom students can read attendance" on public.zoom_attendance;
drop policy if exists "AFF live classroom students can record attendance" on public.zoom_attendance;
drop policy if exists "AFF live classroom admin can manage attendance" on public.zoom_attendance;

create policy "AFF live classroom students can read classes"
on public.zoom_class_sessions
for select
to authenticated
using (
  status <> 'Cancelled'
  or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com'
);

create policy "AFF live classroom admin can manage classes"
on public.zoom_class_sessions
for all
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

create policy "AFF live classroom students can read attendance"
on public.zoom_attendance
for select
to authenticated
using (
  auth.uid() = student_id
  or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com'
);

create policy "AFF live classroom students can record attendance"
on public.zoom_attendance
for insert
to authenticated
with check (auth.uid() = student_id);

create policy "AFF live classroom admin can manage attendance"
on public.zoom_attendance
for all
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "AFF instructors can upload live classroom notes" on storage.objects;
drop policy if exists "Authenticated students can read live classroom notes" on storage.objects;

create policy "AFF instructors can upload live classroom notes"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'live-classroom-notes'
  and lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com'
);

create policy "Authenticated students can read live classroom notes"
on storage.objects
for select
to authenticated
using (bucket_id = 'live-classroom-notes');

update public.zoom_class_sessions
set
  instructor_name = coalesce(instructor_name, 'Dr. Jean Rene Moricette'),
  class_notes_title = coalesce(class_notes_title, 'Forex Anatomy Live Class Notes'),
  homework_title = coalesce(homework_title, 'Submit a structured chart analysis'),
  homework_instructions = coalesce(homework_instructions, 'Upload a PDF, DOCX, screenshot, or chart analysis through the AFF Homework Center after attending class.'),
  homework_due_date = coalesce(homework_due_date, (current_date + interval '7 days')::date)
where title = 'Forex Anatomy Live Review';

insert into public.zoom_class_sessions (
  title,
  description,
  session_date,
  duration_minutes,
  instructor_name,
  meeting_id,
  passcode,
  join_url,
  recording_url,
  status,
  class_notes_title,
  class_notes_url,
  homework_title,
  homework_instructions,
  homework_due_date,
  homework_url,
  created_by
)
select
  'AFF Live Classroom Orientation',
  'Orientation for students joining the Academy for Financial Future live learning environment, attendance workflow, homework submission process, and class recording archive.',
  now() + interval '3 days',
  60,
  'Dr. Jean Rene Moricette',
  null,
  null,
  null,
  null,
  'Scheduled',
  'Live Classroom Orientation Notes',
  null,
  'Complete Live Classroom onboarding reflection',
  'Submit a short reflection in the Homework Center describing your learning goals and class participation plan.',
  (current_date + interval '10 days')::date,
  '/homework-center',
  'acafffx@gmail.com'
where not exists (
  select 1 from public.zoom_class_sessions where title = 'AFF Live Classroom Orientation'
);

notify pgrst, 'reload schema';
