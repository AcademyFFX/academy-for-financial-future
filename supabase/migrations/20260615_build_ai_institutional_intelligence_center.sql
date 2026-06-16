create table if not exists public.ai_center_recommendations (
  id bigserial primary key,
  student_id uuid references auth.users(id) on delete cascade,
  recommendation_type text not null default 'Learning Insight',
  title text not null,
  body text not null,
  priority text not null default 'Medium',
  target_href text,
  status text not null default 'Active',
  created_at timestamptz not null default now(),
  constraint ai_center_recommendations_priority_check check (priority in ('Low', 'Medium', 'High')),
  constraint ai_center_recommendations_status_check check (status in ('Active', 'Completed', 'Archived'))
);

create table if not exists public.ai_center_study_plans (
  id bigserial primary key,
  student_id uuid not null references auth.users(id) on delete cascade,
  student_name text,
  plan_title text not null,
  weakness_area text not null,
  recommended_action text not null,
  progress_prediction text not null default 'Improving',
  target_completion_date date,
  status text not null default 'Active',
  created_at timestamptz not null default now()
);

create table if not exists public.ai_center_usage_events (
  id bigserial primary key,
  student_id uuid references auth.users(id) on delete cascade,
  student_name text,
  module_name text not null,
  event_type text not null,
  event_detail text,
  created_at timestamptz not null default now()
);

alter table public.ai_center_recommendations enable row level security;
alter table public.ai_center_study_plans enable row level security;
alter table public.ai_center_usage_events enable row level security;

drop policy if exists "Students can read own AI center recommendations" on public.ai_center_recommendations;
drop policy if exists "AFF admin can manage AI center recommendations" on public.ai_center_recommendations;
drop policy if exists "Students can read own AI study plans" on public.ai_center_study_plans;
drop policy if exists "Students can create own AI study plans" on public.ai_center_study_plans;
drop policy if exists "AFF admin can manage AI study plans" on public.ai_center_study_plans;
drop policy if exists "Students can create own AI usage events" on public.ai_center_usage_events;
drop policy if exists "Students can read own AI usage events" on public.ai_center_usage_events;
drop policy if exists "AFF admin can manage AI usage events" on public.ai_center_usage_events;

create policy "Students can read own AI center recommendations" on public.ai_center_recommendations for select to authenticated using (student_id is null or auth.uid() = student_id or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF admin can manage AI center recommendations" on public.ai_center_recommendations for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Students can read own AI study plans" on public.ai_center_study_plans for select to authenticated using (auth.uid() = student_id or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Students can create own AI study plans" on public.ai_center_study_plans for insert to authenticated with check (auth.uid() = student_id);
create policy "AFF admin can manage AI study plans" on public.ai_center_study_plans for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Students can create own AI usage events" on public.ai_center_usage_events for insert to authenticated with check (auth.uid() = student_id);
create policy "Students can read own AI usage events" on public.ai_center_usage_events for select to authenticated using (auth.uid() = student_id or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF admin can manage AI usage events" on public.ai_center_usage_events for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

grant select, insert, update, delete on public.ai_center_recommendations to authenticated;
grant select, insert, update, delete on public.ai_center_study_plans to authenticated;
grant select, insert, update, delete on public.ai_center_usage_events to authenticated;
grant usage, select on sequence public.ai_center_recommendations_id_seq to authenticated;
grant usage, select on sequence public.ai_center_study_plans_id_seq to authenticated;
grant usage, select on sequence public.ai_center_usage_events_id_seq to authenticated;

insert into public.ai_center_recommendations (recommendation_type, title, body, priority, target_href)
values
  ('Learning Insight', 'Review Market Structure', 'Strengthen higher highs, higher lows, lower highs, lower lows, and trend structure before certification review.', 'High', '/ai-coach'),
  ('Weakness Analysis', 'Practice Risk Management Explanations', 'Use the AI Voice Coach to explain position sizing, stop loss placement, and risk percentage in a clear professional voice.', 'Medium', '/voice-coach'),
  ('Progress Prediction', 'Submit One Chart for AI Review', 'Upload a TradingView, MT4, or MT5 screenshot so the AI Chart Analyst can identify liquidity zones and risk/reward quality.', 'Medium', '/chart-analyst'),
  ('Academic Advisor', 'Map Degree and Certification Roadmap', 'Use the Academic Advisor panel to connect certifications, course credits, and graduation readiness.', 'High', '/degrees')
on conflict do nothing;

notify pgrst, 'reload schema';
