begin;

alter table public.course_assets
  add column if not exists quiz_group_id uuid;

alter table public.lessons
  add column if not exists canonical_quiz_group_id uuid;

create temporary table aff_lesson2_canonical_quiz_audit (
  lesson_id bigint primary key,
  previous_canonical_quiz_group_id uuid,
  intended_canonical_quiz_group_id uuid,
  base_currency_asset_id uuid not null,
  base_currency_previous_group_id uuid,
  euro_strength_asset_id uuid not null,
  euro_strength_previous_group_id uuid
) on commit drop;

create or replace function pg_temp.aff_safe_jsonb(raw text)
returns jsonb
language plpgsql
immutable
as $$
begin
  return raw::jsonb;
exception when others then
  return null;
end;
$$;

create or replace function pg_temp.aff_jsonb_scalar_values(raw text)
returns table (json_key text, scalar_value text)
language sql
immutable
as $$
  with recursive walk(json_key, node) as (
    select null::text, pg_temp.aff_safe_jsonb(raw)

    union all

    select child.json_key, child.node
    from walk as parent
    cross join lateral (
      select object_item.key as json_key, object_item.value as node
      from jsonb_each(
        case when jsonb_typeof(parent.node) = 'object' then parent.node else '{}'::jsonb end
      ) as object_item

      union all

      select array_item.ordinality::text, array_item.value
      from jsonb_array_elements(
        case when jsonb_typeof(parent.node) = 'array' then parent.node else '[]'::jsonb end
      ) with ordinality as array_item(value, ordinality)
    ) as child
  )
  select
    walk.json_key,
    walk.node #>> '{}' as scalar_value
  from walk
  where jsonb_typeof(walk.node) in ('string', 'number', 'boolean');
$$;

do $$
declare
  expected_previous_group_id constant uuid := 'a8d540ac-b5da-4547-883a-4aaed2092083';
  base_currency_asset_id constant uuid := 'b1c7fa6a-edb7-4191-a921-080cc66ad6b5';
  euro_strength_asset_id constant uuid := 'c774d987-f61e-45a4-9777-5e8e64704a99';
  target_course_id bigint;
  target_lesson_id bigint;
  previous_group_id uuid;
  base_currency_previous_group_id uuid;
  euro_strength_previous_group_id uuid;
  intended_group_id uuid;
  target_asset_count integer;
  target_group_count integer;
  extra_group_asset_count integer;
  base_currency_is_valid boolean;
  euro_strength_is_valid boolean;
begin
  select course.id
  into target_course_id
  from public.courses as course
  where lower(trim(course.course_name)) = 'forex foundations'
  order by course.id
  limit 1;

  select lesson.id, lesson.canonical_quiz_group_id
  into target_lesson_id, previous_group_id
  from public.lessons as lesson
  where lesson.course_id = target_course_id
    and lower(trim(coalesce(lesson.lesson_title, lesson.title))) = 'currency pairs and quote anatomy'
  order by lesson.id
  limit 1;

  if target_course_id is null or target_lesson_id is null then
    raise exception 'Forex Foundations / Currency Pairs and Quote Anatomy was not found; no canonical metadata was changed.';
  end if;

  select count(*)
  into target_asset_count
  from public.course_assets as asset
  where asset.id in (base_currency_asset_id, euro_strength_asset_id)
    and asset.course_id = target_course_id
    and asset.lesson_id = target_lesson_id
    and lower(trim(asset.asset_type)) = 'quiz'
    and lower(trim(asset.asset_status)) = 'published';

  if target_asset_count <> 2 then
    raise exception 'The two exact published Lesson 2 quiz assets were not found on the expected course and lesson; no canonical metadata was changed.';
  end if;

  select
    exists (
      select 1
      from pg_temp.aff_jsonb_scalar_values(asset.signed_url) as scalar
      where scalar.json_key in ('prompt', 'question', 'question_text', 'questionText')
        and lower(trim(scalar.scalar_value)) = 'in eur/usd, which currency is the base currency?'
    )
    and exists (
      select 1
      from pg_temp.aff_jsonb_scalar_values(asset.signed_url) as scalar
      where scalar.json_key in ('correctAnswer', 'correct_answer', 'correct', 'answer', 'correctOption', 'correct_option')
        and lower(trim(scalar.scalar_value)) = 'eur'
    )
  into base_currency_is_valid
  from public.course_assets as asset
  where asset.id = base_currency_asset_id;

  select
    exists (
      select 1
      from pg_temp.aff_jsonb_scalar_values(asset.signed_url) as scalar
      where scalar.json_key in ('prompt', 'question', 'question_text', 'questionText')
        and lower(trim(scalar.scalar_value)) = 'if eur/usd rises, this generally means:'
    )
    and exists (
      select 1
      from pg_temp.aff_jsonb_scalar_values(asset.signed_url) as scalar
      where scalar.json_key in ('correctAnswer', 'correct_answer', 'correct', 'answer', 'correctOption', 'correct_option')
        and lower(trim(scalar.scalar_value)) = 'the euro strengthened against the dollar'
    )
  into euro_strength_is_valid
  from public.course_assets as asset
  where asset.id = euro_strength_asset_id;

  if not coalesce(base_currency_is_valid, false) then
    raise exception 'Asset b1c7fa6a-edb7-4191-a921-080cc66ad6b5 did not contain the exact expected question and EUR answer; no canonical metadata was changed.';
  end if;

  if not coalesce(euro_strength_is_valid, false) then
    raise exception 'Asset c774d987-f61e-45a4-9777-5e8e64704a99 did not contain the exact expected question and Euro-strength answer; no canonical metadata was changed.';
  end if;

  select asset.quiz_group_id
  into base_currency_previous_group_id
  from public.course_assets as asset
  where asset.id = base_currency_asset_id;

  select asset.quiz_group_id
  into euro_strength_previous_group_id
  from public.course_assets as asset
  where asset.id = euro_strength_asset_id;

  select count(distinct asset.quiz_group_id)
  into target_group_count
  from public.course_assets as asset
  where asset.id in (base_currency_asset_id, euro_strength_asset_id);

  if base_currency_previous_group_id is null and euro_strength_previous_group_id is null then
    intended_group_id := gen_random_uuid();
  elsif base_currency_previous_group_id is not null
    and base_currency_previous_group_id = euro_strength_previous_group_id
    and target_group_count = 1 then
    intended_group_id := base_currency_previous_group_id;
  else
    raise exception 'The two repaired assets have conflicting quiz groups; no canonical metadata was changed.';
  end if;

  select count(*)
  into extra_group_asset_count
  from public.course_assets as asset
  where asset.quiz_group_id = intended_group_id
    and asset.id not in (base_currency_asset_id, euro_strength_asset_id);

  if extra_group_asset_count <> 0 then
    raise exception 'The intended quiz group contains assets other than the two repaired Lesson 2 questions; no canonical metadata was changed.';
  end if;

  if previous_group_id is distinct from expected_previous_group_id
    and previous_group_id is distinct from intended_group_id then
    raise exception 'Lesson 2 canonical quiz group changed after production diagnosis; no canonical metadata was changed.';
  end if;

  update public.course_assets
  set quiz_group_id = intended_group_id,
      updated_at = now()
  where id in (base_currency_asset_id, euro_strength_asset_id)
    and quiz_group_id is distinct from intended_group_id;

  update public.lessons
  set canonical_quiz_group_id = intended_group_id,
      updated_at = now()
  where id = target_lesson_id
    and canonical_quiz_group_id is distinct from intended_group_id;

  insert into aff_lesson2_canonical_quiz_audit (
    lesson_id,
    previous_canonical_quiz_group_id,
    intended_canonical_quiz_group_id,
    base_currency_asset_id,
    base_currency_previous_group_id,
    euro_strength_asset_id,
    euro_strength_previous_group_id
  ) values (
    target_lesson_id,
    previous_group_id,
    intended_group_id,
    base_currency_asset_id,
    base_currency_previous_group_id,
    euro_strength_asset_id,
    euro_strength_previous_group_id
  );
end $$;

notify pgrst, 'reload schema';

select
  audit.lesson_id,
  audit.previous_canonical_quiz_group_id as old_lesson2_canonical_group,
  audit.intended_canonical_quiz_group_id as new_lesson2_canonical_group,
  lesson.canonical_quiz_group_id as resulting_lesson2_canonical_group,
  audit.base_currency_asset_id,
  audit.base_currency_previous_group_id,
  base_asset.quiz_group_id as base_currency_resulting_group_id,
  audit.euro_strength_asset_id,
  audit.euro_strength_previous_group_id,
  euro_asset.quiz_group_id as euro_strength_resulting_group_id
from aff_lesson2_canonical_quiz_audit as audit
join public.lessons as lesson on lesson.id = audit.lesson_id
join public.course_assets as base_asset on base_asset.id = audit.base_currency_asset_id
join public.course_assets as euro_asset on euro_asset.id = audit.euro_strength_asset_id;

commit;
