create table if not exists public.think_tank_reports (
  id bigserial primary key,
  report_title text not null,
  center_name text not null,
  report_type text not null default 'Think Tank Report',
  author_name text not null default 'AFF Global Think Tank',
  executive_summary text,
  pdf_url text,
  download_count integer not null default 0,
  citation_count integer not null default 0,
  publication_status text not null default 'Published',
  published_at date default current_date,
  created_at timestamptz not null default now(),
  constraint think_tank_reports_status_check check (publication_status in ('Draft', 'Review', 'Published', 'Archived'))
);

create table if not exists public.policy_briefs (
  id bigserial primary key,
  brief_title text not null,
  policy_area text not null,
  target_audience text not null default 'Executive Leadership',
  policy_status text not null default 'Published',
  summary text,
  recommendations text,
  pdf_url text,
  download_count integer not null default 0,
  citation_count integer not null default 0,
  published_at date default current_date,
  created_at timestamptz not null default now(),
  constraint policy_briefs_status_check check (policy_status in ('Draft', 'Review', 'Published', 'Archived'))
);

create table if not exists public.research_fellows (
  id bigserial primary key,
  fellow_name text not null,
  fellow_email text,
  fellowship_track text not null,
  research_center text not null,
  profile_summary text,
  publication_count integer not null default 0,
  performance_score integer not null default 0,
  fellow_status text not null default 'Active',
  created_at timestamptz not null default now(),
  constraint research_fellows_score_check check (performance_score >= 0 and performance_score <= 100),
  constraint research_fellows_status_check check (fellow_status in ('Applicant', 'Active', 'Alumni', 'Archived'))
);

create table if not exists public.research_grants (
  id bigserial primary key,
  grant_title text not null,
  recipient_name text not null,
  research_center text not null,
  grant_amount numeric(12,2) not null default 0,
  grant_status text not null default 'Review',
  grant_notes text,
  created_at timestamptz not null default now(),
  constraint research_grants_status_check check (grant_status in ('Review', 'Approved', 'Funded', 'Completed', 'Rejected'))
);

create table if not exists public.future_scenarios (
  id bigserial primary key,
  scenario_title text not null,
  scenario_theme text not null,
  scenario_year integer not null default 2030,
  risk_level text not null default 'Moderate',
  scenario_summary text,
  scenario_status text not null default 'Active',
  created_at timestamptz not null default now(),
  constraint future_scenarios_risk_check check (risk_level in ('Low', 'Moderate', 'High', 'Critical')),
  constraint future_scenarios_status_check check (scenario_status in ('Active', 'Review', 'Archived'))
);

create table if not exists public.foresight_studies (
  id bigserial primary key,
  study_title text not null,
  study_type text not null,
  time_horizon text not null default 'Long-Term',
  impact_score integer not null default 0,
  summary text,
  pdf_url text,
  download_count integer not null default 0,
  citation_count integer not null default 0,
  published_at date default current_date,
  created_at timestamptz not null default now(),
  constraint foresight_studies_score_check check (impact_score >= 0 and impact_score <= 100)
);

create table if not exists public.policy_impact_metrics (
  id bigserial primary key,
  metric_title text not null,
  reporting_period text not null,
  policy_impact_score integer not null default 0,
  countries_reached integer not null default 0,
  institutional_citations integer not null default 0,
  executive_briefings integer not null default 0,
  created_at timestamptz not null default now(),
  constraint policy_impact_score_check check (policy_impact_score >= 0 and policy_impact_score <= 100)
);

create table if not exists public.think_tank_publications (
  id bigserial primary key,
  publication_title text not null,
  publication_type text not null,
  center_name text not null,
  author_name text not null default 'AFF Global Think Tank',
  summary text,
  pdf_url text,
  download_count integer not null default 0,
  citation_count integer not null default 0,
  publication_status text not null default 'Published',
  published_at date default current_date,
  created_at timestamptz not null default now(),
  constraint think_tank_publications_type_check check (publication_type in ('Think Tank Report', 'White Paper', 'Policy Brief', 'Research Journal', 'Executive Summary')),
  constraint think_tank_publications_status_check check (publication_status in ('Draft', 'Review', 'Published', 'Archived'))
);

create index if not exists think_tank_reports_center_idx on public.think_tank_reports (center_name, published_at desc);
create index if not exists policy_briefs_area_idx on public.policy_briefs (policy_area, published_at desc);
create index if not exists research_fellows_track_idx on public.research_fellows (fellowship_track, fellow_status);
create index if not exists research_grants_status_idx on public.research_grants (grant_status, created_at desc);
create index if not exists future_scenarios_year_idx on public.future_scenarios (scenario_year, risk_level);
create index if not exists foresight_studies_type_idx on public.foresight_studies (study_type, published_at desc);
create index if not exists policy_impact_period_idx on public.policy_impact_metrics (reporting_period);
create index if not exists think_tank_publications_type_idx on public.think_tank_publications (publication_type, published_at desc);

alter table public.think_tank_reports enable row level security;
alter table public.policy_briefs enable row level security;
alter table public.research_fellows enable row level security;
alter table public.research_grants enable row level security;
alter table public.future_scenarios enable row level security;
alter table public.foresight_studies enable row level security;
alter table public.policy_impact_metrics enable row level security;
alter table public.think_tank_publications enable row level security;

drop policy if exists "Authenticated users can read think tank reports" on public.think_tank_reports;
drop policy if exists "AFF admin can manage think tank reports" on public.think_tank_reports;
create policy "Authenticated users can read think tank reports" on public.think_tank_reports for select to authenticated using (publication_status = 'Published' or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF admin can manage think tank reports" on public.think_tank_reports for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read policy briefs" on public.policy_briefs;
drop policy if exists "AFF admin can manage policy briefs" on public.policy_briefs;
create policy "Authenticated users can read policy briefs" on public.policy_briefs for select to authenticated using (policy_status = 'Published' or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF admin can manage policy briefs" on public.policy_briefs for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read research fellows" on public.research_fellows;
drop policy if exists "AFF admin can manage research fellows" on public.research_fellows;
create policy "Authenticated users can read research fellows" on public.research_fellows for select to authenticated using (fellow_status <> 'Archived' or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF admin can manage research fellows" on public.research_fellows for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read research grants" on public.research_grants;
drop policy if exists "AFF admin can manage research grants" on public.research_grants;
create policy "Authenticated users can read research grants" on public.research_grants for select to authenticated using (grant_status <> 'Rejected' or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF admin can manage research grants" on public.research_grants for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read future scenarios" on public.future_scenarios;
drop policy if exists "AFF admin can manage future scenarios" on public.future_scenarios;
create policy "Authenticated users can read future scenarios" on public.future_scenarios for select to authenticated using (scenario_status <> 'Archived' or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF admin can manage future scenarios" on public.future_scenarios for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read foresight studies" on public.foresight_studies;
drop policy if exists "AFF admin can manage foresight studies" on public.foresight_studies;
create policy "Authenticated users can read foresight studies" on public.foresight_studies for select to authenticated using (true);
create policy "AFF admin can manage foresight studies" on public.foresight_studies for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read policy impact metrics" on public.policy_impact_metrics;
drop policy if exists "AFF admin can manage policy impact metrics" on public.policy_impact_metrics;
create policy "Authenticated users can read policy impact metrics" on public.policy_impact_metrics for select to authenticated using (true);
create policy "AFF admin can manage policy impact metrics" on public.policy_impact_metrics for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read think tank publications" on public.think_tank_publications;
drop policy if exists "AFF admin can manage think tank publications" on public.think_tank_publications;
create policy "Authenticated users can read think tank publications" on public.think_tank_publications for select to authenticated using (publication_status = 'Published' or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF admin can manage think tank publications" on public.think_tank_publications for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

insert into public.think_tank_reports (report_title, center_name, report_type, executive_summary, download_count, citation_count)
select report_title, center_name, report_type, executive_summary, 0, 0
from (
  values
    ('Global Growth, Inflation and Currency Stability Outlook', 'Economic Policy Center', 'Economic Policy Report', 'Strategic macroeconomic outlook for growth, inflation, labor markets, and currency stability.'),
    ('Institutional Liquidity and Capital Markets Intelligence', 'Forex & Capital Markets Center', 'Capital Markets Report', 'Institutional order flow, liquidity, market cycles, and asset allocation intelligence.'),
    ('Civic Trust, Constitutional Literacy and Institutional Accountability', 'Constitutional & Civic Policy Center', 'Governance Report', 'Research on civic trust, constitutional literacy, public accountability, and democratic participation.')
) as seed(report_title, center_name, report_type, executive_summary)
where not exists (select 1 from public.think_tank_reports where think_tank_reports.report_title = seed.report_title);

insert into public.policy_briefs (brief_title, policy_area, target_audience, summary, recommendations)
select brief_title, policy_area, 'Executive Leadership', summary, recommendations
from (
  values
    ('Policy Brief: Financial Literacy as National Resilience', 'Future of Education', 'Financial literacy strengthens household decision-making and community economic resilience.', 'Expand financial literacy, civic literacy, and practical economic education.'),
    ('Policy Brief: Ethical Leadership and Institutional Trust', 'Constitutional & Civic Policy', 'Ethical leadership improves public trust and institutional accountability.', 'Build leadership education around responsibility, service, and transparent decision-making.')
) as seed(brief_title, policy_area, summary, recommendations)
where not exists (select 1 from public.policy_briefs where policy_briefs.brief_title = seed.brief_title);

insert into public.future_scenarios (scenario_title, scenario_theme, scenario_year, risk_level, scenario_summary)
select scenario_title, scenario_theme, scenario_year, risk_level, scenario_summary
from (
  values
    ('AI-Enabled Global Learning Systems 2035', 'Future of Education', 2035, 'Moderate', 'Scenario planning for AI tutors, credentialing, and global education access.'),
    ('Fragmented Geopolitics and Currency Volatility 2030', 'Geopolitical Forecasting', 2030, 'High', 'Scenario analysis for sanctions, trade conflicts, and currency volatility.'),
    ('Human Flourishing and Community Resilience 2040', 'Human Flourishing', 2040, 'Moderate', 'Long-term resilience, character formation, education effectiveness, and purpose-centered development.')
) as seed(scenario_title, scenario_theme, scenario_year, risk_level, scenario_summary)
where not exists (select 1 from public.future_scenarios where future_scenarios.scenario_title = seed.scenario_title);

insert into public.research_fellows (fellow_name, fellowship_track, research_center, profile_summary, publication_count, performance_score, fellow_status)
select 'AFF Senior Research Fellow Desk', 'Institutional Intelligence', 'AFF Global Think Tank', 'Core research desk for strategic forecasting, policy analysis, and institutional intelligence.', 0, 85, 'Active'
where not exists (select 1 from public.research_fellows where fellow_name = 'AFF Senior Research Fellow Desk');

insert into public.policy_impact_metrics (metric_title, reporting_period, policy_impact_score, countries_reached, institutional_citations, executive_briefings)
select 'Think Tank Baseline Impact', 'Baseline', 82, 1, 0, 0
where not exists (select 1 from public.policy_impact_metrics where metric_title = 'Think Tank Baseline Impact');

grant select, insert, update, delete on public.think_tank_reports to authenticated;
grant select, insert, update, delete on public.policy_briefs to authenticated;
grant select, insert, update, delete on public.research_fellows to authenticated;
grant select, insert, update, delete on public.research_grants to authenticated;
grant select, insert, update, delete on public.future_scenarios to authenticated;
grant select, insert, update, delete on public.foresight_studies to authenticated;
grant select, insert, update, delete on public.policy_impact_metrics to authenticated;
grant select, insert, update, delete on public.think_tank_publications to authenticated;

grant usage on sequence public.think_tank_reports_id_seq to authenticated;
grant usage on sequence public.policy_briefs_id_seq to authenticated;
grant usage on sequence public.research_fellows_id_seq to authenticated;
grant usage on sequence public.research_grants_id_seq to authenticated;
grant usage on sequence public.future_scenarios_id_seq to authenticated;
grant usage on sequence public.foresight_studies_id_seq to authenticated;
grant usage on sequence public.policy_impact_metrics_id_seq to authenticated;
grant usage on sequence public.think_tank_publications_id_seq to authenticated;

notify pgrst, 'reload schema';
