alter table public.students
  add column if not exists student_id text,
  add column if not exists membership_plan text not null default 'Free Trial',
  add column if not exists certification_level text not null default 'Academy for Financial Future',
  add column if not exists enrollment_date date,
  add column if not exists status text not null default 'Pending Review';

update public.students
set enrollment_date = coalesce(enrollment_date, created_at::date, current_date)
where enrollment_date is null;

update public.students s
set
  student_id = coalesce(nullif(s.student_id, ''), nullif(a.student_id, '')),
  membership_plan = coalesce(nullif(s.membership_plan, ''), nullif(a.membership_plan, ''), 'Free Trial'),
  certification_level = coalesce(nullif(s.certification_level, ''), nullif(a.program_interest, ''), 'Academy for Financial Future')
from public.student_applications a
where (
    (s.auth_user_id is not null and a.auth_user_id = s.auth_user_id)
    or lower(s.email) = lower(a.email)
  )
  and (
    nullif(s.student_id, '') is null
    or nullif(s.membership_plan, '') is null
    or nullif(s.certification_level, '') is null
  );

create index if not exists students_student_id_idx on public.students (student_id);
create index if not exists students_auth_user_status_idx on public.students (auth_user_id, status);
create index if not exists students_email_status_idx on public.students (lower(email), status);

notify pgrst, 'reload schema';
