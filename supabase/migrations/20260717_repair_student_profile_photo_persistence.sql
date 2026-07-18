begin;

alter table public.student_profiles
  add column if not exists profile_photo_url text,
  add column if not exists updated_at timestamptz not null default now();

grant select, insert, update on public.student_profiles to authenticated;

drop policy if exists "Students can create own student profile" on public.student_profiles;

create policy "Students can create own student profile"
on public.student_profiles
for insert
to authenticated
with check (auth.uid() = auth_user_id);

notify pgrst, 'reload schema';

commit;
