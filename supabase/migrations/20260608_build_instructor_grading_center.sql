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

drop policy if exists "Admins can review assignment submissions" on public.assignments;
drop policy if exists "AFF administrator can review assignment submissions" on public.assignments;
drop policy if exists "AFF administrator can read assignment submissions" on public.assignments;

create policy "AFF administrator can read assignment submissions"
on public.assignments
for select
to authenticated
using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

create policy "AFF administrator can review assignment submissions"
on public.assignments
for update
to authenticated
using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com')
with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

grant select, update on public.assignments to authenticated;

notify pgrst, 'reload schema';
