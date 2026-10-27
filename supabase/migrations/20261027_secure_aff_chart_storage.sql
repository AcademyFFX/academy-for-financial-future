begin;

-- Chart submissions contain student-owned academic work. Keep the existing
-- objects and paths, but require an authenticated owner or AFF administrator
-- to obtain a short-lived signed URL.
insert into storage.buckets (id, name, public)
values ('chart-analyst-uploads', 'chart-analyst-uploads', false)
on conflict (id) do update
set public = false;

drop policy if exists "Students can read chart analyst files" on storage.objects;
create policy "Students can read chart analyst files"
on storage.objects for select
to authenticated
using (
  bucket_id = 'chart-analyst-uploads'
  and (
    auth.uid()::text = (storage.foldername(name))[1]
    or public.is_aff_admin()
  )
);

notify pgrst, 'reload schema';

commit;
