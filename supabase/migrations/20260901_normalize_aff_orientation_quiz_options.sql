begin;

do $$
declare
  v_course_id bigint;
  v_lesson_id bigint;
  v_module_id bigint := 1;
  v_existing_asset_id uuid;
  v_payload jsonb;
  v_storage_path text;
  seed record;
begin
  select id into v_course_id
  from public.courses
  where lower(trim(course_name)) = 'aff student orientation'
  order by id
  limit 1;

  if v_course_id is null then
    return;
  end if;

  select id into v_lesson_id
  from public.lessons
  where course_id = v_course_id
    and (
      lower(trim(coalesce(slug, ''))) = 'how-to-navigate-the-aff-learning-management-system'
      or lower(trim(coalesce(lesson_title, title))) = 'how to navigate the aff learning management system'
    )
  order by id
  limit 1;

  if v_lesson_id is null then
    return;
  end if;

  select coalesce(module_id, 1) into v_module_id
  from public.course_assets
  where course_id = v_course_id
    and asset_type = 'Module'
    and lower(trim(coalesce(module_title, asset_title))) = 'start here'
  order by display_order nulls last, created_at nulls last
  limit 1;

  create temporary table if not exists aff_orientation_quiz_seed (
    question_order integer primary key,
    question_text text not null,
    options jsonb not null,
    correct_answer text not null,
    points integer not null default 1
  ) on commit drop;

  truncate table aff_orientation_quiz_seed;

  insert into aff_orientation_quiz_seed (question_order, question_text, options, correct_answer, points)
  values
    (
      1,
      'Where can a student find the courses they are enrolled in?',
      '["My Courses","Media Center","Analytics","Administration"]'::jsonb,
      'My Courses',
      1
    ),
    (
      2,
      'What should a student select to enter a lesson from an enrolled course?',
      '["Open Lesson","Billing","Logout","Administration"]'::jsonb,
      'Open Lesson',
      1
    ),
    (
      3,
      'What is the purpose of My Private Lesson Notes?',
      '["Save personal study notes","Change course enrollment","Edit instructor content","Manage billing"]'::jsonb,
      'Save personal study notes',
      1
    ),
    (
      4,
      'What should a student do after finishing a lesson?',
      '["Mark Lesson Complete","Delete Lesson","Reset Course","Change Instructor"]'::jsonb,
      'Mark Lesson Complete',
      1
    ),
    (
      5,
      'What does the course progress indicator show?',
      '["Student completion progress","Tuition balance","Instructor availability","Website traffic"]'::jsonb,
      'Student completion progress',
      1
    );

  for seed in
    select *
    from aff_orientation_quiz_seed
    order by question_order
  loop
    v_payload := jsonb_build_object(
      'quizTitle', 'AFF LMS Student Orientation Check',
      'quiz_title', 'AFF LMS Student Orientation Check',
      'passingScore', 80,
      'passing_score', 80,
      'question', jsonb_build_object(
        'prompt', seed.question_text,
        'question', seed.question_text,
        'question_text', seed.question_text,
        'questionText', seed.question_text,
        'options', seed.options,
        'choices', seed.options,
        'answers', seed.options,
        'correctAnswer', seed.correct_answer,
        'correct_answer', seed.correct_answer,
        'points', seed.points,
        'point_value', seed.points
      )
    );

    with ordered_existing as (
      select
        id,
        row_number() over (order by created_at nulls last, id) as row_number
      from public.course_assets
      where course_id = v_course_id
        and lesson_id = v_lesson_id
        and asset_type = 'Quiz'
        and lower(trim(asset_title)) = 'aff lms student orientation check'
    )
    select id into v_existing_asset_id
    from ordered_existing
    where row_number = seed.question_order;

    if v_existing_asset_id is not null then
      update public.course_assets
      set module_id = v_module_id,
          module_title = 'Start Here',
          asset_title = 'AFF LMS Student Orientation Check',
          asset_type = 'Quiz',
          file_name = 'aff-lms-student-orientation-check.json',
          file_type = 'Quiz',
          signed_url = v_payload::text,
          mime_type = 'application/json',
          file_size = length(v_payload::text),
          asset_status = 'Published',
          description = 'AFF Student Orientation quiz question ' || seed.question_order,
          display_order = seed.question_order,
          updated_at = now()
      where id = v_existing_asset_id;
    else
      v_storage_path := 'quizzes/' || v_course_id || '/' || v_lesson_id || '/aff-lms-student-orientation-check/question-' || seed.question_order;

      insert into public.course_assets (
        course_id,
        module_id,
        module_title,
        lesson_id,
        asset_title,
        asset_type,
        file_name,
        file_type,
        storage_path,
        public_url,
        url,
        signed_url,
        mime_type,
        file_size,
        asset_status,
        downloadable,
        visibility,
        display_order,
        description,
        uploaded_by,
        uploaded_by_email,
        created_at,
        updated_at
      )
      values (
        v_course_id,
        v_module_id,
        'Start Here',
        v_lesson_id,
        'AFF LMS Student Orientation Check',
        'Quiz',
        'aff-lms-student-orientation-check.json',
        'Quiz',
        v_storage_path,
        '#',
        '#',
        v_payload::text,
        'application/json',
        length(v_payload::text),
        'Published',
        false,
        'Authenticated Students',
        seed.question_order,
        'AFF Student Orientation quiz question ' || seed.question_order,
        'AFF Course Builder',
        'course-builder@aff.local',
        now(),
        now()
      )
      on conflict (storage_path) do update
      set module_id = excluded.module_id,
          module_title = excluded.module_title,
          lesson_id = excluded.lesson_id,
          asset_title = excluded.asset_title,
          signed_url = excluded.signed_url,
          file_size = excluded.file_size,
          asset_status = 'Published',
          display_order = excluded.display_order,
          updated_at = now();
    end if;
  end loop;
end $$;

notify pgrst, 'reload schema';

commit;
