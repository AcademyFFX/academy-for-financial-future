create table if not exists public.live_market_commentary (
  id bigserial primary key,
  title text not null,
  body text not null,
  session text not null default 'Live Room',
  published_by text not null default 'Dr. Jean Rene Moricette',
  published_at timestamptz not null default now()
);

create table if not exists public.live_room_messages (
  id bigserial primary key,
  student_id uuid not null references auth.users(id) on delete cascade,
  student_name text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.live_trade_ideas (
  id bigserial primary key,
  student_id uuid not null references auth.users(id) on delete cascade,
  student_name text not null,
  symbol text not null,
  direction text not null,
  entry_zone text not null,
  stop_loss text not null,
  take_profit text not null,
  rationale text not null,
  status text not null default 'Published',
  published_at timestamptz not null default now(),
  constraint live_trade_ideas_direction_check check (direction in ('Buy', 'Sell', 'Watchlist'))
);

create table if not exists public.live_session_recordings (
  id bigserial primary key,
  title text not null,
  session text not null default 'Live Room',
  recording_url text,
  recorded_at timestamptz not null default now(),
  created_by text not null default 'Dr. Jean Rene Moricette'
);

alter table public.live_market_commentary enable row level security;
alter table public.live_room_messages enable row level security;
alter table public.live_trade_ideas enable row level security;
alter table public.live_session_recordings enable row level security;

drop policy if exists "Authenticated students can read live commentary" on public.live_market_commentary;
drop policy if exists "AFF administrator can manage live commentary" on public.live_market_commentary;
drop policy if exists "Authenticated students can read live room messages" on public.live_room_messages;
drop policy if exists "Authenticated students can publish live room messages" on public.live_room_messages;
drop policy if exists "Students can delete their own live room messages" on public.live_room_messages;
drop policy if exists "Authenticated students can read trade ideas" on public.live_trade_ideas;
drop policy if exists "Authenticated students can publish trade ideas" on public.live_trade_ideas;
drop policy if exists "Students can update their own trade ideas" on public.live_trade_ideas;
drop policy if exists "AFF administrator can manage trade ideas" on public.live_trade_ideas;
drop policy if exists "Authenticated students can read session recordings" on public.live_session_recordings;
drop policy if exists "AFF administrator can manage session recordings" on public.live_session_recordings;

create policy "Authenticated students can read live commentary"
on public.live_market_commentary
for select
to authenticated
using (true);

create policy "AFF administrator can manage live commentary"
on public.live_market_commentary
for all
to authenticated
using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com')
with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

create policy "Authenticated students can read live room messages"
on public.live_room_messages
for select
to authenticated
using (true);

create policy "Authenticated students can publish live room messages"
on public.live_room_messages
for insert
to authenticated
with check (auth.uid() = student_id);

create policy "Students can delete their own live room messages"
on public.live_room_messages
for delete
to authenticated
using (auth.uid() = student_id);

create policy "Authenticated students can read trade ideas"
on public.live_trade_ideas
for select
to authenticated
using (true);

create policy "Authenticated students can publish trade ideas"
on public.live_trade_ideas
for insert
to authenticated
with check (auth.uid() = student_id);

create policy "Students can update their own trade ideas"
on public.live_trade_ideas
for update
to authenticated
using (auth.uid() = student_id)
with check (auth.uid() = student_id);

create policy "AFF administrator can manage trade ideas"
on public.live_trade_ideas
for all
to authenticated
using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com')
with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

create policy "Authenticated students can read session recordings"
on public.live_session_recordings
for select
to authenticated
using (true);

create policy "AFF administrator can manage session recordings"
on public.live_session_recordings
for all
to authenticated
using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com')
with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

insert into public.live_market_commentary (title, body, session)
values
  ('London Session Preparation', 'Review overnight highs and lows, mark liquidity above Asian range extremes, and wait for confirmation before entering.', 'London'),
  ('New York Risk Note', 'Reduce size before major USD releases and avoid entering during the first reaction candle.', 'New York')
on conflict do nothing;

insert into public.live_session_recordings (title, session, recording_url)
values
  ('Live Trading Room Orientation', 'Academy Onboarding', null)
on conflict do nothing;

grant select on public.live_market_commentary to authenticated;
grant select, insert, delete on public.live_room_messages to authenticated;
grant select, insert, update on public.live_trade_ideas to authenticated;
grant select on public.live_session_recordings to authenticated;
grant usage on sequence public.live_market_commentary_id_seq to authenticated;
grant usage on sequence public.live_room_messages_id_seq to authenticated;
grant usage on sequence public.live_trade_ideas_id_seq to authenticated;
grant usage on sequence public.live_session_recordings_id_seq to authenticated;

notify pgrst, 'reload schema';
