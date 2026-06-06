-- Build automatic certificate generation for passed certification exams.
-- Run this in Supabase SQL Editor after the exams migration.

create sequence if not exists public.certificate_number_seq;

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid unique references public.exams(id) on delete cascade,
  certificate_number text not null unique,
  student_id uuid not null references auth.users(id) on delete cascade,
  student_name text not null,
  course_name text not null,
  score integer not null check (score between 0 and 100),
  issue_date date not null default current_date,
  verification_code text not null unique,
  created_at timestamptz not null default now()
);

alter table public.certificates
  add column if not exists exam_id uuid unique references public.exams(id) on delete cascade,
  add column if not exists certificate_number text,
  add column if not exists student_id uuid references auth.users(id) on delete cascade,
  add column if not exists student_name text,
  add column if not exists course_name text,
  add column if not exists score integer,
  add column if not exists issue_date date not null default current_date,
  add column if not exists verification_code text,
  add column if not exists created_at timestamptz not null default now();

alter table public.certificates
  alter column certificate_number set not null,
  alter column student_id set not null,
  alter column student_name set not null,
  alter column course_name set not null,
  alter column score set not null,
  alter column verification_code set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'certificates_certificate_number_key'
      and conrelid = 'public.certificates'::regclass
  ) then
    alter table public.certificates
      add constraint certificates_certificate_number_key
      unique (certificate_number);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'certificates_verification_code_key'
      and conrelid = 'public.certificates'::regclass
  ) then
    alter table public.certificates
      add constraint certificates_verification_code_key
      unique (verification_code);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'certificates_score_check'
      and conrelid = 'public.certificates'::regclass
  ) then
    alter table public.certificates
      add constraint certificates_score_check
      check (score between 0 and 100);
  end if;
end $$;

create or replace function public.create_certificate_for_passing_exam()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  next_number bigint;
  resolved_student_name text;
begin
  if new.score < 80 then
    return new;
  end if;

  if exists (select 1 from public.certificates where exam_id = new.id) then
    return new;
  end if;

  select coalesce(
    raw_user_meta_data ->> 'name',
    raw_user_meta_data ->> 'full_name',
    email,
    'Student'
  )
  into resolved_student_name
  from auth.users
  where id = new.student_id;

  next_number := nextval('public.certificate_number_seq');

  insert into public.certificates (
    exam_id,
    certificate_number,
    student_id,
    student_name,
    course_name,
    score,
    issue_date,
    verification_code
  )
  values (
    new.id,
    'AFF-2026-' || lpad(next_number::text, 5, '0'),
    new.student_id,
    coalesce(resolved_student_name, 'Student'),
    new.exam_title,
    new.score,
    current_date,
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))
  );

  return new;
end;
$$;

drop trigger if exists create_certificate_after_passing_exam on public.exams;

create trigger create_certificate_after_passing_exam
after insert on public.exams
for each row
execute function public.create_certificate_for_passing_exam();

alter table public.certificates enable row level security;

grant select on public.certificates to authenticated;

drop policy if exists "Students can read own certificates" on public.certificates;

create policy "Students can read own certificates"
on public.certificates
for select
to authenticated
using (auth.uid() = student_id);

notify pgrst, 'reload schema';
