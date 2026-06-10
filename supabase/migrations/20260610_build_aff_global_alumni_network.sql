create table if not exists public.aff_alumni (
  id bigserial primary key,
  student_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  email text,
  country text,
  region text,
  graduation_year integer,
  certifications_earned text,
  degree_records text,
  career_achievements text,
  trading_achievements text,
  research_publications text,
  civic_leadership_achievements text,
  industry text,
  employment_status text not null default 'Seeking Opportunities',
  estimated_annual_earnings numeric(12,2) not null default 0,
  profile_status text not null default 'Active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint aff_alumni_status_check check (profile_status in ('Active', 'Private', 'Archived')),
  constraint aff_alumni_employment_check check (employment_status in ('Seeking Opportunities', 'Employed', 'Founder', 'Investor', 'Researcher', 'Mentor', 'Not Reported'))
);

create table if not exists public.alumni_chapters (
  id bigserial primary key,
  chapter_name text not null,
  region text not null,
  country text,
  city text,
  chapter_leader text,
  chapter_email text,
  member_count integer not null default 0,
  chapter_status text not null default 'Active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint alumni_chapters_status_check check (chapter_status in ('Active', 'Forming', 'Paused', 'Archived'))
);

create table if not exists public.alumni_groups (
  id bigserial primary key,
  group_name text not null,
  group_type text not null,
  focus_area text,
  member_count integer not null default 0,
  group_status text not null default 'Active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint alumni_groups_type_check check (group_type in ('Industry Group', 'Trading Group', 'Research Group', 'Civic Leadership Group', 'Country Group', 'Regional Chapter')),
  constraint alumni_groups_status_check check (group_status in ('Active', 'Private', 'Paused', 'Archived'))
);

create table if not exists public.alumni_mentors (
  id bigserial primary key,
  student_id uuid references auth.users(id) on delete set null,
  mentor_name text not null,
  mentor_email text,
  mentor_type text not null default 'Career Coaching',
  expertise text,
  availability text not null default 'Monthly',
  mentee_capacity integer not null default 5,
  mentor_status text not null default 'Active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint alumni_mentors_type_check check (mentor_type in ('Career Coaching', 'Trading Coaching', 'Leadership Coaching', 'Research Mentorship', 'Student Mentoring')),
  constraint alumni_mentors_status_check check (mentor_status in ('Active', 'Full', 'Paused', 'Archived'))
);

create table if not exists public.alumni_employers (
  id bigserial primary key,
  employer_name text not null,
  industry text not null default 'Financial Services',
  contact_name text,
  contact_email text,
  website_url text,
  hiring_requests integer not null default 0,
  matching_status text not null default 'Open',
  verification_status text not null default 'Verified',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint alumni_employers_matching_check check (matching_status in ('Open', 'Reviewing', 'Matched', 'Paused', 'Closed')),
  constraint alumni_employers_verification_check check (verification_status in ('Verified', 'Pending', 'Rejected'))
);

create table if not exists public.alumni_events (
  id bigserial primary key,
  event_title text not null,
  event_type text not null default 'Global Networking Event',
  event_date timestamptz not null,
  location text,
  registration_status text not null default 'Open',
  attendee_count integer not null default 0,
  webinar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint alumni_events_type_check check (event_type in ('Reunion', 'Alumni Conference', 'Global Networking Event', 'Webinar', 'Employer Roundtable')),
  constraint alumni_events_status_check check (registration_status in ('Open', 'Invite Only', 'Closed', 'Cancelled'))
);

create table if not exists public.alumni_donations (
  id bigserial primary key,
  student_id uuid references auth.users(id) on delete set null,
  donor_name text not null,
  donor_email text,
  donation_type text not null default 'Scholarship Donation',
  campaign_name text,
  donation_amount numeric(12,2) not null default 0,
  donation_status text not null default 'Pledged',
  created_at timestamptz not null default now(),
  constraint alumni_donations_type_check check (donation_type in ('Scholarship Donation', 'Research Sponsorship', 'Campus Development Support', 'Endowment Contribution')),
  constraint alumni_donations_status_check check (donation_status in ('Pledged', 'Received', 'Processed', 'Refunded'))
);

create table if not exists public.alumni_awards (
  id bigserial primary key,
  alumni_id bigint references public.aff_alumni(id) on delete set null,
  recipient_name text not null,
  award_title text not null,
  award_category text not null,
  award_level text not null default 'Global',
  citation text,
  awarded_at date not null default current_date,
  created_at timestamptz not null default now(),
  constraint alumni_awards_category_check check (award_category in ('Distinguished Alumni Award', 'Hall of Fame', 'Top Researcher', 'Top Trader', 'Top Civic Leader'))
);

create table if not exists public.alumni_success_stories (
  id bigserial primary key,
  alumni_id bigint references public.aff_alumni(id) on delete set null,
  alumni_name text not null,
  story_title text not null,
  story_category text not null default 'Career Achievement',
  story_body text,
  publication_status text not null default 'Published',
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint alumni_success_stories_category_check check (story_category in ('Career Achievement', 'Trading Achievement', 'Research Publication', 'Civic Leadership', 'Entrepreneurship', 'Mentorship')),
  constraint alumni_success_stories_status_check check (publication_status in ('Draft', 'Published', 'Archived'))
);

create index if not exists aff_alumni_student_idx on public.aff_alumni (student_id);
create index if not exists aff_alumni_search_idx on public.aff_alumni (graduation_year, country, industry);
create index if not exists alumni_chapters_region_idx on public.alumni_chapters (region, country);
create index if not exists alumni_groups_type_idx on public.alumni_groups (group_type, group_status);
create index if not exists alumni_mentors_student_idx on public.alumni_mentors (student_id, created_at desc);
create index if not exists alumni_employers_industry_idx on public.alumni_employers (industry, matching_status);
create index if not exists alumni_events_date_idx on public.alumni_events (event_date, registration_status);
create index if not exists alumni_donations_student_idx on public.alumni_donations (student_id, created_at desc);
create index if not exists alumni_awards_category_idx on public.alumni_awards (award_category, awarded_at desc);
create index if not exists alumni_success_stories_status_idx on public.alumni_success_stories (publication_status, published_at desc);

alter table public.aff_alumni enable row level security;
alter table public.alumni_chapters enable row level security;
alter table public.alumni_groups enable row level security;
alter table public.alumni_mentors enable row level security;
alter table public.alumni_employers enable row level security;
alter table public.alumni_events enable row level security;
alter table public.alumni_donations enable row level security;
alter table public.alumni_awards enable row level security;
alter table public.alumni_success_stories enable row level security;

drop policy if exists "Authenticated users can read active alumni" on public.aff_alumni;
drop policy if exists "Students can create own alumni profile" on public.aff_alumni;
drop policy if exists "Students can update own alumni profile" on public.aff_alumni;
drop policy if exists "AFF admin can manage alumni profiles" on public.aff_alumni;
create policy "Authenticated users can read active alumni"
on public.aff_alumni for select
to authenticated
using (profile_status = 'Active' or auth.uid() = student_id or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Students can create own alumni profile"
on public.aff_alumni for insert
to authenticated
with check (student_id is null or auth.uid() = student_id);
create policy "Students can update own alumni profile"
on public.aff_alumni for update
to authenticated
using (auth.uid() = student_id)
with check (auth.uid() = student_id);
create policy "AFF admin can manage alumni profiles"
on public.aff_alumni for all
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read alumni chapters" on public.alumni_chapters;
drop policy if exists "AFF admin can manage alumni chapters" on public.alumni_chapters;
create policy "Authenticated users can read alumni chapters"
on public.alumni_chapters for select
to authenticated
using (chapter_status <> 'Archived' or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF admin can manage alumni chapters"
on public.alumni_chapters for all
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read alumni groups" on public.alumni_groups;
drop policy if exists "AFF admin can manage alumni groups" on public.alumni_groups;
create policy "Authenticated users can read alumni groups"
on public.alumni_groups for select
to authenticated
using (group_status <> 'Archived' or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF admin can manage alumni groups"
on public.alumni_groups for all
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read active alumni mentors" on public.alumni_mentors;
drop policy if exists "Students can create own alumni mentor profile" on public.alumni_mentors;
drop policy if exists "Students can update own alumni mentor profile" on public.alumni_mentors;
drop policy if exists "AFF admin can manage alumni mentors" on public.alumni_mentors;
create policy "Authenticated users can read active alumni mentors"
on public.alumni_mentors for select
to authenticated
using (mentor_status in ('Active', 'Full') or auth.uid() = student_id or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Students can create own alumni mentor profile"
on public.alumni_mentors for insert
to authenticated
with check (student_id is null or auth.uid() = student_id);
create policy "Students can update own alumni mentor profile"
on public.alumni_mentors for update
to authenticated
using (auth.uid() = student_id)
with check (auth.uid() = student_id);
create policy "AFF admin can manage alumni mentors"
on public.alumni_mentors for all
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read alumni employers" on public.alumni_employers;
drop policy if exists "AFF admin can manage alumni employers" on public.alumni_employers;
create policy "Authenticated users can read alumni employers"
on public.alumni_employers for select
to authenticated
using (verification_status = 'Verified' or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF admin can manage alumni employers"
on public.alumni_employers for all
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read alumni events" on public.alumni_events;
drop policy if exists "AFF admin can manage alumni events" on public.alumni_events;
create policy "Authenticated users can read alumni events"
on public.alumni_events for select
to authenticated
using (registration_status <> 'Cancelled' or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF admin can manage alumni events"
on public.alumni_events for all
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Students can read own alumni donations" on public.alumni_donations;
drop policy if exists "Students can create alumni donations" on public.alumni_donations;
drop policy if exists "AFF admin can manage alumni donations" on public.alumni_donations;
create policy "Students can read own alumni donations"
on public.alumni_donations for select
to authenticated
using (auth.uid() = student_id or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Students can create alumni donations"
on public.alumni_donations for insert
to authenticated
with check (student_id is null or auth.uid() = student_id);
create policy "AFF admin can manage alumni donations"
on public.alumni_donations for all
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read alumni awards" on public.alumni_awards;
drop policy if exists "AFF admin can manage alumni awards" on public.alumni_awards;
create policy "Authenticated users can read alumni awards"
on public.alumni_awards for select
to authenticated
using (true);
create policy "AFF admin can manage alumni awards"
on public.alumni_awards for all
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read alumni success stories" on public.alumni_success_stories;
drop policy if exists "AFF admin can manage alumni success stories" on public.alumni_success_stories;
create policy "Authenticated users can read alumni success stories"
on public.alumni_success_stories for select
to authenticated
using (publication_status = 'Published' or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF admin can manage alumni success stories"
on public.alumni_success_stories for all
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

insert into public.alumni_chapters (chapter_name, region, country, city, chapter_leader, chapter_email, member_count, chapter_status)
select 'AFF Global Alumni Founders Chapter', 'Global', 'International', 'Virtual', 'AFF Alumni Council', 'acafffx@gmail.com', 0, 'Active'
where not exists (select 1 from public.alumni_chapters where chapter_name = 'AFF Global Alumni Founders Chapter');

insert into public.alumni_groups (group_name, group_type, focus_area, member_count, group_status)
select group_name, group_type, focus_area, 0, 'Active'
from (
  values
    ('AFF Alumni Trading Group', 'Trading Group', 'Institutional forex strategy and trading discipline'),
    ('AFF Alumni Research Group', 'Research Group', 'Economic intelligence and currency research'),
    ('AFF Alumni Civic Leadership Group', 'Civic Leadership Group', 'Civic leadership, service, and moral responsibility')
) as seed(group_name, group_type, focus_area)
where not exists (select 1 from public.alumni_groups where alumni_groups.group_name = seed.group_name);

grant select, insert, update, delete on public.aff_alumni to authenticated;
grant select, insert, update, delete on public.alumni_chapters to authenticated;
grant select, insert, update, delete on public.alumni_groups to authenticated;
grant select, insert, update, delete on public.alumni_mentors to authenticated;
grant select, insert, update, delete on public.alumni_employers to authenticated;
grant select, insert, update, delete on public.alumni_events to authenticated;
grant select, insert, update, delete on public.alumni_donations to authenticated;
grant select, insert, update, delete on public.alumni_awards to authenticated;
grant select, insert, update, delete on public.alumni_success_stories to authenticated;

grant usage on sequence public.aff_alumni_id_seq to authenticated;
grant usage on sequence public.alumni_chapters_id_seq to authenticated;
grant usage on sequence public.alumni_groups_id_seq to authenticated;
grant usage on sequence public.alumni_mentors_id_seq to authenticated;
grant usage on sequence public.alumni_employers_id_seq to authenticated;
grant usage on sequence public.alumni_events_id_seq to authenticated;
grant usage on sequence public.alumni_donations_id_seq to authenticated;
grant usage on sequence public.alumni_awards_id_seq to authenticated;
grant usage on sequence public.alumni_success_stories_id_seq to authenticated;

notify pgrst, 'reload schema';
