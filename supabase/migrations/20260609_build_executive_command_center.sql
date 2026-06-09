create table if not exists public.tv_viewership_events (
  id bigserial primary key,
  student_id uuid not null references auth.users(id) on delete cascade,
  broadcast_id bigint references public.tv_broadcasts(id) on delete cascade,
  event_type text not null default 'library_view',
  watched_at timestamptz not null default now(),
  constraint tv_viewership_events_event_type_check check (event_type in ('live_view', 'library_view', 'replay_view'))
);

create index if not exists tv_viewership_events_broadcast_idx
on public.tv_viewership_events (broadcast_id, watched_at desc);

create index if not exists tv_viewership_events_student_idx
on public.tv_viewership_events (student_id, watched_at desc);

alter table public.tv_viewership_events enable row level security;

drop policy if exists "Students can create own TV viewership events" on public.tv_viewership_events;
drop policy if exists "Students can read own TV viewership events" on public.tv_viewership_events;
drop policy if exists "AFF administrator can read TV viewership events" on public.tv_viewership_events;

create policy "Students can create own TV viewership events"
on public.tv_viewership_events
for insert
to authenticated
with check (auth.uid() = student_id);

create policy "Students can read own TV viewership events"
on public.tv_viewership_events
for select
to authenticated
using (auth.uid() = student_id);

create policy "AFF administrator can read TV viewership events"
on public.tv_viewership_events
for select
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

grant select, insert on public.tv_viewership_events to authenticated;
grant usage, select on sequence public.tv_viewership_events_id_seq to authenticated;

notify pgrst, 'reload schema';
