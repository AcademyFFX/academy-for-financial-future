insert into storage.buckets (id, name, public)
values ('chart-analyst-uploads', 'chart-analyst-uploads', true)
on conflict (id) do update set public = excluded.public;

create table if not exists public.chart_analyst_reports (
  id bigserial primary key,
  student_id uuid references auth.users(id) on delete cascade,
  file_name text not null,
  file_type text,
  file_size bigint not null default 0,
  storage_path text not null,
  public_url text,
  platform text not null default 'TradingView',
  dr_moricette_review_mode boolean not null default false,
  student_notes text,
  summary text not null,
  overall_grade numeric(5,2) not null default 0,
  risk_rating text not null default 'Moderate',
  sections jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.chart_analyst_usage_events (
  id bigserial primary key,
  student_id uuid references auth.users(id) on delete cascade,
  report_id bigint references public.chart_analyst_reports(id) on delete cascade,
  platform text not null default 'TradingView',
  file_type text,
  review_mode boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.chart_analyst_reports enable row level security;
alter table public.chart_analyst_usage_events enable row level security;

drop policy if exists "Students can read own chart analyst reports" on public.chart_analyst_reports;
create policy "Students can read own chart analyst reports"
on public.chart_analyst_reports for select
to authenticated
using (auth.uid() = student_id or (auth.jwt() ->> 'email') = 'acafffx@gmail.com');

drop policy if exists "Students can insert own chart analyst reports" on public.chart_analyst_reports;
create policy "Students can insert own chart analyst reports"
on public.chart_analyst_reports for insert
to authenticated
with check (auth.uid() = student_id);

drop policy if exists "Admin can manage chart analyst reports" on public.chart_analyst_reports;
create policy "Admin can manage chart analyst reports"
on public.chart_analyst_reports for all
to authenticated
using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com')
with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

drop policy if exists "Students can read own chart analyst usage" on public.chart_analyst_usage_events;
create policy "Students can read own chart analyst usage"
on public.chart_analyst_usage_events for select
to authenticated
using (auth.uid() = student_id or (auth.jwt() ->> 'email') = 'acafffx@gmail.com');

drop policy if exists "Students can insert own chart analyst usage" on public.chart_analyst_usage_events;
create policy "Students can insert own chart analyst usage"
on public.chart_analyst_usage_events for insert
to authenticated
with check (auth.uid() = student_id);

drop policy if exists "Admin can manage chart analyst usage" on public.chart_analyst_usage_events;
create policy "Admin can manage chart analyst usage"
on public.chart_analyst_usage_events for all
to authenticated
using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com')
with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

drop policy if exists "Students can upload own chart analyst files" on storage.objects;
create policy "Students can upload own chart analyst files"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'chart-analyst-uploads'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Students can read chart analyst files" on storage.objects;
create policy "Students can read chart analyst files"
on storage.objects for select
to authenticated
using (
  bucket_id = 'chart-analyst-uploads'
  and (auth.uid()::text = (storage.foldername(name))[1] or (auth.jwt() ->> 'email') = 'acafffx@gmail.com')
);

drop policy if exists "Students can update own chart analyst files" on storage.objects;
create policy "Students can update own chart analyst files"
on storage.objects for update
to authenticated
using (
  bucket_id = 'chart-analyst-uploads'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'chart-analyst-uploads'
  and auth.uid()::text = (storage.foldername(name))[1]
);

grant select, insert, update, delete on public.chart_analyst_reports to authenticated;
grant select, insert, update, delete on public.chart_analyst_usage_events to authenticated;
grant usage, select on sequence public.chart_analyst_reports_id_seq to authenticated;
grant usage, select on sequence public.chart_analyst_usage_events_id_seq to authenticated;

notify pgrst, 'reload schema';
