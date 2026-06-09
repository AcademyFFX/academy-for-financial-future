create table if not exists public.tv_broadcasts (
  id bigserial primary key,
  title text not null,
  show_name text not null,
  category text not null,
  description text,
  stream_url text,
  replay_url text,
  thumbnail_url text,
  scheduled_at timestamptz,
  duration_minutes integer default 60,
  host_name text not null default 'Dr. Jean Rene Moricette',
  status text not null default 'Scheduled',
  access_level text not null default 'Members',
  created_by text not null default 'acafffx@gmail.com',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tv_broadcasts_category_check check (
    category in (
      'Live Broadcast',
      'Recorded Masterclass',
      'Student Interview',
      'Market Outlook Show',
      'Community Awareness TV',
      'Destiny Alignment TV',
      'Educational VOD'
    )
  ),
  constraint tv_broadcasts_status_check check (
    status in ('Scheduled', 'Live', 'Replay', 'Published', 'Draft', 'Archived')
  ),
  constraint tv_broadcasts_access_level_check check (
    access_level in ('Members', 'Premium', 'Public')
  ),
  constraint tv_broadcasts_duration_check check (
    duration_minutes is null or duration_minutes > 0
  )
);

create table if not exists public.tv_subscriptions (
  id bigserial primary key,
  student_id uuid not null references auth.users(id) on delete cascade,
  channel_name text not null,
  created_at timestamptz not null default now(),
  unique (student_id, channel_name)
);

create index if not exists tv_broadcasts_status_scheduled_idx
  on public.tv_broadcasts (status, scheduled_at);

create index if not exists tv_broadcasts_category_idx
  on public.tv_broadcasts (category);

create index if not exists tv_subscriptions_student_id_idx
  on public.tv_subscriptions (student_id);

alter table public.tv_broadcasts enable row level security;
alter table public.tv_subscriptions enable row level security;

drop policy if exists "Students can view published AFF TV broadcasts" on public.tv_broadcasts;
drop policy if exists "AFF admin can manage TV broadcasts" on public.tv_broadcasts;
drop policy if exists "Students can view own TV subscriptions" on public.tv_subscriptions;
drop policy if exists "Students can create own TV subscriptions" on public.tv_subscriptions;
drop policy if exists "Students can delete own TV subscriptions" on public.tv_subscriptions;
drop policy if exists "AFF admin can manage TV subscriptions" on public.tv_subscriptions;

create policy "Students can view published AFF TV broadcasts"
on public.tv_broadcasts
for select
to authenticated
using (
  status in ('Live', 'Scheduled', 'Replay', 'Published')
  or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com'
);

create policy "AFF admin can manage TV broadcasts"
on public.tv_broadcasts
for all
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

create policy "Students can view own TV subscriptions"
on public.tv_subscriptions
for select
to authenticated
using (
  auth.uid() = student_id
  or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com'
);

create policy "Students can create own TV subscriptions"
on public.tv_subscriptions
for insert
to authenticated
with check (auth.uid() = student_id);

create policy "Students can delete own TV subscriptions"
on public.tv_subscriptions
for delete
to authenticated
using (auth.uid() = student_id);

create policy "AFF admin can manage TV subscriptions"
on public.tv_subscriptions
for all
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

grant select, insert, update, delete on public.tv_broadcasts to authenticated;
grant select, insert, delete on public.tv_subscriptions to authenticated;
grant usage, select on sequence public.tv_broadcasts_id_seq to authenticated;
grant usage, select on sequence public.tv_subscriptions_id_seq to authenticated;

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
  'A professional weekly broadcast covering forex market structure, major currency catalysts, liquidity zones, and institutional planning for the week ahead.',
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
  'A recorded AFF masterclass introducing the living-system framework behind market structure, liquidity, order flow, and central bank influence.',
  now() - interval '2 days',
  90,
  'Dr. Jean Rene Moricette',
  'Replay',
  'Members'
where not exists (
  select 1 from public.tv_broadcasts where title = 'Forex Anatomy Masterclass Replay'
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
  'Student Trading Desk Interview',
  'Student Interview',
  'Student Interview',
  'A professional student interview format highlighting journal discipline, trading psychology, risk control, and academy progress.',
  now() + interval '3 days',
  45,
  'Dr. Jean Rene Moricette',
  'Scheduled',
  'Members'
where not exists (
  select 1 from public.tv_broadcasts where title = 'Student Trading Desk Interview'
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
  'Community Awareness TV: Financial Literacy Forum',
  'Community Awareness TV',
  'Community Awareness TV',
  'Community-centered financial education programming focused on awareness, opportunity, discipline, and future readiness.',
  now() + interval '5 days',
  50,
  'Dr. Jean Rene Moricette',
  'Scheduled',
  'Public'
where not exists (
  select 1 from public.tv_broadcasts where title = 'Community Awareness TV: Financial Literacy Forum'
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
  'Destiny Alignment TV: Discipline and Purpose',
  'Destiny Alignment TV',
  'Destiny Alignment TV',
  'A values-driven educational broadcast connecting financial discipline, personal purpose, leadership, and long-term development.',
  now() + interval '7 days',
  50,
  'Dr. Jean Rene Moricette',
  'Scheduled',
  'Public'
where not exists (
  select 1 from public.tv_broadcasts where title = 'Destiny Alignment TV: Discipline and Purpose'
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
  'AFF Video On Demand: Risk Protection Briefing',
  'Educational VOD',
  'Educational VOD',
  'An on-demand educational briefing for students reviewing position sizing, drawdown control, trade invalidation, and risk accountability.',
  now() - interval '1 day',
  35,
  'Dr. Jean Rene Moricette',
  'Published',
  'Members'
where not exists (
  select 1 from public.tv_broadcasts where title = 'AFF Video On Demand: Risk Protection Briefing'
);

notify pgrst, 'reload schema';
