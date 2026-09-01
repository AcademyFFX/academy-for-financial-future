begin;

do $$
declare
  v_course_id bigint;
  v_module_asset_id uuid;
  v_lesson_id bigint;
  v_next_course_order integer;
  v_course_has_updated_at boolean;
  v_lessons_has_updated_at boolean;
begin
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'courses'
      and column_name = 'updated_at'
  ) into v_course_has_updated_at;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'lessons'
      and column_name = 'updated_at'
  ) into v_lessons_has_updated_at;

  select id into v_course_id
  from public.courses
  where lower(trim(course_name)) = 'aff student orientation'
  order by id
  limit 1;

  if v_course_id is null then
    insert into public.courses (
      course_name,
      instructor,
      description,
      duration,
      created_at
    )
    values (
      'AFF Student Orientation',
      'Dr. Jean Rene Moricette',
      'Start Here — Learn how to navigate the AFF Learning Management System, access courses, open lessons, use learning resources, save private notes, complete assignments, track academic progress, manage your profile, and move confidently through the Academy.',
      '1 lesson',
      now()
    )
    returning id into v_course_id;
  else
    update public.courses
    set instructor = 'Dr. Jean Rene Moricette',
        description = 'Start Here — Learn how to navigate the AFF Learning Management System, access courses, open lessons, use learning resources, save private notes, complete assignments, track academic progress, manage your profile, and move confidently through the Academy.',
        duration = '1 lesson'
    where id = v_course_id;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'courses' and column_name = 'course_code'
  ) then
    update public.courses
    set course_code = coalesce(nullif(trim(course_code), ''), 'AFF-ORIENT-001')
    where id = v_course_id
      and not exists (
        select 1
        from public.courses other_course
        where other_course.id <> v_course_id
          and lower(coalesce(other_course.course_code, '')) = 'aff-orient-001'
      );
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'courses' and column_name = 'short_description'
  ) then
    update public.courses
    set short_description = 'Start Here — Learn how to navigate the AFF Learning Management System.'
    where id = v_course_id;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'courses' and column_name = 'full_description'
  ) then
    update public.courses
    set full_description = 'Start Here — Learn how to navigate the AFF Learning Management System, access courses, open lessons, use learning resources, save private notes, complete assignments, track academic progress, manage your profile, and move confidently through the Academy.'
    where id = v_course_id;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'courses' and column_name = 'academic_division'
  ) then
    update public.courses
    set academic_division = 'Student Success Division'
    where id = v_course_id;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'courses' and column_name = 'department_name'
  ) then
    update public.courses
    set department_name = 'Academy Orientation'
    where id = v_course_id;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'courses' and column_name = 'instructor_name'
  ) then
    update public.courses
    set instructor_name = 'Dr. Jean Rene Moricette'
    where id = v_course_id;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'courses' and column_name = 'difficulty_level'
  ) then
    update public.courses
    set difficulty_level = 'Orientation'
    where id = v_course_id;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'courses' and column_name = 'certification_eligibility'
  ) then
    update public.courses
    set certification_eligibility = false
    where id = v_course_id;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'courses' and column_name = 'enrollment_type'
  ) then
    update public.courses
    set enrollment_type = 'Enrollment Required'
    where id = v_course_id;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'courses' and column_name = 'publication_status'
  ) then
    update public.courses
    set publication_status = 'Published'
    where id = v_course_id;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'courses' and column_name = 'status'
  ) then
    update public.courses
    set status = 'Published'
    where id = v_course_id
      and lower(coalesce(status, '')) in ('', 'draft', 'inactive', 'pending');
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'courses' and column_name = 'display_order'
  ) then
    select coalesce(max(display_order), 0) + 10 into v_next_course_order
    from public.courses
    where id <> v_course_id;

    update public.courses
    set display_order = least(coalesce(nullif(display_order, 100), v_next_course_order), v_next_course_order)
    where id = v_course_id;
  end if;

  if v_course_has_updated_at then
    update public.courses
    set updated_at = now()
    where id = v_course_id;
  end if;

  select id into v_module_asset_id
  from public.course_assets
  where course_id = v_course_id
    and asset_type = 'Module'
    and lower(trim(coalesce(module_title, asset_title))) = 'start here'
  order by created_at, id
  limit 1;

  if v_module_asset_id is null then
    insert into public.course_assets (
      course_id,
      module_id,
      module_title,
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
      1,
      'Start Here',
      'Start Here',
      'Module',
      'start-here.json',
      'Module',
      'modules/' || v_course_id || '/1-start-here',
      '#',
      '#',
      '{"description":"Essential orientation for new Academy for Financial Future students.","objectives":"Navigate the LMS, open lessons, use resources, save notes, complete assignments, and track progress.","duration":"1 lesson","required":true}',
      'application/json',
      0,
      'Published',
      false,
      'Authenticated Students',
      1,
      'Essential orientation for new Academy for Financial Future students.',
      'AFF Course Builder',
      'course-builder@aff.local',
      now(),
      now()
    )
    on conflict (storage_path) do update
    set module_title = excluded.module_title,
        asset_title = excluded.asset_title,
        asset_status = 'Published',
        description = excluded.description,
        signed_url = excluded.signed_url,
        updated_at = now()
    returning id into v_module_asset_id;
  else
    update public.course_assets
    set module_id = 1,
        module_title = 'Start Here',
        asset_title = 'Start Here',
        asset_status = 'Published',
        description = 'Essential orientation for new Academy for Financial Future students.',
        signed_url = '{"description":"Essential orientation for new Academy for Financial Future students.","objectives":"Navigate the LMS, open lessons, use resources, save notes, complete assignments, and track progress.","duration":"1 lesson","required":true}',
        display_order = 1,
        updated_at = now()
    where id = v_module_asset_id;
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
    insert into public.lessons (
      course_id,
      lesson_title,
      title,
      slug,
      description,
      lesson_order,
      created_at
    )
    values (
      v_course_id,
      'How to Navigate the AFF Learning Management System',
      'How to Navigate the AFF Learning Management System',
      'how-to-navigate-the-aff-learning-management-system',
      'Learn how to use the AFF LMS student dashboard, My Courses, lesson classroom, learning resources, private notes, assignments, lesson completion, progress tracking, profile tools, and course navigation.',
      1,
      now()
    )
    returning id into v_lesson_id;
  else
    update public.lessons
    set lesson_title = 'How to Navigate the AFF Learning Management System',
        title = 'How to Navigate the AFF Learning Management System',
        slug = 'how-to-navigate-the-aff-learning-management-system',
        description = 'Learn how to use the AFF LMS student dashboard, My Courses, lesson classroom, learning resources, private notes, assignments, lesson completion, progress tracking, profile tools, and course navigation.',
        lesson_order = 1
    where id = v_lesson_id;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'lessons' and column_name = 'module_id'
  ) then
    update public.lessons
    set module_id = 1
    where id = v_lesson_id;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'lessons' and column_name = 'lesson_summary'
  ) then
    update public.lessons
    set lesson_summary = 'This orientation introduces the Academy learning workflow: dashboard, My Courses, professional classroom, resources, private notes, assignments, completion tracking, profile tools, and course navigation.'
    where id = v_lesson_id;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'lessons' and column_name = 'full_content'
  ) then
    update public.lessons
    set full_content = 'Use this orientation lesson to become comfortable with the AFF student experience before beginning your academic and Forex training courses. Review your Student Dashboard, open My Courses, enter the Professional Video Classroom, save private notes, locate downloadable resources, acknowledge assignments, mark lessons complete, and monitor progress toward Academy milestones.'
    where id = v_lesson_id;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'lessons' and column_name = 'learning_objectives'
  ) then
    update public.lessons
    set learning_objectives = 'Navigate the AFF Student Dashboard; Open My Courses and course lessons; Use the Professional Video Classroom; Access lesson resources; Save private lesson notes; Understand assignment and completion workflows; Track academic progress; Manage profile tools'
    where id = v_lesson_id;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'lessons' and column_name = 'instructor_notes'
  ) then
    update public.lessons
    set instructor_notes = 'Orientation lesson prepared for new AFF students. Video will be attached through the External Lesson Video interface after course structure verification.'
    where id = v_lesson_id;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'lessons' and column_name = 'estimated_duration'
  ) then
    update public.lessons
    set estimated_duration = '10 minutes'
    where id = v_lesson_id;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'lessons' and column_name = 'video_type'
  ) then
    update public.lessons
    set video_type = 'Text-only lesson'
    where id = v_lesson_id;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'lessons' and column_name = 'video_provider'
  ) then
    update public.lessons
    set video_provider = 'none'
    where id = v_lesson_id;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'lessons' and column_name = 'video_url'
  ) then
    update public.lessons
    set video_url = null
    where id = v_lesson_id;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'lessons' and column_name = 'video_title'
  ) then
    update public.lessons
    set video_title = null
    where id = v_lesson_id;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'lessons' and column_name = 'video_duration_seconds'
  ) then
    update public.lessons
    set video_duration_seconds = null
    where id = v_lesson_id;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'lessons' and column_name = 'video_thumbnail_url'
  ) then
    update public.lessons
    set video_thumbnail_url = null
    where id = v_lesson_id;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'lessons' and column_name = 'publication_status'
  ) then
    update public.lessons
    set publication_status = 'Published'
    where id = v_lesson_id;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'lessons' and column_name = 'status'
  ) then
    update public.lessons
    set status = 'Published'
    where id = v_lesson_id
      and lower(coalesce(status, '')) in ('', 'draft', 'inactive', 'pending');
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'lessons' and column_name = 'free_preview'
  ) then
    update public.lessons
    set free_preview = true
    where id = v_lesson_id;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'lessons' and column_name = 'required_completion'
  ) then
    update public.lessons
    set required_completion = true
    where id = v_lesson_id;
  end if;

  if v_lessons_has_updated_at then
    update public.lessons
    set updated_at = now()
    where id = v_lesson_id;
  end if;

  update public.course_assets
  set lesson_id = v_lesson_id,
      module_id = 1,
      module_title = 'Start Here',
      updated_at = now()
  where id = v_module_asset_id
    and asset_type = 'Module';
end $$;

notify pgrst, 'reload schema';

commit;
