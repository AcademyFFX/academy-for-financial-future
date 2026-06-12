grant select on public.students to authenticated;

drop policy if exists "Students can read their own profile" on public.students;
drop policy if exists "AFF administrator can read student profiles" on public.students;

create policy "Students can read their own profile"
on public.students
for select
to authenticated
using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

create policy "AFF administrator can read student profiles"
on public.students
for select
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

notify pgrst, 'reload schema';
