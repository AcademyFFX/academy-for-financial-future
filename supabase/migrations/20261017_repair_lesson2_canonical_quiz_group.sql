begin;

alter table public.course_assets
  add column if not exists quiz_group_id uuid;

alter table public.lessons
  add column if not exists canonical_quiz_group_id uuid;

create temporary table aff_lesson2_canonical_quiz_audit (
  lesson_id bigint primary key,
  previous_canonical_quiz_group_id uuid,
  intended_canonical_quiz_group_id uuid,
  selected_asset_ids uuid[] not null
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

do $$
declare
  target_course_id bigint;
  target_lesson_id bigint;
  previous_group_id uuid;
  intended_group_id uuid;
  reusable_group_id uuid;
  selected_asset_ids uuid[];
  matched_question_count integer;
  extra_group_asset_count integer;
begin
  select id into target_course_id
  from public.courses
  where lower(trim(course_name)) = 'forex foundations'
  order by id
  limit 1;

  select id, canonical_quiz_group_id
  into target_lesson_id, previous_group_id
  from public.lessons
  where course_id = target_course_id
    and lower(trim(coalesce(lesson_title, title))) = 'currency pairs and quote anatomy'
  order by id
  limit 1;

  if target_course_id is null or target_lesson_id is null then
    raise exception 'Forex Foundations / Currency Pairs and Quote Anatomy was not found.';
  end if;

  create temporary table aff_lesson2_question_rows on commit drop as
  with asset_payloads as (
    select
      asset.id as asset_id,
      asset.quiz_group_id,
      asset.updated_at,
      pg_temp.aff_safe_jsonb(asset.signed_url) as payload
    from public.course_assets as asset
    where asset.course_id = target_course_id
      and asset.lesson_id = target_lesson_id
      and asset.asset_type = 'Quiz'
      and asset.asset_status = 'Published'
      and lower(trim(asset.asset_title)) = 'currency pairs and quote anatomy multiple choice'
  ), expanded as (
    select
      asset.asset_id,
      asset.quiz_group_id,
      asset.updated_at,
      question.value as question
    from asset_payloads as asset
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(asset.payload -> 'questions') = 'array' then asset.payload -> 'questions' else '[]'::jsonb end
    ) as question(value)

    union all

    select asset.asset_id, asset.quiz_group_id, asset.updated_at, asset.payload -> 'question'
    from asset_payloads as asset
    where jsonb_typeof(asset.payload -> 'questions') is distinct from 'array'
      and jsonb_typeof(asset.payload -> 'question') = 'object'

    union all

    select asset.asset_id, asset.quiz_group_id, asset.updated_at, asset.payload
    from asset_payloads as asset
    where jsonb_typeof(asset.payload -> 'questions') is distinct from 'array'
      and jsonb_typeof(asset.payload -> 'question') is distinct from 'object'
      and jsonb_typeof(asset.payload) = 'object'
  )
  select
    expanded.*,
    lower(regexp_replace(trim(coalesce(
      question ->> 'prompt',
      question ->> 'question',
      question ->> 'question_text',
      question ->> 'questionText',
      ''
    )), '[[:space:][:punct:]]+$', '')) as normalized_prompt,
    case
      when exists (
        select 1 from jsonb_each_text(question) as answer_key(key, answer)
        where answer_key.key in ('correctAnswer', 'correct_answer', 'correct', 'answer', 'correctOption', 'correct_option')
          and lower(trim(answer_key.answer)) = 'eur'
      ) then 'base_currency'
      when exists (
        select 1 from jsonb_each_text(question) as answer_key(key, answer)
        where answer_key.key in ('correctAnswer', 'correct_answer', 'correct', 'answer', 'correctOption', 'correct_option')
          and lower(trim(answer_key.answer)) = 'the euro strengthened against the dollar'
      ) then 'euro_strengthened'
      else null
    end as expected_answer_key
  from expanded;

  create temporary table aff_lesson2_selected_assets on commit drop as
  with valid_questions as (
    select *
    from aff_lesson2_question_rows
    where (
      normalized_prompt = 'in eur/usd, which currency is the base currency'
      and expected_answer_key = 'base_currency'
    ) or (
      normalized_prompt = 'if eur/usd rises, this generally means'
      and expected_answer_key = 'euro_strengthened'
    )
  ), bundled_asset as (
    select valid.asset_id, max(valid.updated_at) as updated_at
    from valid_questions as valid
    group by valid.asset_id
    having count(distinct valid.expected_answer_key) = 2
       and (select count(*) from aff_lesson2_question_rows as all_questions where all_questions.asset_id = valid.asset_id) = 2
    order by updated_at desc nulls last, valid.asset_id desc
    limit 1
  ), ranked_individual_questions as (
    select
      valid.asset_id,
      valid.expected_answer_key,
      row_number() over (
        partition by valid.expected_answer_key
        order by valid.updated_at desc nulls last, valid.asset_id desc
      ) as answer_rank
    from valid_questions as valid
    where not exists (select 1 from bundled_asset)
  )
  select asset_id from bundled_asset
  union
  select asset_id from ranked_individual_questions where answer_rank = 1;

  select count(distinct row.expected_answer_key)
  into matched_question_count
  from aff_lesson2_question_rows as row
  join aff_lesson2_selected_assets as selected on selected.asset_id = row.asset_id
  where row.expected_answer_key is not null;

  if matched_question_count <> 2 then
    raise exception 'Unable to identify exactly the repaired two-question Lesson 2 quiz; no canonical metadata was changed.';
  end if;

  select array_agg(asset_id order by asset_id)
  into selected_asset_ids
  from aff_lesson2_selected_assets;

  select min(asset.quiz_group_id::text)::uuid
  into reusable_group_id
  from public.course_assets as asset
  where asset.id = any(selected_asset_ids)
  having count(distinct asset.quiz_group_id) = 1
     and count(asset.quiz_group_id) = count(*);

  if reusable_group_id is not null then
    select count(*) into extra_group_asset_count
    from public.course_assets as asset
    where asset.quiz_group_id = reusable_group_id
      and not (asset.id = any(selected_asset_ids));
  else
    extra_group_asset_count := 0;
  end if;

  intended_group_id := case
    when reusable_group_id is not null and extra_group_asset_count = 0 then reusable_group_id
    else gen_random_uuid()
  end;

  update public.course_assets
  set quiz_group_id = intended_group_id,
      updated_at = now()
  where id = any(selected_asset_ids)
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
    selected_asset_ids
  ) values (
    target_lesson_id,
    previous_group_id,
    intended_group_id,
    selected_asset_ids
  );
end $$;

notify pgrst, 'reload schema';

select
  audit.lesson_id,
  audit.previous_canonical_quiz_group_id as current_group_before_repair,
  audit.intended_canonical_quiz_group_id as intended_two_question_group,
  lesson.canonical_quiz_group_id as current_group_after_repair,
  audit.selected_asset_ids
from aff_lesson2_canonical_quiz_audit as audit
join public.lessons as lesson on lesson.id = audit.lesson_id;

commit;
