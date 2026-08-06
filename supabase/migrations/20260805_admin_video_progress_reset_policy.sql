begin;

alter table public.video_progress enable row level security;

grant select, delete on public.video_progress to authenticated;

drop policy if exists "AFF admins can manage video progress" on public.video_progress;

create policy "AFF admins can manage video progress"
on public.video_progress
for all
to authenticated
using (public.is_aff_admin())
with check (public.is_aff_admin());

notify pgrst, 'reload schema';

commit;
