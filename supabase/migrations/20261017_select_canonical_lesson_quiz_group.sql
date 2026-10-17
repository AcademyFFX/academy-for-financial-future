begin;

alter table public.course_assets
  add column if not exists quiz_group_id uuid;

alter table public.lessons
  add column if not exists canonical_quiz_group_id uuid;

create index if not exists course_assets_quiz_group_idx
  on public.course_assets (course_id, lesson_id, quiz_group_id)
  where asset_type = 'Quiz';

create index if not exists lessons_canonical_quiz_group_idx
  on public.lessons (canonical_quiz_group_id)
  where canonical_quiz_group_id is not null;

do $$
declare
  target_course_id bigint;
  target_lesson_id bigint;
  canonical_group_id uuid;
  matching_asset_count integer;
begin
  select id into target_course_id
  from public.courses
  where lower(trim(course_name)) = 'forex foundations'
  order by id
  limit 1;

  select id into target_lesson_id
  from public.lessons
  where course_id = target_course_id
    and lower(trim(coalesce(lesson_title, title))) = 'currency pairs and quote anatomy'
  order by id
  limit 1;

  if target_course_id is null or target_lesson_id is null then
    raise notice 'Forex Foundations Lesson 2 was not found; no quiz metadata was changed.';
    return;
  end if;

  select count(*), min(quiz_group_id::text)::uuid
  into matching_asset_count, canonical_group_id
  from public.course_assets
  where course_id = target_course_id
    and lesson_id = target_lesson_id
    and asset_type = 'Quiz'
    and asset_status = 'Published'
    and lower(trim(asset_title)) = 'currency pairs and quote anatomy multiple choice';

  if matching_asset_count = 0 then
    raise notice 'The repaired Currency Pairs and Quote Anatomy Multiple Choice assets were not found; no quiz metadata was changed.';
    return;
  end if;

  canonical_group_id := coalesce(canonical_group_id, gen_random_uuid());

  update public.course_assets
  set quiz_group_id = canonical_group_id,
      updated_at = now()
  where course_id = target_course_id
    and lesson_id = target_lesson_id
    and asset_type = 'Quiz'
    and asset_status = 'Published'
    and lower(trim(asset_title)) = 'currency pairs and quote anatomy multiple choice'
    and quiz_group_id is distinct from canonical_group_id;

  update public.lessons
  set canonical_quiz_group_id = canonical_group_id,
      updated_at = now()
  where id = target_lesson_id
    and canonical_quiz_group_id is distinct from canonical_group_id;
end $$;

notify pgrst, 'reload schema';

commit;
