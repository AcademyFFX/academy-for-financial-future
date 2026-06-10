create table if not exists public.constitutional_courses (
  id bigserial primary key,
  course_title text not null,
  course_level text not null default 'Foundations',
  description text,
  module_count integer not null default 0,
  display_order integer not null default 0,
  course_status text not null default 'Active',
  created_at timestamptz not null default now(),
  constraint constitutional_courses_status_check check (course_status in ('Active', 'Draft', 'Archived'))
);

create table if not exists public.leadership_programs (
  id bigserial primary key,
  program_name text not null,
  program_type text not null,
  training_format text not null default 'Hybrid',
  description text,
  program_status text not null default 'Active',
  enrolled_count integer not null default 0,
  completion_count integer not null default 0,
  created_at timestamptz not null default now(),
  constraint leadership_programs_type_check check (program_type in ('Ethical Leadership', 'Decision-Making Simulation', 'Public Speaking', 'Crisis Leadership', 'Community Leadership', 'Economic Governance', 'Public Administration')),
  constraint leadership_programs_status_check check (program_status in ('Active', 'Draft', 'Archived'))
);

create table if not exists public.public_policy_cases (
  id bigserial primary key,
  case_title text not null,
  case_type text not null,
  simulation_type text not null default 'Public Policy Simulation',
  summary text,
  policy_area text,
  case_status text not null default 'Active',
  created_at timestamptz not null default now(),
  constraint public_policy_cases_type_check check (case_type in ('Legislative Simulation', 'Public Policy Simulation', 'Constitutional Case Study', 'Economic Crisis Simulation', 'Leadership Response Exercise')),
  constraint public_policy_cases_status_check check (case_status in ('Active', 'Review', 'Archived'))
);

create table if not exists public.nation_building_projects (
  id bigserial primary key,
  project_title text not null,
  project_type text not null,
  community_region text,
  description text,
  impact_score integer not null default 0,
  project_status text not null default 'Active',
  created_at timestamptz not null default now(),
  constraint nation_building_projects_type_check check (project_type in ('Social Responsibility', 'Community Development', 'Civic Engagement', 'National Resilience', 'Institutional Trust')),
  constraint nation_building_projects_score_check check (impact_score >= 0 and impact_score <= 100),
  constraint nation_building_projects_status_check check (project_status in ('Active', 'Planning', 'Completed', 'Archived'))
);

create table if not exists public.community_service_records (
  id bigserial primary key,
  student_id uuid references auth.users(id) on delete set null,
  student_name text not null,
  student_email text,
  service_project text not null,
  service_category text not null default 'Community Leadership',
  service_hours numeric(8,2) not null default 0,
  notes text,
  served_at date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.leadership_certifications (
  id bigserial primary key,
  student_id uuid references auth.users(id) on delete set null,
  student_name text not null,
  student_email text,
  certification_title text not null,
  certification_type text not null,
  certification_status text not null default 'In Progress',
  score numeric(5,2) not null default 0,
  issued_at date,
  created_at timestamptz not null default now(),
  constraint leadership_certifications_type_check check (certification_type in ('Civic Leadership Certification', 'Public Leadership Certification', 'Nation Building Certification', 'Community Impact Certification')),
  constraint leadership_certifications_status_check check (certification_status in ('In Progress', 'Passed', 'Issued', 'Revoked'))
);

create table if not exists public.civic_publications (
  id bigserial primary key,
  publication_title text not null,
  publication_type text not null,
  author_name text not null default 'Academy for Financial Future',
  abstract text,
  pdf_url text,
  publication_status text not null default 'Published',
  published_at date default current_date,
  created_at timestamptz not null default now(),
  constraint civic_publications_type_check check (publication_type in ('Civic Journal', 'Constitutional Studies Paper', 'Leadership Essay', 'Policy White Paper')),
  constraint civic_publications_status_check check (publication_status in ('Draft', 'Submitted', 'Published', 'Archived'))
);

create table if not exists public.governance_metrics (
  id bigserial primary key,
  reporting_period text not null,
  leadership_certifications_count integer not null default 0,
  community_service_hours numeric(10,2) not null default 0,
  civic_engagement_score integer not null default 0,
  public_policy_participation integer not null default 0,
  created_at timestamptz not null default now(),
  constraint governance_metrics_score_check check (civic_engagement_score >= 0 and civic_engagement_score <= 100)
);

create index if not exists constitutional_courses_order_idx on public.constitutional_courses (display_order, course_status);
create index if not exists leadership_programs_type_idx on public.leadership_programs (program_type, program_status);
create index if not exists public_policy_cases_type_idx on public.public_policy_cases (case_type, case_status);
create index if not exists nation_building_projects_type_idx on public.nation_building_projects (project_type, project_status);
create index if not exists community_service_records_student_idx on public.community_service_records (student_id, served_at desc);
create index if not exists leadership_certifications_student_idx on public.leadership_certifications (student_id, issued_at desc);
create index if not exists civic_publications_type_idx on public.civic_publications (publication_type, published_at desc);
create index if not exists governance_metrics_period_idx on public.governance_metrics (reporting_period);

alter table public.constitutional_courses enable row level security;
alter table public.leadership_programs enable row level security;
alter table public.public_policy_cases enable row level security;
alter table public.nation_building_projects enable row level security;
alter table public.community_service_records enable row level security;
alter table public.leadership_certifications enable row level security;
alter table public.civic_publications enable row level security;
alter table public.governance_metrics enable row level security;

drop policy if exists "Authenticated users can read constitutional courses" on public.constitutional_courses;
drop policy if exists "AFF admin can manage constitutional courses" on public.constitutional_courses;
create policy "Authenticated users can read constitutional courses" on public.constitutional_courses for select to authenticated using (course_status <> 'Archived' or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF admin can manage constitutional courses" on public.constitutional_courses for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read leadership programs" on public.leadership_programs;
drop policy if exists "AFF admin can manage leadership programs" on public.leadership_programs;
create policy "Authenticated users can read leadership programs" on public.leadership_programs for select to authenticated using (program_status <> 'Archived' or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF admin can manage leadership programs" on public.leadership_programs for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read public policy cases" on public.public_policy_cases;
drop policy if exists "AFF admin can manage public policy cases" on public.public_policy_cases;
create policy "Authenticated users can read public policy cases" on public.public_policy_cases for select to authenticated using (case_status <> 'Archived' or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF admin can manage public policy cases" on public.public_policy_cases for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read nation building projects" on public.nation_building_projects;
drop policy if exists "AFF admin can manage nation building projects" on public.nation_building_projects;
create policy "Authenticated users can read nation building projects" on public.nation_building_projects for select to authenticated using (project_status <> 'Archived' or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF admin can manage nation building projects" on public.nation_building_projects for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Students can read own community service records" on public.community_service_records;
drop policy if exists "Students can create own community service records" on public.community_service_records;
drop policy if exists "AFF admin can manage community service records" on public.community_service_records;
create policy "Students can read own community service records" on public.community_service_records for select to authenticated using (auth.uid() = student_id or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Students can create own community service records" on public.community_service_records for insert to authenticated with check (student_id is null or auth.uid() = student_id);
create policy "AFF admin can manage community service records" on public.community_service_records for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Students can read own leadership certifications" on public.leadership_certifications;
drop policy if exists "AFF admin can manage leadership certifications" on public.leadership_certifications;
create policy "Students can read own leadership certifications" on public.leadership_certifications for select to authenticated using (auth.uid() = student_id or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF admin can manage leadership certifications" on public.leadership_certifications for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read civic publications" on public.civic_publications;
drop policy if exists "AFF admin can manage civic publications" on public.civic_publications;
create policy "Authenticated users can read civic publications" on public.civic_publications for select to authenticated using (publication_status = 'Published' or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF admin can manage civic publications" on public.civic_publications for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read governance metrics" on public.governance_metrics;
drop policy if exists "AFF admin can manage governance metrics" on public.governance_metrics;
create policy "Authenticated users can read governance metrics" on public.governance_metrics for select to authenticated using (true);
create policy "AFF admin can manage governance metrics" on public.governance_metrics for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

insert into public.constitutional_courses (course_title, course_level, description, module_count, display_order)
select course_title, course_level, description, module_count, display_order
from (
  values
    ('Constitutional Literacy Foundations', 'Foundations', 'Rights, responsibilities, constitutional history, and civic participation.', 8, 1),
    ('Comparative Constitutional Systems', 'Intermediate', 'Study constitutional models, public accountability, and civic institutions.', 10, 2),
    ('Rights, Duties, and Democratic Participation', 'Applied', 'Practice civic participation, public dialogue, and institutional trust.', 9, 3)
) as seed(course_title, course_level, description, module_count, display_order)
where not exists (select 1 from public.constitutional_courses where constitutional_courses.course_title = seed.course_title);

insert into public.leadership_programs (program_name, program_type, training_format, description)
select program_name, program_type, 'Hybrid', description
from (
  values
    ('Ethical Public Leadership Lab', 'Ethical Leadership', 'Ethical leadership, moral responsibility, and decision-making practice.'),
    ('Crisis Leadership Simulation', 'Crisis Leadership', 'Leadership response exercises for public pressure and emergency decision-making.'),
    ('Economic Governance and Public Budgeting', 'Economic Governance', 'Fiscal policy, monetary policy, public budgeting, and economic development.')
) as seed(program_name, program_type, description)
where not exists (select 1 from public.leadership_programs where leadership_programs.program_name = seed.program_name);

insert into public.public_policy_cases (case_title, case_type, simulation_type, policy_area, summary)
select case_title, case_type, simulation_type, policy_area, summary
from (
  values
    ('Constitutional Rights Case Study', 'Constitutional Case Study', 'Constitutional Case Study', 'Constitutional Literacy', 'Analyze rights, responsibilities, and public accountability.'),
    ('Economic Crisis Response Simulation', 'Economic Crisis Simulation', 'Economic Crisis Simulation', 'Economic Governance', 'Coordinate fiscal, monetary, and public communication responses.'),
    ('Legislative Debate and Public Policy Lab', 'Legislative Simulation', 'Legislative Simulation', 'Public Administration', 'Draft, debate, and evaluate public policy proposals.')
) as seed(case_title, case_type, simulation_type, policy_area, summary)
where not exists (select 1 from public.public_policy_cases where public_policy_cases.case_title = seed.case_title);

insert into public.nation_building_projects (project_title, project_type, community_region, description, impact_score)
select project_title, project_type, 'Global', description, impact_score
from (
  values
    ('Community Development and Civic Trust Initiative', 'Community Development', 'Build civic engagement, institutional trust, and community leadership.', 85),
    ('National Resilience Studies Program', 'National Resilience', 'Study resilience, social responsibility, and public administration capacity.', 82)
) as seed(project_title, project_type, description, impact_score)
where not exists (select 1 from public.nation_building_projects where nation_building_projects.project_title = seed.project_title);

insert into public.civic_publications (publication_title, publication_type, author_name, abstract, publication_status)
select publication_title, publication_type, 'Academy for Financial Future Governance Desk', abstract, 'Published'
from (
  values
    ('Civic Responsibility and Constitutional Literacy', 'Constitutional Studies Paper', 'A governance school publication on civic literacy, rights, and responsibilities.'),
    ('Ethical Leadership for Nation Building', 'Leadership Essay', 'A leadership essay on moral responsibility, institutional trust, and public service.'),
    ('Economic Governance and Public Budgeting Framework', 'Policy White Paper', 'A policy white paper on fiscal policy, public budgeting, and economic development.')
) as seed(publication_title, publication_type, abstract)
where not exists (select 1 from public.civic_publications where civic_publications.publication_title = seed.publication_title);

insert into public.governance_metrics (reporting_period, leadership_certifications_count, community_service_hours, civic_engagement_score, public_policy_participation)
select 'Baseline', 0, 0, 80, 0
where not exists (select 1 from public.governance_metrics where reporting_period = 'Baseline');

grant select, insert, update, delete on public.constitutional_courses to authenticated;
grant select, insert, update, delete on public.leadership_programs to authenticated;
grant select, insert, update, delete on public.public_policy_cases to authenticated;
grant select, insert, update, delete on public.nation_building_projects to authenticated;
grant select, insert, update, delete on public.community_service_records to authenticated;
grant select, insert, update, delete on public.leadership_certifications to authenticated;
grant select, insert, update, delete on public.civic_publications to authenticated;
grant select, insert, update, delete on public.governance_metrics to authenticated;

grant usage on sequence public.constitutional_courses_id_seq to authenticated;
grant usage on sequence public.leadership_programs_id_seq to authenticated;
grant usage on sequence public.public_policy_cases_id_seq to authenticated;
grant usage on sequence public.nation_building_projects_id_seq to authenticated;
grant usage on sequence public.community_service_records_id_seq to authenticated;
grant usage on sequence public.leadership_certifications_id_seq to authenticated;
grant usage on sequence public.civic_publications_id_seq to authenticated;
grant usage on sequence public.governance_metrics_id_seq to authenticated;

notify pgrst, 'reload schema';
