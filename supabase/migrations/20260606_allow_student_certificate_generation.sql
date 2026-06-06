-- Allow authenticated students to create their own certificate records from /certificates.

alter table public.certificates enable row level security;

grant select, insert on public.certificates to authenticated;

drop policy if exists "Students can create own certificates" on public.certificates;

create policy "Students can create own certificates"
on public.certificates
for insert
to authenticated
with check (auth.uid() = student_id);

notify pgrst, 'reload schema';
