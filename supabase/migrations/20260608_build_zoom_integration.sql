create table if not exists public.zoom_class_sessions (
  id bigserial primary key,
  title text not null,
  description text,
  session_date timestamptz not null,
  duration_minutes integer not null default 60,
  meeting_id text,
  passcode text,
  join_url text,
  recording_url text,
  status text not null default 'Scheduled',
  created_by text not null default 'acafffx@gmail.com',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint zoom_class_sessions_status_check check (status in ('Scheduled', 'Live', 'Completed', 'Cancelled')),
  constraint zoom_class_sessions_duration_check check (duration_minutes >= 15)
);

create table if not exists public.zoom_attendance (
  id bigserial primary key,
  session_id bigint not null references public.zoom_class_sessions(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  student_name text not null,
  student_email text not null,
  attendance_status text not null default 'Joined',
  joined_at timestamptz not null default now(),
  unique (session_id, student_id)
);

alter table public.zoom_class_sessions enable row level security;
alter table public.zoom_attendance enable row level security;

drop policy if exists "Authenticated students can read Zoom classes" on public.zoom_class_sessions;
drop policy if exists "AFF administrator can manage Zoom classes" on public.zoom_class_sessions;
drop policy if exists "Students can read their Zoom attendance" on public.zoom_attendance;
drop policy if exists "Students can record their Zoom attendance" on public.zoom_attendance;
drop policy if exists "Students can update their Zoom attendance" on public.zoom_attendance;
drop policy if exists "AFF administrator can read Zoom attendance" on public.zoom_attendance;
drop policy if exists "AFF administrator can manage Zoom attendance" on public.zoom_attendance;

create policy "Authenticated students can read Zoom classes"
on public.zoom_class_sessions
for select
to authenticated
using (status <> 'Cancelled' or (auth.jwt() ->> 'email') = 'acafffx@gmail.com');

create policy "AFF administrator can manage Zoom classes"
on public.zoom_class_sessions
for all
to authenticated
using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com')
with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

create policy "Students can read their Zoom attendance"
on public.zoom_attendance
for select
to authenticated
using (auth.uid() = student_id or (auth.jwt() ->> 'email') = 'acafffx@gmail.com');

create policy "Students can record their Zoom attendance"
on public.zoom_attendance
for insert
to authenticated
with check (auth.uid() = student_id);

create policy "Students can update their Zoom attendance"
on public.zoom_attendance
for update
to authenticated
using (auth.uid() = student_id)
with check (auth.uid() = student_id);

create policy "AFF administrator can manage Zoom attendance"
on public.zoom_attendance
for all
to authenticated
using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com')
with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

insert into public.zoom_class_sessions (
  title,
  description,
  session_date,
  duration_minutes,
  meeting_id,
  passcode,
  join_url,
  recording_url,
  status,
  created_by
)
select
  title,
  description,
  session_date,
  duration_minutes,
  meeting_id,
  passcode,
  join_url,
  recording_url,
  status,
  created_by
from (
  values
  (
    'Forex Anatomy Live Review',
    'Instructor-led review of market structure, liquidity, session timing, and execution discipline for Academy for Financial Future students.',
    now() + interval '2 days',
    75,
    null,
    null,
    null,
    null,
    'Scheduled',
    'acafffx@gmail.com'
  )
) as seed(title, description, session_date, duration_minutes, meeting_id, passcode, join_url, recording_url, status, created_by)
where not exists (
  select 1
  from public.zoom_class_sessions
  where title = 'Forex Anatomy Live Review'
);

grant select, insert, update, delete on public.zoom_class_sessions to authenticated;
grant select, insert, update, delete on public.zoom_attendance to authenticated;
grant usage on sequence public.zoom_class_sessions_id_seq to authenticated;
grant usage on sequence public.zoom_attendance_id_seq to authenticated;

notify pgrst, 'reload schema';
