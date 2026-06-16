create table if not exists public.university_departments (
  id bigserial primary key,
  college_id bigint references public.university_colleges(id) on delete set null,
  college_name text not null,
  department_name text not null,
  department_chair text not null default 'AFF Academic Council',
  department_status text not null default 'Active',
  created_at timestamptz not null default now(),
  unique (college_name, department_name)
);

create table if not exists public.university_faculty (
  id bigserial primary key,
  faculty_name text not null,
  title text not null,
  college_name text not null,
  department_name text,
  expertise text,
  faculty_status text not null default 'Active',
  created_at timestamptz not null default now()
);

create table if not exists public.university_research_centers (
  id bigserial primary key,
  center_name text not null unique,
  college_name text not null,
  director_name text not null default 'AFF Research Council',
  research_focus text,
  center_status text not null default 'Active',
  created_at timestamptz not null default now()
);

create table if not exists public.university_academic_calendar (
  id bigserial primary key,
  event_title text not null,
  event_type text not null default 'Academic Calendar',
  event_date date not null default current_date,
  event_location text,
  event_status text not null default 'Scheduled',
  created_at timestamptz not null default now()
);

create table if not exists public.student_academic_affiliations (
  id bigserial primary key,
  student_id uuid not null references auth.users(id) on delete cascade,
  student_name text,
  student_email text,
  college_affiliation text not null default 'College of Financial Markets',
  degree_affiliation text not null default 'Associate of Financial Markets',
  academic_standing text not null default 'Good Standing',
  advisor_name text not null default 'AFF Academic Advisor',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (student_id)
);

alter table public.university_departments enable row level security;
alter table public.university_faculty enable row level security;
alter table public.university_research_centers enable row level security;
alter table public.university_academic_calendar enable row level security;
alter table public.student_academic_affiliations enable row level security;

drop policy if exists "Authenticated users can read university departments" on public.university_departments;
drop policy if exists "AFF admin can manage university departments" on public.university_departments;
drop policy if exists "Authenticated users can read university faculty" on public.university_faculty;
drop policy if exists "AFF admin can manage university faculty" on public.university_faculty;
drop policy if exists "Authenticated users can read university research centers" on public.university_research_centers;
drop policy if exists "AFF admin can manage university research centers" on public.university_research_centers;
drop policy if exists "Authenticated users can read university academic calendar" on public.university_academic_calendar;
drop policy if exists "AFF admin can manage university academic calendar" on public.university_academic_calendar;
drop policy if exists "Students can read own academic affiliation" on public.student_academic_affiliations;
drop policy if exists "Students can create own academic affiliation" on public.student_academic_affiliations;
drop policy if exists "AFF admin can manage academic affiliations" on public.student_academic_affiliations;

create policy "Authenticated users can read university departments" on public.university_departments for select to authenticated using (true);
create policy "AFF admin can manage university departments" on public.university_departments for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Authenticated users can read university faculty" on public.university_faculty for select to authenticated using (true);
create policy "AFF admin can manage university faculty" on public.university_faculty for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Authenticated users can read university research centers" on public.university_research_centers for select to authenticated using (true);
create policy "AFF admin can manage university research centers" on public.university_research_centers for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Authenticated users can read university academic calendar" on public.university_academic_calendar for select to authenticated using (true);
create policy "AFF admin can manage university academic calendar" on public.university_academic_calendar for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Students can read own academic affiliation" on public.student_academic_affiliations for select to authenticated using (auth.uid() = student_id or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Students can create own academic affiliation" on public.student_academic_affiliations for insert to authenticated with check (auth.uid() = student_id);
create policy "AFF admin can manage academic affiliations" on public.student_academic_affiliations for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

grant select, insert, update, delete on public.university_departments to authenticated;
grant select, insert, update, delete on public.university_faculty to authenticated;
grant select, insert, update, delete on public.university_research_centers to authenticated;
grant select, insert, update, delete on public.university_academic_calendar to authenticated;
grant select, insert, update, delete on public.student_academic_affiliations to authenticated;
grant usage, select on sequence public.university_departments_id_seq to authenticated;
grant usage, select on sequence public.university_faculty_id_seq to authenticated;
grant usage, select on sequence public.university_research_centers_id_seq to authenticated;
grant usage, select on sequence public.university_academic_calendar_id_seq to authenticated;
grant usage, select on sequence public.student_academic_affiliations_id_seq to authenticated;

insert into public.university_colleges (college_name, college_code, description, dean_name, display_order)
values
  ('College of Financial Markets', 'CFM', 'Forex foundations, technical analysis, risk, market structure, and financial market literacy.', 'Dr. Jean Rene Moricette', 1),
  ('College of Institutional Trading', 'CIT', 'Institutional order flow, liquidity, smart money models, trading floor practice, and professional execution.', 'AFF Institutional Trading Faculty', 2),
  ('College of Economic Intelligence', 'CEI', 'Central banks, economic data, inflation, global risk, currency intelligence, and macro research.', 'AFF Economic Intelligence Faculty', 3),
  ('College of Media & Digital Broadcasting', 'CMDB', 'AFF TV Studio, digital broadcasting, podcasts, video libraries, livestreams, and educational media.', 'AFF Media Faculty', 4),
  ('College of Civic Leadership', 'CCL', 'Civic literacy, constitutional studies, moral responsibility, community leadership, and ethics.', 'AFF Civic Council', 5),
  ('College of Human Flourishing', 'CHF', 'Peace, prosperity, human development, service leadership, moral responsibility, and community well-being.', 'AFF Human Flourishing Faculty', 6),
  ('College of Artificial Intelligence', 'CAI', 'AI learning systems, AI Forex Coach, chart intelligence, voice coaching, academic advising, and analytics.', 'AFF AI Faculty', 7)
on conflict (college_name) do update set
  college_code = excluded.college_code,
  description = excluded.description,
  dean_name = excluded.dean_name,
  display_order = excluded.display_order;

insert into public.university_departments (college_id, college_name, department_name, department_chair)
select id, college_name, department_name, department_chair
from public.university_colleges
cross join lateral (
  values
    ('Academic Programs', 'AFF Academic Council'),
    ('Research and Applied Practice', 'AFF Research Council')
) as seed(department_name, department_chair)
where college_name in (
  'College of Financial Markets',
  'College of Institutional Trading',
  'College of Economic Intelligence',
  'College of Media & Digital Broadcasting',
  'College of Civic Leadership',
  'College of Human Flourishing',
  'College of Artificial Intelligence'
)
on conflict (college_name, department_name) do update set department_chair = excluded.department_chair;

insert into public.university_faculty (faculty_name, title, college_name, department_name, expertise)
values
  ('Dr. Jean Rene Moricette', 'University Administrator and Chancellor', 'College of Financial Markets', 'Academic Programs', 'Financial literacy, institutional education, leadership'),
  ('AFF Institutional Desk', 'Instructor Faculty', 'College of Institutional Trading', 'Research and Applied Practice', 'Liquidity, order flow, institutional strategy'),
  ('AFF Economic Intelligence Faculty', 'Research Faculty', 'College of Economic Intelligence', 'Research and Applied Practice', 'Central banks, CPI, NFP, FOMC, macro reports'),
  ('AFF Media Faculty', 'Broadcast Faculty', 'College of Media & Digital Broadcasting', 'Academic Programs', 'TV Studio, live broadcast, educational media'),
  ('AFF Civic Council', 'Civic Faculty', 'College of Civic Leadership', 'Academic Programs', 'Civic literacy, ethics, constitutional studies'),
  ('AFF Human Flourishing Faculty', 'Leadership Faculty', 'College of Human Flourishing', 'Research and Applied Practice', 'Peace, prosperity, human development'),
  ('AFF AI Faculty', 'AI Systems Faculty', 'College of Artificial Intelligence', 'Academic Programs', 'AI coaching, chart intelligence, voice systems')
on conflict do nothing;

insert into public.university_research_centers (center_name, college_name, director_name, research_focus)
values
  ('Financial Markets Research Center', 'College of Financial Markets', 'AFF Research Council', 'Forex foundations, risk, market structure, and technical analysis'),
  ('Institutional Trading Laboratory', 'College of Institutional Trading', 'AFF Institutional Desk', 'Liquidity, order flow, trade execution, and simulated trading'),
  ('Economic Intelligence Command Center', 'College of Economic Intelligence', 'AFF Economic Intelligence Faculty', 'Central banks, inflation, employment, rates, and currency reports'),
  ('Digital Broadcasting Studio Lab', 'College of Media & Digital Broadcasting', 'AFF Media Faculty', 'Educational media production and live academy broadcasts'),
  ('Civic and Moral Leadership Center', 'College of Civic Leadership', 'AFF Civic Council', 'Civic literacy, ethics, public leadership, and community service'),
  ('Human Flourishing Institute Lab', 'College of Human Flourishing', 'AFF Human Flourishing Faculty', 'Peace, prosperity, well-being, and global service'),
  ('AI Learning Intelligence Lab', 'College of Artificial Intelligence', 'AFF AI Faculty', 'AI Coach, Chart Analyst, Voice Coach, and institutional analytics')
on conflict (center_name) do update set
  college_name = excluded.college_name,
  director_name = excluded.director_name,
  research_focus = excluded.research_focus;

insert into public.university_academic_calendar (event_title, event_type, event_date, event_location, event_status)
values
  ('Global University Orientation', 'Student Services', current_date + interval '7 days', 'AFF Online Campus', 'Scheduled'),
  ('Certification Exam Review Week', 'Registrar Office', current_date + interval '14 days', 'Certification Center', 'Scheduled'),
  ('International Programs Information Session', 'International Programs', current_date + interval '21 days', 'Global Network', 'Scheduled'),
  ('Research and Economic Intelligence Colloquium', 'Research Centers', current_date + interval '30 days', 'Research Institute', 'Scheduled')
on conflict do nothing;

notify pgrst, 'reload schema';
