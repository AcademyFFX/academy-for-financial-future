create table if not exists public.investment_portfolios (
  id bigserial primary key,
  student_id uuid references auth.users(id) on delete set null,
  portfolio_name text not null,
  portfolio_type text not null default 'Demo Institutional Portfolio',
  manager_name text,
  portfolio_value numeric(14,2) not null default 0,
  benchmark text not null default 'Global 60/40',
  performance_percent numeric(8,2) not null default 0,
  risk_budget_percent numeric(8,2) not null default 0,
  portfolio_status text not null default 'Active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint investment_portfolios_status_check check (portfolio_status in ('Active', 'Review', 'Closed', 'Archived'))
);

create table if not exists public.portfolio_holdings (
  id bigserial primary key,
  portfolio_id bigint references public.investment_portfolios(id) on delete cascade,
  student_id uuid references auth.users(id) on delete set null,
  security_name text not null,
  ticker text,
  asset_class text not null,
  market_value numeric(14,2) not null default 0,
  weight_percent numeric(8,2) not null default 0,
  exposure_notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.asset_allocations (
  id bigserial primary key,
  portfolio_id bigint references public.investment_portfolios(id) on delete cascade,
  student_id uuid references auth.users(id) on delete set null,
  allocation_model text not null default 'Strategic Allocation',
  equities_percent numeric(8,2) not null default 0,
  bonds_percent numeric(8,2) not null default 0,
  currencies_percent numeric(8,2) not null default 0,
  commodities_percent numeric(8,2) not null default 0,
  alternatives_percent numeric(8,2) not null default 0,
  cash_percent numeric(8,2) not null default 0,
  rebalancing_frequency text not null default 'Monthly',
  created_at timestamptz not null default now()
);

create table if not exists public.risk_reports (
  id bigserial primary key,
  student_id uuid references auth.users(id) on delete set null,
  report_title text not null,
  var_percent numeric(8,2) not null default 0,
  stress_test_result text,
  drawdown_percent numeric(8,2) not null default 0,
  exposure_monitoring text,
  liquidity_risk text not null default 'Moderate',
  risk_status text not null default 'Committee Review',
  created_at timestamptz not null default now(),
  constraint risk_reports_liquidity_check check (liquidity_risk in ('Low', 'Moderate', 'High', 'Critical')),
  constraint risk_reports_status_check check (risk_status in ('Draft', 'Committee Review', 'Approved', 'Escalated', 'Archived'))
);

create table if not exists public.investment_committees (
  id bigserial primary key,
  committee_title text not null,
  decision_type text not null default 'Trade Approval',
  decision_status text not null default 'Review',
  capital_allocation numeric(14,2) not null default 0,
  committee_notes text,
  approved_by text,
  meeting_date date not null default current_date,
  created_at timestamptz not null default now(),
  constraint investment_committees_type_check check (decision_type in ('Research Review', 'Trade Approval', 'Capital Allocation', 'Investment Memo', 'Risk Review')),
  constraint investment_committees_status_check check (decision_status in ('Review', 'Approved', 'Rejected', 'Deferred'))
);

create table if not exists public.research_memos (
  id bigserial primary key,
  student_id uuid references auth.users(id) on delete set null,
  memo_title text not null,
  asset_class text not null default 'Currency',
  recommendation text not null default 'Monitor',
  memo_body text,
  utilization_count integer not null default 0,
  review_status text not null default 'Submitted',
  created_at timestamptz not null default now(),
  constraint research_memos_recommendation_check check (recommendation in ('Buy', 'Sell', 'Hold', 'Monitor', 'Hedge')),
  constraint research_memos_status_check check (review_status in ('Submitted', 'Committee Review', 'Approved', 'Rejected', 'Archived'))
);

create table if not exists public.student_funds (
  id bigserial primary key,
  student_id uuid references auth.users(id) on delete set null,
  fund_name text not null,
  team_name text,
  fund_nav numeric(14,2) not null default 1000000,
  performance_percent numeric(8,2) not null default 0,
  risk_adjusted_return numeric(8,2) not null default 0,
  performance_rank integer not null default 999,
  competition_status text not null default 'Active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_funds_status_check check (competition_status in ('Active', 'Review', 'Completed', 'Archived'))
);

create table if not exists public.wealth_management_profiles (
  id bigserial primary key,
  student_id uuid references auth.users(id) on delete set null,
  client_name text not null,
  planning_focus text not null default 'Wealth Preservation',
  risk_profile text not null default 'Balanced',
  retirement_plan text,
  estate_plan text,
  tax_efficiency_model text,
  portfolio_value numeric(14,2) not null default 0,
  profile_status text not null default 'Active',
  created_at timestamptz not null default now(),
  constraint wealth_profiles_risk_check check (risk_profile in ('Conservative', 'Balanced', 'Growth', 'Aggressive')),
  constraint wealth_profiles_status_check check (profile_status in ('Active', 'Review', 'Archived'))
);

create table if not exists public.hedge_fund_strategies (
  id bigserial primary key,
  strategy_name text not null,
  strategy_type text not null,
  target_return numeric(8,2) not null default 0,
  risk_level text not null default 'Moderate',
  strategy_notes text,
  strategy_status text not null default 'Active',
  created_at timestamptz not null default now(),
  constraint hedge_strategy_type_check check (strategy_type in ('Long/Short', 'Global Macro', 'Trend Following', 'Quantitative Trading', 'Event Driven')),
  constraint hedge_strategy_risk_check check (risk_level in ('Low', 'Moderate', 'High')),
  constraint hedge_strategy_status_check check (strategy_status in ('Active', 'Research', 'Paused', 'Archived'))
);

create index if not exists investment_portfolios_student_idx on public.investment_portfolios (student_id, created_at desc);
create index if not exists portfolio_holdings_portfolio_idx on public.portfolio_holdings (portfolio_id, asset_class);
create index if not exists asset_allocations_portfolio_idx on public.asset_allocations (portfolio_id);
create index if not exists risk_reports_student_idx on public.risk_reports (student_id, created_at desc);
create index if not exists investment_committees_date_idx on public.investment_committees (meeting_date desc, decision_status);
create index if not exists research_memos_student_idx on public.research_memos (student_id, created_at desc);
create index if not exists student_funds_rank_idx on public.student_funds (performance_rank, risk_adjusted_return desc);
create index if not exists wealth_profiles_student_idx on public.wealth_management_profiles (student_id, created_at desc);
create index if not exists hedge_strategies_type_idx on public.hedge_fund_strategies (strategy_type, strategy_status);

alter table public.investment_portfolios enable row level security;
alter table public.portfolio_holdings enable row level security;
alter table public.asset_allocations enable row level security;
alter table public.risk_reports enable row level security;
alter table public.investment_committees enable row level security;
alter table public.research_memos enable row level security;
alter table public.student_funds enable row level security;
alter table public.wealth_management_profiles enable row level security;
alter table public.hedge_fund_strategies enable row level security;

drop policy if exists "Authenticated users can read investment portfolios" on public.investment_portfolios;
drop policy if exists "Students can create own investment portfolios" on public.investment_portfolios;
drop policy if exists "AFF admin can manage investment portfolios" on public.investment_portfolios;
create policy "Authenticated users can read investment portfolios" on public.investment_portfolios for select to authenticated using (true);
create policy "Students can create own investment portfolios" on public.investment_portfolios for insert to authenticated with check (student_id is null or auth.uid() = student_id);
create policy "AFF admin can manage investment portfolios" on public.investment_portfolios for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read portfolio holdings" on public.portfolio_holdings;
drop policy if exists "Students can create own portfolio holdings" on public.portfolio_holdings;
drop policy if exists "AFF admin can manage portfolio holdings" on public.portfolio_holdings;
create policy "Authenticated users can read portfolio holdings" on public.portfolio_holdings for select to authenticated using (true);
create policy "Students can create own portfolio holdings" on public.portfolio_holdings for insert to authenticated with check (student_id is null or auth.uid() = student_id);
create policy "AFF admin can manage portfolio holdings" on public.portfolio_holdings for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read asset allocations" on public.asset_allocations;
drop policy if exists "AFF admin can manage asset allocations" on public.asset_allocations;
create policy "Authenticated users can read asset allocations" on public.asset_allocations for select to authenticated using (true);
create policy "AFF admin can manage asset allocations" on public.asset_allocations for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read risk reports" on public.risk_reports;
drop policy if exists "Students can create own risk reports" on public.risk_reports;
drop policy if exists "AFF admin can manage risk reports" on public.risk_reports;
create policy "Authenticated users can read risk reports" on public.risk_reports for select to authenticated using (true);
create policy "Students can create own risk reports" on public.risk_reports for insert to authenticated with check (student_id is null or auth.uid() = student_id);
create policy "AFF admin can manage risk reports" on public.risk_reports for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read investment committees" on public.investment_committees;
drop policy if exists "AFF admin can manage investment committees" on public.investment_committees;
create policy "Authenticated users can read investment committees" on public.investment_committees for select to authenticated using (true);
create policy "AFF admin can manage investment committees" on public.investment_committees for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read research memos" on public.research_memos;
drop policy if exists "Students can create own research memos" on public.research_memos;
drop policy if exists "AFF admin can manage research memos" on public.research_memos;
create policy "Authenticated users can read research memos" on public.research_memos for select to authenticated using (true);
create policy "Students can create own research memos" on public.research_memos for insert to authenticated with check (student_id is null or auth.uid() = student_id);
create policy "AFF admin can manage research memos" on public.research_memos for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read student funds" on public.student_funds;
drop policy if exists "Students can create own student funds" on public.student_funds;
drop policy if exists "AFF admin can manage student funds" on public.student_funds;
create policy "Authenticated users can read student funds" on public.student_funds for select to authenticated using (true);
create policy "Students can create own student funds" on public.student_funds for insert to authenticated with check (student_id is null or auth.uid() = student_id);
create policy "AFF admin can manage student funds" on public.student_funds for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read wealth profiles" on public.wealth_management_profiles;
drop policy if exists "Students can create own wealth profiles" on public.wealth_management_profiles;
drop policy if exists "AFF admin can manage wealth profiles" on public.wealth_management_profiles;
create policy "Authenticated users can read wealth profiles" on public.wealth_management_profiles for select to authenticated using (true);
create policy "Students can create own wealth profiles" on public.wealth_management_profiles for insert to authenticated with check (student_id is null or auth.uid() = student_id);
create policy "AFF admin can manage wealth profiles" on public.wealth_management_profiles for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read hedge fund strategies" on public.hedge_fund_strategies;
drop policy if exists "AFF admin can manage hedge fund strategies" on public.hedge_fund_strategies;
create policy "Authenticated users can read hedge fund strategies" on public.hedge_fund_strategies for select to authenticated using (strategy_status <> 'Archived' or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF admin can manage hedge fund strategies" on public.hedge_fund_strategies for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

insert into public.investment_portfolios (portfolio_name, portfolio_type, manager_name, portfolio_value, benchmark, performance_percent, risk_budget_percent)
select 'AFF Institutional Multi-Asset Demo Portfolio', 'Demo Institutional Portfolio', 'AFF Investment Committee', 10000000, 'Global Multi-Asset Benchmark', 0, 12
where not exists (select 1 from public.investment_portfolios where portfolio_name = 'AFF Institutional Multi-Asset Demo Portfolio');

insert into public.hedge_fund_strategies (strategy_name, strategy_type, target_return, risk_level, strategy_notes)
select strategy_name, strategy_type, target_return, risk_level, strategy_notes
from (
  values
    ('AFF Long/Short Equity Lab', 'Long/Short', 8, 'Moderate', 'Pairs, sector rotation, and beta-adjusted equity exposure.'),
    ('AFF Global Macro FX Lab', 'Global Macro', 12, 'High', 'Central bank, currency, rates, and macro catalyst simulation.'),
    ('AFF Trend Following Lab', 'Trend Following', 10, 'Moderate', 'Momentum, breakouts, and disciplined systematic exits.'),
    ('AFF Quantitative Trading Lab', 'Quantitative Trading', 9, 'Moderate', 'Rules-based signals, risk overlays, and performance attribution.'),
    ('AFF Event Driven Lab', 'Event Driven', 7, 'High', 'News, earnings, policy events, and geopolitical catalyst playbooks.')
) as seed(strategy_name, strategy_type, target_return, risk_level, strategy_notes)
where not exists (select 1 from public.hedge_fund_strategies where hedge_fund_strategies.strategy_name = seed.strategy_name);

insert into public.risk_reports (report_title, var_percent, stress_test_result, drawdown_percent, exposure_monitoring, liquidity_risk, risk_status)
select 'AFF Institutional Risk Committee Baseline', 5, 'Baseline stress test active', 8, 'Monitoring desk, portfolio, and student fund exposure.', 'Moderate', 'Committee Review'
where not exists (select 1 from public.risk_reports where report_title = 'AFF Institutional Risk Committee Baseline');

insert into public.investment_committees (committee_title, decision_type, decision_status, capital_allocation, committee_notes, approved_by)
select 'AFF Investment Committee Opening Mandate', 'Capital Allocation', 'Review', 1000000, 'Initial student fund simulator mandate for portfolio construction and risk-adjusted return training.', 'Dr. Jean Rene Moricette'
where not exists (select 1 from public.investment_committees where committee_title = 'AFF Investment Committee Opening Mandate');

insert into public.student_funds (fund_name, team_name, fund_nav, performance_rank, risk_adjusted_return)
select 'AFF Student Global Macro Fund', 'Forex Training Division Analysts', 1000000, 1, 0
where not exists (select 1 from public.student_funds where fund_name = 'AFF Student Global Macro Fund');

grant select, insert, update, delete on public.investment_portfolios to authenticated;
grant select, insert, update, delete on public.portfolio_holdings to authenticated;
grant select, insert, update, delete on public.asset_allocations to authenticated;
grant select, insert, update, delete on public.risk_reports to authenticated;
grant select, insert, update, delete on public.investment_committees to authenticated;
grant select, insert, update, delete on public.research_memos to authenticated;
grant select, insert, update, delete on public.student_funds to authenticated;
grant select, insert, update, delete on public.wealth_management_profiles to authenticated;
grant select, insert, update, delete on public.hedge_fund_strategies to authenticated;

grant usage on sequence public.investment_portfolios_id_seq to authenticated;
grant usage on sequence public.portfolio_holdings_id_seq to authenticated;
grant usage on sequence public.asset_allocations_id_seq to authenticated;
grant usage on sequence public.risk_reports_id_seq to authenticated;
grant usage on sequence public.investment_committees_id_seq to authenticated;
grant usage on sequence public.research_memos_id_seq to authenticated;
grant usage on sequence public.student_funds_id_seq to authenticated;
grant usage on sequence public.wealth_management_profiles_id_seq to authenticated;
grant usage on sequence public.hedge_fund_strategies_id_seq to authenticated;

notify pgrst, 'reload schema';
