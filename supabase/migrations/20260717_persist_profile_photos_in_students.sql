select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'students'
  and column_name in (
    'id',
    'auth_user_id',
    'student_id',
    'full_name',
    'email',
    'profile_photo_url',
    'created_at'
  )
order by ordinal_position;

begin;

alter table public.students
  add column if not exists profile_photo_url text;

grant select on public.students to authenticated;
grant update (profile_photo_url) on public.students to authenticated;

drop policy if exists "Students can update own profile photo in students" on public.students;

create policy "Students can update own profile photo in students"
on public.students
for update
to authenticated
using (auth.uid() = auth_user_id)
with check (auth.uid() = auth_user_id);

notify pgrst, 'reload schema';

commit;
