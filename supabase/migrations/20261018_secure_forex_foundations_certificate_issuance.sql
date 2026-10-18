begin;

create extension if not exists pgcrypto;

alter table public.digital_certificates
  add column if not exists exam_attempt_id bigint,
  add column if not exists integrity_verified boolean not null default false,
  add column if not exists issuance_source text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'digital_certificates_exam_attempt_id_fkey'
      and conrelid = 'public.digital_certificates'::regclass
  ) then
    alter table public.digital_certificates
      add constraint digital_certificates_exam_attempt_id_fkey
      foreign key (exam_attempt_id)
      references public.certification_exam_attempts(id)
      on delete set null
      not valid;
  end if;
end $$;

create unique index if not exists digital_certificates_verified_student_certification_unique
  on public.digital_certificates (student_id, certification_id)
  where integrity_verified is true
    and status = 'Valid'
    and certification_id is not null;

drop policy if exists "AFF students issue own digital certificates" on public.digital_certificates;
drop policy if exists "Students can create own digital certificates" on public.digital_certificates;

revoke insert, update, delete on public.digital_certificates from authenticated;
revoke usage, select on sequence public.digital_certificates_id_seq from authenticated;
grant select on public.digital_certificates to authenticated;

create or replace function public.prevent_legacy_forex_foundations_certificate()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if lower(trim(coalesce(new.course_name, ''))) = 'forex foundations' then
    raise exception using
      errcode = '23514',
      message = 'Forex Foundations certificates must be issued through the guarded certification examination workflow.';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_legacy_forex_foundations_certificate_insert on public.certificates;
create trigger prevent_legacy_forex_foundations_certificate_insert
before insert on public.certificates
for each row
execute function public.prevent_legacy_forex_foundations_certificate();

create or replace function public.aff_assignment_is_required(p_metadata text)
returns boolean
language plpgsql
immutable
set search_path = pg_catalog
as $$
declare
  metadata jsonb;
  required_value text;
begin
  if p_metadata is null or trim(p_metadata) = '' then
    return true;
  end if;

  begin
    metadata := p_metadata::jsonb;
  exception when others then
    return true;
  end;

  if jsonb_typeof(metadata) <> 'object' then
    return true;
  end if;

  required_value := lower(trim(coalesce(metadata ->> 'required', 'true')));
  return required_value not in ('false', '0', 'no', 'optional');
end;
$$;

revoke all on function public.aff_assignment_is_required(text) from public;

create or replace function public.issue_aff_certificate(p_attempt_id bigint)
returns setof public.digital_certificates
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  requesting_user_id uuid := auth.uid();
  attempt_row public.certification_exam_attempts%rowtype;
  catalog_row public.certification_catalog%rowtype;
  student_row public.students%rowtype;
  existing_certificate public.digital_certificates%rowtype;
  issued_certificate public.digital_certificates%rowtype;
  required_lesson_count integer := 0;
  completed_lesson_count integer := 0;
  required_assignment_count integer := 0;
  approved_assignment_count integer := 0;
  certificate_number_value text;
  verification_code_value text;
begin
  if requesting_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication is required to issue a certificate.';
  end if;

  select attempt.*
  into attempt_row
  from public.certification_exam_attempts as attempt
  where attempt.id = p_attempt_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'The certification attempt was not found.';
  end if;

  if attempt_row.student_id <> requesting_user_id and not public.is_aff_admin() then
    raise exception using errcode = '42501', message = 'This certification attempt belongs to another student.';
  end if;

  select catalog.*
  into catalog_row
  from public.certification_catalog as catalog
  inner join public.certification_exams as exam
    on exam.certification_id = catalog.id
  where catalog.id = attempt_row.certification_id
    and exam.id = attempt_row.exam_id;

  if not found or catalog_row.course_id is null then
    raise exception using errcode = 'P0002', message = 'The certification attempt is not mapped to an Academy course.';
  end if;

  if attempt_row.submitted_at is null
    or lower(trim(coalesce(attempt_row.result, attempt_row.pass_fail, ''))) not in ('pass', 'passed')
    or attempt_row.score < greatest(80, catalog_row.passing_score)
    or lower(trim(coalesce(attempt_row.status, ''))) not in ('submitted', 'completed', 'certification approved') then
    raise exception using errcode = '23514', message = 'A submitted passing certification attempt with a score of at least 80% is required.';
  end if;

  select student.*
  into student_row
  from public.students as student
  where student.auth_user_id = attempt_row.student_id
  order by student.id
  limit 1;

  if not found then
    raise exception using errcode = 'P0002', message = 'The certification attempt is not linked to an Academy student record.';
  end if;

  if not exists (
    select 1
    from public.enrollments as enrollment
    where enrollment.student_id = student_row.id
      and enrollment.course_id = catalog_row.course_id
      and lower(trim(coalesce(enrollment.enrollment_status, ''))) in ('active', 'approved', 'enrolled', 'in progress')
  ) then
    raise exception using errcode = '23514', message = 'An active enrollment in the certification course is required.';
  end if;

  select count(*)
  into required_lesson_count
  from public.lessons as lesson
  where lesson.course_id = catalog_row.course_id
    and coalesce(lesson.required_completion, true) is true
    and lower(trim(coalesce(lesson.publication_status, 'Published'))) in ('published', 'active', 'available');

  select count(*)
  into completed_lesson_count
  from public.lessons as lesson
  where lesson.course_id = catalog_row.course_id
    and coalesce(lesson.required_completion, true) is true
    and lower(trim(coalesce(lesson.publication_status, 'Published'))) in ('published', 'active', 'available')
    and exists (
      select 1
      from public.lesson_progress as progress
      where progress.student_id = attempt_row.student_id
        and progress.course_id = lesson.course_id::text
        and progress.lesson_id = lesson.id::text
    );

  if required_lesson_count = 0 or completed_lesson_count <> required_lesson_count then
    raise exception using errcode = '23514', message = 'All published required lessons must be complete before certificate issuance.';
  end if;

  select count(*)
  into required_assignment_count
  from public.course_assets as asset
  where asset.course_id = catalog_row.course_id
    and lower(trim(asset.asset_type)) = 'assignment'
    and lower(trim(coalesce(asset.asset_status, 'Draft'))) = 'published'
    and public.aff_assignment_is_required(asset.signed_url);

  select count(*)
  into approved_assignment_count
  from public.course_assets as asset
  where asset.course_id = catalog_row.course_id
    and lower(trim(asset.asset_type)) = 'assignment'
    and lower(trim(coalesce(asset.asset_status, 'Draft'))) = 'published'
    and public.aff_assignment_is_required(asset.signed_url)
    and exists (
      select 1
      from public.assignments as submission
      where submission.student_id = attempt_row.student_id
        and submission.course_id = catalog_row.course_id
        and submission.lesson_id = asset.lesson_id
        and lower(trim(coalesce(submission.status, ''))) = 'approved'
    );

  if approved_assignment_count <> required_assignment_count then
    raise exception using errcode = '23514', message = 'All published required assignments must be approved before certificate issuance.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(attempt_row.student_id::text || ':' || catalog_row.id::text, 0));

  select certificate.*
  into existing_certificate
  from public.digital_certificates as certificate
  where certificate.student_id = attempt_row.student_id
    and certificate.certification_id = catalog_row.id
    and certificate.status = 'Valid'
  order by certificate.issue_date desc, certificate.id desc
  limit 1;

  if found then
    return next existing_certificate;
    return;
  end if;

  certificate_number_value := 'AFF-' || extract(year from current_date)::integer::text || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
  verification_code_value := 'AFF-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 20));

  insert into public.digital_certificates (
    student_id,
    student_name,
    aff_student_id,
    certification_id,
    certificate_name,
    issue_date,
    certificate_number,
    qr_verification_code,
    verification_url,
    status,
    approved_by,
    exam_attempt_id,
    integrity_verified,
    issuance_source
  )
  values (
    attempt_row.student_id,
    coalesce(nullif(trim(student_row.full_name), ''), attempt_row.student_name, 'Student'),
    coalesce(nullif(trim(student_row.student_id), ''), attempt_row.aff_student_id),
    catalog_row.id,
    catalog_row.certificate_name,
    current_date,
    certificate_number_value,
    verification_code_value,
    '/verify-certificate',
    'Valid',
    'Dr. Jean Rene Moricette',
    attempt_row.id,
    true,
    'guarded-certification-rpc'
  )
  returning * into issued_certificate;

  return next issued_certificate;
end;
$$;

revoke all on function public.issue_aff_certificate(bigint) from public;
grant execute on function public.issue_aff_certificate(bigint) to authenticated;

notify pgrst, 'reload schema';

commit;
