create table if not exists public.student_messages (
  id bigserial primary key,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  recipient_name text not null,
  recipient_email text not null,
  sender_name text not null default 'Dr. Jean Rene Moricette',
  sender_email text not null default 'acafffx@gmail.com',
  category text not null default 'Announcement',
  priority text not null default 'Normal',
  title text not null,
  body text not null,
  action_url text,
  read_at timestamptz,
  archived_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint student_messages_category_check check (category in (
    'Announcement',
    'Direct Message',
    'Homework Reminder',
    'Certification Notification',
    'Zoom Class Reminder',
    'Course Update'
  )),
  constraint student_messages_priority_check check (priority in ('Normal', 'Important', 'Urgent'))
);

create index if not exists student_messages_recipient_created_idx
on public.student_messages (recipient_id, created_at desc);

create index if not exists student_messages_unread_idx
on public.student_messages (recipient_id)
where read_at is null and deleted_at is null;

alter table public.student_messages enable row level security;

drop policy if exists "Students can read their messages" on public.student_messages;
drop policy if exists "Students can update their message state" on public.student_messages;
drop policy if exists "AFF administrator can send student messages" on public.student_messages;
drop policy if exists "AFF administrator can manage student messages" on public.student_messages;

create policy "Students can read their messages"
on public.student_messages
for select
to authenticated
using (auth.uid() = recipient_id or (auth.jwt() ->> 'email') = 'acafffx@gmail.com');

create policy "Students can update their message state"
on public.student_messages
for update
to authenticated
using (auth.uid() = recipient_id)
with check (auth.uid() = recipient_id);

create policy "AFF administrator can manage student messages"
on public.student_messages
for all
to authenticated
using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com')
with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

grant select on public.student_messages to authenticated;
grant update (read_at, archived_at, deleted_at) on public.student_messages to authenticated;
grant insert, delete on public.student_messages to authenticated;
grant usage on sequence public.student_messages_id_seq to authenticated;

insert into public.student_messages (
  recipient_id,
  recipient_name,
  recipient_email,
  category,
  priority,
  title,
  body,
  action_url
)
select
  auth.users.id,
  coalesce(public.students.full_name, auth.users.email, 'Student'),
  coalesce(public.students.email, auth.users.email, ''),
  'Announcement',
  'Normal',
  'Welcome to the AFF Messaging Center',
  'Academy announcements, homework reminders, Zoom class notices, certification updates, and direct instructor messages will appear in this inbox.',
  '/messages'
from auth.users
left join public.students on public.students.email = auth.users.email
where not exists (
  select 1
  from public.student_messages existing
  where existing.recipient_id = auth.users.id
    and existing.title = 'Welcome to the AFF Messaging Center'
);

notify pgrst, 'reload schema';
