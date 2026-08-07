begin;

alter table public.lessons add column if not exists video_provider text;
alter table public.lessons add column if not exists video_url text;
alter table public.lessons add column if not exists video_title text;
alter table public.lessons add column if not exists video_duration_seconds integer;
alter table public.lessons add column if not exists video_thumbnail_url text;
alter table public.lessons add column if not exists video_type text not null default 'Text-only lesson';
alter table public.lessons add column if not exists updated_at timestamptz not null default now();

alter table public.lessons
  drop constraint if exists lessons_video_provider_check;

alter table public.lessons
  add constraint lessons_video_provider_check
  check (
    video_provider is null
    or lower(video_provider) in ('none', 'youtube', 'vimeo', 'mp4', 'uploaded_video', 'bunny', 'embed')
  );

alter table public.lessons enable row level security;

grant select on public.lessons to authenticated;
grant update (
  video_provider,
  video_url,
  video_title,
  video_duration_seconds,
  video_thumbnail_url,
  video_type,
  updated_at
) on public.lessons to authenticated;

drop policy if exists "AFF admins can update lesson video metadata" on public.lessons;

create policy "AFF admins can update lesson video metadata"
on public.lessons
for update
to authenticated
using (public.is_aff_admin())
with check (public.is_aff_admin());

notify pgrst, 'reload schema';

commit;
