begin;

alter table public.course_assets
  add column if not exists url text,
  add column if not exists description text,
  add column if not exists downloadable boolean not null default true,
  add column if not exists visibility text not null default 'Authenticated Students',
  add column if not exists display_order integer not null default 100;

create index if not exists course_assets_module_idx
on public.course_assets (course_id, module_id, display_order);

create index if not exists course_assets_display_order_idx
on public.course_assets (course_id, lesson_id, display_order);

notify pgrst, 'reload schema';

commit;
