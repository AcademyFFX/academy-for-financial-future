create table if not exists public.voice_coach_conversations (
  id bigserial primary key,
  student_id uuid references auth.users(id) on delete cascade,
  coach_mode text not null default 'Forex Instructor Mode',
  role text not null check (role in ('student', 'assistant')),
  transcript text not null,
  topic text,
  recommendations jsonb,
  audio_url text,
  audio_duration_seconds integer,
  source text not null default 'microphone',
  created_at timestamptz not null default now()
);

create table if not exists public.voice_coach_usage_events (
  id bigserial primary key,
  student_id uuid references auth.users(id) on delete cascade,
  coach_mode text not null default 'Forex Instructor Mode',
  event_type text not null default 'voice_exchange',
  prompt_characters integer not null default 0,
  response_characters integer not null default 0,
  audio_duration_seconds integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.voice_coach_conversations enable row level security;
alter table public.voice_coach_usage_events enable row level security;

drop policy if exists "Students can read own voice coach conversations" on public.voice_coach_conversations;
create policy "Students can read own voice coach conversations"
on public.voice_coach_conversations for select
to authenticated
using (auth.uid() = student_id or (auth.jwt() ->> 'email') = 'acafffx@gmail.com');

drop policy if exists "Students can insert own voice coach conversations" on public.voice_coach_conversations;
create policy "Students can insert own voice coach conversations"
on public.voice_coach_conversations for insert
to authenticated
with check (auth.uid() = student_id);

drop policy if exists "Admin can manage voice coach conversations" on public.voice_coach_conversations;
create policy "Admin can manage voice coach conversations"
on public.voice_coach_conversations for all
to authenticated
using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com')
with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

drop policy if exists "Students can read own voice coach usage" on public.voice_coach_usage_events;
create policy "Students can read own voice coach usage"
on public.voice_coach_usage_events for select
to authenticated
using (auth.uid() = student_id or (auth.jwt() ->> 'email') = 'acafffx@gmail.com');

drop policy if exists "Students can insert own voice coach usage" on public.voice_coach_usage_events;
create policy "Students can insert own voice coach usage"
on public.voice_coach_usage_events for insert
to authenticated
with check (auth.uid() = student_id);

drop policy if exists "Admin can manage voice coach usage" on public.voice_coach_usage_events;
create policy "Admin can manage voice coach usage"
on public.voice_coach_usage_events for all
to authenticated
using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com')
with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

grant select, insert, update, delete on public.voice_coach_conversations to authenticated;
grant select, insert, update, delete on public.voice_coach_usage_events to authenticated;
grant usage, select on sequence public.voice_coach_conversations_id_seq to authenticated;
grant usage, select on sequence public.voice_coach_usage_events_id_seq to authenticated;

notify pgrst, 'reload schema';
