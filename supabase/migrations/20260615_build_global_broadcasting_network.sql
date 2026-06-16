create table if not exists public.broadcast_network_divisions (
  id bigserial primary key,
  division_name text not null unique,
  description text,
  director_name text not null default 'Dr. Jean Rene Moricette',
  division_status text not null default 'Active',
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.broadcast_programs (
  id bigserial primary key,
  division_id bigint references public.broadcast_network_divisions(id) on delete cascade,
  division_name text not null,
  program_name text not null,
  program_type text not null default 'Broadcast Program',
  description text,
  host_name text not null default 'Dr. Jean Rene Moricette',
  program_status text not null default 'Active',
  created_at timestamptz not null default now(),
  unique (division_name, program_name)
);

create table if not exists public.broadcast_media_library (
  id bigserial primary key,
  media_title text not null,
  media_type text not null,
  division_name text,
  program_name text,
  media_url text,
  duration_minutes integer default 0,
  access_level text not null default 'Members',
  archive_status text not null default 'Published',
  created_at timestamptz not null default now(),
  constraint broadcast_media_type_check check (media_type in ('Video', 'Podcast', 'Interview', 'Course', 'Broadcast Archive')),
  constraint broadcast_media_access_check check (access_level in ('Public', 'Members', 'Premium', 'Admin'))
);

create table if not exists public.broadcast_student_submissions (
  id bigserial primary key,
  student_id uuid not null references auth.users(id) on delete cascade,
  student_name text,
  submission_type text not null,
  title text not null,
  description text,
  media_url text,
  review_status text not null default 'Submitted',
  instructor_feedback text,
  created_at timestamptz not null default now(),
  constraint broadcast_submission_type_check check (submission_type in ('Project Upload', 'Student Broadcast', 'Report Submission', 'Interview Submission')),
  constraint broadcast_submission_status_check check (review_status in ('Submitted', 'In Review', 'Approved', 'Returned', 'Published'))
);

create table if not exists public.broadcast_ai_media_assets (
  id bigserial primary key,
  media_id bigint references public.broadcast_media_library(id) on delete set null,
  student_id uuid references auth.users(id) on delete set null,
  asset_type text not null,
  title text not null,
  content text not null,
  created_by text not null default 'AFF AI Media Assistant',
  created_at timestamptz not null default now(),
  constraint broadcast_ai_asset_type_check check (asset_type in ('Episode Summary', 'Show Notes', 'Title Ideas', 'Social Media Clips'))
);

create table if not exists public.broadcast_analytics (
  id bigserial primary key,
  division_name text,
  program_name text,
  media_id bigint references public.broadcast_media_library(id) on delete set null,
  views integer not null default 0,
  watch_time_minutes integer not null default 0,
  subscribers integer not null default 0,
  engagement_score numeric(6,2) not null default 0,
  recorded_at date not null default current_date,
  created_at timestamptz not null default now()
);

alter table public.broadcast_network_divisions enable row level security;
alter table public.broadcast_programs enable row level security;
alter table public.broadcast_media_library enable row level security;
alter table public.broadcast_student_submissions enable row level security;
alter table public.broadcast_ai_media_assets enable row level security;
alter table public.broadcast_analytics enable row level security;

drop policy if exists "Authenticated users can read broadcast divisions" on public.broadcast_network_divisions;
drop policy if exists "AFF admin can manage broadcast divisions" on public.broadcast_network_divisions;
drop policy if exists "Authenticated users can read broadcast programs" on public.broadcast_programs;
drop policy if exists "AFF admin can manage broadcast programs" on public.broadcast_programs;
drop policy if exists "Authenticated users can read broadcast media library" on public.broadcast_media_library;
drop policy if exists "AFF admin can manage broadcast media library" on public.broadcast_media_library;
drop policy if exists "Students can read own broadcast submissions" on public.broadcast_student_submissions;
drop policy if exists "Students can create own broadcast submissions" on public.broadcast_student_submissions;
drop policy if exists "AFF admin can manage broadcast submissions" on public.broadcast_student_submissions;
drop policy if exists "Authenticated users can read broadcast AI assets" on public.broadcast_ai_media_assets;
drop policy if exists "Students can create own broadcast AI assets" on public.broadcast_ai_media_assets;
drop policy if exists "AFF admin can manage broadcast AI assets" on public.broadcast_ai_media_assets;
drop policy if exists "Authenticated users can read broadcast analytics" on public.broadcast_analytics;
drop policy if exists "AFF admin can manage broadcast analytics" on public.broadcast_analytics;

create policy "Authenticated users can read broadcast divisions" on public.broadcast_network_divisions for select to authenticated using (division_status = 'Active' or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF admin can manage broadcast divisions" on public.broadcast_network_divisions for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Authenticated users can read broadcast programs" on public.broadcast_programs for select to authenticated using (program_status = 'Active' or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF admin can manage broadcast programs" on public.broadcast_programs for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Authenticated users can read broadcast media library" on public.broadcast_media_library for select to authenticated using (archive_status in ('Published', 'Replay', 'Archived') or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF admin can manage broadcast media library" on public.broadcast_media_library for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Students can read own broadcast submissions" on public.broadcast_student_submissions for select to authenticated using (auth.uid() = student_id or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Students can create own broadcast submissions" on public.broadcast_student_submissions for insert to authenticated with check (auth.uid() = student_id);
create policy "AFF admin can manage broadcast submissions" on public.broadcast_student_submissions for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Authenticated users can read broadcast AI assets" on public.broadcast_ai_media_assets for select to authenticated using (student_id is null or auth.uid() = student_id or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Students can create own broadcast AI assets" on public.broadcast_ai_media_assets for insert to authenticated with check (student_id is null or auth.uid() = student_id);
create policy "AFF admin can manage broadcast AI assets" on public.broadcast_ai_media_assets for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Authenticated users can read broadcast analytics" on public.broadcast_analytics for select to authenticated using (true);
create policy "AFF admin can manage broadcast analytics" on public.broadcast_analytics for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

grant select, insert, update, delete on public.broadcast_network_divisions to authenticated;
grant select, insert, update, delete on public.broadcast_programs to authenticated;
grant select, insert, update, delete on public.broadcast_media_library to authenticated;
grant select, insert, update, delete on public.broadcast_student_submissions to authenticated;
grant select, insert, update, delete on public.broadcast_ai_media_assets to authenticated;
grant select, insert, update, delete on public.broadcast_analytics to authenticated;
grant usage, select on sequence public.broadcast_network_divisions_id_seq to authenticated;
grant usage, select on sequence public.broadcast_programs_id_seq to authenticated;
grant usage, select on sequence public.broadcast_media_library_id_seq to authenticated;
grant usage, select on sequence public.broadcast_student_submissions_id_seq to authenticated;
grant usage, select on sequence public.broadcast_ai_media_assets_id_seq to authenticated;
grant usage, select on sequence public.broadcast_analytics_id_seq to authenticated;

insert into public.broadcast_network_divisions (division_name, description, display_order)
values
  ('AFF TV Studio', 'Live streaming, program scheduling, on-demand episodes, host management, and guest management.', 1),
  ('Community Awareness TV', 'Community Awareness, Public Affairs, Leadership Series, and Civic Dialogue programming.', 2),
  ('Destiny Alignment TV', 'Destiny Alignment, Faith & Purpose, and Leadership Development programming.', 3),
  ('Financial Future Network', 'Market Outlook, Forex Masterclass, Economic Intelligence, and Trading Psychology programming.', 4),
  ('Student Media Center', 'Student projects, broadcasts, reports, interviews, and media publication workflows.', 5),
  ('Eyes on Society TV', 'Exploring the issues, ideas, challenges, and opportunities shaping modern society.', 6)
on conflict (division_name) do update set description = excluded.description, display_order = excluded.display_order;

insert into public.broadcast_programs (division_id, division_name, program_name, program_type, description)
select division.id, seed.division_name, seed.program_name, seed.program_type, seed.description
from public.broadcast_network_divisions division
join (
  values
    ('AFF TV Studio', 'Live Stream Desk', 'Live Streaming', 'Academy live broadcasts and instructor-led programming.'),
    ('AFF TV Studio', 'On-Demand Episode Library', 'On-Demand Episodes', 'Published masterclasses, replays, and academy video-on-demand content.'),
    ('Community Awareness TV', 'Community Awareness', 'Community Program', 'Community education, awareness, and public service programming.'),
    ('Community Awareness TV', 'Public Affairs', 'Public Affairs', 'Public affairs conversations and community leadership topics.'),
    ('Community Awareness TV', 'Leadership Series', 'Leadership Series', 'Leadership lessons for civic and professional growth.'),
    ('Community Awareness TV', 'Civic Dialogue', 'Civic Dialogue', 'Constructive civic dialogue and public responsibility.'),
    ('Destiny Alignment TV', 'Destiny Alignment', 'Purpose Program', 'Purpose, destiny, alignment, and leadership formation.'),
    ('Destiny Alignment TV', 'Faith & Purpose', 'Purpose Program', 'Faith and purpose conversations for personal development.'),
    ('Destiny Alignment TV', 'Leadership Development', 'Leadership Series', 'Leadership growth and character development.'),
    ('Financial Future Network', 'Market Outlook', 'Financial Markets', 'Weekly market structure and macro outlook.'),
    ('Financial Future Network', 'Forex Masterclass', 'Financial Markets', 'Advanced forex education and masterclass programming.'),
    ('Financial Future Network', 'Economic Intelligence', 'Economic Intelligence', 'Central bank, inflation, employment, and macroeconomic analysis.'),
    ('Financial Future Network', 'Trading Psychology', 'Trading Psychology', 'Mindset, discipline, journaling, and professional behavior.'),
    ('Student Media Center', 'Student Broadcast Desk', 'Student Media', 'Student-created broadcasts and interviews.'),
    ('Student Media Center', 'Student Report Desk', 'Student Media', 'Student media reports and academy projects.'),
    ('Eyes on Society TV', 'Education & Literacy', 'Social Issues', 'Exploring education access, literacy, learning equity, and public knowledge.'),
    ('Eyes on Society TV', 'Economic Awareness', 'Social Issues', 'Economic education, household finance, employment, opportunity, and social mobility.'),
    ('Eyes on Society TV', 'Leadership & Governance', 'Public Affairs', 'Leadership decisions, governance questions, public trust, and institutional accountability.'),
    ('Eyes on Society TV', 'Community Development', 'Community Reports', 'Community growth, neighborhood needs, service projects, and local transformation.'),
    ('Eyes on Society TV', 'Technology & Society', 'Technology and Culture', 'How technology, AI, platforms, and innovation affect modern society.'),
    ('Eyes on Society TV', 'Media & Culture', 'Media and Culture', 'Culture, media narratives, communication, and public understanding.'),
    ('Eyes on Society TV', 'Youth Development', 'Youth Development', 'Youth leadership, mentorship, discipline, education, and future readiness.'),
    ('Eyes on Society TV', 'Financial Literacy', 'Financial Literacy', 'Financial literacy as a civic and social responsibility.'),
    ('Eyes on Society TV', 'Public Policy Discussions', 'Public Policy', 'Public policy dialogue, issue framing, evidence, and institutional choices.'),
    ('Eyes on Society TV', 'Social Responsibility', 'Social Responsibility', 'Moral responsibility, service, community stewardship, and social impact.')
) as seed(division_name, program_name, program_type, description) on seed.division_name = division.division_name
on conflict (division_name, program_name) do update set
  program_type = excluded.program_type,
  description = excluded.description;

insert into public.broadcast_media_library (media_title, media_type, division_name, program_name, duration_minutes, access_level)
values
  ('Institutional Market Outlook Archive', 'Broadcast Archive', 'Financial Future Network', 'Market Outlook', 60, 'Members'),
  ('Forex Masterclass Episode Library', 'Course', 'Financial Future Network', 'Forex Masterclass', 90, 'Members'),
  ('Community Awareness Leadership Forum', 'Video', 'Community Awareness TV', 'Leadership Series', 45, 'Public'),
  ('Destiny Alignment Leadership Development Replay', 'Video', 'Destiny Alignment TV', 'Leadership Development', 50, 'Members'),
  ('Student Interview Archive', 'Interview', 'Student Media Center', 'Student Broadcast Desk', 30, 'Members'),
  ('AFF Podcast Collection', 'Podcast', 'AFF TV Studio', 'On-Demand Episode Library', 35, 'Public'),
  ('Eyes on Society Episode Archive', 'Broadcast Archive', 'Eyes on Society TV', 'Education & Literacy', 45, 'Public'),
  ('Eyes on Society Video Library', 'Video', 'Eyes on Society TV', 'Community Development', 50, 'Public'),
  ('Eyes on Society Podcast Versions', 'Podcast', 'Eyes on Society TV', 'Public Policy Discussions', 35, 'Public'),
  ('Eyes on Society Featured Interviews', 'Interview', 'Eyes on Society TV', 'Leadership & Governance', 40, 'Members'),
  ('Eyes on Society Documentary Series', 'Video', 'Eyes on Society TV', 'Technology & Society', 60, 'Members'),
  ('Eyes on Society Downloadable Show Notes', 'Broadcast Archive', 'Eyes on Society TV', 'Media & Culture', 15, 'Public')
on conflict do nothing;

insert into public.broadcast_ai_media_assets (asset_type, title, content)
values
  ('Episode Summary', 'Market Outlook Summary Template', 'Summarize major pairs, economic catalysts, liquidity zones, and risk themes in professional AFF language.'),
  ('Show Notes', 'Forex Masterclass Show Notes Template', 'Include lesson objective, key concepts, student action steps, and certification connection.'),
  ('Title Ideas', 'Leadership Series Title Ideas', 'Generate refined titles for civic leadership, financial literacy, and professional development episodes.'),
  ('Social Media Clips', 'Broadcast Clip Prompt Set', 'Create short clips for market insight, student motivation, civic awareness, and academy announcements.'),
  ('Episode Summary', 'Eyes on Society Episode Summary Template', 'Summarize the issue, social context, key voices, public implications, and responsible action steps.'),
  ('Show Notes', 'Eyes on Society Research Brief Template', 'Prepare show notes with research references, public policy context, community implications, and discussion questions.'),
  ('Title Ideas', 'Eyes on Society Topic Recommendations', 'Generate issue-focused episode topics across education, economy, governance, culture, youth, and responsibility.'),
  ('Social Media Clips', 'Eyes on Society Clip Plan', 'Create short clips for issue awareness, viewer questions, expert panel highlights, and community report moments.')
on conflict do nothing;

insert into public.broadcast_analytics (division_name, program_name, views, watch_time_minutes, subscribers, engagement_score)
values
  ('Financial Future Network', 'Market Outlook', 1240, 3820, 312, 87.5),
  ('Community Awareness TV', 'Leadership Series', 860, 2140, 205, 82.0),
  ('Destiny Alignment TV', 'Leadership Development', 640, 1880, 178, 79.5),
  ('Student Media Center', 'Student Broadcast Desk', 420, 960, 96, 74.0),
  ('Eyes on Society TV', 'Education & Literacy', 980, 2680, 244, 84.5),
  ('Eyes on Society TV', 'Public Policy Discussions', 720, 1985, 188, 81.0),
  ('Eyes on Society TV', 'Community Development', 690, 1740, 172, 80.5)
on conflict do nothing;

notify pgrst, 'reload schema';
