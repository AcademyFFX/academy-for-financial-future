begin;

with target as (
  select
    id,
    signed_url::jsonb as payload
  from public.course_assets
  where course_id = 1
    and lesson_id = 2
    and asset_type = 'Quiz'
    and asset_status = 'Published'
    and lower(trim(asset_title)) = 'understanding exchange rates'
    and signed_url is not null
    and signed_url ~ '^\s*\{'
), corrected as (
  select
    id,
    jsonb_set(
      jsonb_set(
        payload,
        '{question,correctAnswer}',
        to_jsonb('Higher interest rates'::text),
        true
      ),
      '{question,correct_answer}',
      to_jsonb('Higher interest rates'::text),
      true
    ) as payload
  from target
  where lower(trim(coalesce(
    payload #>> '{question,prompt}',
    payload #>> '{question,question}',
    payload #>> '{question,question_text}',
    payload #>> '{question,questionText}'
  ))) = 'which factor often attracts international capital?'
)
update public.course_assets as asset
set
  signed_url = corrected.payload::text,
  file_size = length(corrected.payload::text),
  updated_at = now()
from corrected
where asset.id = corrected.id
  and (
    asset.signed_url::jsonb #>> '{question,correctAnswer}' is distinct from 'Higher interest rates'
    or asset.signed_url::jsonb #>> '{question,correct_answer}' is distinct from 'Higher interest rates'
  );

notify pgrst, 'reload schema';

commit;
