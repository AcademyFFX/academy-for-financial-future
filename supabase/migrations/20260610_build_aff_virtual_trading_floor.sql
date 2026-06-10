create table if not exists public.trading_floor_sessions (
  id bigserial primary key,
  title text not null,
  session_name text not null default 'London Session',
  lesson_announcement text,
  session_notes text,
  trade_setup text,
  published_by text not null default 'Dr. Jean Rene Moricette',
  created_at timestamptz not null default now()
);

create table if not exists public.trading_floor_messages (
  id bigserial primary key,
  student_id uuid not null references auth.users(id) on delete cascade,
  student_name text not null,
  channel text not null default '#general',
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.trade_ideas (
  id bigserial primary key,
  student_id uuid not null references auth.users(id) on delete cascade,
  student_name text not null,
  pair text not null,
  direction text not null,
  entry text not null,
  stop_loss text not null,
  take_profit text not null,
  analysis text not null,
  instructor_comment text,
  status text not null default 'Published',
  created_at timestamptz not null default now(),
  constraint trade_ideas_direction_check check (direction in ('Buy', 'Sell', 'Watchlist'))
);

create table if not exists public.market_commentary (
  id bigserial primary key,
  title text not null,
  body text not null,
  priority text not null default 'Medium',
  published_by text not null default 'Dr. Jean Rene Moricette',
  published_at timestamptz not null default now(),
  constraint market_commentary_priority_check check (priority in ('Low', 'Medium', 'High'))
);

create table if not exists public.student_watchlists (
  id bigserial primary key,
  student_id uuid not null references auth.users(id) on delete cascade,
  student_name text,
  student_email text,
  watchlist text not null default 'EURUSD, GOLD, DXY',
  notes text,
  daily_plan text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint student_watchlists_student_id_key unique (student_id)
);

create table if not exists public.daily_bias_reports (
  id bigserial primary key,
  session_name text not null default 'London Session',
  bias_title text not null,
  bias_body text,
  trade_setup text,
  published_by text not null default 'Dr. Jean Rene Moricette',
  created_at timestamptz not null default now()
);

create table if not exists public.leaderboard_scores (
  id bigserial primary key,
  student_id uuid references auth.users(id) on delete cascade,
  student_name text not null,
  certification_points integer not null default 0,
  simulator_performance integer not null default 0,
  journal_completion integer not null default 0,
  community_contribution integer not null default 0,
  civic_leadership integer not null default 0,
  total_score integer generated always as (
    certification_points + simulator_performance + journal_completion + community_contribution + civic_leadership
  ) stored,
  updated_at timestamptz not null default now()
);

alter table public.trading_floor_sessions enable row level security;
alter table public.trading_floor_messages enable row level security;
alter table public.trade_ideas enable row level security;
alter table public.market_commentary enable row level security;
alter table public.student_watchlists enable row level security;
alter table public.daily_bias_reports enable row level security;
alter table public.leaderboard_scores enable row level security;

drop policy if exists "Authenticated users can read trading floor sessions" on public.trading_floor_sessions;
create policy "Authenticated users can read trading floor sessions"
on public.trading_floor_sessions for select
to authenticated
using (true);

drop policy if exists "Admin can manage trading floor sessions" on public.trading_floor_sessions;
create policy "Admin can manage trading floor sessions"
on public.trading_floor_sessions for all
to authenticated
using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com')
with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read trading floor messages" on public.trading_floor_messages;
create policy "Authenticated users can read trading floor messages"
on public.trading_floor_messages for select
to authenticated
using (true);

drop policy if exists "Students can insert own trading floor messages" on public.trading_floor_messages;
create policy "Students can insert own trading floor messages"
on public.trading_floor_messages for insert
to authenticated
with check (auth.uid() = student_id);

drop policy if exists "Students can delete own trading floor messages" on public.trading_floor_messages;
create policy "Students can delete own trading floor messages"
on public.trading_floor_messages for delete
to authenticated
using (auth.uid() = student_id or (auth.jwt() ->> 'email') = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read trade ideas" on public.trade_ideas;
create policy "Authenticated users can read trade ideas"
on public.trade_ideas for select
to authenticated
using (true);

drop policy if exists "Students can insert own trade ideas" on public.trade_ideas;
create policy "Students can insert own trade ideas"
on public.trade_ideas for insert
to authenticated
with check (auth.uid() = student_id);

drop policy if exists "Students and admin can update trade ideas" on public.trade_ideas;
create policy "Students and admin can update trade ideas"
on public.trade_ideas for update
to authenticated
using (auth.uid() = student_id or (auth.jwt() ->> 'email') = 'acafffx@gmail.com')
with check (auth.uid() = student_id or (auth.jwt() ->> 'email') = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read market commentary" on public.market_commentary;
create policy "Authenticated users can read market commentary"
on public.market_commentary for select
to authenticated
using (true);

drop policy if exists "Admin can manage market commentary" on public.market_commentary;
create policy "Admin can manage market commentary"
on public.market_commentary for all
to authenticated
using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com')
with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

drop policy if exists "Students can read own watchlist" on public.student_watchlists;
create policy "Students can read own watchlist"
on public.student_watchlists for select
to authenticated
using (auth.uid() = student_id or (auth.jwt() ->> 'email') = 'acafffx@gmail.com');

drop policy if exists "Students can insert own watchlist" on public.student_watchlists;
create policy "Students can insert own watchlist"
on public.student_watchlists for insert
to authenticated
with check (auth.uid() = student_id);

drop policy if exists "Students can update own watchlist" on public.student_watchlists;
create policy "Students can update own watchlist"
on public.student_watchlists for update
to authenticated
using (auth.uid() = student_id)
with check (auth.uid() = student_id);

drop policy if exists "Authenticated users can read daily bias reports" on public.daily_bias_reports;
create policy "Authenticated users can read daily bias reports"
on public.daily_bias_reports for select
to authenticated
using (true);

drop policy if exists "Admin can manage daily bias reports" on public.daily_bias_reports;
create policy "Admin can manage daily bias reports"
on public.daily_bias_reports for all
to authenticated
using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com')
with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read leaderboard scores" on public.leaderboard_scores;
create policy "Authenticated users can read leaderboard scores"
on public.leaderboard_scores for select
to authenticated
using (true);

drop policy if exists "Admin can manage leaderboard scores" on public.leaderboard_scores;
create policy "Admin can manage leaderboard scores"
on public.leaderboard_scores for all
to authenticated
using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com')
with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

grant select, insert, update, delete on public.trading_floor_sessions to authenticated;
grant select, insert, update, delete on public.trading_floor_messages to authenticated;
grant select, insert, update, delete on public.trade_ideas to authenticated;
grant select, insert, update, delete on public.market_commentary to authenticated;
grant select, insert, update, delete on public.student_watchlists to authenticated;
grant select, insert, update, delete on public.daily_bias_reports to authenticated;
grant select, insert, update, delete on public.leaderboard_scores to authenticated;

grant usage, select on sequence public.trading_floor_sessions_id_seq to authenticated;
grant usage, select on sequence public.trading_floor_messages_id_seq to authenticated;
grant usage, select on sequence public.trade_ideas_id_seq to authenticated;
grant usage, select on sequence public.market_commentary_id_seq to authenticated;
grant usage, select on sequence public.student_watchlists_id_seq to authenticated;
grant usage, select on sequence public.daily_bias_reports_id_seq to authenticated;
grant usage, select on sequence public.leaderboard_scores_id_seq to authenticated;

insert into public.trading_floor_sessions (title, session_name, lesson_announcement, session_notes, trade_setup)
values
  ('London Institutional Prep', 'London Session', 'Review Forex Anatomy market structure before London open.', 'Map Asian range liquidity and wait for confirmation.', 'EURUSD watchlist: bullish only after BOS and clean retest.'),
  ('New York Risk Briefing', 'New York Session', 'Prepare for USD volatility and news-driven spread expansion.', 'Reduce size before CPI, NFP, FOMC, or rate decisions.', 'DXY and GOLD correlation review before execution.')
on conflict do nothing;

insert into public.market_commentary (title, body, priority)
values
  ('CPI Volatility Protocol', 'Do not enter during the first reaction candle. Wait for displacement, liquidity confirmation, and risk compression.', 'High'),
  ('London Liquidity Map', 'Monitor buy-side liquidity above Asian highs and sell-side liquidity below Asian lows before directional bias.', 'Medium'),
  ('Risk Desk Reminder', 'Every trading floor setup must include entry, stop loss, take profit, and invalidation logic.', 'High')
on conflict do nothing;

insert into public.daily_bias_reports (session_name, bias_title, bias_body, trade_setup)
values
  ('London Session', 'EURUSD London Bias', 'Neutral until London confirms a break of Asian range with displacement.', 'Wait for BOS, FVG mitigation, and risk-defined entry.'),
  ('New York Session', 'GOLD New York Bias', 'Bullish only if DXY remains offered and GOLD reclaims prior liquidity.', 'Avoid entry into red-folder news without confirmation.')
on conflict do nothing;

insert into public.leaderboard_scores (student_name, certification_points, simulator_performance, journal_completion, community_contribution, civic_leadership)
values
  ('AFF Cohort Leader', 240, 180, 120, 90, 80),
  ('Forex Anatomy Scholar', 210, 160, 130, 70, 95),
  ('Risk Management Captain', 190, 175, 150, 60, 75)
on conflict do nothing;

notify pgrst, 'reload schema';
