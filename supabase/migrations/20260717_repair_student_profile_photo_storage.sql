begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'student-profile-photos',
  'student-profile-photos',
  true,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Students can upload own profile photo" on storage.objects;
drop policy if exists "Students can read profile photos" on storage.objects;
drop policy if exists "Students can update own profile photo" on storage.objects;
drop policy if exists "AFF administrator can manage profile photos" on storage.objects;
drop policy if exists "Public can read student profile photos" on storage.objects;
drop policy if exists "Authenticated students can upload own profile photos" on storage.objects;
drop policy if exists "Authenticated students can update own profile photos" on storage.objects;

create policy "Public can read student profile photos"
on storage.objects
for select
to public
using (bucket_id = 'student-profile-photos');

create policy "Authenticated students can upload own profile photos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'student-profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Authenticated students can update own profile photos"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'student-profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'student-profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

notify pgrst, 'reload schema';

commit;
