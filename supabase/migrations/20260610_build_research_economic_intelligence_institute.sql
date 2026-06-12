create table if not exists public.research_publications (
  id bigserial primary key,
  title text not null,
  category text not null,
  abstract text,
  author_name text not null default 'Academy for Financial Future Research Desk',
  author_email text,
  publication_status text not null default 'Published',
  publication_date date default current_date,
  pdf_url text,
  citation_text text,
  keywords text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint research_publications_category_check check (category in (
    'Economic Research Library',
    'Central Bank Intelligence Reports',
    'Weekly Forex Outlook Reports',
    'Institutional Order Flow Research',
    'Forex White Papers',
    'Student Research Publications',
    'Academic Journal Archive',
    'Quarterly Currency Forecast Reports'
  )),
  constraint research_publications_status_check check (publication_status in ('Draft', 'Submitted', 'Published', 'Archived'))
);

create table if not exists public.research_submissions (
  id bigserial primary key,
  student_id uuid not null references auth.users(id) on delete cascade,
  student_name text not null,
  student_email text not null,
  title text not null,
  category text not null,
  abstract text,
  pdf_url text,
  citation_text text,
  review_status text not null default 'Submitted',
  reviewer_notes text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  constraint research_submissions_status_check check (review_status in ('Submitted', 'In Review', 'Approved', 'Published', 'Rejected', 'Needs Revision'))
);

create table if not exists public.research_analyst_profiles (
  id bigserial primary key,
  analyst_name text not null,
  analyst_email text,
  specialty text not null,
  ranking_score numeric not null default 0,
  reports_published integer not null default 0,
  profile_status text not null default 'Active',
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint research_analyst_profiles_status_check check (profile_status in ('Active', 'Emerging', 'Archived'))
);

create table if not exists public.research_citations (
  id bigserial primary key,
  publication_id bigint references public.research_publications(id) on delete cascade,
  source_title text not null,
  citation_style text not null default 'APA',
  reference_text text not null,
  source_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.research_download_events (
  id bigserial primary key,
  student_id uuid references auth.users(id) on delete set null,
  publication_id bigint references public.research_publications(id) on delete cascade,
  downloaded_at timestamptz not null default now()
);

create index if not exists research_publications_category_idx on public.research_publications (category, publication_status);
create index if not exists research_submissions_student_idx on public.research_submissions (student_id, submitted_at desc);
create index if not exists research_download_events_publication_idx on public.research_download_events (publication_id, downloaded_at desc);

alter table public.research_publications enable row level security;
alter table public.research_submissions enable row level security;
alter table public.research_analyst_profiles enable row level security;
alter table public.research_citations enable row level security;
alter table public.research_download_events enable row level security;

drop policy if exists "Students can read published research" on public.research_publications;
drop policy if exists "AFF administrator can manage research publications" on public.research_publications;
drop policy if exists "Students can create own research submissions" on public.research_submissions;
drop policy if exists "Students can read own research submissions" on public.research_submissions;
drop policy if exists "AFF administrator can manage research submissions" on public.research_submissions;
drop policy if exists "Students can read analyst profiles" on public.research_analyst_profiles;
drop policy if exists "AFF administrator can manage analyst profiles" on public.research_analyst_profiles;
drop policy if exists "Students can read research citations" on public.research_citations;
drop policy if exists "AFF administrator can manage research citations" on public.research_citations;
drop policy if exists "Students can create research download events" on public.research_download_events;
drop policy if exists "AFF administrator can read research download events" on public.research_download_events;

create policy "Students can read published research"
on public.research_publications
for select
to authenticated
using (publication_status = 'Published' or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

create policy "AFF administrator can manage research publications"
on public.research_publications
for all
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

create policy "Students can create own research submissions"
on public.research_submissions
for insert
to authenticated
with check (auth.uid() = student_id);

create policy "Students can read own research submissions"
on public.research_submissions
for select
to authenticated
using (auth.uid() = student_id);

create policy "AFF administrator can manage research submissions"
on public.research_submissions
for all
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

create policy "Students can read analyst profiles"
on public.research_analyst_profiles
for select
to authenticated
using (profile_status in ('Active', 'Emerging') or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

create policy "AFF administrator can manage analyst profiles"
on public.research_analyst_profiles
for all
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

create policy "Students can read research citations"
on public.research_citations
for select
to authenticated
using (true);

create policy "AFF administrator can manage research citations"
on public.research_citations
for all
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

create policy "Students can create research download events"
on public.research_download_events
for insert
to authenticated
with check (auth.uid() = student_id or student_id is null);

create policy "AFF administrator can read research download events"
on public.research_download_events
for select
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

grant select, insert, update, delete on public.research_publications to authenticated;
grant select, insert, update, delete on public.research_submissions to authenticated;
grant select, insert, update, delete on public.research_analyst_profiles to authenticated;
grant select, insert, update, delete on public.research_citations to authenticated;
grant select, insert on public.research_download_events to authenticated;
grant usage, select on sequence public.research_publications_id_seq to authenticated;
grant usage, select on sequence public.research_submissions_id_seq to authenticated;
grant usage, select on sequence public.research_analyst_profiles_id_seq to authenticated;
grant usage, select on sequence public.research_citations_id_seq to authenticated;
grant usage, select on sequence public.research_download_events_id_seq to authenticated;

insert into public.research_publications (title, category, abstract, author_name, publication_status, pdf_url, citation_text, keywords)
values
  ('AFF Weekly Forex Outlook: Dollar Liquidity and Session Volatility', 'Weekly Forex Outlook Reports', 'A weekly institutional outlook reviewing USD liquidity, London and New York session behavior, and risk planning for major pairs.', 'AFF Research Desk', 'Published', null, 'Academy for Financial Future. (2026). AFF Weekly Forex Outlook: Dollar Liquidity and Session Volatility.', 'USD, liquidity, sessions, volatility'),
  ('Central Bank Intelligence Brief: Interest Rates and Forward Guidance', 'Central Bank Intelligence Reports', 'A central bank intelligence report explaining how rate decisions, inflation targets, and forward guidance influence currency repricing.', 'AFF Economic Intelligence Desk', 'Published', null, 'Academy for Financial Future. (2026). Central Bank Intelligence Brief: Interest Rates and Forward Guidance.', 'central banks, rates, inflation'),
  ('Institutional Order Flow Research: Liquidity Sweep Conditions', 'Institutional Order Flow Research', 'An institutional order flow study outlining liquidity pool behavior, stop activation, and reversal conditions around key highs and lows.', 'AFF Institutional Research Desk', 'Published', null, 'Academy for Financial Future. (2026). Institutional Order Flow Research: Liquidity Sweep Conditions.', 'order flow, liquidity sweeps, institutional activity'),
  ('Forex White Paper: Market Structure as an Academic Framework', 'Forex White Papers', 'A formal white paper presenting market structure as the skeleton of forex analysis through higher highs, higher lows, lower highs, and lower lows.', 'Dr. Jean Rene Moricette', 'Published', null, 'Moricette, J. R. (2026). Forex White Paper: Market Structure as an Academic Framework. Academy for Financial Future.', 'market structure, forex anatomy'),
  ('Quarterly Currency Forecast: Macro Catalysts and Risk Regimes', 'Quarterly Currency Forecast Reports', 'A quarterly currency forecast reviewing macro catalysts, interest rate expectations, inflation pressure, and risk sentiment regimes.', 'AFF Forecast Committee', 'Published', null, 'Academy for Financial Future. (2026). Quarterly Currency Forecast: Macro Catalysts and Risk Regimes.', 'currency forecast, macro, risk sentiment')
on conflict do nothing;

insert into public.research_analyst_profiles (analyst_name, analyst_email, specialty, ranking_score, reports_published, profile_status, bio)
values
  ('Dr. Jean Rene Moricette', 'acafffx@gmail.com', 'Forex Anatomy, Central Bank Intelligence, Institutional Strategy', 98, 5, 'Active', 'Administrator and lead academic voice for Academy for Financial Future research standards.'),
  ('AFF Research Desk', 'acafffx@gmail.com', 'Weekly Outlook, Order Flow, Currency Forecasts', 91, 4, 'Active', 'Internal AFF research desk supporting student and institutional research publications.')
on conflict do nothing;

insert into public.research_citations (source_title, citation_style, reference_text, source_url)
values
  ('AFF Forex Anatomy Curriculum', 'APA', 'Academy for Financial Future. (2026). Forex Anatomy Curriculum. Academy for Financial Future.', '/courses'),
  ('AFF Certificate Verification Portal', 'APA', 'Academy for Financial Future. (2026). Certificate Verification Portal. https://academyforfinancialfuture.com/verify', '/verify')
on conflict do nothing;

notify pgrst, 'reload schema';
