begin;

alter table public.digital_certificates enable row level security;

-- Public verification exposes only credentials that remain valid. The public
-- portal selects a deliberately small field set from this read-only policy.
drop policy if exists "Public can verify digital certificates" on public.digital_certificates;
create policy "Public can verify digital certificates"
on public.digital_certificates
for select
to anon
using (status = 'Valid');

revoke insert, update, delete, truncate, references, trigger
on public.digital_certificates
from anon;

grant select on public.digital_certificates to anon;

notify pgrst, 'reload schema';

commit;
