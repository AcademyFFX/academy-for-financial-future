alter table public.student_applications enable row level security;
alter table public.students enable row level security;

grant select, insert, update on public.student_applications to authenticated;
grant select, insert, update on public.students to authenticated;

drop policy if exists "AFF admin can approve enrollment applications" on public.student_applications;
create policy "AFF admin can approve enrollment applications"
on public.student_applications
for update
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "AFF admin can read enrollment applications" on public.student_applications;
create policy "AFF admin can read enrollment applications"
on public.student_applications
for select
to authenticated
using (
  auth.uid() = auth_user_id
  or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com'
);

drop policy if exists "AFF admin can activate students" on public.students;
create policy "AFF admin can activate students"
on public.students
for update
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "AFF admin can read students" on public.students;
create policy "AFF admin can read students"
on public.students
for select
to authenticated
using (
  auth.uid() = auth_user_id
  or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  or status = 'Active'
  or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com'
);

notify pgrst, 'reload schema';
