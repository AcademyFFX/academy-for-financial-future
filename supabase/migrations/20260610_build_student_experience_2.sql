create table if not exists public.student_missions (
  id bigserial primary key,
  student_id uuid not null references auth.users(id) on delete cascade,
  mission_title text not null,
  mission_category text not null default 'Learning Path',
  mission_status text not null default 'Assigned',
  points integer not null default 0,
  due_date date not null default current_date,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_missions_status_check check (mission_status in ('Assigned', 'In Progress', 'Completed', 'Skipped'))
);

create table if not exists public.student_streaks (
  id bigserial primary key,
  student_id uuid not null references auth.users(id) on delete cascade unique,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_activity_date date,
  streak_status text not null default 'Active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_streaks_status_check check (streak_status in ('Active', 'Paused', 'Reset'))
);

create table if not exists public.student_badges (
  id bigserial primary key,
  student_id uuid not null references auth.users(id) on delete cascade,
  badge_title text not null,
  badge_category text not null default 'Achievement',
  badge_level text not null default 'Bronze',
  points integer not null default 0,
  awarded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.student_journal (
  id bigserial primary key,
  student_id uuid not null references auth.users(id) on delete cascade,
  student_name text,
  journal_title text not null default 'Student Reflection',
  journal_entry text not null,
  mood text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_recommendations (
  id bigserial primary key,
  student_id uuid references auth.users(id) on delete cascade,
  recommendation_title text not null,
  recommendation_type text not null default 'Learning Path',
  recommendation_body text not null,
  target_href text not null default '/student-dashboard',
  priority text not null default 'Medium',
  recommendation_status text not null default 'Active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_recommendations_priority_check check (priority in ('Low', 'Medium', 'High', 'Executive')),
  constraint student_recommendations_status_check check (recommendation_status in ('Active', 'Completed', 'Archived'))
);

create table if not exists public.student_mentors (
  id bigserial primary key,
  student_id uuid references auth.users(id) on delete cascade,
  mentor_name text not null,
  mentor_role text not null default 'Academy Advisor',
  mentor_email text,
  mentor_status text not null default 'Assigned',
  assigned_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_mentors_status_check check (mentor_status in ('Assigned', 'Active', 'Completed', 'Paused'))
);

create table if not exists public.student_goals (
  id bigserial primary key,
  student_id uuid not null references auth.users(id) on delete cascade,
  goal_title text not null,
  goal_category text not null default 'Learning Path',
  target_date date,
  goal_status text not null default 'Active',
  progress_percentage numeric(5,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_goals_status_check check (goal_status in ('Active', 'Completed', 'Paused', 'Archived')),
  constraint student_goals_progress_check check (progress_percentage >= 0 and progress_percentage <= 100)
);

create index if not exists student_missions_student_idx on public.student_missions (student_id, created_at desc);
create index if not exists student_badges_student_idx on public.student_badges (student_id, awarded_at desc);
create index if not exists student_journal_student_idx on public.student_journal (student_id, created_at desc);
create index if not exists student_recommendations_student_idx on public.student_recommendations (student_id, created_at desc);
create index if not exists student_mentors_student_idx on public.student_mentors (student_id, assigned_at desc);
create index if not exists student_goals_student_idx on public.student_goals (student_id, created_at desc);

alter table public.student_missions enable row level security;
alter table public.student_streaks enable row level security;
alter table public.student_badges enable row level security;
alter table public.student_journal enable row level security;
alter table public.student_recommendations enable row level security;
alter table public.student_mentors enable row level security;
alter table public.student_goals enable row level security;

drop policy if exists "Students can read own missions" on public.student_missions;
drop policy if exists "Students can create own missions" on public.student_missions;
drop policy if exists "Students can update own missions" on public.student_missions;
drop policy if exists "AFF admin can manage missions" on public.student_missions;
create policy "Students can read own missions"
on public.student_missions for select
to authenticated
using (auth.uid() = student_id or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Students can create own missions"
on public.student_missions for insert
to authenticated
with check (auth.uid() = student_id);
create policy "Students can update own missions"
on public.student_missions for update
to authenticated
using (auth.uid() = student_id)
with check (auth.uid() = student_id);
create policy "AFF admin can manage missions"
on public.student_missions for all
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Students can read own streaks" on public.student_streaks;
drop policy if exists "Students can create own streaks" on public.student_streaks;
drop policy if exists "Students can update own streaks" on public.student_streaks;
drop policy if exists "AFF admin can manage streaks" on public.student_streaks;
create policy "Students can read own streaks"
on public.student_streaks for select
to authenticated
using (auth.uid() = student_id or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Students can create own streaks"
on public.student_streaks for insert
to authenticated
with check (auth.uid() = student_id);
create policy "Students can update own streaks"
on public.student_streaks for update
to authenticated
using (auth.uid() = student_id)
with check (auth.uid() = student_id);
create policy "AFF admin can manage streaks"
on public.student_streaks for all
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Students can read own badges" on public.student_badges;
drop policy if exists "AFF admin can manage badges" on public.student_badges;
create policy "Students can read own badges"
on public.student_badges for select
to authenticated
using (auth.uid() = student_id or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF admin can manage badges"
on public.student_badges for all
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Students can read own journal" on public.student_journal;
drop policy if exists "Students can create own journal" on public.student_journal;
drop policy if exists "Students can update own journal" on public.student_journal;
drop policy if exists "AFF admin can manage journal" on public.student_journal;
create policy "Students can read own journal"
on public.student_journal for select
to authenticated
using (auth.uid() = student_id or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Students can create own journal"
on public.student_journal for insert
to authenticated
with check (auth.uid() = student_id);
create policy "Students can update own journal"
on public.student_journal for update
to authenticated
using (auth.uid() = student_id)
with check (auth.uid() = student_id);
create policy "AFF admin can manage journal"
on public.student_journal for all
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Students can read own recommendations" on public.student_recommendations;
drop policy if exists "Students can create own recommendations" on public.student_recommendations;
drop policy if exists "Students can update own recommendations" on public.student_recommendations;
drop policy if exists "AFF admin can manage recommendations" on public.student_recommendations;
create policy "Students can read own recommendations"
on public.student_recommendations for select
to authenticated
using (student_id is null or auth.uid() = student_id or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Students can create own recommendations"
on public.student_recommendations for insert
to authenticated
with check (auth.uid() = student_id);
create policy "Students can update own recommendations"
on public.student_recommendations for update
to authenticated
using (auth.uid() = student_id)
with check (auth.uid() = student_id);
create policy "AFF admin can manage recommendations"
on public.student_recommendations for all
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Students can read own mentors" on public.student_mentors;
drop policy if exists "Students can create own mentor assignment" on public.student_mentors;
drop policy if exists "AFF admin can manage mentors" on public.student_mentors;
create policy "Students can read own mentors"
on public.student_mentors for select
to authenticated
using (student_id is null or auth.uid() = student_id or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Students can create own mentor assignment"
on public.student_mentors for insert
to authenticated
with check (auth.uid() = student_id);
create policy "AFF admin can manage mentors"
on public.student_mentors for all
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Students can read own goals" on public.student_goals;
drop policy if exists "Students can create own goals" on public.student_goals;
drop policy if exists "Students can update own goals" on public.student_goals;
drop policy if exists "AFF admin can manage goals" on public.student_goals;
create policy "Students can read own goals"
on public.student_goals for select
to authenticated
using (auth.uid() = student_id or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Students can create own goals"
on public.student_goals for insert
to authenticated
with check (auth.uid() = student_id);
create policy "Students can update own goals"
on public.student_goals for update
to authenticated
using (auth.uid() = student_id)
with check (auth.uid() = student_id);
create policy "AFF admin can manage goals"
on public.student_goals for all
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

grant select, insert, update, delete on public.student_missions to authenticated;
grant select, insert, update, delete on public.student_streaks to authenticated;
grant select, insert, update, delete on public.student_badges to authenticated;
grant select, insert, update, delete on public.student_journal to authenticated;
grant select, insert, update, delete on public.student_recommendations to authenticated;
grant select, insert, update, delete on public.student_mentors to authenticated;
grant select, insert, update, delete on public.student_goals to authenticated;

grant usage on sequence public.student_missions_id_seq to authenticated;
grant usage on sequence public.student_streaks_id_seq to authenticated;
grant usage on sequence public.student_badges_id_seq to authenticated;
grant usage on sequence public.student_journal_id_seq to authenticated;
grant usage on sequence public.student_recommendations_id_seq to authenticated;
grant usage on sequence public.student_mentors_id_seq to authenticated;
grant usage on sequence public.student_goals_id_seq to authenticated;

notify pgrst, 'reload schema';
