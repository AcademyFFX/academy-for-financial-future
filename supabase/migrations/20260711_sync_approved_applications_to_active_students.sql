alter table public.student_applications enable row level security;
alter table public.students enable row level security;

grant select, update on public.student_applications to authenticated;
grant select, update on public.students to authenticated;

drop policy if exists "AFF admin can update enrollment approvals" on public.student_applications;
create policy "AFF admin can update enrollment approvals"
on public.student_applications
for update
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "AFF admin can update approved student accounts" on public.students;
create policy "AFF admin can update approved student accounts"
on public.students
for update
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

update public.students s
set
  status = 'Active',
  student_id = coalesce(nullif(s.student_id, ''), nullif(a.student_id, '')),
  membership_plan = coalesce(nullif(s.membership_plan, ''), 'Free Trial'),
  certification_level = coalesce(nullif(s.certification_level, ''), nullif(a.program_interest, ''), 'Academy for Financial Future')
from public.student_applications a
where a.application_status = 'Approved'
  and (
    (a.auth_user_id is not null and s.auth_user_id = a.auth_user_id)
    or lower(s.email) = lower(a.email)
  );

notify pgrst, 'reload schema';
