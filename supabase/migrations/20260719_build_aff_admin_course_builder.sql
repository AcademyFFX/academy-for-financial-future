begin;

create extension if not exists pgcrypto;

alter table public.courses add column if not exists course_code text;
alter table public.courses add column if not exists short_description text;
alter table public.courses add column if not exists full_description text;
alter table public.courses add column if not exists academic_division text;
alter table public.courses add column if not exists department_name text;
alter table public.courses add column if not exists instructor_name text;
alter table public.courses add column if not exists instructor_user_id uuid references auth.users(id) on delete set null;
alter table public.courses add column if not exists thumbnail_url text;
alter table public.courses add column if not exists banner_image_url text;
alter table public.courses add column if not exists difficulty_level text;
alter table public.courses add column if not exists certification_eligibility boolean not null default false;
alter table public.courses add column if not exists enrollment_type text not null default 'Enrollment Required';
alter table public.courses add column if not exists publication_status text not null default 'Draft';
alter table public.courses add column if not exists display_order integer not null default 100;
alter table public.courses add column if not exists updated_at timestamptz not null default now();

update public.courses
set instructor_name = coalesce(instructor_name, instructor),
    short_description = coalesce(short_description, description),
    full_description = coalesce(full_description, description),
    academic_division = coalesce(academic_division, 'Forex Training Division'),
    department_name = coalesce(department_name, 'Academy for Financial Future'),
    course_code = coalesce(course_code, upper(regexp_replace(course_name, '[^a-zA-Z0-9]+', '-', 'g'))),
    publication_status = coalesce(publication_status, 'Draft'),
    updated_at = coalesce(updated_at, now())
where course_name is not null;

create unique index if not exists courses_course_code_unique
on public.courses (lower(course_code))
where course_code is not null and length(trim(course_code)) > 0;

create index if not exists courses_publication_status_idx on public.courses (publication_status);
create index if not exists courses_academic_division_idx on public.courses (academic_division);
create index if not exists courses_display_order_idx on public.courses (display_order);
create index if not exists courses_updated_at_idx on public.courses (updated_at desc);

alter table public.lessons add column if not exists module_id bigint;
alter table public.lessons add column if not exists video_url text;
alter table public.lessons add column if not exists pdf_notes_url text;
alter table public.lessons add column if not exists lesson_summary text;
alter table public.lessons add column if not exists full_content text;
alter table public.lessons add column if not exists video_type text not null default 'Text-only lesson';
alter table public.lessons add column if not exists transcript text;
alter table public.lessons add column if not exists instructor_notes text;
alter table public.lessons add column if not exists estimated_duration text;
alter table public.lessons add column if not exists publication_status text not null default 'Draft';
alter table public.lessons add column if not exists free_preview boolean not null default false;
alter table public.lessons add column if not exists required_completion boolean not null default true;
alter table public.lessons add column if not exists updated_at timestamptz not null default now();

update public.lessons
set lesson_summary = coalesce(lesson_summary, description),
    publication_status = coalesce(publication_status, 'Draft'),
    video_type = coalesce(video_type, case when video_url is not null and length(trim(video_url)) > 0 then 'External Video URL' else 'Text-only lesson' end),
    updated_at = coalesce(updated_at, now());

create index if not exists lessons_course_module_idx on public.lessons (course_id, module_id);
create index if not exists lessons_publication_status_idx on public.lessons (publication_status);
create index if not exists lessons_display_order_idx on public.lessons (course_id, lesson_order);
create unique index if not exists lessons_course_slug_unique on public.lessons (course_id, slug);

create table if not exists public.course_assets (
  id uuid primary key default gen_random_uuid(),
  course_id bigint not null references public.courses(id) on delete cascade,
  lesson_id bigint references public.lessons(id) on delete set null,
  module_id bigint,
  module_title text,
  asset_title text not null,
  asset_type text not null,
  file_name text not null,
  file_type text,
  storage_path text not null unique,
  public_url text,
  url text,
  signed_url text,
  mime_type text,
  file_size bigint not null default 0,
  asset_status text not null default 'Draft',
  downloadable boolean not null default true,
  visibility text not null default 'Authenticated Students',
  display_order integer not null default 100,
  description text,
  uploaded_by text,
  uploaded_by_email text,
  uploaded_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.course_assets add column if not exists public_url text;
alter table public.course_assets add column if not exists url text;
alter table public.course_assets add column if not exists description text;
alter table public.course_assets add column if not exists downloadable boolean not null default true;
alter table public.course_assets add column if not exists visibility text not null default 'Authenticated Students';
alter table public.course_assets add column if not exists display_order integer not null default 100;
alter table public.course_assets add column if not exists updated_at timestamptz not null default now();

alter table public.course_assets drop constraint if exists course_assets_asset_type_check;
alter table public.course_assets add constraint course_assets_asset_type_check
check (asset_type in (
  'Module',
  'Video',
  'PDF Notes',
  'PowerPoint',
  'Assignment',
  'Quiz',
  'Course Thumbnail',
  'Resource',
  'DOCX',
  'PPTX',
  'XLSX',
  'ZIP',
  'Image',
  'Audio',
  'External Link',
  'Workbook',
  'Cheat Sheet',
  'Assignment Instructions'
));

alter table public.course_assets drop constraint if exists course_assets_asset_status_check;
alter table public.course_assets add constraint course_assets_asset_status_check
check (asset_status in ('Draft', 'Published', 'Archived'));

create index if not exists course_assets_course_idx on public.course_assets (course_id, asset_type, created_at desc);
create index if not exists course_assets_module_idx on public.course_assets (course_id, module_id, display_order);
create index if not exists course_assets_lesson_idx on public.course_assets (lesson_id, asset_type);
create index if not exists course_assets_status_idx on public.course_assets (asset_status);
create unique index if not exists course_assets_storage_path_unique on public.course_assets (storage_path);

alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.course_assets enable row level security;

drop policy if exists "Authenticated users can read courses" on public.courses;
drop policy if exists "AFF admins can manage courses" on public.courses;
drop policy if exists "Authenticated users can read lessons" on public.lessons;
drop policy if exists "AFF admins can manage lessons" on public.lessons;
drop policy if exists "Authenticated users can read published course assets" on public.course_assets;
drop policy if exists "AFF admin can manage course assets" on public.course_assets;

create policy "Authenticated users can read courses"
on public.courses for select to authenticated
using (
  publication_status = 'Published'
  or exists (
    select 1 from public.aff_admin_users admin_user
    where admin_user.user_id = auth.uid()
      and admin_user.is_active = true
      and lower(admin_user.role) in ('administrator', 'admin')
  )
);

create policy "AFF admins can manage courses"
on public.courses for all to authenticated
using (
  exists (
    select 1 from public.aff_admin_users admin_user
    where admin_user.user_id = auth.uid()
      and admin_user.is_active = true
      and lower(admin_user.role) in ('administrator', 'admin')
  )
)
with check (
  exists (
    select 1 from public.aff_admin_users admin_user
    where admin_user.user_id = auth.uid()
      and admin_user.is_active = true
      and lower(admin_user.role) in ('administrator', 'admin')
  )
);

create policy "Authenticated users can read lessons"
on public.lessons for select to authenticated
using (
  publication_status = 'Published'
  or exists (
    select 1 from public.aff_admin_users admin_user
    where admin_user.user_id = auth.uid()
      and admin_user.is_active = true
      and lower(admin_user.role) in ('administrator', 'admin')
  )
);

create policy "AFF admins can manage lessons"
on public.lessons for all to authenticated
using (
  exists (
    select 1 from public.aff_admin_users admin_user
    where admin_user.user_id = auth.uid()
      and admin_user.is_active = true
      and lower(admin_user.role) in ('administrator', 'admin')
  )
)
with check (
  exists (
    select 1 from public.aff_admin_users admin_user
    where admin_user.user_id = auth.uid()
      and admin_user.is_active = true
      and lower(admin_user.role) in ('administrator', 'admin')
  )
);

create policy "Authenticated users can read published course assets"
on public.course_assets for select to authenticated
using (
  asset_status = 'Published'
  or exists (
    select 1 from public.aff_admin_users admin_user
    where admin_user.user_id = auth.uid()
      and admin_user.is_active = true
      and lower(admin_user.role) in ('administrator', 'admin')
  )
);

create policy "AFF admin can manage course assets"
on public.course_assets for all to authenticated
using (
  exists (
    select 1 from public.aff_admin_users admin_user
    where admin_user.user_id = auth.uid()
      and admin_user.is_active = true
      and lower(admin_user.role) in ('administrator', 'admin')
  )
)
with check (
  exists (
    select 1 from public.aff_admin_users admin_user
    where admin_user.user_id = auth.uid()
      and admin_user.is_active = true
      and lower(admin_user.role) in ('administrator', 'admin')
  )
);

grant select on public.courses to authenticated;
grant select on public.lessons to authenticated;
grant select, insert, update, delete on public.course_assets to authenticated;

do $$
declare
  v_course_id bigint;
  v_module_count integer;
begin
  select id into v_course_id
  from public.courses
  where lower(course_name) in ('forex training division', 'forex anatomy', 'forex foundations')
  order by case when lower(course_name) = 'forex training division' then 0 else 1 end, id
  limit 1;

  if v_course_id is null then
    return;
  end if;

  select count(*) into v_module_count
  from public.course_assets
  where course_id = v_course_id
    and asset_type = 'Module';

  if v_module_count = 0 then
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
      asset_status,
      display_order,
      description,
      uploaded_by_email
    )
    values (
      v_course_id,
      1,
      'Introduction to Forex Anatomy',
      'Introduction to Forex Anatomy',
      'Module',
      'introduction-to-forex-anatomy.json',
      'Module',
      'modules/' || v_course_id || '/1-introduction-to-forex-anatomy',
      '#',
      '#',
      '{"description":"A draft module introducing the Forex market as a living system.","objectives":"Understand structure, liquidity, and institutional behavior.","duration":"3 lessons","required":true}',
      'application/json',
      'Draft',
      1,
      'A draft module introducing the Forex market as a living system.',
      'system'
    )
    on conflict (storage_path) do nothing;

    insert into public.lessons (
      course_id,
      module_id,
      lesson_title,
      title,
      slug,
      description,
      lesson_summary,
      lesson_order,
      video_type,
      publication_status,
      free_preview,
      required_completion,
      updated_at
    )
    values
      (v_course_id, 1, 'Understanding the Forex Market as a Living System', 'Understanding the Forex Market as a Living System', 'forex-market-living-system', 'Draft lesson for the Forex Training Division course builder.', 'Introduces the market as a coordinated system of participants, liquidity, and economic force.', 1, 'Text-only lesson', 'Draft', true, true, now()),
      (v_course_id, 1, 'The Skeleton: Market Structure', 'The Skeleton: Market Structure', 'the-skeleton-market-structure', 'Draft lesson for the Forex Training Division course builder.', 'Frames market structure as the readable skeleton of price movement.', 2, 'Text-only lesson', 'Draft', false, true, now()),
      (v_course_id, 1, 'The Heart: Liquidity', 'The Heart: Liquidity', 'the-heart-liquidity', 'Draft lesson for the Forex Training Division course builder.', 'Explains liquidity as the condition that allows orders to fill and markets to move.', 3, 'Text-only lesson', 'Draft', false, true, now())
    on conflict (course_id, slug) do nothing;
  end if;
end $$;

notify pgrst, 'reload schema';

commit;
