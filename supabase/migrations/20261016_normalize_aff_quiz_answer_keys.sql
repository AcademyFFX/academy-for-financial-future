begin;

create or replace function pg_temp.aff_quiz_question_key(question_payload jsonb)
returns text
language sql
immutable
as $$
  select regexp_replace(
    lower(trim(coalesce(
      question_payload ->> 'prompt',
      question_payload ->> 'question',
      question_payload ->> 'question_text',
      question_payload ->> 'questionText',
      question_payload ->> 'text',
      question_payload ->> 'title',
      ''
    ))),
    '[[:space:][:punct:]]+$',
    ''
  );
$$;

do $$
declare
  quiz_asset record;
  answer_key record;
  payload jsonb;
  question_payload jsonb;
  normalized_questions jsonb;
  changed boolean;
begin
  for quiz_asset in
    select id, signed_url
    from public.course_assets
    where asset_type = 'Quiz'
      and signed_url is not null
      and signed_url ~ '^\s*[\{\[]'
      and (
        lower(trim(asset_title)) in (
          'currency pairs and quote anatomy',
          'currency pairs and quote anatomy multiple choice',
          'understanding exchange rates'
        )
        or lower(signed_url) like '%in eur/usd, which currency is the base currency%'
        or lower(signed_url) like '%if eur/usd rises, this generally means%'
        or lower(signed_url) like '%exchange rates are primarily influenced by%'
        or lower(signed_url) like '%which factor often attracts international capital%'
        or lower(signed_url) like '%inflation has no effect on currency values%'
      )
  loop
    begin
      payload := quiz_asset.signed_url::jsonb;
    exception when others then
      continue;
    end;

    changed := false;

    for answer_key in
      select *
      from (values
        ('in eur/usd, which currency is the base currency', 'EUR'),
        ('if eur/usd rises, this generally means', 'The Euro strengthened against the Dollar'),
        ('exchange rates are primarily influenced by', 'Supply and Demand'),
        ('which factor often attracts international capital', 'Higher interest rates'),
        ('inflation has no effect on currency values', 'False')
      ) as expected(question_text, correct_answer)
    loop
      question_payload := payload -> 'question';
      if jsonb_typeof(question_payload) = 'object'
         and pg_temp.aff_quiz_question_key(question_payload) = answer_key.question_text then
        question_payload := question_payload || jsonb_build_object(
          'correctAnswer', answer_key.correct_answer,
          'correct_answer', answer_key.correct_answer
        );
        payload := jsonb_set(payload, '{question}', question_payload, true);
        changed := true;
      end if;

      if jsonb_typeof(payload) = 'object'
         and payload ? 'questions'
         and jsonb_typeof(payload -> 'questions') = 'array' then
        select jsonb_agg(
          case
            when pg_temp.aff_quiz_question_key(item) = answer_key.question_text
            then item || jsonb_build_object(
              'correctAnswer', answer_key.correct_answer,
              'correct_answer', answer_key.correct_answer
            )
            else item
          end
          order by ordinal
        ) into normalized_questions
        from jsonb_array_elements(payload -> 'questions') with ordinality as questions(item, ordinal);

        if normalized_questions is distinct from payload -> 'questions' then
          payload := jsonb_set(payload, '{questions}', normalized_questions, false);
          changed := true;
        end if;
      end if;

      if jsonb_typeof(payload) = 'object'
         and not (payload ? 'question')
         and not (payload ? 'questions')
         and pg_temp.aff_quiz_question_key(payload) = answer_key.question_text then
        payload := payload || jsonb_build_object(
          'correctAnswer', answer_key.correct_answer,
          'correct_answer', answer_key.correct_answer
        );
        changed := true;
      end if;
    end loop;

    if changed then
      update public.course_assets
      set signed_url = payload::text,
          file_size = length(payload::text),
          updated_at = now()
      where id = quiz_asset.id;
    end if;
  end loop;
end $$;

notify pgrst, 'reload schema';

commit;
