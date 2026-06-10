create table if not exists public.foundation_programs (
  id bigserial primary key,
  program_name text not null,
  program_type text not null,
  region text not null default 'Global',
  program_status text not null default 'Active',
  beneficiaries_count integer not null default 0,
  budget_allocated numeric not null default 0,
  created_at timestamptz not null default now(),
  constraint foundation_programs_type_check check (program_type in ('Scholarship Outreach', 'Youth Financial Literacy', 'Community Development', 'Economic Empowerment')),
  constraint foundation_programs_status_check check (program_status in ('Active', 'Planning', 'Completed', 'Paused'))
);

create table if not exists public.foundation_education_partnerships (
  id bigserial primary key,
  partner_name text not null,
  region text not null default 'Global',
  partnership_scope text,
  partnership_status text not null default 'Active',
  created_at timestamptz not null default now()
);

create table if not exists public.foundation_grant_distributions (
  id bigserial primary key,
  recipient_name text not null,
  program_name text not null,
  distribution_amount numeric not null default 0,
  distribution_status text not null default 'Approved',
  distributed_at date default current_date
);

create table if not exists public.foundation_volunteers (
  id bigserial primary key,
  volunteer_name text not null,
  volunteer_email text,
  focus_area text not null,
  volunteer_status text not null default 'Active',
  hours_committed integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.foundation_humanitarian_campaigns (
  id bigserial primary key,
  submitted_by uuid references auth.users(id) on delete set null,
  applicant_name text not null,
  applicant_email text not null,
  campaign_name text not null,
  region text,
  requested_support text,
  impact_goal text,
  campaign_status text not null default 'Submitted',
  created_at timestamptz not null default now(),
  constraint foundation_campaigns_status_check check (campaign_status in ('Submitted', 'In Review', 'Approved', 'Active', 'Completed', 'Rejected'))
);

create table if not exists public.foundation_ambassadors (
  id bigserial primary key,
  ambassador_name text not null,
  ambassador_email text,
  region text not null,
  focus_area text not null,
  ambassador_status text not null default 'Active',
  created_at timestamptz not null default now()
);

create table if not exists public.foundation_governance_records (
  id bigserial primary key,
  record_title text not null,
  governance_area text not null,
  governance_status text not null default 'Current',
  review_date date default current_date
);

create table if not exists public.foundation_impact_reports (
  id bigserial primary key,
  report_title text not null,
  reporting_period text not null,
  beneficiaries_reached integer not null default 0,
  impact_investment numeric not null default 0,
  report_status text not null default 'Published',
  published_at date default current_date
);

alter table public.foundation_programs enable row level security;
alter table public.foundation_education_partnerships enable row level security;
alter table public.foundation_grant_distributions enable row level security;
alter table public.foundation_volunteers enable row level security;
alter table public.foundation_humanitarian_campaigns enable row level security;
alter table public.foundation_ambassadors enable row level security;
alter table public.foundation_governance_records enable row level security;
alter table public.foundation_impact_reports enable row level security;

drop policy if exists "Authenticated users can view foundation programs" on public.foundation_programs;
drop policy if exists "AFF administrator can manage foundation programs" on public.foundation_programs;
drop policy if exists "Authenticated users can view foundation partnerships" on public.foundation_education_partnerships;
drop policy if exists "AFF administrator can manage foundation partnerships" on public.foundation_education_partnerships;
drop policy if exists "AFF administrator can manage foundation grants" on public.foundation_grant_distributions;
drop policy if exists "AFF administrator can manage foundation volunteers" on public.foundation_volunteers;
drop policy if exists "Users can create foundation campaign requests" on public.foundation_humanitarian_campaigns;
drop policy if exists "Users can view own foundation campaign requests" on public.foundation_humanitarian_campaigns;
drop policy if exists "AFF administrator can manage foundation campaigns" on public.foundation_humanitarian_campaigns;
drop policy if exists "Authenticated users can view foundation ambassadors" on public.foundation_ambassadors;
drop policy if exists "AFF administrator can manage foundation ambassadors" on public.foundation_ambassadors;
drop policy if exists "AFF administrator can manage foundation governance" on public.foundation_governance_records;
drop policy if exists "Authenticated users can view foundation impact reports" on public.foundation_impact_reports;
drop policy if exists "AFF administrator can manage foundation impact reports" on public.foundation_impact_reports;

create policy "Authenticated users can view foundation programs" on public.foundation_programs for select to authenticated using (program_status in ('Active', 'Planning', 'Completed') or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF administrator can manage foundation programs" on public.foundation_programs for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Authenticated users can view foundation partnerships" on public.foundation_education_partnerships for select to authenticated using (partnership_status = 'Active' or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF administrator can manage foundation partnerships" on public.foundation_education_partnerships for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF administrator can manage foundation grants" on public.foundation_grant_distributions for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF administrator can manage foundation volunteers" on public.foundation_volunteers for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Users can create foundation campaign requests" on public.foundation_humanitarian_campaigns for insert to authenticated with check (auth.uid() = submitted_by);
create policy "Users can view own foundation campaign requests" on public.foundation_humanitarian_campaigns for select to authenticated using (auth.uid() = submitted_by);
create policy "AFF administrator can manage foundation campaigns" on public.foundation_humanitarian_campaigns for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Authenticated users can view foundation ambassadors" on public.foundation_ambassadors for select to authenticated using (ambassador_status = 'Active' or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF administrator can manage foundation ambassadors" on public.foundation_ambassadors for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF administrator can manage foundation governance" on public.foundation_governance_records for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Authenticated users can view foundation impact reports" on public.foundation_impact_reports for select to authenticated using (report_status = 'Published' or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF administrator can manage foundation impact reports" on public.foundation_impact_reports for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

grant select, insert, update, delete on public.foundation_programs to authenticated;
grant select, insert, update, delete on public.foundation_education_partnerships to authenticated;
grant select, insert, update, delete on public.foundation_grant_distributions to authenticated;
grant select, insert, update, delete on public.foundation_volunteers to authenticated;
grant select, insert, update, delete on public.foundation_humanitarian_campaigns to authenticated;
grant select, insert, update, delete on public.foundation_ambassadors to authenticated;
grant select, insert, update, delete on public.foundation_governance_records to authenticated;
grant select, insert, update, delete on public.foundation_impact_reports to authenticated;
grant usage, select on all sequences in schema public to authenticated;

insert into public.foundation_programs (program_name, program_type, region, program_status, beneficiaries_count, budget_allocated)
values
  ('AFF Scholarship Outreach Initiative', 'Scholarship Outreach', 'Global', 'Active', 75, 25000),
  ('Youth Financial Literacy Initiative', 'Youth Financial Literacy', 'United States and Caribbean', 'Active', 300, 18000),
  ('Community Development Through Financial Education', 'Community Development', 'Global', 'Planning', 120, 15000),
  ('Economic Empowerment for Emerging Traders', 'Economic Empowerment', 'Global', 'Active', 180, 22000)
on conflict do nothing;

insert into public.foundation_education_partnerships (partner_name, region, partnership_scope, partnership_status)
values ('AFF International Education Partnership Network', 'Global', 'Scholarship outreach, youth financial literacy, community education, and academy pathway development.', 'Active')
on conflict do nothing;

insert into public.foundation_grant_distributions (recipient_name, program_name, distribution_amount, distribution_status)
values ('AFF Scholarship Outreach Initiative', 'AFF Forex Training Scholarship Fund', 5000, 'Approved')
on conflict do nothing;

insert into public.foundation_volunteers (volunteer_name, volunteer_email, focus_area, volunteer_status, hours_committed)
values ('AFF Volunteer Corps', 'acafffx@gmail.com', 'Youth financial literacy and event support', 'Active', 120)
on conflict do nothing;

insert into public.foundation_ambassadors (ambassador_name, ambassador_email, region, focus_area, ambassador_status)
values ('Dr. Jean Rene Moricette', 'acafffx@gmail.com', 'Global', 'Financial literacy, scholarship outreach, and economic empowerment', 'Active')
on conflict do nothing;

insert into public.foundation_governance_records (record_title, governance_area, governance_status, review_date)
values ('AFF Foundation Governance Charter', 'Foundation Oversight', 'Current', current_date)
on conflict do nothing;

insert into public.foundation_impact_reports (report_title, reporting_period, beneficiaries_reached, impact_investment, report_status, published_at)
values ('AFF Annual Humanitarian Impact Report', '2026', 675, 85000, 'Published', current_date)
on conflict do nothing;

notify pgrst, 'reload schema';
