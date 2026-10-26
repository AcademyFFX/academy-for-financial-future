begin;

-- Chart Analyst predates the canonical AFF administrator role table. Keep
-- student ownership intact while authorizing every active AFF administrator.
drop policy if exists "Students can read own chart analyst reports" on public.chart_analyst_reports;
create policy "Students can read own chart analyst reports"
on public.chart_analyst_reports for select
to authenticated
using (auth.uid() = student_id or public.is_aff_admin());

drop policy if exists "Admin can manage chart analyst reports" on public.chart_analyst_reports;
create policy "Admin can manage chart analyst reports"
on public.chart_analyst_reports for all
to authenticated
using (public.is_aff_admin())
with check (public.is_aff_admin());

drop policy if exists "Students can read own chart analyst usage" on public.chart_analyst_usage_events;
create policy "Students can read own chart analyst usage"
on public.chart_analyst_usage_events for select
to authenticated
using (auth.uid() = student_id or public.is_aff_admin());

drop policy if exists "Admin can manage chart analyst usage" on public.chart_analyst_usage_events;
create policy "Admin can manage chart analyst usage"
on public.chart_analyst_usage_events for all
to authenticated
using (public.is_aff_admin())
with check (public.is_aff_admin());

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
