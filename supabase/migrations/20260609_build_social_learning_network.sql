create table if not exists public.social_posts (
  id bigserial primary key,
  student_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  author_email text not null,
  category text not null default 'Forex Anatomy',
  title text not null,
  body text not null,
  chart_url text,
  lesson_title text,
  achievement_level text not null default 'AFF Community Member',
  status text not null default 'Approved',
  moderator_notes text,
  moderated_by text,
  moderated_at timestamptz,
  created_at timestamptz not null default now(),
  constraint social_posts_status_check check (status in ('Approved', 'Featured', 'Reported', 'Hidden', 'Removed')),
  constraint social_posts_category_check check (category in (
    'Forex Anatomy',
    'Market Structure',
    'Liquidity Sweeps',
    'Institutional Orders',
    'Order Flow',
    'Trading Journal',
    'Lesson Discussion',
    'Risk Management'
  ))
);

create table if not exists public.social_post_replies (
  id bigserial primary key,
  post_id bigint not null references public.social_posts(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  body text not null,
  status text not null default 'Approved',
  created_at timestamptz not null default now(),
  constraint social_post_replies_status_check check (status in ('Approved', 'Reported', 'Hidden', 'Removed'))
);

create table if not exists public.social_post_likes (
  id bigserial primary key,
  post_id bigint not null references public.social_posts(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, student_id)
);

create table if not exists public.study_groups (
  id bigserial primary key,
  created_by uuid not null references auth.users(id) on delete cascade,
  creator_name text not null,
  name text not null,
  focus_area text not null,
  meeting_time text,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.instructor_follows (
  id bigserial primary key,
  student_id uuid not null references auth.users(id) on delete cascade,
  instructor_name text not null,
  instructor_email text not null,
  created_at timestamptz not null default now(),
  unique (student_id, instructor_email)
);

create index if not exists social_posts_status_created_idx
on public.social_posts (status, created_at desc);

create index if not exists social_replies_post_idx
on public.social_post_replies (post_id, created_at);

create index if not exists social_likes_post_idx
on public.social_post_likes (post_id);

alter table public.social_posts enable row level security;
alter table public.social_post_replies enable row level security;
alter table public.social_post_likes enable row level security;
alter table public.study_groups enable row level security;
alter table public.instructor_follows enable row level security;

drop policy if exists "Students can read approved social posts" on public.social_posts;
drop policy if exists "Students can create own social posts" on public.social_posts;
drop policy if exists "Students can report visible social posts" on public.social_posts;
drop policy if exists "AFF administrator can manage social posts" on public.social_posts;
drop policy if exists "Students can read approved social replies" on public.social_post_replies;
drop policy if exists "Students can create own social replies" on public.social_post_replies;
drop policy if exists "AFF administrator can manage social replies" on public.social_post_replies;
drop policy if exists "Students can read social likes" on public.social_post_likes;
drop policy if exists "Students can create own social likes" on public.social_post_likes;
drop policy if exists "Students can delete own social likes" on public.social_post_likes;
drop policy if exists "Students can read active study groups" on public.study_groups;
drop policy if exists "Students can create study groups" on public.study_groups;
drop policy if exists "AFF administrator can manage study groups" on public.study_groups;
drop policy if exists "Students can read own instructor follows" on public.instructor_follows;
drop policy if exists "Students can create own instructor follows" on public.instructor_follows;
drop policy if exists "Students can delete own instructor follows" on public.instructor_follows;
drop policy if exists "AFF administrator can manage instructor follows" on public.instructor_follows;

create policy "Students can read approved social posts"
on public.social_posts
for select
to authenticated
using (status in ('Approved', 'Featured') or student_id = auth.uid() or (auth.jwt() ->> 'email') = 'acafffx@gmail.com');

create policy "Students can create own social posts"
on public.social_posts
for insert
to authenticated
with check (student_id = auth.uid());

create policy "Students can report visible social posts"
on public.social_posts
for update
to authenticated
using (status in ('Approved', 'Featured'))
with check (status = 'Reported');

create policy "AFF administrator can manage social posts"
on public.social_posts
for all
to authenticated
using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com')
with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

create policy "Students can read approved social replies"
on public.social_post_replies
for select
to authenticated
using (status = 'Approved' or student_id = auth.uid() or (auth.jwt() ->> 'email') = 'acafffx@gmail.com');

create policy "Students can create own social replies"
on public.social_post_replies
for insert
to authenticated
with check (student_id = auth.uid());

create policy "AFF administrator can manage social replies"
on public.social_post_replies
for all
to authenticated
using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com')
with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

create policy "Students can read social likes"
on public.social_post_likes
for select
to authenticated
using (true);

create policy "Students can create own social likes"
on public.social_post_likes
for insert
to authenticated
with check (student_id = auth.uid());

create policy "Students can delete own social likes"
on public.social_post_likes
for delete
to authenticated
using (student_id = auth.uid());

create policy "Students can read active study groups"
on public.study_groups
for select
to authenticated
using (active = true or created_by = auth.uid() or (auth.jwt() ->> 'email') = 'acafffx@gmail.com');

create policy "Students can create study groups"
on public.study_groups
for insert
to authenticated
with check (created_by = auth.uid());

create policy "AFF administrator can manage study groups"
on public.study_groups
for all
to authenticated
using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com')
with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

create policy "Students can read own instructor follows"
on public.instructor_follows
for select
to authenticated
using (student_id = auth.uid() or (auth.jwt() ->> 'email') = 'acafffx@gmail.com');

create policy "Students can create own instructor follows"
on public.instructor_follows
for insert
to authenticated
with check (student_id = auth.uid());

create policy "Students can delete own instructor follows"
on public.instructor_follows
for delete
to authenticated
using (student_id = auth.uid());

create policy "AFF administrator can manage instructor follows"
on public.instructor_follows
for all
to authenticated
using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com')
with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

grant select, insert, update, delete on public.social_posts to authenticated;
grant select, insert, update, delete on public.social_post_replies to authenticated;
grant select, insert, delete on public.social_post_likes to authenticated;
grant select, insert, update on public.study_groups to authenticated;
grant select, insert, delete on public.instructor_follows to authenticated;
grant usage on sequence public.social_posts_id_seq to authenticated;
grant usage on sequence public.social_post_replies_id_seq to authenticated;
grant usage on sequence public.social_post_likes_id_seq to authenticated;
grant usage on sequence public.study_groups_id_seq to authenticated;
grant usage on sequence public.instructor_follows_id_seq to authenticated;

notify pgrst, 'reload schema';
