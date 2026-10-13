begin;

alter table public.assignments
  add column if not exists status text not null default 'Submitted',
  add column if not exists grade numeric,
  add column if not exists instructor_feedback text,
  add column if not exists reviewed_by text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists grading_history jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'assignments_grade_range'
      and conrelid = 'public.assignments'::regclass
  ) then
    alter table public.assignments
      add constraint assignments_grade_range
      check (grade is null or (grade >= 0 and grade <= 100))
      not valid;

    alter table public.assignments
      validate constraint assignments_grade_range;
  end if;
end $$;

alter table public.assignments enable row level security;

grant select, insert, update on public.assignments to authenticated;

drop policy if exists "Students can read own assignments" on public.assignments;
drop policy if exists "Students can create own assignment submissions" on public.assignments;
drop policy if exists "Admins can read assignment submissions" on public.assignments;
drop policy if exists "Admins can review assignment submissions" on public.assignments;
drop policy if exists "AFF administrator can read assignment submissions" on public.assignments;
drop policy if exists "AFF administrator can review assignment submissions" on public.assignments;
drop policy if exists "AFF admins can manage assignments" on public.assignments;

create policy "Students can read own assignments"
on public.assignments
for select
to authenticated
using (auth.uid() = student_id or public.is_aff_admin());

create policy "Students can create own assignment submissions"
on public.assignments
for insert
to authenticated
with check (auth.uid() = student_id);

create policy "AFF admins can manage assignments"
on public.assignments
for all
to authenticated
using (public.is_aff_admin())
with check (public.is_aff_admin());

notify pgrst, 'reload schema';

commit;
