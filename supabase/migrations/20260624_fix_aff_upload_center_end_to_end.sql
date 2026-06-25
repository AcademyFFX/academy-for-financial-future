create extension if not exists pgcrypto;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'aff-course-assets',
  'aff-course-assets',
  true,
  524288000,
  array[
    'video/mp4',
    'video/quicktime',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/png',
    'image/jpeg',
    'image/webp'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.lms_course_assets (
  id uuid primary key default gen_random_uuid(),
  course_id bigint not null references public.lms_courses(id) on delete cascade,
  module_id bigint references public.lms_modules(id) on delete set null,
  lesson_id bigint references public.lms_lessons(id) on delete set null,
  asset_title text not null,
  asset_type text not null,
  file_name text not null,
  file_type text,
  storage_path text not null unique,
  public_url text not null,
  signed_url text,
  mime_type text,
  file_size bigint not null default 0,
  asset_status text not null default 'Published',
  uploaded_by text not null default 'acafffx@gmail.com',
  uploaded_by_email text,
  uploaded_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.lms_course_assets add column if not exists file_type text;
alter table public.lms_course_assets add column if not exists signed_url text;
alter table public.lms_course_assets add column if not exists uploaded_by_email text;
alter table public.lms_course_assets add column if not exists uploaded_by_user_id uuid references auth.users(id) on delete set null;
alter table public.lms_course_assets add column if not exists created_at timestamptz not null default now();
alter table public.lms_course_assets add column if not exists updated_at timestamptz not null default now();

alter table public.lms_course_assets drop constraint if exists lms_course_asset_type_check;
alter table public.lms_course_assets add constraint lms_course_asset_type_check
check (asset_type in ('Video', 'PDF Notes', 'PowerPoint', 'Assignment', 'Course Thumbnail'));

alter table public.lms_course_assets drop constraint if exists lms_course_asset_status_check;
alter table public.lms_course_assets add constraint lms_course_asset_status_check
check (asset_status in ('Draft', 'Published', 'Archived'));

create index if not exists lms_course_assets_course_idx on public.lms_course_assets (course_id, asset_type, created_at desc);
create index if not exists lms_course_assets_lesson_idx on public.lms_course_assets (lesson_id, asset_type);
create index if not exists lms_course_assets_uploaded_by_user_idx on public.lms_course_assets (uploaded_by_user_id, created_at desc);

alter table public.lms_course_assets enable row level security;

drop policy if exists "Authenticated users can read published LMS assets" on public.lms_course_assets;
drop policy if exists "AFF admin can manage LMS assets" on public.lms_course_assets;

create policy "Authenticated users can read published LMS assets"
on public.lms_course_assets for select to authenticated
using (asset_status = 'Published' or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

create policy "AFF admin can manage LMS assets"
on public.lms_course_assets for all to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read AFF course storage" on storage.objects;
drop policy if exists "AFF admin can upload course storage" on storage.objects;
drop policy if exists "AFF admin can update course storage" on storage.objects;
drop policy if exists "AFF admin can delete course storage" on storage.objects;

create policy "Authenticated users can read AFF course storage"
on storage.objects for select to authenticated
using (bucket_id = 'aff-course-assets');

create policy "AFF admin can upload course storage"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'aff-course-assets'
  and lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com'
);

create policy "AFF admin can update course storage"
on storage.objects for update to authenticated
using (
  bucket_id = 'aff-course-assets'
  and lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com'
)
with check (
  bucket_id = 'aff-course-assets'
  and lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com'
);

create policy "AFF admin can delete course storage"
on storage.objects for delete to authenticated
using (
  bucket_id = 'aff-course-assets'
  and lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com'
);

grant select, insert, update, delete on public.lms_course_assets to authenticated;

notify pgrst, 'reload schema';
