create table if not exists public.ai_coach_chat_messages (
  id bigserial primary key,
  student_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  content text not null,
  topic text,
  recommendations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint ai_coach_chat_role_check check (role in ('student', 'assistant'))
);

create table if not exists public.ai_coach_knowledge (
  id bigserial primary key,
  title text not null,
  topic text not null,
  content text not null,
  active boolean not null default true,
  uploaded_by text not null default 'acafffx@gmail.com',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_coach_chat_student_created_idx
on public.ai_coach_chat_messages (student_id, created_at desc);

create index if not exists ai_coach_knowledge_active_topic_idx
on public.ai_coach_knowledge (active, topic);

alter table public.ai_coach_chat_messages enable row level security;
alter table public.ai_coach_knowledge enable row level security;

drop policy if exists "Students can read own AI Coach chat" on public.ai_coach_chat_messages;
drop policy if exists "Students can create own AI Coach chat" on public.ai_coach_chat_messages;
drop policy if exists "AFF administrator can read AI Coach chats" on public.ai_coach_chat_messages;
drop policy if exists "Authenticated students can read active AI Coach knowledge" on public.ai_coach_knowledge;
drop policy if exists "AFF administrator can manage AI Coach knowledge" on public.ai_coach_knowledge;

create policy "Students can read own AI Coach chat"
on public.ai_coach_chat_messages
for select
to authenticated
using (auth.uid() = student_id or (auth.jwt() ->> 'email') = 'acafffx@gmail.com');

create policy "Students can create own AI Coach chat"
on public.ai_coach_chat_messages
for insert
to authenticated
with check (auth.uid() = student_id);

create policy "Authenticated students can read active AI Coach knowledge"
on public.ai_coach_knowledge
for select
to authenticated
using (active = true or (auth.jwt() ->> 'email') = 'acafffx@gmail.com');

create policy "AFF administrator can manage AI Coach knowledge"
on public.ai_coach_knowledge
for all
to authenticated
using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com')
with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

insert into public.ai_coach_knowledge (title, topic, content, active)
select
  'AFF Forex Anatomy Study Guide',
  'Forex Anatomy',
  'Forex Anatomy teaches the market as a living system: structure is the skeleton, institutional orders are the muscles, order flow is the blood flow, economic data is the nervous system, liquidity is the heart, trading sessions are the clock, broker interface is the skin, and central banks are the brain.',
  true
where not exists (
  select 1
  from public.ai_coach_knowledge
  where title = 'AFF Forex Anatomy Study Guide'
);

grant select, insert on public.ai_coach_chat_messages to authenticated;
grant select, insert, update, delete on public.ai_coach_knowledge to authenticated;
grant usage on sequence public.ai_coach_chat_messages_id_seq to authenticated;
grant usage on sequence public.ai_coach_knowledge_id_seq to authenticated;

notify pgrst, 'reload schema';
