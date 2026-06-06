-- Allow public certificate verification by certificate number and verification code.

alter table public.certificates enable row level security;

grant select on public.certificates to anon;

drop policy if exists "Public can verify certificates" on public.certificates;

create policy "Public can verify certificates"
on public.certificates
for select
to anon
using (true);

notify pgrst, 'reload schema';
