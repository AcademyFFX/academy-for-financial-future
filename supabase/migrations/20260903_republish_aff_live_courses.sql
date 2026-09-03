begin;

do $$
declare
  v_has_course_publication_status boolean;
  v_has_course_status boolean;
  v_has_course_updated_at boolean;
  v_has_lesson_publication_status boolean;
  v_has_lesson_status boolean;
  v_has_lesson_updated_at boolean;
  v_has_asset_updated_at boolean;
begin
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'courses' and column_name = 'publication_status'
  ) into v_has_course_publication_status;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'courses' and column_name = 'status'
  ) into v_has_course_status;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'courses' and column_name = 'updated_at'
  ) into v_has_course_updated_at;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'lessons' and column_name = 'publication_status'
  ) into v_has_lesson_publication_status;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'lessons' and column_name = 'status'
  ) into v_has_lesson_status;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'lessons' and column_name = 'updated_at'
  ) into v_has_lesson_updated_at;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'course_assets' and column_name = 'updated_at'
  ) into v_has_asset_updated_at;

  if v_has_course_publication_status then
    execute format(
      'update public.courses
       set publication_status = %L%s
       where lower(trim(course_name)) in (%L, %L)
         and coalesce(publication_status, '''') <> %L',
      'Published',
      case when v_has_course_updated_at then ', updated_at = now()' else '' end,
      'aff student orientation',
      'forex foundations',
      'Published'
    );
  end if;

  if v_has_course_status then
    execute format(
      'update public.courses
       set status = %L%s
       where lower(trim(course_name)) in (%L, %L)
         and lower(trim(coalesce(status, ''''))) in ('''', ''draft'', ''inactive'', ''pending'')',
      'Published',
      case when v_has_course_updated_at then ', updated_at = now()' else '' end,
      'aff student orientation',
      'forex foundations'
    );
  end if;

  if v_has_lesson_publication_status then
    execute format(
      'update public.lessons
       set publication_status = %L%s
       where course_id in (
         select id from public.courses
         where lower(trim(course_name)) in (%L, %L)
       )
       and coalesce(publication_status, '''') <> %L',
      'Published',
      case when v_has_lesson_updated_at then ', updated_at = now()' else '' end,
      'aff student orientation',
      'forex foundations',
      'Published'
    );
  end if;

  if v_has_lesson_status then
    execute format(
      'update public.lessons
       set status = %L%s
       where course_id in (
         select id from public.courses
         where lower(trim(course_name)) in (%L, %L)
       )
       and lower(trim(coalesce(status, ''''))) in ('''', ''draft'', ''inactive'', ''pending'')',
      'Published',
      case when v_has_lesson_updated_at then ', updated_at = now()' else '' end,
      'aff student orientation',
      'forex foundations'
    );
  end if;

  execute format(
    'update public.course_assets
     set asset_status = %L%s
     where course_id in (
       select id from public.courses
       where lower(trim(course_name)) in (%L, %L)
     )
     and asset_type = %L
     and lower(trim(coalesce(module_title, asset_title, ''''))) in (%L, %L)
     and coalesce(asset_status, '''') <> %L',
    'Published',
    case when v_has_asset_updated_at then ', updated_at = now()' else '' end,
    'aff student orientation',
    'forex foundations',
    'Module',
    'start here',
    'the aff perspective',
    'Published'
  );
end $$;

notify pgrst, 'reload schema';

commit;
