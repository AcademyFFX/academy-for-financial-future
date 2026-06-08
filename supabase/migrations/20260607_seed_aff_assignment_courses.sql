create table if not exists public.courses (
  id bigserial primary key,
  course_name text not null,
  instructor text,
  description text,
  duration text,
  created_at timestamp default now()
);

alter table public.courses
  add column if not exists course_name text,
  add column if not exists instructor text,
  add column if not exists description text,
  add column if not exists duration text,
  add column if not exists created_at timestamp default now();

alter table public.courses
  alter column course_name set not null;

do $$
declare
  aff_instructor text := 'Dr. Jean Rene Moricette';
begin
  if exists (select 1 from public.courses where course_name = 'Forex Foundations') then
    update public.courses
    set instructor = aff_instructor,
        description = 'Market structure, currency pairs, sessions, pips, order flow, and broker execution fundamentals.',
        duration = '4 lessons'
    where course_name = 'Forex Foundations';
  else
    insert into public.courses (course_name, instructor, description, duration)
    values ('Forex Foundations', aff_instructor, 'Market structure, currency pairs, sessions, pips, order flow, and broker execution fundamentals.', '4 lessons');
  end if;

  if exists (select 1 from public.courses where course_name = 'Forex Anatomy') then
    update public.courses
    set instructor = aff_instructor,
        description = 'Understand the Forex market as a living system by studying its structure, liquidity, institutional activity, economic forces, trading sessions, and broker execution environment.',
        duration = '8 lessons'
    where course_name = 'Forex Anatomy';
  else
    insert into public.courses (course_name, instructor, description, duration)
    values ('Forex Anatomy', aff_instructor, 'Understand the Forex market as a living system by studying its structure, liquidity, institutional activity, economic forces, trading sessions, and broker execution environment.', '8 lessons');
  end if;

  if exists (select 1 from public.courses where course_name = 'Technical Analysis Lab') then
    update public.courses
    set instructor = aff_instructor,
        description = 'Candlestick reading, support and resistance, trend systems, multi-timeframe confirmation, and chart review.',
        duration = '4 lessons'
    where course_name = 'Technical Analysis Lab';
  else
    insert into public.courses (course_name, instructor, description, duration)
    values ('Technical Analysis Lab', aff_instructor, 'Candlestick reading, support and resistance, trend systems, multi-timeframe confirmation, and chart review.', '4 lessons');
  end if;

  if exists (select 1 from public.courses where course_name = 'Risk and Capital Protection') then
    update public.courses
    set instructor = aff_instructor,
        description = 'Position sizing, drawdown control, trade invalidation, loss limits, and portfolio-level risk rules.',
        duration = '4 lessons'
    where course_name = 'Risk and Capital Protection';
  else
    insert into public.courses (course_name, instructor, description, duration)
    values ('Risk and Capital Protection', aff_instructor, 'Position sizing, drawdown control, trade invalidation, loss limits, and portfolio-level risk rules.', '4 lessons');
  end if;

  if exists (select 1 from public.courses where course_name = 'Institutional Forex Strategy') then
    update public.courses
    set instructor = aff_instructor,
        description = 'Liquidity concepts, macro catalysts, news discipline, and professional trade planning routines.',
        duration = '4 lessons'
    where course_name = 'Institutional Forex Strategy';
  else
    insert into public.courses (course_name, instructor, description, duration)
    values ('Institutional Forex Strategy', aff_instructor, 'Liquidity concepts, macro catalysts, news discipline, and professional trade planning routines.', '4 lessons');
  end if;
end $$;

create table if not exists public.lessons (
  id bigserial primary key,
  course_id bigint not null references public.courses(id) on delete cascade,
  lesson_title text,
  title text,
  slug text,
  description text,
  lesson_order integer,
  created_at timestamp default now()
);

alter table public.lessons
  add column if not exists course_id bigint,
  add column if not exists lesson_title text,
  add column if not exists title text,
  add column if not exists slug text,
  add column if not exists description text,
  add column if not exists lesson_order integer,
  add column if not exists created_at timestamp default now();

alter table public.lessons
  drop constraint if exists lessons_course_id_fkey;

alter table public.lessons
  add constraint lessons_course_id_fkey
  foreign key (course_id)
  references public.courses(id)
  on delete cascade;

create unique index if not exists lessons_course_slug_unique
on public.lessons (course_id, slug);

do $$
declare
  v_forex_foundations bigint;
  v_forex_anatomy bigint;
  v_technical_analysis bigint;
  v_risk_capital bigint;
  v_institutional_strategy bigint;
begin
  select id into v_forex_foundations from public.courses where course_name = 'Forex Foundations' order by id limit 1;
  select id into v_forex_anatomy from public.courses where course_name = 'Forex Anatomy' order by id limit 1;
  select id into v_technical_analysis from public.courses where course_name = 'Technical Analysis Lab' order by id limit 1;
  select id into v_risk_capital from public.courses where course_name = 'Risk and Capital Protection' order by id limit 1;
  select id into v_institutional_strategy from public.courses where course_name = 'Institutional Forex Strategy' order by id limit 1;

  insert into public.lessons (course_id, slug, lesson_title, title, description, lesson_order)
  values
    (v_forex_foundations, 'fx-market-map', 'The Forex Market Map', 'The Forex Market Map', 'A foundational tour of participants, sessions, liquidity, and how currency markets move.', 1),
    (v_forex_foundations, 'currency-pairs', 'Currency Pairs and Quote Anatomy', 'Currency Pairs and Quote Anatomy', 'Learn base and quote currencies, bid/ask pricing, spread mechanics, and pair classification.', 2),
    (v_forex_foundations, 'sessions-pips', 'Sessions, Pips, Lots and Spreads', 'Sessions, Pips, Lots and Spreads', 'Understand the timing, measurement, and execution language traders use every day.', 3),
    (v_forex_foundations, 'orders-execution', 'Orders, Execution and Broker Basics', 'Orders, Execution and Broker Basics', 'Review market, limit, stop, and protective order behavior under real market conditions.', 4),
    (v_forex_anatomy, 'market-structure-skeleton', 'The Skeleton: Market Structure', 'The Skeleton: Market Structure', 'Study market structure as the framework that gives price movement its readable form.', 1),
    (v_forex_anatomy, 'institutional-orders-muscles', 'The Muscles: Institutional Orders', 'The Muscles: Institutional Orders', 'Explore how institutional order activity creates force behind visible market movement.', 2),
    (v_forex_anatomy, 'order-flow-blood', 'The Blood Flow: Order Flow', 'The Blood Flow: Order Flow', 'Learn order flow as the movement of buying and selling pressure through the market.', 3),
    (v_forex_anatomy, 'economic-data-nervous-system', 'The Nervous System: Economic Data', 'The Nervous System: Economic Data', 'Understand economic data as the signal system that can trigger volatility and reshape currency expectations.', 4),
    (v_forex_anatomy, 'liquidity-heart', 'The Heart: Liquidity', 'The Heart: Liquidity', 'Study liquidity as the core condition that allows orders to be filled and markets to move.', 5),
    (v_forex_anatomy, 'trading-sessions-clock', 'The Clock: Trading Sessions', 'The Clock: Trading Sessions', 'Use trading sessions to understand when liquidity, volatility, and opportunity tend to appear.', 6),
    (v_forex_anatomy, 'broker-interface-skin', 'The Skin: Broker Interface', 'The Skin: Broker Interface', 'Review the broker interface as the visible layer where analysis becomes execution.', 7),
    (v_forex_anatomy, 'central-banks-brain', 'The Brain: Central Banks', 'The Brain: Central Banks', 'Central banks are the decision-making brain of the forex market.', 8),
    (v_technical_analysis, 'candlestick-structure', 'Candlestick Structure and Context', 'Candlestick Structure and Context', 'Study wick, body, range, and candle context without treating patterns as isolated signals.', 1),
    (v_technical_analysis, 'support-resistance', 'Support, Resistance, and Liquidity Zones', 'Support, Resistance, and Liquidity Zones', 'Identify decision areas where price reacts, pauses, or hunts liquidity.', 2),
    (v_technical_analysis, 'trend-confirmation', 'Trend Systems and Confirmation', 'Trend Systems and Confirmation', 'Build a repeatable approach to trend identification and confirmation.', 3),
    (v_technical_analysis, 'multi-timeframe', 'Multi-Timeframe Analysis Lab', 'Multi-Timeframe Analysis Lab', 'Combine higher-timeframe bias with lower-timeframe execution planning.', 4),
    (v_risk_capital, 'position-sizing', 'Position Sizing Frameworks', 'Position Sizing Frameworks', 'Translate risk percentage into trade size with practical sizing discipline.', 1),
    (v_risk_capital, 'drawdown-control', 'Drawdown Control and Daily Loss Rules', 'Drawdown Control and Daily Loss Rules', 'Design daily and weekly controls that protect capital before emotions take over.', 2),
    (v_risk_capital, 'trade-invalidation', 'Trade Invalidation and Stop Logic', 'Trade Invalidation and Stop Logic', 'Define when your idea is wrong and how to exit without negotiation.', 3),
    (v_risk_capital, 'risk-review', 'Risk Review and Capital Protection Plan', 'Risk Review and Capital Protection Plan', 'Audit your risk behavior and build an enforceable capital protection plan.', 4),
    (v_institutional_strategy, 'liquidity-concepts', 'Institutional Liquidity Concepts', 'Institutional Liquidity Concepts', 'Study how resting orders, liquidity pools, and execution incentives shape movement.', 1),
    (v_institutional_strategy, 'macro-catalysts', 'Macro Catalysts and Currency Bias', 'Macro Catalysts and Currency Bias', 'Use macro events, rates, and risk sentiment to frame currency bias.', 2),
    (v_institutional_strategy, 'news-discipline', 'News Discipline and Volatility Controls', 'News Discipline and Volatility Controls', 'Prepare for news events without abandoning risk rules or execution standards.', 3),
    (v_institutional_strategy, 'trade-planning', 'Professional Trade Planning Routine', 'Professional Trade Planning Routine', 'Build a repeatable pre-market and pre-trade workflow for institutional discipline.', 4)
  on conflict (course_id, slug) do update
  set lesson_title = excluded.lesson_title,
      title = excluded.title,
      description = excluded.description,
      lesson_order = excluded.lesson_order;
end $$;

grant select on public.courses to authenticated;
grant select on public.lessons to authenticated;

alter table public.courses enable row level security;
alter table public.lessons enable row level security;

drop policy if exists "Authenticated users can read courses" on public.courses;
drop policy if exists "Authenticated users can read lessons" on public.lessons;

create policy "Authenticated users can read courses"
on public.courses
for select
to authenticated
using (true);

create policy "Authenticated users can read lessons"
on public.lessons
for select
to authenticated
using (true);

notify pgrst, 'reload schema';
