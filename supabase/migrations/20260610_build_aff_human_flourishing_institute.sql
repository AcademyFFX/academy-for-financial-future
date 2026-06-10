create table if not exists public.flourishing_programs (
  id bigserial primary key,
  program_name text not null,
  program_category text not null,
  program_status text not null default 'Active',
  enrolled_count integer not null default 0,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.peace_initiatives (
  id bigserial primary key,
  initiative_name text not null,
  region text not null,
  initiative_status text not null default 'Active',
  participants_count integer not null default 0,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.prosperity_projects (
  id bigserial primary key,
  project_name text not null,
  region text not null,
  project_status text not null default 'Active',
  beneficiaries_count integer not null default 0,
  investment_focus text,
  created_at timestamptz not null default now()
);

create table if not exists public.human_development_tracks (
  id bigserial primary key,
  track_name text not null,
  track_level text not null default 'Core',
  track_status text not null default 'Active',
  modules_count integer not null default 0,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.leadership_fellowships (
  id bigserial primary key,
  fellowship_name text not null,
  region text not null,
  fellowship_status text not null default 'Active',
  fellows_count integer not null default 0,
  fellowship_focus text,
  created_at timestamptz not null default now()
);

create table if not exists public.global_service_campaigns (
  id bigserial primary key,
  student_id uuid references auth.users(id) on delete set null,
  student_name text,
  student_email text,
  campaign_name text not null,
  campaign_region text not null,
  focus_area text not null default 'Peace Education',
  service_goal text,
  notes text,
  campaign_status text not null default 'Submitted',
  created_at timestamptz not null default now()
);

create table if not exists public.flourishing_reports (
  id bigserial primary key,
  report_title text not null,
  report_category text not null,
  report_status text not null default 'Published',
  report_url text,
  published_at date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.flourishing_impact_metrics (
  id bigserial primary key,
  reporting_period text not null,
  region text not null,
  beneficiaries_count integer not null default 0,
  peace_score integer not null default 0,
  prosperity_score integer not null default 0,
  wellbeing_score integer not null default 0,
  service_campaigns integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.flourishing_programs enable row level security;
alter table public.peace_initiatives enable row level security;
alter table public.prosperity_projects enable row level security;
alter table public.human_development_tracks enable row level security;
alter table public.leadership_fellowships enable row level security;
alter table public.global_service_campaigns enable row level security;
alter table public.flourishing_reports enable row level security;
alter table public.flourishing_impact_metrics enable row level security;

drop policy if exists "Authenticated users can read flourishing programs" on public.flourishing_programs;
create policy "Authenticated users can read flourishing programs" on public.flourishing_programs for select to authenticated using (true);
drop policy if exists "Admin can manage flourishing programs" on public.flourishing_programs;
create policy "Admin can manage flourishing programs" on public.flourishing_programs for all to authenticated using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com') with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read peace initiatives" on public.peace_initiatives;
create policy "Authenticated users can read peace initiatives" on public.peace_initiatives for select to authenticated using (true);
drop policy if exists "Admin can manage peace initiatives" on public.peace_initiatives;
create policy "Admin can manage peace initiatives" on public.peace_initiatives for all to authenticated using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com') with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read prosperity projects" on public.prosperity_projects;
create policy "Authenticated users can read prosperity projects" on public.prosperity_projects for select to authenticated using (true);
drop policy if exists "Admin can manage prosperity projects" on public.prosperity_projects;
create policy "Admin can manage prosperity projects" on public.prosperity_projects for all to authenticated using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com') with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read human development tracks" on public.human_development_tracks;
create policy "Authenticated users can read human development tracks" on public.human_development_tracks for select to authenticated using (true);
drop policy if exists "Admin can manage human development tracks" on public.human_development_tracks;
create policy "Admin can manage human development tracks" on public.human_development_tracks for all to authenticated using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com') with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read leadership fellowships" on public.leadership_fellowships;
create policy "Authenticated users can read leadership fellowships" on public.leadership_fellowships for select to authenticated using (true);
drop policy if exists "Admin can manage leadership fellowships" on public.leadership_fellowships;
create policy "Admin can manage leadership fellowships" on public.leadership_fellowships for all to authenticated using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com') with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read service campaigns" on public.global_service_campaigns;
create policy "Authenticated users can read service campaigns" on public.global_service_campaigns for select to authenticated using (true);
drop policy if exists "Students can insert service campaigns" on public.global_service_campaigns;
create policy "Students can insert service campaigns" on public.global_service_campaigns for insert to authenticated with check (auth.uid() = student_id);
drop policy if exists "Admin can manage service campaigns" on public.global_service_campaigns;
create policy "Admin can manage service campaigns" on public.global_service_campaigns for all to authenticated using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com') with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read flourishing reports" on public.flourishing_reports;
create policy "Authenticated users can read flourishing reports" on public.flourishing_reports for select to authenticated using (true);
drop policy if exists "Admin can manage flourishing reports" on public.flourishing_reports;
create policy "Admin can manage flourishing reports" on public.flourishing_reports for all to authenticated using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com') with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read flourishing impact" on public.flourishing_impact_metrics;
create policy "Authenticated users can read flourishing impact" on public.flourishing_impact_metrics for select to authenticated using (true);
drop policy if exists "Admin can manage flourishing impact" on public.flourishing_impact_metrics;
create policy "Admin can manage flourishing impact" on public.flourishing_impact_metrics for all to authenticated using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com') with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

grant select, insert, update, delete on public.flourishing_programs to authenticated;
grant select, insert, update, delete on public.peace_initiatives to authenticated;
grant select, insert, update, delete on public.prosperity_projects to authenticated;
grant select, insert, update, delete on public.human_development_tracks to authenticated;
grant select, insert, update, delete on public.leadership_fellowships to authenticated;
grant select, insert, update, delete on public.global_service_campaigns to authenticated;
grant select, insert, update, delete on public.flourishing_reports to authenticated;
grant select, insert, update, delete on public.flourishing_impact_metrics to authenticated;
grant usage, select on all sequences in schema public to authenticated;

insert into public.flourishing_programs (program_name, program_category, enrolled_count, description)
values
  ('Peace Education Program', 'Peace Education', 120, 'Curriculum for conflict prevention, dialogue, dignity, and civic peacebuilding.'),
  ('Prosperity Initiative Lab', 'Prosperity', 96, 'Economic empowerment projects connecting financial literacy with community advancement.'),
  ('Human Development Curriculum', 'Human Development', 140, 'Purpose, communication, leadership, discipline, and lifelong growth.'),
  ('Moral Responsibility Research Program', 'Moral Responsibility', 84, 'Research on ethics, stewardship, accountability, and institutional trust.')
on conflict do nothing;

insert into public.peace_initiatives (initiative_name, region, participants_count, description)
values
  ('Community Peace Education Circle', 'Global Online', 80, 'Dialogue-based peace education for students and community leaders.'),
  ('Youth Civic Peacebuilding Workshop', 'Caribbean', 45, 'Youth program connecting civic leadership with peaceful community transformation.')
on conflict do nothing;

insert into public.prosperity_projects (project_name, region, beneficiaries_count, investment_focus)
values
  ('Financial Literacy for Household Prosperity', 'Global Online', 240, 'Financial education and economic empowerment'),
  ('Entrepreneurship and Capital Stewardship Project', 'North America', 120, 'Small business readiness and responsible capital use')
on conflict do nothing;

insert into public.human_development_tracks (track_name, track_level, modules_count, description)
values
  ('Purpose and Personal Discipline', 'Core', 6, 'Human development foundation for identity, discipline, and vision.'),
  ('Communication and Leadership Presence', 'Professional', 8, 'Leadership communication, public speaking, and ethical influence.'),
  ('Service, Meaning, and Legacy', 'Advanced', 7, 'Legacy-centered leadership and lifelong human contribution.')
on conflict do nothing;

insert into public.leadership_fellowships (fellowship_name, region, fellows_count, fellowship_focus)
values
  ('Global Human Flourishing Fellowship', 'Global', 24, 'Peace, prosperity, moral responsibility, and human development.'),
  ('Community Transformation Fellowship', 'Caribbean', 12, 'Local leadership, service, and economic empowerment.')
on conflict do nothing;

insert into public.flourishing_reports (report_title, report_category, report_status)
values
  ('Human Flourishing and Financial Education', 'Human Flourishing Report', 'Published'),
  ('Peace, Prosperity, and Moral Responsibility Framework', 'Moral Responsibility Research', 'Published'),
  ('Community Well-Being and Economic Empowerment', 'Impact Report', 'Published')
on conflict do nothing;

insert into public.flourishing_impact_metrics (reporting_period, region, beneficiaries_count, peace_score, prosperity_score, wellbeing_score, service_campaigns)
values
  ('2026-Q2', 'Global', 360, 86, 88, 89, 12),
  ('2026-Q2', 'Caribbean', 165, 82, 78, 84, 5)
on conflict do nothing;

notify pgrst, 'reload schema';
