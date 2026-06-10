create table if not exists public.mobile_devices (
  id bigserial primary key,
  student_id uuid not null references auth.users(id) on delete cascade,
  device_label text not null,
  platform text not null default 'Web',
  push_token text,
  device_status text not null default 'Active',
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, device_label),
  constraint mobile_devices_platform_check check (platform in ('iOS', 'Android', 'Tablet', 'Web')),
  constraint mobile_devices_status_check check (device_status in ('Active', 'Inactive', 'Revoked'))
);

create table if not exists public.mobile_notifications (
  id bigserial primary key,
  student_id uuid references auth.users(id) on delete cascade,
  notification_title text not null,
  notification_body text not null,
  notification_type text not null default 'Announcement',
  delivery_status text not null default 'Queued',
  read_at timestamptz,
  created_by text not null default 'acafffx@gmail.com',
  created_at timestamptz not null default now(),
  constraint mobile_notifications_type_check check (notification_type in ('Push Notification', 'Announcement', 'Instructor Alert', 'Homework Reminder', 'Certification Notice', 'Zoom Reminder', 'Course Update')),
  constraint mobile_notifications_status_check check (delivery_status in ('Queued', 'Sent', 'Delivered', 'Read', 'Failed'))
);

create table if not exists public.mobile_sessions (
  id bigserial primary key,
  student_id uuid not null references auth.users(id) on delete cascade,
  device_id bigint references public.mobile_devices(id) on delete set null,
  platform text not null default 'Web',
  app_version text,
  session_status text not null default 'Active',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  constraint mobile_sessions_platform_check check (platform in ('iOS', 'Android', 'Tablet', 'Web')),
  constraint mobile_sessions_status_check check (session_status in ('Active', 'Ended', 'Expired'))
);

create table if not exists public.mobile_downloads (
  id bigserial primary key,
  student_id uuid not null references auth.users(id) on delete cascade,
  asset_type text not null,
  asset_title text not null,
  source_route text,
  file_url text,
  download_status text not null default 'Queued',
  downloaded_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  constraint mobile_downloads_type_check check (asset_type in ('Lesson Pack', 'PDF Resource', 'Certificate', 'Transcript', 'Research PDF', 'Video Replay')),
  constraint mobile_downloads_status_check check (download_status in ('Queued', 'Downloaded', 'Available Offline', 'Expired', 'Removed'))
);

create table if not exists public.mobile_activity (
  id bigserial primary key,
  student_id uuid not null references auth.users(id) on delete cascade,
  activity_type text not null,
  activity_label text not null,
  activity_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists mobile_devices_student_idx on public.mobile_devices (student_id, last_seen_at desc);
create index if not exists mobile_notifications_student_idx on public.mobile_notifications (student_id, created_at desc);
create index if not exists mobile_sessions_student_idx on public.mobile_sessions (student_id, started_at desc);
create index if not exists mobile_downloads_student_idx on public.mobile_downloads (student_id, created_at desc);
create index if not exists mobile_activity_student_idx on public.mobile_activity (student_id, created_at desc);

alter table public.mobile_devices enable row level security;
alter table public.mobile_notifications enable row level security;
alter table public.mobile_sessions enable row level security;
alter table public.mobile_downloads enable row level security;
alter table public.mobile_activity enable row level security;

drop policy if exists "Students can read own mobile devices" on public.mobile_devices;
drop policy if exists "Students can create own mobile devices" on public.mobile_devices;
drop policy if exists "Students can update own mobile devices" on public.mobile_devices;
drop policy if exists "AFF admin can manage mobile devices" on public.mobile_devices;
create policy "Students can read own mobile devices"
on public.mobile_devices for select
to authenticated
using (auth.uid() = student_id or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Students can create own mobile devices"
on public.mobile_devices for insert
to authenticated
with check (auth.uid() = student_id);
create policy "Students can update own mobile devices"
on public.mobile_devices for update
to authenticated
using (auth.uid() = student_id)
with check (auth.uid() = student_id);
create policy "AFF admin can manage mobile devices"
on public.mobile_devices for all
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Students can read own mobile notifications" on public.mobile_notifications;
drop policy if exists "Students can update own mobile notifications" on public.mobile_notifications;
drop policy if exists "AFF admin can manage mobile notifications" on public.mobile_notifications;
create policy "Students can read own mobile notifications"
on public.mobile_notifications for select
to authenticated
using (student_id is null or auth.uid() = student_id or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Students can update own mobile notifications"
on public.mobile_notifications for update
to authenticated
using (auth.uid() = student_id)
with check (auth.uid() = student_id);
create policy "AFF admin can manage mobile notifications"
on public.mobile_notifications for all
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Students can read own mobile sessions" on public.mobile_sessions;
drop policy if exists "Students can create own mobile sessions" on public.mobile_sessions;
drop policy if exists "Students can update own mobile sessions" on public.mobile_sessions;
drop policy if exists "AFF admin can manage mobile sessions" on public.mobile_sessions;
create policy "Students can read own mobile sessions"
on public.mobile_sessions for select
to authenticated
using (auth.uid() = student_id or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Students can create own mobile sessions"
on public.mobile_sessions for insert
to authenticated
with check (auth.uid() = student_id);
create policy "Students can update own mobile sessions"
on public.mobile_sessions for update
to authenticated
using (auth.uid() = student_id)
with check (auth.uid() = student_id);
create policy "AFF admin can manage mobile sessions"
on public.mobile_sessions for all
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Students can read own mobile downloads" on public.mobile_downloads;
drop policy if exists "Students can create own mobile downloads" on public.mobile_downloads;
drop policy if exists "Students can update own mobile downloads" on public.mobile_downloads;
drop policy if exists "AFF admin can manage mobile downloads" on public.mobile_downloads;
create policy "Students can read own mobile downloads"
on public.mobile_downloads for select
to authenticated
using (auth.uid() = student_id or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Students can create own mobile downloads"
on public.mobile_downloads for insert
to authenticated
with check (auth.uid() = student_id);
create policy "Students can update own mobile downloads"
on public.mobile_downloads for update
to authenticated
using (auth.uid() = student_id)
with check (auth.uid() = student_id);
create policy "AFF admin can manage mobile downloads"
on public.mobile_downloads for all
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Students can read own mobile activity" on public.mobile_activity;
drop policy if exists "Students can create own mobile activity" on public.mobile_activity;
drop policy if exists "AFF admin can manage mobile activity" on public.mobile_activity;
create policy "Students can read own mobile activity"
on public.mobile_activity for select
to authenticated
using (auth.uid() = student_id or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Students can create own mobile activity"
on public.mobile_activity for insert
to authenticated
with check (auth.uid() = student_id);
create policy "AFF admin can manage mobile activity"
on public.mobile_activity for all
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

insert into public.mobile_notifications (
  student_id,
  notification_title,
  notification_body,
  notification_type,
  delivery_status
)
select
  null,
  'AFF Mobile Super App is ready',
  'Access your Academy dashboard, missions, trading tools, university records, media, global network, and offline downloads from the mobile-first Super App.',
  'Announcement',
  'Sent'
where not exists (
  select 1
  from public.mobile_notifications
  where notification_title = 'AFF Mobile Super App is ready'
);

grant select, insert, update, delete on public.mobile_devices to authenticated;
grant select, insert, update, delete on public.mobile_notifications to authenticated;
grant select, insert, update, delete on public.mobile_sessions to authenticated;
grant select, insert, update, delete on public.mobile_downloads to authenticated;
grant select, insert, update, delete on public.mobile_activity to authenticated;

grant usage on sequence public.mobile_devices_id_seq to authenticated;
grant usage on sequence public.mobile_notifications_id_seq to authenticated;
grant usage on sequence public.mobile_sessions_id_seq to authenticated;
grant usage on sequence public.mobile_downloads_id_seq to authenticated;
grant usage on sequence public.mobile_activity_id_seq to authenticated;

notify pgrst, 'reload schema';
