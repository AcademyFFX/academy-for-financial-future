create table if not exists public.aff_identity_profiles (
  id bigserial primary key,
  student_id uuid not null references auth.users(id) on delete cascade,
  student_name text,
  student_email text,
  display_name text not null,
  professional_title text not null default 'AFF Student',
  country text,
  primary_division text not null default 'Forex Training Division',
  mission_statement text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint aff_identity_profiles_student_id_key unique (student_id)
);

create table if not exists public.aff_passports (
  id bigserial primary key,
  student_id uuid not null references auth.users(id) on delete cascade,
  student_name text,
  student_email text,
  passport_number text not null unique,
  passport_status text not null default 'Active',
  primary_division text not null default 'Forex Training Division',
  lifelong_record_status text not null default 'Open',
  issued_at timestamptz not null default now(),
  constraint aff_passports_student_id_key unique (student_id)
);

create table if not exists public.aff_achievements (
  id bigserial primary key,
  student_id uuid references auth.users(id) on delete cascade,
  student_name text,
  achievement_title text not null,
  division_name text not null,
  achievement_level text not null default 'Milestone',
  points integer not null default 0,
  awarded_at date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.aff_mentor_network (
  id bigserial primary key,
  mentor_name text not null,
  mentor_email text,
  mentor_role text not null,
  division_name text not null,
  mentor_status text not null default 'Active',
  created_at timestamptz not null default now()
);

create table if not exists public.aff_knowledge_graph (
  id bigserial primary key,
  node_title text not null,
  node_type text not null default 'Division',
  division_name text not null,
  relationship_count integer not null default 0,
  summary text,
  created_at timestamptz not null default now()
);

create table if not exists public.aff_legacy_vault (
  id bigserial primary key,
  student_id uuid references auth.users(id) on delete cascade,
  student_name text,
  vault_title text not null,
  vault_category text not null default 'Lifelong Record',
  vault_entry text not null,
  visibility text not null default 'Private',
  created_at timestamptz not null default now()
);

create table if not exists public.aff_os_activity (
  id bigserial primary key,
  student_id uuid references auth.users(id) on delete cascade,
  student_name text,
  activity_type text not null,
  division_name text not null default 'AFF Operating System',
  activity_summary text not null,
  created_at timestamptz not null default now()
);

alter table public.aff_identity_profiles enable row level security;
alter table public.aff_passports enable row level security;
alter table public.aff_achievements enable row level security;
alter table public.aff_mentor_network enable row level security;
alter table public.aff_knowledge_graph enable row level security;
alter table public.aff_legacy_vault enable row level security;
alter table public.aff_os_activity enable row level security;

drop policy if exists "Students can read own AFF identity" on public.aff_identity_profiles;
create policy "Students can read own AFF identity" on public.aff_identity_profiles for select to authenticated using (auth.uid() = student_id or (auth.jwt() ->> 'email') = 'acafffx@gmail.com');
drop policy if exists "Students can insert own AFF identity" on public.aff_identity_profiles;
create policy "Students can insert own AFF identity" on public.aff_identity_profiles for insert to authenticated with check (auth.uid() = student_id);
drop policy if exists "Students can update own AFF identity" on public.aff_identity_profiles;
create policy "Students can update own AFF identity" on public.aff_identity_profiles for update to authenticated using (auth.uid() = student_id) with check (auth.uid() = student_id);
drop policy if exists "Admin can manage AFF identity" on public.aff_identity_profiles;
create policy "Admin can manage AFF identity" on public.aff_identity_profiles for all to authenticated using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com') with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

drop policy if exists "Students can read own AFF passport" on public.aff_passports;
create policy "Students can read own AFF passport" on public.aff_passports for select to authenticated using (auth.uid() = student_id or (auth.jwt() ->> 'email') = 'acafffx@gmail.com');
drop policy if exists "Students can insert own AFF passport" on public.aff_passports;
create policy "Students can insert own AFF passport" on public.aff_passports for insert to authenticated with check (auth.uid() = student_id);
drop policy if exists "Students can update own AFF passport" on public.aff_passports;
create policy "Students can update own AFF passport" on public.aff_passports for update to authenticated using (auth.uid() = student_id) with check (auth.uid() = student_id);
drop policy if exists "Admin can manage AFF passports" on public.aff_passports;
create policy "Admin can manage AFF passports" on public.aff_passports for all to authenticated using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com') with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

drop policy if exists "Students can read own AFF achievements" on public.aff_achievements;
create policy "Students can read own AFF achievements" on public.aff_achievements for select to authenticated using (auth.uid() = student_id or student_id is null or (auth.jwt() ->> 'email') = 'acafffx@gmail.com');
drop policy if exists "Admin can manage AFF achievements" on public.aff_achievements;
create policy "Admin can manage AFF achievements" on public.aff_achievements for all to authenticated using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com') with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read AFF mentor network" on public.aff_mentor_network;
create policy "Authenticated users can read AFF mentor network" on public.aff_mentor_network for select to authenticated using (true);
drop policy if exists "Admin can manage AFF mentor network" on public.aff_mentor_network;
create policy "Admin can manage AFF mentor network" on public.aff_mentor_network for all to authenticated using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com') with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read AFF knowledge graph" on public.aff_knowledge_graph;
create policy "Authenticated users can read AFF knowledge graph" on public.aff_knowledge_graph for select to authenticated using (true);
drop policy if exists "Admin can manage AFF knowledge graph" on public.aff_knowledge_graph;
create policy "Admin can manage AFF knowledge graph" on public.aff_knowledge_graph for all to authenticated using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com') with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

drop policy if exists "Students can read own legacy vault" on public.aff_legacy_vault;
create policy "Students can read own legacy vault" on public.aff_legacy_vault for select to authenticated using (auth.uid() = student_id or (auth.jwt() ->> 'email') = 'acafffx@gmail.com');
drop policy if exists "Students can insert own legacy vault" on public.aff_legacy_vault;
create policy "Students can insert own legacy vault" on public.aff_legacy_vault for insert to authenticated with check (auth.uid() = student_id);
drop policy if exists "Admin can manage legacy vault" on public.aff_legacy_vault;
create policy "Admin can manage legacy vault" on public.aff_legacy_vault for all to authenticated using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com') with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

drop policy if exists "Students can read own AFF OS activity" on public.aff_os_activity;
create policy "Students can read own AFF OS activity" on public.aff_os_activity for select to authenticated using (auth.uid() = student_id or (auth.jwt() ->> 'email') = 'acafffx@gmail.com');
drop policy if exists "Students can insert own AFF OS activity" on public.aff_os_activity;
create policy "Students can insert own AFF OS activity" on public.aff_os_activity for insert to authenticated with check (auth.uid() = student_id);
drop policy if exists "Admin can manage AFF OS activity" on public.aff_os_activity;
create policy "Admin can manage AFF OS activity" on public.aff_os_activity for all to authenticated using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com') with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

grant select, insert, update, delete on public.aff_identity_profiles to authenticated;
grant select, insert, update, delete on public.aff_passports to authenticated;
grant select, insert, update, delete on public.aff_achievements to authenticated;
grant select, insert, update, delete on public.aff_mentor_network to authenticated;
grant select, insert, update, delete on public.aff_knowledge_graph to authenticated;
grant select, insert, update, delete on public.aff_legacy_vault to authenticated;
grant select, insert, update, delete on public.aff_os_activity to authenticated;
grant usage, select on all sequences in schema public to authenticated;

insert into public.aff_mentor_network (mentor_name, mentor_email, mentor_role, division_name, mentor_status)
values
  ('Dr. Jean Rene Moricette', 'acafffx@gmail.com', 'Chancellor and Executive Mentor', 'AFF Operating System', 'Active'),
  ('AFF AI Executive Assistant', null, 'AI Progress Mentor', 'AI Coach', 'Active'),
  ('AFF Career Mentor Desk', null, 'Career and Credential Mentor', 'Career Center', 'Active')
on conflict do nothing;

insert into public.aff_knowledge_graph (node_title, node_type, division_name, relationship_count, summary)
values
  ('AFF Global University', 'Core System', 'University', 12, 'Academic colleges, degrees, transcripts, honors, and progress records.'),
  ('AI Intelligence Layer', 'AI System', 'AI Coach', 4, 'AI Coach, Voice Coach, Chart Analyst, and executive assistant workflows.'),
  ('Institutional Trading Layer', 'Trading System', 'Trading Floor', 5, 'Trading floor, simulator, journals, live room, and market analysis systems.'),
  ('Global Expansion Layer', 'Global System', 'Global Network', 6, 'International campuses, directors, partners, localization, and standards.'),
  ('Legacy and Governance Layer', 'Governance System', 'AFF Operating System', 8, 'Identity, passport, activity, achievements, mentors, and vault records.')
on conflict do nothing;

insert into public.aff_achievements (student_name, achievement_title, division_name, achievement_level, points)
values
  ('AFF Global Cohort', 'AFF Operating System Founding Record', 'AFF Operating System', 'Institutional Milestone', 100),
  ('AFF Global Cohort', 'Digital Passport Framework Activated', 'AFF Digital Passport', 'System Milestone', 75)
on conflict do nothing;

notify pgrst, 'reload schema';
