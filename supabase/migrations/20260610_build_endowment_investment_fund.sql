create table if not exists public.endowment_donors (
  id bigserial primary key,
  donor_name text not null,
  donor_email text,
  donor_type text not null default 'Individual',
  giving_level text not null default 'Supporter',
  total_giving numeric not null default 0,
  donor_status text not null default 'Active',
  created_at timestamptz not null default now(),
  constraint endowment_donors_status_check check (donor_status in ('Active', 'Prospect', 'Stewardship', 'Archived'))
);

create table if not exists public.endowment_scholarship_funds (
  id bigserial primary key,
  fund_name text not null,
  fund_purpose text,
  fund_balance numeric not null default 0,
  awarded_amount numeric not null default 0,
  fund_status text not null default 'Active',
  created_at timestamptz not null default now()
);

create table if not exists public.endowment_scholarship_applications (
  id bigserial primary key,
  student_id uuid references auth.users(id) on delete set null,
  applicant_name text not null,
  applicant_email text not null,
  fund_name text not null,
  requested_amount numeric not null default 0,
  financial_need_statement text,
  career_goal text,
  application_status text not null default 'Submitted',
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  constraint endowment_scholarship_applications_status_check check (application_status in ('Submitted', 'In Review', 'Awarded', 'Rejected', 'Needs Documents'))
);

create table if not exists public.endowment_grants (
  id bigserial primary key,
  grant_name text not null,
  grant_purpose text not null,
  grant_amount numeric not null default 0,
  grant_status text not null default 'Open',
  created_at timestamptz not null default now()
);

create table if not exists public.endowment_corporate_sponsorships (
  id bigserial primary key,
  sponsor_name text not null,
  sponsor_level text not null default 'Gold',
  sponsorship_amount numeric not null default 0,
  sponsorship_status text not null default 'Active',
  contact_email text,
  created_at timestamptz not null default now()
);

create table if not exists public.endowment_alumni_giving (
  id bigserial primary key,
  alumni_name text not null,
  alumni_email text,
  campaign_name text not null,
  gift_amount numeric not null default 0,
  gift_status text not null default 'Received',
  created_at timestamptz not null default now()
);

create table if not exists public.endowment_investment_portfolio (
  id bigserial primary key,
  asset_name text not null,
  asset_class text not null,
  current_value numeric not null default 0,
  cost_basis numeric not null default 0,
  return_rate numeric not null default 0,
  allocation_percent numeric not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.endowment_budget_plans (
  id bigserial primary key,
  budget_name text not null,
  division_name text not null,
  planned_amount numeric not null default 0,
  approved_amount numeric not null default 0,
  budget_status text not null default 'Draft',
  fiscal_year text not null default '2026'
);

create table if not exists public.endowment_transparency_reports (
  id bigserial primary key,
  report_title text not null,
  reporting_period text not null,
  report_status text not null default 'Published',
  report_url text,
  published_at date default current_date
);

create table if not exists public.endowment_board_members (
  id bigserial primary key,
  member_name text not null,
  board_role text not null,
  member_email text,
  member_status text not null default 'Active',
  term_end_date date
);

create table if not exists public.endowment_research_grant_allocations (
  id bigserial primary key,
  research_project text not null,
  researcher_name text not null,
  allocated_amount numeric not null default 0,
  allocation_status text not null default 'Allocated',
  connected_publication_id bigint references public.research_publications(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.endowment_donors enable row level security;
alter table public.endowment_scholarship_funds enable row level security;
alter table public.endowment_scholarship_applications enable row level security;
alter table public.endowment_grants enable row level security;
alter table public.endowment_corporate_sponsorships enable row level security;
alter table public.endowment_alumni_giving enable row level security;
alter table public.endowment_investment_portfolio enable row level security;
alter table public.endowment_budget_plans enable row level security;
alter table public.endowment_transparency_reports enable row level security;
alter table public.endowment_board_members enable row level security;
alter table public.endowment_research_grant_allocations enable row level security;

drop policy if exists "AFF administrator can manage endowment donors" on public.endowment_donors;
drop policy if exists "Authenticated users can view scholarship funds" on public.endowment_scholarship_funds;
drop policy if exists "AFF administrator can manage scholarship funds" on public.endowment_scholarship_funds;
drop policy if exists "Students can create own scholarship applications" on public.endowment_scholarship_applications;
drop policy if exists "Students can view own scholarship applications" on public.endowment_scholarship_applications;
drop policy if exists "AFF administrator can manage scholarship applications" on public.endowment_scholarship_applications;
drop policy if exists "AFF administrator can manage endowment grants" on public.endowment_grants;
drop policy if exists "AFF administrator can manage corporate sponsorships" on public.endowment_corporate_sponsorships;
drop policy if exists "AFF administrator can manage alumni giving" on public.endowment_alumni_giving;
drop policy if exists "AFF administrator can manage investment portfolio" on public.endowment_investment_portfolio;
drop policy if exists "AFF administrator can manage budget plans" on public.endowment_budget_plans;
drop policy if exists "Authenticated users can view transparency reports" on public.endowment_transparency_reports;
drop policy if exists "AFF administrator can manage transparency reports" on public.endowment_transparency_reports;
drop policy if exists "AFF administrator can manage board members" on public.endowment_board_members;
drop policy if exists "AFF administrator can manage research grant allocations" on public.endowment_research_grant_allocations;

create policy "AFF administrator can manage endowment donors" on public.endowment_donors for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Authenticated users can view scholarship funds" on public.endowment_scholarship_funds for select to authenticated using (fund_status = 'Active' or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF administrator can manage scholarship funds" on public.endowment_scholarship_funds for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Students can create own scholarship applications" on public.endowment_scholarship_applications for insert to authenticated with check (auth.uid() = student_id);
create policy "Students can view own scholarship applications" on public.endowment_scholarship_applications for select to authenticated using (auth.uid() = student_id);
create policy "AFF administrator can manage scholarship applications" on public.endowment_scholarship_applications for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF administrator can manage endowment grants" on public.endowment_grants for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF administrator can manage corporate sponsorships" on public.endowment_corporate_sponsorships for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF administrator can manage alumni giving" on public.endowment_alumni_giving for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF administrator can manage investment portfolio" on public.endowment_investment_portfolio for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF administrator can manage budget plans" on public.endowment_budget_plans for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Authenticated users can view transparency reports" on public.endowment_transparency_reports for select to authenticated using (report_status = 'Published' or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF administrator can manage transparency reports" on public.endowment_transparency_reports for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF administrator can manage board members" on public.endowment_board_members for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF administrator can manage research grant allocations" on public.endowment_research_grant_allocations for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

grant select, insert, update, delete on public.endowment_donors to authenticated;
grant select, insert, update, delete on public.endowment_scholarship_funds to authenticated;
grant select, insert, update, delete on public.endowment_scholarship_applications to authenticated;
grant select, insert, update, delete on public.endowment_grants to authenticated;
grant select, insert, update, delete on public.endowment_corporate_sponsorships to authenticated;
grant select, insert, update, delete on public.endowment_alumni_giving to authenticated;
grant select, insert, update, delete on public.endowment_investment_portfolio to authenticated;
grant select, insert, update, delete on public.endowment_budget_plans to authenticated;
grant select, insert, update, delete on public.endowment_transparency_reports to authenticated;
grant select, insert, update, delete on public.endowment_board_members to authenticated;
grant select, insert, update, delete on public.endowment_research_grant_allocations to authenticated;
grant usage, select on all sequences in schema public to authenticated;

insert into public.endowment_donors (donor_name, donor_email, donor_type, giving_level, total_giving, donor_status)
values ('Academy for Financial Future Founding Fund', 'acafffx@gmail.com', 'Foundation', 'Founding', 100000, 'Active')
on conflict do nothing;

insert into public.endowment_scholarship_funds (fund_name, fund_purpose, fund_balance, awarded_amount, fund_status)
values ('AFF Forex Training Scholarship Fund', 'Scholarship support for students pursuing Academy for Financial Future certification and career readiness.', 25000, 5000, 'Active')
on conflict do nothing;

insert into public.endowment_grants (grant_name, grant_purpose, grant_amount, grant_status)
values ('AFF Research and Economic Intelligence Grant', 'Support student and institute research publications in forex economics, central bank policy, and institutional order flow.', 15000, 'Open')
on conflict do nothing;

insert into public.endowment_corporate_sponsorships (sponsor_name, sponsor_level, sponsorship_amount, sponsorship_status, contact_email)
values ('AFF Institutional Sponsor Program', 'Platinum', 50000, 'Active', 'acafffx@gmail.com')
on conflict do nothing;

insert into public.endowment_alumni_giving (alumni_name, alumni_email, campaign_name, gift_amount, gift_status)
values ('AFF Alumni Giving Circle', 'acafffx@gmail.com', 'Future Traders Scholarship Campaign', 2500, 'Received')
on conflict do nothing;

insert into public.endowment_investment_portfolio (asset_name, asset_class, current_value, cost_basis, return_rate, allocation_percent)
values
  ('AFF Endowment Operating Reserve', 'Cash Reserve', 75000, 75000, 0, 60),
  ('AFF Long-Term Growth Sleeve', 'Diversified Investment', 50000, 48000, 4.16, 40)
on conflict do nothing;

insert into public.endowment_budget_plans (budget_name, division_name, planned_amount, approved_amount, budget_status, fiscal_year)
values
  ('Career Placement Scholarship Budget', 'Career Center', 12000, 10000, 'Approved', '2026'),
  ('Research Grant Allocation Budget', 'Research Institute', 15000, 15000, 'Approved', '2026'),
  ('Campus Expansion Seed Budget', 'Campus Expansion Division', 20000, 15000, 'Draft', '2026')
on conflict do nothing;

insert into public.endowment_transparency_reports (report_title, reporting_period, report_status, report_url, published_at)
values ('AFF Foundation Transparency Summary', '2026-Q2', 'Published', null, current_date)
on conflict do nothing;

insert into public.endowment_board_members (member_name, board_role, member_email, member_status, term_end_date)
values ('Dr. Jean Rene Moricette', 'Foundation Board Chair', 'acafffx@gmail.com', 'Active', current_date + interval '2 years')
on conflict do nothing;

insert into public.endowment_research_grant_allocations (research_project, researcher_name, allocated_amount, allocation_status)
values ('Central Bank Intelligence and Currency Forecast Research', 'AFF Research Desk', 7500, 'Allocated')
on conflict do nothing;

notify pgrst, 'reload schema';
