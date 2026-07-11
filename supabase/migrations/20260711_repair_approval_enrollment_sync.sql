begin;

alter table public.students
  add column if not exists student_id text,
  add column if not exists membership_plan text not null default 'Free Trial',
  add column if not exists certification_level text,
  add column if not exists status text not null default 'Pending Review',
  add column if not exists enrollment_date date,
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null;

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id bigint not null references public.students(id) on delete cascade,
  course_id bigint,
  course_name text,
  enrollment_status text not null default 'Active',
  progress_percentage numeric(5,2) not null default 0,
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.enrollments
  add column if not exists student_id bigint references public.students(id) on delete cascade,
  add column if not exists course_id bigint,
  add column if not exists course_name text,
  add column if not exists enrollment_status text not null default 'Active',
  add column if not exists progress_percentage numeric(5,2) not null default 0,
  add column if not exists enrolled_at timestamptz not null default now(),
  add column if not exists completed_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists students_auth_email_status_idx
on public.students (auth_user_id, lower(email), status);

create index if not exists student_applications_auth_email_status_idx
on public.student_applications (auth_user_id, lower(email), application_status);

create index if not exists enrollments_student_course_name_idx
on public.enrollments (student_id, course_name);

alter table public.students enable row level security;
alter table public.student_applications enable row level security;
alter table public.enrollments enable row level security;

grant select, insert, update on public.students to authenticated;
grant select, insert, update on public.student_applications to authenticated;
grant select, insert, update on public.enrollments to authenticated;

drop policy if exists "AFF admin can update students for approval sync" on public.students;
create policy "AFF admin can update students for approval sync"
on public.students
for update
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Students can read own student account" on public.students;
create policy "Students can read own student account"
on public.students
for select
to authenticated
using (
  auth.uid() = auth_user_id
  or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com'
);

drop policy if exists "AFF admin can approve enrollment applications" on public.student_applications;
create policy "AFF admin can approve enrollment applications"
on public.student_applications
for update
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Students can read own enrollment application" on public.student_applications;
create policy "Students can read own enrollment application"
on public.student_applications
for select
to authenticated
using (
  auth.uid() = auth_user_id
  or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com'
);

drop policy if exists "Students can read own enrollments" on public.enrollments;
create policy "Students can read own enrollments"
on public.enrollments
for select
to authenticated
using (
  exists (
    select 1
    from public.students s
    where s.id = enrollments.student_id
      and (
        s.auth_user_id = auth.uid()
        or lower(s.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  )
  or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com'
);

drop policy if exists "AFF admin can manage approval enrollments" on public.enrollments;
create policy "AFF admin can manage approval enrollments"
on public.enrollments
for all
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

update public.students s
set
  status = 'Active',
  enrollment_date = coalesce(s.enrollment_date, coalesce(a.reviewed_at::date, current_date)),
  student_id = coalesce(nullif(s.student_id, ''), nullif(a.student_id, '')),
  membership_plan = coalesce(nullif(s.membership_plan, ''), 'Free Trial'),
  certification_level = coalesce(nullif(s.certification_level, ''), nullif(a.program_interest, ''), 'Academy for Financial Future')
from public.student_applications a
where a.application_status = 'Approved'
  and (
    (a.auth_user_id is not null and s.auth_user_id = a.auth_user_id)
    or lower(s.email) = lower(a.email)
  );

insert into public.enrollments (
  student_id,
  course_id,
  course_name,
  enrolled_at,
  enrollment_status,
  progress_percentage,
  created_at,
  updated_at
)
select
  s.id,
  null,
  coalesce(nullif(a.program_interest, ''), 'Academy for Financial Future'),
  coalesce(a.reviewed_at, now()),
  'Active',
  0,
  now(),
  now()
from public.student_applications a
join public.students s
  on (
    (a.auth_user_id is not null and s.auth_user_id = a.auth_user_id)
    or lower(s.email) = lower(a.email)
  )
where a.application_status = 'Approved'
  and not exists (
    select 1
    from public.enrollments e
    where e.student_id = s.id
      and coalesce(e.course_name, '') = coalesce(nullif(a.program_interest, ''), 'Academy for Financial Future')
  );

notify pgrst, 'reload schema';

commit;
