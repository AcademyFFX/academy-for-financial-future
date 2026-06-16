create table if not exists public.eyes_society_episodes (
  id bigserial primary key,
  episode_title text not null,
  category text not null,
  episode_format text not null default 'Interview',
  status text not null default 'Scheduled',
  description text,
  guest_name text,
  scheduled_at timestamptz,
  live_stream_url text,
  replay_url text,
  production_stage text not null default 'Pre-Production',
  sponsor_name text,
  created_by text not null default 'acafffx@gmail.com',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.eyes_society_guests (
  id bigserial primary key,
  guest_name text not null,
  guest_title text,
  organization text,
  email text,
  topic text not null,
  booking_status text not null default 'Invited',
  appearance_date timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.eyes_society_production_calendar (
  id bigserial primary key,
  event_title text not null,
  event_type text not null,
  event_date timestamptz,
  owner_name text not null default 'Dr. Jean R. Moricette',
  status text not null default 'Scheduled',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.eyes_society_sponsors (
  id bigserial primary key,
  sponsor_name text not null,
  contact_name text,
  sponsorship_level text not null default 'Community Partner',
  campaign_name text,
  start_date date,
  end_date date,
  status text not null default 'Prospect',
  benefits text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.eyes_society_scripts (
  id bigserial primary key,
  episode_title text not null,
  segment_title text not null default 'Opening Segment',
  ai_prompt text,
  script_text text not null,
  script_status text not null default 'Draft',
  created_by text not null default 'acafffx@gmail.com',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.eyes_society_teleprompter_runs (
  id bigserial primary key,
  episode_title text not null,
  script_text text not null,
  scroll_speed integer not null default 5,
  font_size integer not null default 42,
  operator_name text not null default 'Studio Operator',
  status text not null default 'Ready',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.eyes_society_camera_workflows (
  id bigserial primary key,
  episode_title text not null,
  camera_label text not null,
  shot_type text not null,
  operator_name text not null default 'Studio Operator',
  input_source text,
  status text not null default 'Ready',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.eyes_society_viewer_questions (
  id bigserial primary key,
  student_id uuid references auth.users(id) on delete set null,
  viewer_name text not null,
  email text,
  topic text not null,
  question text not null,
  review_status text not null default 'Submitted',
  response_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.eyes_society_journalism_submissions (
  id bigserial primary key,
  student_id uuid references auth.users(id) on delete set null,
  student_name text not null,
  email text,
  project_title text not null,
  category text not null default 'Student Journalism',
  media_url text,
  summary text not null,
  review_status text not null default 'Submitted',
  instructor_feedback text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.eyes_society_media_assets (
  id bigserial primary key,
  asset_title text not null,
  asset_type text not null,
  episode_title text,
  asset_url text,
  description text,
  uploaded_by text not null default 'acafffx@gmail.com',
  status text not null default 'Published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint eyes_society_media_asset_type_check check (asset_type in ('Video', 'Audio', 'Image', 'Document'))
);

create index if not exists eyes_society_episodes_category_idx on public.eyes_society_episodes (category);
create index if not exists eyes_society_episodes_schedule_idx on public.eyes_society_episodes (scheduled_at, status);
create index if not exists eyes_society_guests_appearance_idx on public.eyes_society_guests (appearance_date, booking_status);
create index if not exists eyes_society_calendar_date_idx on public.eyes_society_production_calendar (event_date, status);
create index if not exists eyes_society_sponsors_status_idx on public.eyes_society_sponsors (status, sponsorship_level);
create index if not exists eyes_society_questions_status_idx on public.eyes_society_viewer_questions (review_status, topic);
create index if not exists eyes_society_journalism_status_idx on public.eyes_society_journalism_submissions (review_status, category);
create index if not exists eyes_society_media_assets_type_idx on public.eyes_society_media_assets (asset_type, status);

alter table public.eyes_society_episodes enable row level security;
alter table public.eyes_society_guests enable row level security;
alter table public.eyes_society_production_calendar enable row level security;
alter table public.eyes_society_sponsors enable row level security;
alter table public.eyes_society_scripts enable row level security;
alter table public.eyes_society_teleprompter_runs enable row level security;
alter table public.eyes_society_camera_workflows enable row level security;
alter table public.eyes_society_viewer_questions enable row level security;
alter table public.eyes_society_journalism_submissions enable row level security;
alter table public.eyes_society_media_assets enable row level security;

drop policy if exists "Authenticated users can read Eyes episodes" on public.eyes_society_episodes;
drop policy if exists "AFF admin can manage Eyes episodes" on public.eyes_society_episodes;
drop policy if exists "Authenticated users can read Eyes guests" on public.eyes_society_guests;
drop policy if exists "AFF admin can manage Eyes guests" on public.eyes_society_guests;
drop policy if exists "Authenticated users can read Eyes calendar" on public.eyes_society_production_calendar;
drop policy if exists "AFF admin can manage Eyes calendar" on public.eyes_society_production_calendar;
drop policy if exists "Authenticated users can read Eyes sponsors" on public.eyes_society_sponsors;
drop policy if exists "AFF admin can manage Eyes sponsors" on public.eyes_society_sponsors;
drop policy if exists "Authenticated users can read Eyes scripts" on public.eyes_society_scripts;
drop policy if exists "AFF admin can manage Eyes scripts" on public.eyes_society_scripts;
drop policy if exists "Authenticated users can read Eyes teleprompter" on public.eyes_society_teleprompter_runs;
drop policy if exists "AFF admin can manage Eyes teleprompter" on public.eyes_society_teleprompter_runs;
drop policy if exists "Authenticated users can read Eyes camera workflows" on public.eyes_society_camera_workflows;
drop policy if exists "AFF admin can manage Eyes camera workflows" on public.eyes_society_camera_workflows;
drop policy if exists "Students can read own Eyes questions" on public.eyes_society_viewer_questions;
drop policy if exists "Students can submit Eyes questions" on public.eyes_society_viewer_questions;
drop policy if exists "AFF admin can manage Eyes questions" on public.eyes_society_viewer_questions;
drop policy if exists "Students can read own Eyes journalism" on public.eyes_society_journalism_submissions;
drop policy if exists "Students can submit Eyes journalism" on public.eyes_society_journalism_submissions;
drop policy if exists "AFF admin can manage Eyes journalism" on public.eyes_society_journalism_submissions;
drop policy if exists "Authenticated users can read Eyes media assets" on public.eyes_society_media_assets;
drop policy if exists "AFF admin can manage Eyes media assets" on public.eyes_society_media_assets;

create policy "Authenticated users can read Eyes episodes" on public.eyes_society_episodes for select to authenticated using (true);
create policy "AFF admin can manage Eyes episodes" on public.eyes_society_episodes for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Authenticated users can read Eyes guests" on public.eyes_society_guests for select to authenticated using (true);
create policy "AFF admin can manage Eyes guests" on public.eyes_society_guests for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Authenticated users can read Eyes calendar" on public.eyes_society_production_calendar for select to authenticated using (true);
create policy "AFF admin can manage Eyes calendar" on public.eyes_society_production_calendar for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Authenticated users can read Eyes sponsors" on public.eyes_society_sponsors for select to authenticated using (true);
create policy "AFF admin can manage Eyes sponsors" on public.eyes_society_sponsors for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Authenticated users can read Eyes scripts" on public.eyes_society_scripts for select to authenticated using (true);
create policy "AFF admin can manage Eyes scripts" on public.eyes_society_scripts for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Authenticated users can read Eyes teleprompter" on public.eyes_society_teleprompter_runs for select to authenticated using (true);
create policy "AFF admin can manage Eyes teleprompter" on public.eyes_society_teleprompter_runs for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Authenticated users can read Eyes camera workflows" on public.eyes_society_camera_workflows for select to authenticated using (true);
create policy "AFF admin can manage Eyes camera workflows" on public.eyes_society_camera_workflows for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Students can read own Eyes questions" on public.eyes_society_viewer_questions for select to authenticated using (student_id is null or auth.uid() = student_id or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Students can submit Eyes questions" on public.eyes_society_viewer_questions for insert to authenticated with check (student_id is null or auth.uid() = student_id);
create policy "AFF admin can manage Eyes questions" on public.eyes_society_viewer_questions for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Students can read own Eyes journalism" on public.eyes_society_journalism_submissions for select to authenticated using (student_id is null or auth.uid() = student_id or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Students can submit Eyes journalism" on public.eyes_society_journalism_submissions for insert to authenticated with check (student_id is null or auth.uid() = student_id);
create policy "AFF admin can manage Eyes journalism" on public.eyes_society_journalism_submissions for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Authenticated users can read Eyes media assets" on public.eyes_society_media_assets for select to authenticated using (status = 'Published' or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF admin can manage Eyes media assets" on public.eyes_society_media_assets for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

grant select, insert, update, delete on public.eyes_society_episodes to authenticated;
grant select, insert, update, delete on public.eyes_society_guests to authenticated;
grant select, insert, update, delete on public.eyes_society_production_calendar to authenticated;
grant select, insert, update, delete on public.eyes_society_sponsors to authenticated;
grant select, insert, update, delete on public.eyes_society_scripts to authenticated;
grant select, insert, update, delete on public.eyes_society_teleprompter_runs to authenticated;
grant select, insert, update, delete on public.eyes_society_camera_workflows to authenticated;
grant select, insert, update, delete on public.eyes_society_viewer_questions to authenticated;
grant select, insert, update, delete on public.eyes_society_journalism_submissions to authenticated;
grant select, insert, update, delete on public.eyes_society_media_assets to authenticated;
grant usage, select on sequence public.eyes_society_episodes_id_seq to authenticated;
grant usage, select on sequence public.eyes_society_guests_id_seq to authenticated;
grant usage, select on sequence public.eyes_society_production_calendar_id_seq to authenticated;
grant usage, select on sequence public.eyes_society_sponsors_id_seq to authenticated;
grant usage, select on sequence public.eyes_society_scripts_id_seq to authenticated;
grant usage, select on sequence public.eyes_society_teleprompter_runs_id_seq to authenticated;
grant usage, select on sequence public.eyes_society_camera_workflows_id_seq to authenticated;
grant usage, select on sequence public.eyes_society_viewer_questions_id_seq to authenticated;
grant usage, select on sequence public.eyes_society_journalism_submissions_id_seq to authenticated;
grant usage, select on sequence public.eyes_society_media_assets_id_seq to authenticated;

insert into public.eyes_society_episodes (
  episode_title,
  category,
  episode_format,
  status,
  description,
  guest_name,
  scheduled_at,
  production_stage,
  sponsor_name
)
values
  ('Eyes on Society Tonight', 'Public Policy Discussions', 'Studio Commentary', 'Scheduled', 'A weekly issues program examining the ideas, decisions, and leadership questions shaping modern society.', 'Dr. Jean R. Moricette', now() + interval '7 days', 'Scheduled', 'AFF Community Partners'),
  ('Economic Reality', 'Economic Awareness', 'Documentary', 'Scheduled', 'A documentary-style program explaining inflation, employment, household finance, opportunity, and public economic choices.', 'Dr. Jean R. Moricette', now() + interval '14 days', 'Pre-Production', 'AFF Community Partners'),
  ('Community Awareness Report', 'Community Development', 'Community Report', 'Published', 'Field reports and studio analysis on community development, civic responsibility, literacy, and social transformation.', 'Community Leadership Panel', now() - interval '3 days', 'Published', null),
  ('Future Leaders Roundtable', 'Youth Development', 'Town Hall', 'Scheduled', 'A live town hall for youth voices, student leadership, civic responsibility, and future readiness.', 'Youth Leadership Panel', now() + interval '21 days', 'Scheduled', null),
  ('Civic Literacy Academy', 'Leadership & Governance', 'Expert Panel', 'Published', 'A civic education series on rights, responsibilities, governance, public trust, and informed participation.', 'Dr. Jean R. Moricette', now() - interval '10 days', 'Published', null),
  ('Youth Voices', 'Youth Development', 'Student Journalism', 'Scheduled', 'Student journalism, interviews, and youth perspectives on education, leadership, technology, and society.', 'Student Media Center', now() + interval '28 days', 'Research', null)
on conflict do nothing;

insert into public.eyes_society_guests (guest_name, guest_title, organization, topic, booking_status, appearance_date, notes)
values
  ('Dr. Jean R. Moricette', 'Host and Executive Producer', 'Academy for Financial Future', 'Education, literacy, leadership, and social responsibility', 'Confirmed', now() + interval '7 days', 'Primary host profile for Eyes on Society TV.'),
  ('Community Leadership Panel', 'Panel Guests', 'AFF Broadcast Network', 'Community development and public responsibility', 'Confirmed', now() - interval '3 days', 'Appearance history includes Community Awareness Report.'),
  ('Youth Leadership Panel', 'Student and Community Leaders', 'AFF Student Media Center', 'Youth leadership, education, and future readiness', 'Confirmed', now() + interval '21 days', 'Scheduled for Future Leaders Roundtable.'),
  ('Student Media Center', 'Student Journalism Desk', 'Academy for Financial Future', 'Student journalism and youth reporting', 'Invited', now() + interval '28 days', 'Prepared for Youth Voices submission review.')
on conflict do nothing;

insert into public.eyes_society_production_calendar (event_title, event_type, event_date, owner_name, status, notes)
values
  ('Eyes on Society Weekly Production Meeting', 'Production Meeting', now() + interval '3 days', 'Dr. Jean R. Moricette', 'Scheduled', 'Review topics, guests, sponsor mentions, camera plan, and broadcast timing.'),
  ('Eyes on Society Tonight Live Prep', 'Live Broadcast', now() + interval '7 days', 'Studio Operator', 'Scheduled', 'Prepare live stream routing, teleprompter, camera plan, and AFF TV Studio listing.'),
  ('Economic Reality Documentary Review', 'Editing Deadline', now() + interval '12 days', 'Production Editor', 'Scheduled', 'Review documentary outline, research notes, and asset library.'),
  ('Future Leaders Roundtable Guest Check', 'Guest Interview', now() + interval '20 days', 'Producer Desk', 'Scheduled', 'Confirm panel guests, viewer questions, and town hall run of show.')
on conflict do nothing;

insert into public.eyes_society_sponsors (sponsor_name, contact_name, sponsorship_level, campaign_name, start_date, end_date, status, benefits)
values
  ('AFF Community Partners', 'Partnership Desk', 'Community Partner', 'Eyes on Society Launch', current_date, current_date + 90, 'Active', 'Logo mention, opening acknowledgment, and show notes placement.')
on conflict do nothing;

insert into public.eyes_society_scripts (episode_title, segment_title, ai_prompt, script_text, script_status)
values
  ('Eyes on Society Tonight', 'Opening Segment', 'Create an opening monologue for a weekly public issues program.', 'Welcome to Eyes on Society Tonight. We examine the issues, ideas, challenges, and opportunities shaping modern society with clarity, responsibility, and hope.', 'Approved'),
  ('Economic Reality', 'Documentary Structure', 'Create a documentary structure for household economics and public awareness.', 'Economic Reality opens with household pressure, explains macroeconomic forces, introduces community voices, and closes with practical financial literacy action steps.', 'Draft'),
  ('Future Leaders Roundtable', 'Interview Questions', 'Generate youth leadership roundtable questions.', 'What does leadership mean to your generation? What challenges do young people face? How can education, discipline, and service prepare future leaders?', 'Draft')
on conflict do nothing;

insert into public.eyes_society_teleprompter_runs (episode_title, script_text, scroll_speed, font_size, operator_name, status)
values
  ('Eyes on Society Tonight', 'Welcome to Eyes on Society Tonight. We examine the issues, ideas, challenges, and opportunities shaping modern society with clarity, responsibility, and hope.', 5, 42, 'Studio Operator', 'Ready'),
  ('Civic Literacy Academy', 'Civic literacy begins when citizens understand rights, responsibilities, institutions, and the moral weight of participation.', 4, 44, 'Studio Operator', 'Ready')
on conflict do nothing;

insert into public.eyes_society_camera_workflows (episode_title, camera_label, shot_type, operator_name, input_source, status, notes)
values
  ('Eyes on Society Tonight', 'Camera 1', 'Host Close-Up', 'Studio Operator', 'HDMI 1', 'Ready', 'Primary host shot.'),
  ('Eyes on Society Tonight', 'Camera 2', 'Wide Studio', 'Studio Operator', 'HDMI 2', 'Ready', 'Wide studio and panel shot.'),
  ('Eyes on Society Tonight', 'Screen Capture', 'Presentation Screen', 'Studio Operator', 'OBS Scene 3', 'Ready', 'Graphics, references, and research notes.'),
  ('Future Leaders Roundtable', 'Remote Guest', 'Guest Close-Up', 'Studio Operator', 'Remote Feed 1', 'Standby', 'Remote panel participant feed.')
on conflict do nothing;

insert into public.eyes_society_viewer_questions (viewer_name, email, topic, question, review_status, response_notes)
values
  ('AFF Viewer', 'viewer@example.com', 'Economic Awareness', 'How can families understand inflation without becoming discouraged?', 'Submitted', 'Consider for Economic Reality.'),
  ('Community Member', 'community@example.com', 'Community Development', 'What makes a community development project sustainable?', 'In Review', 'Use in Community Awareness Report.'),
  ('Student Viewer', 'student@example.com', 'Youth Development', 'How can young leaders prepare for public responsibility?', 'Submitted', 'Use in Future Leaders Roundtable.')
on conflict do nothing;

insert into public.eyes_society_journalism_submissions (student_name, email, project_title, category, media_url, summary, review_status, instructor_feedback)
values
  ('AFF Student Reporter', 'student.reporter@example.com', 'Youth Voices: Education and Opportunity', 'Student Journalism', null, 'A student-produced segment on how education access shapes future leadership.', 'Submitted', null),
  ('AFF Media Student', 'media.student@example.com', 'Community Awareness Report Field Notes', 'Community Report', null, 'A local community report outline with interview questions and research references.', 'In Review', 'Add two community source references.')
on conflict do nothing;

insert into public.eyes_society_media_assets (asset_title, asset_type, episode_title, asset_url, description, uploaded_by, status)
values
  ('Eyes on Society Tonight Opening Video', 'Video', 'Eyes on Society Tonight', null, 'Opening video package for the flagship weekly program.', 'acafffx@gmail.com', 'Published'),
  ('Economic Reality Research Brief', 'Document', 'Economic Reality', null, 'Research document covering inflation, employment, wages, and household economics.', 'acafffx@gmail.com', 'Published'),
  ('Community Awareness Report Audio Promo', 'Audio', 'Community Awareness Report', null, 'Audio promo for community development reporting.', 'acafffx@gmail.com', 'Published'),
  ('Future Leaders Roundtable Cover Image', 'Image', 'Future Leaders Roundtable', null, 'Promotional artwork for the youth leadership town hall.', 'acafffx@gmail.com', 'Published'),
  ('Civic Literacy Academy Handout', 'Document', 'Civic Literacy Academy', null, 'Downloadable notes for civic literacy viewers.', 'acafffx@gmail.com', 'Published'),
  ('Youth Voices Submission Guide', 'Document', 'Youth Voices', null, 'Student journalism submission standards and editorial expectations.', 'acafffx@gmail.com', 'Published')
on conflict do nothing;

insert into public.broadcast_analytics (division_name, program_name, views, watch_time_minutes, subscribers, engagement_score)
values
  ('Eyes on Society TV', 'Eyes on Society Tonight', 1350, 4120, 330, 88.5),
  ('Eyes on Society TV', 'Economic Reality', 1120, 3380, 285, 86.0),
  ('Eyes on Society TV', 'Community Awareness Report', 980, 2620, 244, 84.5),
  ('Eyes on Society TV', 'Future Leaders Roundtable', 760, 1985, 205, 82.0),
  ('Eyes on Society TV', 'Civic Literacy Academy', 890, 2260, 221, 83.5),
  ('Eyes on Society TV', 'Youth Voices', 620, 1480, 166, 79.5)
on conflict do nothing;

notify pgrst, 'reload schema';
