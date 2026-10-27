begin;

-- Active AFF administrators need institution-wide read access for academic analytics.
drop policy if exists "AFF admins can read all lesson progress" on public.lesson_progress;
create policy "AFF admins can read all lesson progress"
on public.lesson_progress
for select
to authenticated
using (public.is_aff_admin());

-- Replace the retired email-specific membership policies with the shared role resolver.
drop policy if exists "AFF administrator can manage memberships" on public.student_memberships;
create policy "AFF administrators can manage memberships"
on public.student_memberships
for all
to authenticated
using (public.is_aff_admin())
with check (public.is_aff_admin());

drop policy if exists "Students can read their membership" on public.student_memberships;
create policy "Students can read their membership"
on public.student_memberships
for select
to authenticated
using (auth.uid() = student_id or public.is_aff_admin());

drop policy if exists "Students can update their membership checkout state" on public.student_memberships;
create policy "Students can update their membership checkout state"
on public.student_memberships
for update
to authenticated
using (auth.uid() = student_id or public.is_aff_admin())
with check (auth.uid() = student_id or public.is_aff_admin());

-- The legacy certificate registry remains readable by its owner and active AFF administrators.
drop policy if exists "AFF admin can manage dashboard certificates" on public.certificates;
create policy "AFF administrators can manage legacy certificates"
on public.certificates
for all
to authenticated
using (public.is_aff_admin())
with check (public.is_aff_admin());

drop policy if exists "Students can read own dashboard certificates" on public.certificates;
create policy "Students can read own dashboard certificates"
on public.certificates
for select
to authenticated
using (auth.uid() = student_id or public.is_aff_admin());

notify pgrst, 'reload schema';

commit;
