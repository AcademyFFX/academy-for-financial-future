create table if not exists public.event_calendar (
  id bigserial primary key,
  title text not null,
  event_type text not null default 'Global Conference',
  description text,
  event_location text,
  start_at timestamptz not null,
  end_at timestamptz,
  registration_status text not null default 'Open',
  capacity integer,
  ce_credit_hours numeric not null default 0,
  created_by text not null default 'acafffx@gmail.com',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_calendar_type_check check (event_type in ('Global Conference', 'Workshop', 'Instructor Session', 'Continuing Education', 'Student Summit')),
  constraint event_calendar_status_check check (registration_status in ('Open', 'Invite Only', 'Closed', 'Cancelled'))
);

create table if not exists public.event_registrations (
  id bigserial primary key,
  event_id bigint references public.event_calendar(id) on delete cascade,
  event_title text not null,
  student_id uuid not null references auth.users(id) on delete cascade,
  attendee_name text not null,
  attendee_email text not null,
  registration_type text not null default 'Conference Registration',
  registration_status text not null default 'Registered',
  qr_pass_code text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_registrations_status_check check (registration_status in ('Registered', 'Checked In', 'Cancelled', 'Waitlisted'))
);

create table if not exists public.event_speakers (
  id bigserial primary key,
  event_id bigint references public.event_calendar(id) on delete set null,
  speaker_name text not null,
  speaker_title text not null,
  speaker_email text,
  topic text not null,
  bio text,
  speaker_status text not null default 'Confirmed',
  created_at timestamptz not null default now(),
  constraint event_speakers_status_check check (speaker_status in ('Invited', 'Confirmed', 'Presented', 'Cancelled'))
);

create table if not exists public.event_instructor_schedule (
  id bigserial primary key,
  event_id bigint references public.event_calendar(id) on delete cascade,
  instructor_name text not null,
  instructor_email text not null default 'acafffx@gmail.com',
  session_title text not null,
  scheduled_at timestamptz not null,
  schedule_status text not null default 'Scheduled',
  created_at timestamptz not null default now(),
  constraint event_instructor_schedule_status_check check (schedule_status in ('Scheduled', 'Completed', 'Cancelled'))
);

create table if not exists public.event_attendance (
  id bigserial primary key,
  event_id bigint references public.event_calendar(id) on delete cascade,
  registration_id bigint references public.event_registrations(id) on delete cascade,
  student_id uuid references auth.users(id) on delete set null,
  attendee_name text not null,
  attendee_email text not null,
  event_title text not null,
  attendance_status text not null default 'Registered',
  checked_in_at timestamptz,
  created_at timestamptz not null default now(),
  constraint event_attendance_status_check check (attendance_status in ('Registered', 'Checked In', 'Completed', 'No Show'))
);

create table if not exists public.event_sponsors (
  id bigserial primary key,
  sponsor_name text not null,
  sponsor_level text not null default 'Gold',
  contact_name text,
  contact_email text,
  sponsor_status text not null default 'Active',
  contribution_notes text,
  created_at timestamptz not null default now(),
  constraint event_sponsors_status_check check (sponsor_status in ('Active', 'Prospect', 'Fulfilled', 'Archived'))
);

create table if not exists public.event_certificates (
  id bigserial primary key,
  event_id bigint references public.event_calendar(id) on delete cascade,
  student_id uuid references auth.users(id) on delete set null,
  student_name text not null,
  student_email text not null,
  event_title text not null,
  certificate_number text not null unique,
  ce_credit_hours numeric not null default 0,
  issued_at date not null default current_date,
  verification_code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.event_ce_credits (
  id bigserial primary key,
  event_id bigint references public.event_calendar(id) on delete cascade,
  student_id uuid references auth.users(id) on delete set null,
  student_name text not null,
  student_email text not null,
  event_title text not null,
  credit_hours numeric not null default 0,
  credit_status text not null default 'Awarded',
  awarded_at date not null default current_date,
  created_at timestamptz not null default now(),
  constraint event_ce_credits_status_check check (credit_status in ('Awarded', 'Pending', 'Revoked'))
);

create table if not exists public.event_video_archive (
  id bigserial primary key,
  event_id bigint references public.event_calendar(id) on delete set null,
  event_title text not null,
  recording_title text not null,
  recording_url text,
  access_level text not null default 'Registered Students',
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.event_calendar enable row level security;
alter table public.event_registrations enable row level security;
alter table public.event_speakers enable row level security;
alter table public.event_instructor_schedule enable row level security;
alter table public.event_attendance enable row level security;
alter table public.event_sponsors enable row level security;
alter table public.event_certificates enable row level security;
alter table public.event_ce_credits enable row level security;
alter table public.event_video_archive enable row level security;

drop policy if exists "Students can view open events" on public.event_calendar;
drop policy if exists "AFF administrator can manage events" on public.event_calendar;
drop policy if exists "Students can create own event registrations" on public.event_registrations;
drop policy if exists "Students can view own event registrations" on public.event_registrations;
drop policy if exists "AFF administrator can manage event registrations" on public.event_registrations;
drop policy if exists "Authenticated users can view event speakers" on public.event_speakers;
drop policy if exists "AFF administrator can manage event speakers" on public.event_speakers;
drop policy if exists "AFF administrator can manage instructor schedules" on public.event_instructor_schedule;
drop policy if exists "Students can view own attendance" on public.event_attendance;
drop policy if exists "AFF administrator can manage attendance" on public.event_attendance;
drop policy if exists "Authenticated users can view event sponsors" on public.event_sponsors;
drop policy if exists "AFF administrator can manage event sponsors" on public.event_sponsors;
drop policy if exists "Students can view own event certificates" on public.event_certificates;
drop policy if exists "AFF administrator can manage event certificates" on public.event_certificates;
drop policy if exists "Students can view own CE credits" on public.event_ce_credits;
drop policy if exists "AFF administrator can manage CE credits" on public.event_ce_credits;
drop policy if exists "Authenticated users can view event video archive" on public.event_video_archive;
drop policy if exists "AFF administrator can manage event video archive" on public.event_video_archive;

create policy "Students can view open events" on public.event_calendar for select to authenticated
using (registration_status in ('Open', 'Invite Only') or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF administrator can manage events" on public.event_calendar for all to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

create policy "Students can create own event registrations" on public.event_registrations for insert to authenticated
with check (auth.uid() = student_id);
create policy "Students can view own event registrations" on public.event_registrations for select to authenticated
using (auth.uid() = student_id);
create policy "AFF administrator can manage event registrations" on public.event_registrations for all to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

create policy "Authenticated users can view event speakers" on public.event_speakers for select to authenticated using (true);
create policy "AFF administrator can manage event speakers" on public.event_speakers for all to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

create policy "AFF administrator can manage instructor schedules" on public.event_instructor_schedule for all to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

create policy "Students can view own attendance" on public.event_attendance for select to authenticated
using (auth.uid() = student_id);
create policy "AFF administrator can manage attendance" on public.event_attendance for all to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

create policy "Authenticated users can view event sponsors" on public.event_sponsors for select to authenticated using (true);
create policy "AFF administrator can manage event sponsors" on public.event_sponsors for all to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

create policy "Students can view own event certificates" on public.event_certificates for select to authenticated
using (auth.uid() = student_id);
create policy "AFF administrator can manage event certificates" on public.event_certificates for all to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

create policy "Students can view own CE credits" on public.event_ce_credits for select to authenticated
using (auth.uid() = student_id);
create policy "AFF administrator can manage CE credits" on public.event_ce_credits for all to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

create policy "Authenticated users can view event video archive" on public.event_video_archive for select to authenticated using (true);
create policy "AFF administrator can manage event video archive" on public.event_video_archive for all to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

grant select, insert, update, delete on public.event_calendar to authenticated;
grant select, insert, update, delete on public.event_registrations to authenticated;
grant select, insert, update, delete on public.event_speakers to authenticated;
grant select, insert, update, delete on public.event_instructor_schedule to authenticated;
grant select, insert, update, delete on public.event_attendance to authenticated;
grant select, insert, update, delete on public.event_sponsors to authenticated;
grant select, insert, update, delete on public.event_certificates to authenticated;
grant select, insert, update, delete on public.event_ce_credits to authenticated;
grant select, insert, update, delete on public.event_video_archive to authenticated;

grant usage, select on all sequences in schema public to authenticated;

insert into public.event_calendar (title, event_type, description, event_location, start_at, end_at, registration_status, capacity, ce_credit_hours)
values
  ('AFF Global Forex Future Conference 2026', 'Global Conference', 'Executive conference on forex education, institutional strategy, certification, research, and global financial readiness.', 'Hybrid / Online', now() + interval '21 days', now() + interval '21 days' + interval '6 hours', 'Open', 500, 6),
  ('Central Bank Intelligence Workshop', 'Workshop', 'Applied workshop on CPI, NFP, interest rates, inflation targets, and forward guidance for currency analysis.', 'Online', now() + interval '10 days', now() + interval '10 days' + interval '2 hours', 'Open', 150, 2),
  ('AFF Instructor Scheduling Summit', 'Instructor Session', 'Instructor operations meeting for lesson delivery, event facilitation, certification standards, and continuing education.', 'Online', now() + interval '14 days', now() + interval '14 days' + interval '90 minutes', 'Invite Only', 50, 1.5)
on conflict do nothing;

insert into public.event_speakers (speaker_name, speaker_title, speaker_email, topic, bio, speaker_status)
values
  ('Dr. Jean Rene Moricette', 'Administrator, Academy for Financial Future', 'acafffx@gmail.com', 'Forex Anatomy, Certification, and Global Financial Readiness', 'Lead administrator for Academy for Financial Future and the Academy for Financial Future.', 'Confirmed'),
  ('AFF Research Desk', 'Economic Intelligence Panel', 'acafffx@gmail.com', 'Central Bank Intelligence and Currency Forecasts', 'Research desk panel for macro, central bank, and currency outlook programming.', 'Confirmed')
on conflict do nothing;

insert into public.event_instructor_schedule (instructor_name, instructor_email, session_title, scheduled_at, schedule_status)
values ('Dr. Jean Rene Moricette', 'acafffx@gmail.com', 'Opening Keynote and Instructor Certification Briefing', now() + interval '21 days', 'Scheduled')
on conflict do nothing;

insert into public.event_sponsors (sponsor_name, sponsor_level, contact_name, contact_email, sponsor_status, contribution_notes)
values ('Academy for Financial Future', 'Founding Sponsor', 'Dr. Jean Rene Moricette', 'acafffx@gmail.com', 'Active', 'Internal founding sponsor for AFF global conference programming.')
on conflict do nothing;

insert into public.event_video_archive (event_title, recording_title, recording_url, access_level)
values ('AFF Global Forex Future Conference 2026', 'AFF Global Conference Welcome Archive', null, 'Registered Students')
on conflict do nothing;

notify pgrst, 'reload schema';
