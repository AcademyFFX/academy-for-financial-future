alter table public.certificates
  add column if not exists completion_date date,
  add column if not exists qr_payload text,
  add column if not exists certificate_pdf_url text,
  add column if not exists instructor_name text not null default 'Dr. Jean Rene Moricette',
  add column if not exists certification_status text not null default 'Verified';

update public.certificates
set completion_date = coalesce(completion_date, issue_date),
    instructor_name = coalesce(instructor_name, 'Dr. Jean Rene Moricette'),
    certification_status = coalesce(certification_status, 'Verified');

insert into storage.buckets (id, name, public, file_size_limit)
values ('certificates', 'certificates', true, 10485760)
on conflict (id) do update
set public = true,
    file_size_limit = 10485760;

alter table public.certificates enable row level security;

grant select, insert on public.certificates to authenticated;
grant select on public.certificates to anon;

drop policy if exists "Students can read own certificates" on public.certificates;
drop policy if exists "Students can create own certificates" on public.certificates;
drop policy if exists "Public can verify certificates" on public.certificates;

create policy "Students can read own certificates"
on public.certificates
for select
to authenticated
using (auth.uid() = student_id);

create policy "Students can create own certificates"
on public.certificates
for insert
to authenticated
with check (auth.uid() = student_id);

create policy "Public can verify certificates"
on public.certificates
for select
to anon
using (true);

drop policy if exists "Students can upload own certificate PDFs" on storage.objects;
drop policy if exists "Public can read certificate PDFs" on storage.objects;

create policy "Students can upload own certificate PDFs"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'certificates'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Public can read certificate PDFs"
on storage.objects
for select
to anon
using (bucket_id = 'certificates');

notify pgrst, 'reload schema';
