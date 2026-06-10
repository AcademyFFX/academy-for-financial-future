create table if not exists public.economic_events (
  id bigserial primary key,
  event_name text not null,
  country text not null,
  currency text not null,
  event_category text not null default 'Economic Calendar',
  impact_level text not null default 'Medium',
  actual_value text,
  forecast_value text,
  previous_value text,
  event_time timestamptz not null,
  archive_status text not null default 'Active',
  created_at timestamptz not null default now(),
  constraint economic_events_impact_check check (impact_level in ('Low', 'Medium', 'High')),
  constraint economic_events_archive_check check (archive_status in ('Active', 'Archived'))
);

create table if not exists public.central_bank_reports (
  id bigserial primary key,
  bank_name text not null,
  country text not null,
  currency text not null,
  policy_bias text not null default 'Neutral',
  interest_rate text,
  inflation_target text,
  summary text,
  next_meeting_at date,
  published_by text not null default 'AFF Economic Intelligence Desk',
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint central_bank_bias_check check (policy_bias in ('Dovish', 'Neutral', 'Hawkish', 'Monitoring'))
);

create table if not exists public.inflation_reports (
  id bigserial primary key,
  report_title text not null,
  country text not null,
  currency text not null,
  cpi numeric(8,2),
  core_cpi numeric(8,2),
  ppi numeric(8,2),
  employment_data text,
  wage_growth numeric(8,2),
  housing_inflation numeric(8,2),
  summary text,
  report_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.currency_reports (
  id bigserial primary key,
  currency_code text not null,
  report_title text not null,
  bias text not null default 'Neutral',
  macro_summary text,
  central_bank_summary text,
  technical_context text,
  risk_notes text,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint currency_reports_code_check check (currency_code in ('USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD')),
  constraint currency_reports_bias_check check (bias in ('Bullish', 'Bearish', 'Neutral', 'Mixed', 'Monitoring'))
);

create table if not exists public.global_risk_reports (
  id bigserial primary key,
  report_title text not null,
  risk_category text not null,
  risk_score integer not null default 50,
  recession_indicator text,
  yield_curve_status text,
  debt_monitoring text,
  banking_stress text,
  crisis_notes text,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint global_risk_score_check check (risk_score >= 0 and risk_score <= 100)
);

create table if not exists public.geopolitical_reports (
  id bigserial primary key,
  report_title text not null,
  region text not null,
  risk_type text not null,
  impact_level text not null default 'Medium',
  affected_currencies text,
  summary text,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint geopolitical_reports_type_check check (risk_type in ('Trade Conflict', 'Sanctions', 'Election', 'Military Conflict', 'Energy Disruption', 'Supply Chain Disruption')),
  constraint geopolitical_reports_impact_check check (impact_level in ('Low', 'Medium', 'High'))
);

create table if not exists public.economic_forecasts (
  id bigserial primary key,
  forecast_title text not null,
  forecast_type text not null default 'Weekly Outlook',
  currency_focus text,
  forecast_summary text,
  institutional_view text,
  accuracy_score numeric(5,2) not null default 0,
  forecast_date date not null default current_date,
  created_at timestamptz not null default now(),
  constraint economic_forecasts_type_check check (forecast_type in ('Weekly Outlook', 'Monthly Forecast', 'Quarterly Forecast', 'Institutional Report', 'Economic White Paper')),
  constraint economic_forecasts_accuracy_check check (accuracy_score >= 0 and accuracy_score <= 100)
);

create table if not exists public.research_downloads (
  id bigserial primary key,
  student_id uuid references auth.users(id) on delete set null,
  student_email text,
  research_title text not null,
  download_type text not null default 'Economic Research PDF',
  source_table text,
  source_id bigint,
  downloaded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists economic_events_time_idx on public.economic_events (event_time, impact_level);
create index if not exists central_bank_reports_bank_idx on public.central_bank_reports (bank_name, published_at desc);
create index if not exists inflation_reports_country_idx on public.inflation_reports (country, report_date desc);
create index if not exists currency_reports_currency_idx on public.currency_reports (currency_code, published_at desc);
create index if not exists global_risk_reports_score_idx on public.global_risk_reports (risk_score, published_at desc);
create index if not exists geopolitical_reports_type_idx on public.geopolitical_reports (risk_type, impact_level, published_at desc);
create index if not exists economic_forecasts_type_idx on public.economic_forecasts (forecast_type, forecast_date desc);
create index if not exists research_downloads_student_idx on public.research_downloads (student_id, downloaded_at desc);

alter table public.economic_events enable row level security;
alter table public.central_bank_reports enable row level security;
alter table public.inflation_reports enable row level security;
alter table public.currency_reports enable row level security;
alter table public.global_risk_reports enable row level security;
alter table public.geopolitical_reports enable row level security;
alter table public.economic_forecasts enable row level security;
alter table public.research_downloads enable row level security;

drop policy if exists "Authenticated users can read economic events" on public.economic_events;
drop policy if exists "AFF admin can manage economic events" on public.economic_events;
create policy "Authenticated users can read economic events" on public.economic_events for select to authenticated using (true);
create policy "AFF admin can manage economic events" on public.economic_events for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read central bank reports" on public.central_bank_reports;
drop policy if exists "AFF admin can manage central bank reports" on public.central_bank_reports;
create policy "Authenticated users can read central bank reports" on public.central_bank_reports for select to authenticated using (true);
create policy "AFF admin can manage central bank reports" on public.central_bank_reports for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read inflation reports" on public.inflation_reports;
drop policy if exists "AFF admin can manage inflation reports" on public.inflation_reports;
create policy "Authenticated users can read inflation reports" on public.inflation_reports for select to authenticated using (true);
create policy "AFF admin can manage inflation reports" on public.inflation_reports for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read currency reports" on public.currency_reports;
drop policy if exists "AFF admin can manage currency reports" on public.currency_reports;
create policy "Authenticated users can read currency reports" on public.currency_reports for select to authenticated using (true);
create policy "AFF admin can manage currency reports" on public.currency_reports for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read global risk reports" on public.global_risk_reports;
drop policy if exists "AFF admin can manage global risk reports" on public.global_risk_reports;
create policy "Authenticated users can read global risk reports" on public.global_risk_reports for select to authenticated using (true);
create policy "AFF admin can manage global risk reports" on public.global_risk_reports for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read geopolitical reports" on public.geopolitical_reports;
drop policy if exists "AFF admin can manage geopolitical reports" on public.geopolitical_reports;
create policy "Authenticated users can read geopolitical reports" on public.geopolitical_reports for select to authenticated using (true);
create policy "AFF admin can manage geopolitical reports" on public.geopolitical_reports for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read economic forecasts" on public.economic_forecasts;
drop policy if exists "AFF admin can manage economic forecasts" on public.economic_forecasts;
create policy "Authenticated users can read economic forecasts" on public.economic_forecasts for select to authenticated using (true);
create policy "AFF admin can manage economic forecasts" on public.economic_forecasts for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Students can read own research downloads" on public.research_downloads;
drop policy if exists "Students can create own research downloads" on public.research_downloads;
drop policy if exists "AFF admin can manage research downloads" on public.research_downloads;
create policy "Students can read own research downloads" on public.research_downloads for select to authenticated using (auth.uid() = student_id or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Students can create own research downloads" on public.research_downloads for insert to authenticated with check (student_id is null or auth.uid() = student_id);
create policy "AFF admin can manage research downloads" on public.research_downloads for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

insert into public.central_bank_reports (bank_name, country, currency, policy_bias, interest_rate, inflation_target, summary)
select bank_name, country, currency, 'Monitoring', null, inflation_target, summary
from (
  values
    ('Federal Reserve', 'United States', 'USD', '2%', 'Monitoring FOMC policy path, employment data, inflation persistence, and USD volatility.'),
    ('ECB', 'Euro Area', 'EUR', '2%', 'Monitoring euro-area inflation, growth divergence, and EUR policy repricing.'),
    ('BOJ', 'Japan', 'JPY', '2%', 'Monitoring yield curve policy, wage growth, and yen intervention risk.'),
    ('BOE', 'United Kingdom', 'GBP', '2%', 'Monitoring UK inflation, wage pressures, and sterling volatility.'),
    ('SNB', 'Switzerland', 'CHF', '0-2%', 'Monitoring safe-haven demand, inflation control, and CHF intervention language.'),
    ('BOC', 'Canada', 'CAD', '2%', 'Monitoring oil sensitivity, labor data, and CAD policy expectations.'),
    ('RBA', 'Australia', 'AUD', '2-3%', 'Monitoring commodity demand, inflation pressure, and AUD risk sentiment.'),
    ('RBNZ', 'New Zealand', 'NZD', '1-3%', 'Monitoring domestic inflation, growth slowdown, and NZD carry conditions.')
) as seed(bank_name, country, currency, inflation_target, summary)
where not exists (select 1 from public.central_bank_reports where central_bank_reports.bank_name = seed.bank_name);

insert into public.currency_reports (currency_code, report_title, bias, macro_summary)
select currency_code, currency_code || ' Institutional Currency Intelligence', 'Monitoring', macro_summary
from (
  values
    ('USD', 'Dollar intelligence focused on Fed policy, inflation, labor data, and global risk demand.'),
    ('EUR', 'Euro intelligence focused on ECB policy, growth divergence, and regional risk.'),
    ('GBP', 'Sterling intelligence focused on BOE policy, wages, inflation, and UK growth.'),
    ('JPY', 'Yen intelligence focused on BOJ policy, yields, intervention risk, and safe-haven flows.'),
    ('CHF', 'Swiss franc intelligence focused on SNB policy and safe-haven demand.'),
    ('CAD', 'Canadian dollar intelligence focused on BOC policy, oil, and US demand.'),
    ('AUD', 'Australian dollar intelligence focused on RBA policy, China demand, and commodities.'),
    ('NZD', 'New Zealand dollar intelligence focused on RBNZ policy and risk sentiment.')
) as seed(currency_code, macro_summary)
where not exists (select 1 from public.currency_reports where currency_reports.currency_code = seed.currency_code);

insert into public.economic_events (event_name, country, currency, event_category, impact_level, event_time)
select event_name, country, currency, event_category, impact_level, now() + event_offset
from (
  values
    ('CPI', 'United States', 'USD', 'Inflation', 'High', interval '2 days'),
    ('NFP', 'United States', 'USD', 'Employment', 'High', interval '6 days'),
    ('FOMC Interest Rate Decision', 'United States', 'USD', 'Central Bank', 'High', interval '10 days'),
    ('GDP', 'United States', 'USD', 'Growth', 'Medium', interval '12 days'),
    ('Retail Sales', 'United States', 'USD', 'Consumer Demand', 'Medium', interval '14 days'),
    ('Trade Balance', 'Euro Area', 'EUR', 'Trade', 'Low', interval '16 days')
) as seed(event_name, country, currency, event_category, impact_level, event_offset)
where not exists (select 1 from public.economic_events where economic_events.event_name = seed.event_name and economic_events.country = seed.country);

insert into public.inflation_reports (report_title, country, currency, cpi, core_cpi, ppi, employment_data, wage_growth, housing_inflation, summary)
select 'United States Inflation Command Brief', 'United States', 'USD', 0, 0, 0, 'Monitoring labor market strength and unemployment trend.', 0, 0, 'CPI, Core CPI, PPI, wage growth, and housing inflation remain primary USD volatility drivers.'
where not exists (select 1 from public.inflation_reports where report_title = 'United States Inflation Command Brief');

insert into public.global_risk_reports (report_title, risk_category, risk_score, recession_indicator, yield_curve_status, debt_monitoring, banking_stress, crisis_notes)
select 'Global Risk Monitor Baseline', 'Macro Risk', 50, 'Monitoring', 'Monitoring curve inversion and steepening risk.', 'Monitoring sovereign and corporate debt stress.', 'Monitoring bank liquidity and credit conditions.', 'Baseline risk framework for recession, debt, banking stress, and global crisis monitoring.'
where not exists (select 1 from public.global_risk_reports where report_title = 'Global Risk Monitor Baseline');

insert into public.geopolitical_reports (report_title, region, risk_type, impact_level, affected_currencies, summary)
select 'Global Geopolitical Risk Baseline', 'Global', 'Supply Chain Disruption', 'Medium', 'USD, EUR, JPY, CHF, CAD, AUD, NZD', 'Monitoring trade conflicts, sanctions, elections, military conflicts, energy disruptions, and supply chain pressure.'
where not exists (select 1 from public.geopolitical_reports where report_title = 'Global Geopolitical Risk Baseline');

insert into public.economic_forecasts (forecast_title, forecast_type, currency_focus, forecast_summary, institutional_view, accuracy_score)
select 'AFF Weekly Forex Outlook', 'Weekly Outlook', 'USD, EUR, GBP, JPY', 'Weekly outlook for central bank policy, inflation, global risk, and major currency direction.', 'Institutional desk monitors macro catalyst alignment before directional conviction.', 0
where not exists (select 1 from public.economic_forecasts where forecast_title = 'AFF Weekly Forex Outlook');

insert into public.market_commentary (title, body, priority, published_by)
select 'Economic Intelligence Desk Online', 'AFF Global Economic Intelligence Network is monitoring central banks, inflation, currency reports, geopolitical risk, and institutional forex outlooks.', 'High', 'AFF Economic Intelligence Desk'
where not exists (select 1 from public.market_commentary where title = 'Economic Intelligence Desk Online');

grant select, insert, update, delete on public.economic_events to authenticated;
grant select, insert, update, delete on public.central_bank_reports to authenticated;
grant select, insert, update, delete on public.inflation_reports to authenticated;
grant select, insert, update, delete on public.currency_reports to authenticated;
grant select, insert, update, delete on public.global_risk_reports to authenticated;
grant select, insert, update, delete on public.geopolitical_reports to authenticated;
grant select, insert, update, delete on public.economic_forecasts to authenticated;
grant select, insert, update, delete on public.research_downloads to authenticated;

grant usage on sequence public.economic_events_id_seq to authenticated;
grant usage on sequence public.central_bank_reports_id_seq to authenticated;
grant usage on sequence public.inflation_reports_id_seq to authenticated;
grant usage on sequence public.currency_reports_id_seq to authenticated;
grant usage on sequence public.global_risk_reports_id_seq to authenticated;
grant usage on sequence public.geopolitical_reports_id_seq to authenticated;
grant usage on sequence public.economic_forecasts_id_seq to authenticated;
grant usage on sequence public.research_downloads_id_seq to authenticated;

notify pgrst, 'reload schema';
