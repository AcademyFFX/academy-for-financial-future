create extension if not exists pgcrypto;

create table if not exists public.tv_broadcasts (
  id bigserial primary key,
  title text not null,
  show_name text not null default 'AFF TV Studio',
  category text not null default 'Educational VOD',
  description text,
  stream_url text,
  replay_url text,
  thumbnail_url text,
  scheduled_at timestamptz default now(),
  duration_minutes integer default 60,
  host_name text not null default 'Dr. Jean Rene Moricette',
  status text not null default 'Scheduled',
  access_level text not null default 'Members',
  created_by text not null default 'acafffx@gmail.com',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tv_broadcasts
  add column if not exists show_name text not null default 'AFF TV Studio',
  add column if not exists category text not null default 'Educational VOD',
  add column if not exists description text,
  add column if not exists stream_url text,
  add column if not exists replay_url text,
  add column if not exists thumbnail_url text,
  add column if not exists scheduled_at timestamptz default now(),
  add column if not exists duration_minutes integer default 60,
  add column if not exists host_name text not null default 'Dr. Jean Rene Moricette',
  add column if not exists status text not null default 'Scheduled',
  add column if not exists access_level text not null default 'Members',
  add column if not exists created_by text not null default 'acafffx@gmail.com',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.zoom_class_sessions (
  id bigserial primary key,
  title text not null,
  description text,
  session_date timestamptz not null default now(),
  duration_minutes integer not null default 60,
  meeting_id text,
  passcode text,
  join_url text,
  recording_url text,
  status text not null default 'Scheduled',
  created_by text not null default 'acafffx@gmail.com',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.zoom_class_sessions
  add column if not exists description text,
  add column if not exists session_date timestamptz not null default now(),
  add column if not exists duration_minutes integer not null default 60,
  add column if not exists meeting_id text,
  add column if not exists passcode text,
  add column if not exists join_url text,
  add column if not exists recording_url text,
  add column if not exists status text not null default 'Scheduled',
  add column if not exists created_by text not null default 'acafffx@gmail.com',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.live_trading_rooms (
  id bigserial primary key,
  room_title text not null,
  session_name text not null default 'AFF Live Trading Room',
  instructor_name text not null default 'Dr. Jean Rene Moricette',
  room_status text not null default 'Scheduled',
  session_date timestamptz not null default now(),
  live_stream_url text,
  replay_url text,
  market_focus text,
  daily_bias text,
  created_by text not null default 'acafffx@gmail.com',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.live_trading_rooms
  add column if not exists session_name text not null default 'AFF Live Trading Room',
  add column if not exists instructor_name text not null default 'Dr. Jean Rene Moricette',
  add column if not exists room_status text not null default 'Scheduled',
  add column if not exists session_date timestamptz not null default now(),
  add column if not exists live_stream_url text,
  add column if not exists replay_url text,
  add column if not exists market_focus text,
  add column if not exists daily_bias text,
  add column if not exists created_by text not null default 'acafffx@gmail.com',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.student_journal (
  id bigserial primary key,
  student_id uuid not null references auth.users(id) on delete cascade,
  student_name text,
  journal_title text not null default 'Student Reflection',
  journal_entry text not null,
  mood text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.student_journal
  add column if not exists student_name text,
  add column if not exists journal_title text not null default 'Student Reflection',
  add column if not exists journal_entry text,
  add column if not exists mood text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.student_goals (
  id bigserial primary key,
  student_id uuid not null references auth.users(id) on delete cascade,
  goal_title text not null,
  goal_category text not null default 'Learning Path',
  target_date date,
  goal_status text not null default 'Active',
  progress_percentage numeric(5,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.student_goals
  add column if not exists goal_category text not null default 'Learning Path',
  add column if not exists target_date date,
  add column if not exists goal_status text not null default 'Active',
  add column if not exists progress_percentage numeric(5,2) not null default 0,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.certifications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  student_name text not null,
  course_name text not null default 'Academy for Financial Future',
  certification_title text not null default 'Academy for Financial Future Certification',
  certification_status text not null default 'In Progress',
  score numeric(5,2),
  issued_at date,
  certificate_number text unique,
  verification_code text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.certifications
  add column if not exists student_name text,
  add column if not exists course_name text not null default 'Academy for Financial Future',
  add column if not exists certification_title text not null default 'Academy for Financial Future Certification',
  add column if not exists certification_status text not null default 'In Progress',
  add column if not exists score numeric(5,2),
  add column if not exists issued_at date,
  add column if not exists certificate_number text,
  add column if not exists verification_code text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists tv_broadcasts_status_scheduled_idx on public.tv_broadcasts (status, scheduled_at);
create index if not exists zoom_class_sessions_status_date_idx on public.zoom_class_sessions (status, session_date);
create index if not exists live_trading_rooms_status_date_idx on public.live_trading_rooms (room_status, session_date);
create index if not exists student_journal_student_idx on public.student_journal (student_id, created_at desc);
create index if not exists student_goals_student_idx on public.student_goals (student_id, created_at desc);
create index if not exists certifications_student_idx on public.certifications (student_id, issued_at desc);

alter table public.tv_broadcasts enable row level security;
alter table public.zoom_class_sessions enable row level security;
alter table public.live_trading_rooms enable row level security;
alter table public.student_journal enable row level security;
alter table public.student_goals enable row level security;
alter table public.certifications enable row level security;

drop policy if exists "Students can view AFF TV broadcasts" on public.tv_broadcasts;
drop policy if exists "AFF admin can manage AFF TV broadcasts" on public.tv_broadcasts;
drop policy if exists "Students can view Zoom class sessions" on public.zoom_class_sessions;
drop policy if exists "AFF admin can manage Zoom class sessions" on public.zoom_class_sessions;
drop policy if exists "Students can view live trading rooms" on public.live_trading_rooms;
drop policy if exists "AFF admin can manage live trading rooms" on public.live_trading_rooms;
drop policy if exists "Students can read own student journal" on public.student_journal;
drop policy if exists "Students can create own student journal" on public.student_journal;
drop policy if exists "Students can update own student journal" on public.student_journal;
drop policy if exists "AFF admin can manage student journal" on public.student_journal;
drop policy if exists "Students can read own student goals" on public.student_goals;
drop policy if exists "Students can create own student goals" on public.student_goals;
drop policy if exists "Students can update own student goals" on public.student_goals;
drop policy if exists "AFF admin can manage student goals" on public.student_goals;
drop policy if exists "Students can read own certifications" on public.certifications;
drop policy if exists "AFF admin can manage certifications" on public.certifications;

create policy "Students can view AFF TV broadcasts"
on public.tv_broadcasts for select to authenticated
using (
  status in ('Live', 'Scheduled', 'Replay', 'Published')
  or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com'
);

create policy "AFF admin can manage AFF TV broadcasts"
on public.tv_broadcasts for all to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

create policy "Students can view Zoom class sessions"
on public.zoom_class_sessions for select to authenticated
using (
  status <> 'Cancelled'
  or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com'
);

create policy "AFF admin can manage Zoom class sessions"
on public.zoom_class_sessions for all to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

create policy "Students can view live trading rooms"
on public.live_trading_rooms for select to authenticated
using (
  room_status in ('Live', 'Open', 'Scheduled', 'Replay', 'Published')
  or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com'
);

create policy "AFF admin can manage live trading rooms"
on public.live_trading_rooms for all to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

create policy "Students can read own student journal"
on public.student_journal for select to authenticated
using (auth.uid() = student_id or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

create policy "Students can create own student journal"
on public.student_journal for insert to authenticated
with check (auth.uid() = student_id);

create policy "Students can update own student journal"
on public.student_journal for update to authenticated
using (auth.uid() = student_id)
with check (auth.uid() = student_id);

create policy "AFF admin can manage student journal"
on public.student_journal for all to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

create policy "Students can read own student goals"
on public.student_goals for select to authenticated
using (auth.uid() = student_id or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

create policy "Students can create own student goals"
on public.student_goals for insert to authenticated
with check (auth.uid() = student_id);

create policy "Students can update own student goals"
on public.student_goals for update to authenticated
using (auth.uid() = student_id)
with check (auth.uid() = student_id);

create policy "AFF admin can manage student goals"
on public.student_goals for all to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

create policy "Students can read own certifications"
on public.certifications for select to authenticated
using (auth.uid() = student_id or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

create policy "AFF admin can manage certifications"
on public.certifications for all to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

grant select, insert, update, delete on public.tv_broadcasts to authenticated;
grant select, insert, update, delete on public.zoom_class_sessions to authenticated;
grant select, insert, update, delete on public.live_trading_rooms to authenticated;
grant select, insert, update, delete on public.student_journal to authenticated;
grant select, insert, update, delete on public.student_goals to authenticated;
grant select, insert, update, delete on public.certifications to authenticated;

do $$
begin
  if to_regclass('public.tv_broadcasts_id_seq') is not null then
    grant usage, select on sequence public.tv_broadcasts_id_seq to authenticated;
  end if;
  if to_regclass('public.zoom_class_sessions_id_seq') is not null then
    grant usage, select on sequence public.zoom_class_sessions_id_seq to authenticated;
  end if;
  if to_regclass('public.live_trading_rooms_id_seq') is not null then
    grant usage, select on sequence public.live_trading_rooms_id_seq to authenticated;
  end if;
  if to_regclass('public.student_journal_id_seq') is not null then
    grant usage, select on sequence public.student_journal_id_seq to authenticated;
  end if;
  if to_regclass('public.student_goals_id_seq') is not null then
    grant usage, select on sequence public.student_goals_id_seq to authenticated;
  end if;
end $$;

insert into public.tv_broadcasts (
  title,
  show_name,
  category,
  description,
  scheduled_at,
  duration_minutes,
  host_name,
  status,
  access_level
)
select
  'Weekly Institutional Market Outlook',
  'Market Outlook Show',
  'Market Outlook Show',
  'A weekly AFF broadcast covering forex market structure, liquidity, economic catalysts, and institutional preparation.',
  now() + interval '1 day',
  60,
  'Dr. Jean Rene Moricette',
  'Scheduled',
  'Members'
where not exists (
  select 1 from public.tv_broadcasts where title = 'Weekly Institutional Market Outlook'
);

insert into public.tv_broadcasts (
  title,
  show_name,
  category,
  description,
  scheduled_at,
  duration_minutes,
  host_name,
  status,
  access_level
)
select
  'Forex Anatomy Masterclass Replay',
  'Recorded Masterclass',
  'Recorded Masterclass',
  'A recorded AFF masterclass on market structure, liquidity, order flow, economic data, and broker execution.',
  now() - interval '2 days',
  90,
  'Dr. Jean Rene Moricette',
  'Replay',
  'Members'
where not exists (
  select 1 from public.tv_broadcasts where title = 'Forex Anatomy Masterclass Replay'
);

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
  'Forex Anatomy Live Review',
  'Instructor-led review of market structure, liquidity, trading sessions, and execution discipline.',
  now() + interval '2 days',
  75,
  null,
  null,
  null,
  null,
  'Scheduled',
  'acafffx@gmail.com'
where not exists (
  select 1 from public.zoom_class_sessions where title = 'Forex Anatomy Live Review'
);

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
  'Risk and Capital Protection Lab',
  'A live class focused on position sizing, risk percentage, stop placement, and capital preservation.',
  now() + interval '5 days',
  60,
  null,
  null,
  null,
  null,
  'Scheduled',
  'acafffx@gmail.com'
where not exists (
  select 1 from public.zoom_class_sessions where title = 'Risk and Capital Protection Lab'
);

insert into public.live_trading_rooms (
  room_title,
  session_name,
  instructor_name,
  room_status,
  session_date,
  market_focus,
  daily_bias
)
select
  'London Session Institutional Prep',
  'London Session',
  'Dr. Jean Rene Moricette',
  'Scheduled',
  now() + interval '1 day',
  'EURUSD, GBPUSD, DXY',
  'Map Asia range liquidity and wait for London confirmation.'
where not exists (
  select 1 from public.live_trading_rooms where room_title = 'London Session Institutional Prep'
);

insert into public.live_trading_rooms (
  room_title,
  session_name,
  instructor_name,
  room_status,
  session_date,
  market_focus,
  daily_bias
)
select
  'New York Session Command Desk',
  'New York Session',
  'Dr. Jean Rene Moricette',
  'Scheduled',
  now() + interval '2 days',
  'USD majors, GOLD, NASDAQ',
  'Respect high-impact data and reduce exposure during the first reaction.'
where not exists (
  select 1 from public.live_trading_rooms where room_title = 'New York Session Command Desk'
);

notify pgrst, 'reload schema';
