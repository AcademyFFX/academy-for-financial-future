create table if not exists public.civilization_pillars (
  id bigserial primary key,
  pillar_name text not null unique,
  description text,
  display_order integer not null default 0,
  pillar_status text not null default 'Active',
  created_at timestamptz not null default now()
);

create table if not exists public.civilization_index_scores (
  id bigserial primary key,
  student_id uuid not null references auth.users(id) on delete cascade,
  student_name text,
  student_email text,
  index_score integer not null default 0,
  citizen_rank text not null default 'Bronze Citizen',
  financial_literacy_score integer not null default 0,
  economic_intelligence_score integer not null default 0,
  civic_leadership_score integer not null default 0,
  moral_responsibility_score integer not null default 0,
  human_development_score integer not null default 0,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint civilization_index_scores_student_id_key unique (student_id)
);

create table if not exists public.global_citizenship_records (
  id bigserial primary key,
  student_id uuid references auth.users(id) on delete cascade,
  student_name text not null,
  student_email text,
  citizenship_rank text not null default 'Bronze Citizen',
  citizenship_status text not null default 'Active',
  service_region text,
  created_at timestamptz not null default now()
);

create table if not exists public.community_projects (
  id bigserial primary key,
  student_id uuid references auth.users(id) on delete set null,
  student_name text,
  student_email text,
  project_title text not null,
  pillar_name text not null,
  community_region text not null,
  impact_goal text,
  notes text,
  project_status text not null default 'Submitted',
  created_at timestamptz not null default now()
);

create table if not exists public.public_policy_forums (
  id bigserial primary key,
  forum_title text not null,
  policy_area text not null,
  priority_level text not null default 'Medium',
  moderator_name text not null default 'AFF Civic Leadership Institute',
  scheduled_at timestamptz not null default now(),
  forum_status text not null default 'Scheduled',
  created_at timestamptz not null default now()
);

create table if not exists public.civilization_library (
  id bigserial primary key,
  title text not null,
  pillar_name text not null,
  resource_type text not null default 'Article',
  resource_url text,
  resource_status text not null default 'Published',
  published_at date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.global_leadership_programs (
  id bigserial primary key,
  program_name text not null,
  pillar_name text not null,
  program_status text not null default 'Active',
  enrolled_count integer not null default 0,
  completion_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.civilization_impact_metrics (
  id bigserial primary key,
  reporting_period text not null,
  pillar_name text not null,
  beneficiaries_count integer not null default 0,
  projects_completed integer not null default 0,
  media_reach integer not null default 0,
  impact_score integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.civilization_pillars enable row level security;
alter table public.civilization_index_scores enable row level security;
alter table public.global_citizenship_records enable row level security;
alter table public.community_projects enable row level security;
alter table public.public_policy_forums enable row level security;
alter table public.civilization_library enable row level security;
alter table public.global_leadership_programs enable row level security;
alter table public.civilization_impact_metrics enable row level security;

drop policy if exists "Authenticated users can read civilization pillars" on public.civilization_pillars;
create policy "Authenticated users can read civilization pillars" on public.civilization_pillars for select to authenticated using (true);
drop policy if exists "Admin can manage civilization pillars" on public.civilization_pillars;
create policy "Admin can manage civilization pillars" on public.civilization_pillars for all to authenticated using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com') with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

drop policy if exists "Students can read own civilization index" on public.civilization_index_scores;
create policy "Students can read own civilization index" on public.civilization_index_scores for select to authenticated using (auth.uid() = student_id or (auth.jwt() ->> 'email') = 'acafffx@gmail.com');
drop policy if exists "Admin can manage civilization index" on public.civilization_index_scores;
create policy "Admin can manage civilization index" on public.civilization_index_scores for all to authenticated using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com') with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

drop policy if exists "Students can read own global citizenship" on public.global_citizenship_records;
create policy "Students can read own global citizenship" on public.global_citizenship_records for select to authenticated using (auth.uid() = student_id or student_id is null or (auth.jwt() ->> 'email') = 'acafffx@gmail.com');
drop policy if exists "Admin can manage global citizenship" on public.global_citizenship_records;
create policy "Admin can manage global citizenship" on public.global_citizenship_records for all to authenticated using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com') with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read community projects" on public.community_projects;
create policy "Authenticated users can read community projects" on public.community_projects for select to authenticated using (true);
drop policy if exists "Students can insert community projects" on public.community_projects;
create policy "Students can insert community projects" on public.community_projects for insert to authenticated with check (auth.uid() = student_id);
drop policy if exists "Admin can manage community projects" on public.community_projects;
create policy "Admin can manage community projects" on public.community_projects for all to authenticated using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com') with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read public policy forums" on public.public_policy_forums;
create policy "Authenticated users can read public policy forums" on public.public_policy_forums for select to authenticated using (true);
drop policy if exists "Admin can manage public policy forums" on public.public_policy_forums;
create policy "Admin can manage public policy forums" on public.public_policy_forums for all to authenticated using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com') with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read civilization library" on public.civilization_library;
create policy "Authenticated users can read civilization library" on public.civilization_library for select to authenticated using (true);
drop policy if exists "Admin can manage civilization library" on public.civilization_library;
create policy "Admin can manage civilization library" on public.civilization_library for all to authenticated using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com') with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read leadership programs" on public.global_leadership_programs;
create policy "Authenticated users can read leadership programs" on public.global_leadership_programs for select to authenticated using (true);
drop policy if exists "Admin can manage leadership programs" on public.global_leadership_programs;
create policy "Admin can manage leadership programs" on public.global_leadership_programs for all to authenticated using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com') with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read civilization impact" on public.civilization_impact_metrics;
create policy "Authenticated users can read civilization impact" on public.civilization_impact_metrics for select to authenticated using (true);
drop policy if exists "Admin can manage civilization impact" on public.civilization_impact_metrics;
create policy "Admin can manage civilization impact" on public.civilization_impact_metrics for all to authenticated using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com') with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

grant select, insert, update, delete on public.civilization_pillars to authenticated;
grant select, insert, update, delete on public.civilization_index_scores to authenticated;
grant select, insert, update, delete on public.global_citizenship_records to authenticated;
grant select, insert, update, delete on public.community_projects to authenticated;
grant select, insert, update, delete on public.public_policy_forums to authenticated;
grant select, insert, update, delete on public.civilization_library to authenticated;
grant select, insert, update, delete on public.global_leadership_programs to authenticated;
grant select, insert, update, delete on public.civilization_impact_metrics to authenticated;
grant usage, select on all sequences in schema public to authenticated;

insert into public.civilization_pillars (pillar_name, description, display_order)
values
  ('Financial Literacy', 'Practical understanding of money, risk, markets, capital protection, and financial decision-making.', 1),
  ('Economic Intelligence', 'Ability to interpret economic data, central banks, inflation, labor markets, GDP, and policy forces.', 2),
  ('Civic Leadership', 'Formation in service, citizenship, constitutional awareness, public responsibility, and community action.', 3),
  ('Moral Responsibility', 'Ethical discipline, integrity, stewardship, accountability, and leadership under pressure.', 4),
  ('Human Development', 'Personal growth, purpose, communication, career readiness, and lifelong advancement.', 5)
on conflict (pillar_name) do update set description = excluded.description, display_order = excluded.display_order;

insert into public.public_policy_forums (forum_title, policy_area, priority_level, scheduled_at)
values
  ('Financial Literacy as Public Policy', 'Education Policy', 'High', now() + interval '14 days'),
  ('Economic Empowerment and Community Stability', 'Economic Development', 'High', now() + interval '21 days'),
  ('Moral Responsibility in Digital Education', 'Civic Ethics', 'Medium', now() + interval '30 days')
on conflict do nothing;

insert into public.civilization_library (title, pillar_name, resource_type, resource_status)
values
  ('AFF Civilization Charter', 'Moral Responsibility', 'Article', 'Published'),
  ('Community Awareness TV: Financial Literacy', 'Financial Literacy', 'Media', 'Published'),
  ('Central Banks and Civic Life', 'Economic Intelligence', 'White Paper', 'Published'),
  ('Global Citizen Leadership Guide', 'Civic Leadership', 'PDF', 'Published')
on conflict do nothing;

insert into public.global_leadership_programs (program_name, pillar_name, enrolled_count, completion_count)
values
  ('Global Citizenship Program', 'Civic Leadership', 120, 45),
  ('Global Leadership Academy', 'Human Development', 84, 31),
  ('Moral Responsibility Certification', 'Moral Responsibility', 72, 28)
on conflict do nothing;

insert into public.civilization_impact_metrics (reporting_period, pillar_name, beneficiaries_count, projects_completed, media_reach, impact_score)
values
  ('2026-Q2', 'Financial Literacy', 248, 12, 1500, 88),
  ('2026-Q2', 'Civic Leadership', 140, 8, 950, 82),
  ('2026-Q2', 'Human Development', 96, 6, 720, 79)
on conflict do nothing;

insert into public.global_citizenship_records (student_name, citizenship_rank, citizenship_status, service_region)
values ('AFF Global Cohort', 'Bronze Citizen', 'Active', 'Global')
on conflict do nothing;

notify pgrst, 'reload schema';
