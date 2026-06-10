create table if not exists public.civic_programs (
  id bigserial primary key,
  program_name text not null,
  program_type text not null,
  description text,
  program_status text not null default 'Active',
  enrolled_count integer not null default 0,
  completion_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.civic_service_hours (
  id bigserial primary key,
  student_id uuid references auth.users(id) on delete cascade,
  student_name text,
  student_email text,
  service_project text not null,
  service_category text not null default 'Community Outreach',
  hours numeric(8,2) not null default 0,
  service_status text not null default 'Submitted',
  notes text,
  served_at date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.civic_policy_forums (
  id bigserial primary key,
  forum_title text not null,
  policy_area text not null,
  moderator_name text,
  forum_status text not null default 'Scheduled',
  discussion_prompt text,
  scheduled_at timestamptz default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.civic_research_publications (
  id bigserial primary key,
  title text not null,
  author_name text not null,
  publication_category text not null,
  abstract text,
  publication_status text not null default 'Published',
  pdf_url text,
  published_at date default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.civic_student_journals (
  id bigserial primary key,
  student_id uuid references auth.users(id) on delete cascade,
  student_name text,
  student_email text,
  journal_title text not null,
  reflection text not null,
  leadership_theme text not null default 'Moral Responsibility',
  review_status text not null default 'Submitted',
  created_at timestamptz not null default now()
);

create table if not exists public.civic_ethics_certifications (
  id bigserial primary key,
  student_id uuid references auth.users(id) on delete set null,
  student_name text,
  student_email text,
  certification_title text not null,
  certification_status text not null default 'Issued',
  score numeric(5,2),
  issued_at date default current_date,
  verification_code text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.civic_outreach_projects (
  id bigserial primary key,
  project_name text not null,
  community_region text not null,
  project_status text not null default 'Active',
  participants_count integer not null default 0,
  impact_score integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.civic_leadership_exams (
  id bigserial primary key,
  student_id uuid references auth.users(id) on delete cascade,
  student_name text,
  student_email text,
  exam_title text not null,
  score numeric(5,2) not null default 0,
  result text not null default 'In Progress',
  submitted_at timestamptz not null default now()
);

alter table public.civic_programs enable row level security;
alter table public.civic_service_hours enable row level security;
alter table public.civic_policy_forums enable row level security;
alter table public.civic_research_publications enable row level security;
alter table public.civic_student_journals enable row level security;
alter table public.civic_ethics_certifications enable row level security;
alter table public.civic_outreach_projects enable row level security;
alter table public.civic_leadership_exams enable row level security;

drop policy if exists "Authenticated users can read civic programs" on public.civic_programs;
create policy "Authenticated users can read civic programs"
on public.civic_programs for select
to authenticated
using (true);

drop policy if exists "Admin can manage civic programs" on public.civic_programs;
create policy "Admin can manage civic programs"
on public.civic_programs for all
to authenticated
using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com')
with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read civic forums" on public.civic_policy_forums;
create policy "Authenticated users can read civic forums"
on public.civic_policy_forums for select
to authenticated
using (true);

drop policy if exists "Admin can manage civic forums" on public.civic_policy_forums;
create policy "Admin can manage civic forums"
on public.civic_policy_forums for all
to authenticated
using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com')
with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read civic publications" on public.civic_research_publications;
create policy "Authenticated users can read civic publications"
on public.civic_research_publications for select
to authenticated
using (true);

drop policy if exists "Admin can manage civic publications" on public.civic_research_publications;
create policy "Admin can manage civic publications"
on public.civic_research_publications for all
to authenticated
using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com')
with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read civic outreach" on public.civic_outreach_projects;
create policy "Authenticated users can read civic outreach"
on public.civic_outreach_projects for select
to authenticated
using (true);

drop policy if exists "Admin can manage civic outreach" on public.civic_outreach_projects;
create policy "Admin can manage civic outreach"
on public.civic_outreach_projects for all
to authenticated
using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com')
with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

drop policy if exists "Students can read own civic service" on public.civic_service_hours;
create policy "Students can read own civic service"
on public.civic_service_hours for select
to authenticated
using (auth.uid() = student_id or (auth.jwt() ->> 'email') = 'acafffx@gmail.com');

drop policy if exists "Students can insert own civic service" on public.civic_service_hours;
create policy "Students can insert own civic service"
on public.civic_service_hours for insert
to authenticated
with check (auth.uid() = student_id);

drop policy if exists "Admin can manage civic service" on public.civic_service_hours;
create policy "Admin can manage civic service"
on public.civic_service_hours for all
to authenticated
using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com')
with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

drop policy if exists "Students can read own leadership journals" on public.civic_student_journals;
create policy "Students can read own leadership journals"
on public.civic_student_journals for select
to authenticated
using (auth.uid() = student_id or (auth.jwt() ->> 'email') = 'acafffx@gmail.com');

drop policy if exists "Students can insert own leadership journals" on public.civic_student_journals;
create policy "Students can insert own leadership journals"
on public.civic_student_journals for insert
to authenticated
with check (auth.uid() = student_id);

drop policy if exists "Admin can manage leadership journals" on public.civic_student_journals;
create policy "Admin can manage leadership journals"
on public.civic_student_journals for all
to authenticated
using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com')
with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

drop policy if exists "Students can read own ethics certifications" on public.civic_ethics_certifications;
create policy "Students can read own ethics certifications"
on public.civic_ethics_certifications for select
to authenticated
using (auth.uid() = student_id or (auth.jwt() ->> 'email') = 'acafffx@gmail.com');

drop policy if exists "Admin can manage ethics certifications" on public.civic_ethics_certifications;
create policy "Admin can manage ethics certifications"
on public.civic_ethics_certifications for all
to authenticated
using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com')
with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

drop policy if exists "Students can read own civic exams" on public.civic_leadership_exams;
create policy "Students can read own civic exams"
on public.civic_leadership_exams for select
to authenticated
using (auth.uid() = student_id or (auth.jwt() ->> 'email') = 'acafffx@gmail.com');

drop policy if exists "Students can insert own civic exams" on public.civic_leadership_exams;
create policy "Students can insert own civic exams"
on public.civic_leadership_exams for insert
to authenticated
with check (auth.uid() = student_id);

drop policy if exists "Admin can manage civic exams" on public.civic_leadership_exams;
create policy "Admin can manage civic exams"
on public.civic_leadership_exams for all
to authenticated
using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com')
with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

grant select, insert, update, delete on public.civic_programs to authenticated;
grant select, insert, update, delete on public.civic_service_hours to authenticated;
grant select, insert, update, delete on public.civic_policy_forums to authenticated;
grant select, insert, update, delete on public.civic_research_publications to authenticated;
grant select, insert, update, delete on public.civic_student_journals to authenticated;
grant select, insert, update, delete on public.civic_ethics_certifications to authenticated;
grant select, insert, update, delete on public.civic_outreach_projects to authenticated;
grant select, insert, update, delete on public.civic_leadership_exams to authenticated;

grant usage, select on sequence public.civic_programs_id_seq to authenticated;
grant usage, select on sequence public.civic_service_hours_id_seq to authenticated;
grant usage, select on sequence public.civic_policy_forums_id_seq to authenticated;
grant usage, select on sequence public.civic_research_publications_id_seq to authenticated;
grant usage, select on sequence public.civic_student_journals_id_seq to authenticated;
grant usage, select on sequence public.civic_ethics_certifications_id_seq to authenticated;
grant usage, select on sequence public.civic_outreach_projects_id_seq to authenticated;
grant usage, select on sequence public.civic_leadership_exams_id_seq to authenticated;

insert into public.civic_programs (program_name, program_type, description, program_status, enrolled_count, completion_count)
values
  ('Civic Literacy Academy', 'Civic Literacy Academy', 'Structured study of citizenship, institutions, civic participation, and public responsibility.', 'Active', 120, 72),
  ('Moral Responsibility Academy', 'Moral Responsibility Academy', 'Ethical formation for disciplined leadership, accountability, justice, and service.', 'Active', 96, 58),
  ('Constitutional Studies Center', 'Constitutional Studies Center', 'Academic study of constitutional principles, rights, duties, and institutional safeguards.', 'Active', 84, 49),
  ('Leadership Development Programs', 'Leadership Development Program', 'Professional leadership formation through decision-making, service, mentorship, and communication.', 'Active', 110, 66),
  ('Ethics Certification Programs', 'Ethics Certification Program', 'Certification track for civic ethics, public trust, leadership integrity, and community stewardship.', 'Active', 64, 38)
on conflict do nothing;

insert into public.civic_policy_forums (forum_title, policy_area, moderator_name, forum_status, discussion_prompt, scheduled_at)
values
  ('Public Policy and Financial Responsibility Forum', 'Economic Citizenship', 'Dr. Jean Rene Moricette', 'Scheduled', 'How should financial literacy shape responsible civic participation?', now() + interval '7 days'),
  ('Constitutional Rights and Community Leadership Forum', 'Constitutional Studies', 'AFF Civic Faculty', 'Scheduled', 'How do constitutional principles guide public leadership and service?', now() + interval '14 days'),
  ('Ethics, Markets, and Moral Accountability Forum', 'Moral Responsibility', 'AFF Ethics Council', 'Open', 'What ethical obligations should financial leaders carry in public life?', now())
on conflict do nothing;

insert into public.civic_research_publications (title, author_name, publication_category, abstract, publication_status, published_at)
values
  ('Civic Responsibility in Financial Education', 'AFF Research Faculty', 'Civic Research Publications', 'A research brief on connecting financial literacy, public responsibility, and ethical decision-making.', 'Published', current_date),
  ('Moral Leadership and Economic Stewardship', 'Institute for Civic and Moral Leadership', 'Civic Research Publications', 'An academic paper on stewardship, accountability, and service-centered leadership.', 'Published', current_date),
  ('Constitutional Literacy for Emerging Leaders', 'Constitutional Studies Center', 'Academic Journal Archive', 'A curriculum outline for teaching constitutional principles to emerging academy leaders.', 'Published', current_date)
on conflict do nothing;

insert into public.civic_outreach_projects (project_name, community_region, project_status, participants_count, impact_score)
values
  ('Youth Civic and Financial Literacy Outreach', 'South Florida', 'Active', 42, 88),
  ('Community Ethics and Leadership Workshop', 'Caribbean Diaspora', 'Planning', 28, 74),
  ('Student Service and Public Responsibility Campaign', 'Global Online Campus', 'Active', 65, 91)
on conflict do nothing;

notify pgrst, 'reload schema';
