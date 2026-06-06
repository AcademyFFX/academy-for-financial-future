-- AFF Admin Dashboard support.
-- This migration only creates the announcements table used by /admin.

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

notify pgrst, 'reload schema';
