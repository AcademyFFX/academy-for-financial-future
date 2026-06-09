create table if not exists public.simulator_accounts (
  id bigserial primary key,
  student_id uuid not null references auth.users(id) on delete cascade,
  demo_balance numeric not null default 100000,
  total_points integer not null default 0,
  total_badges integer not null default 0,
  certification_credits integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id),
  constraint simulator_accounts_balance_check check (demo_balance >= 0),
  constraint simulator_accounts_points_check check (total_points >= 0 and total_badges >= 0 and certification_credits >= 0)
);

create table if not exists public.simulator_attempts (
  id bigserial primary key,
  student_id uuid not null references auth.users(id) on delete cascade,
  scenario_id text not null,
  scenario_title text not null,
  category text not null,
  pair text not null,
  decision_label text not null,
  direction text not null,
  risk_percent numeric not null default 0,
  outcome_pips integer not null default 0,
  profit_loss numeric not null default 0,
  points integer not null default 0,
  badge_awarded text,
  certification_credits integer not null default 0,
  journal_notes text,
  simulator_feedback text,
  instructor_feedback text,
  review_status text not null default 'Submitted',
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint simulator_attempts_direction_check check (direction in ('Buy', 'Sell', 'No Trade')),
  constraint simulator_attempts_review_status_check check (review_status in ('Submitted', 'Reviewed', 'Needs Revision', 'Excellent')),
  constraint simulator_attempts_risk_check check (risk_percent >= 0 and risk_percent <= 5),
  constraint simulator_attempts_points_check check (points >= 0 and certification_credits >= 0)
);

create index if not exists simulator_attempts_student_created_idx
on public.simulator_attempts (student_id, created_at desc);

create index if not exists simulator_attempts_review_status_idx
on public.simulator_attempts (review_status, created_at desc);

alter table public.simulator_accounts enable row level security;
alter table public.simulator_attempts enable row level security;

drop policy if exists "Students can read own simulator account" on public.simulator_accounts;
drop policy if exists "Students can create own simulator account" on public.simulator_accounts;
drop policy if exists "Students can update own simulator account" on public.simulator_accounts;
drop policy if exists "AFF administrator can manage simulator accounts" on public.simulator_accounts;
drop policy if exists "Students can read own simulator attempts" on public.simulator_attempts;
drop policy if exists "Students can create own simulator attempts" on public.simulator_attempts;
drop policy if exists "AFF administrator can review simulator attempts" on public.simulator_attempts;

create policy "Students can read own simulator account"
on public.simulator_accounts
for select
to authenticated
using (auth.uid() = student_id or (auth.jwt() ->> 'email') = 'acafffx@gmail.com');

create policy "Students can create own simulator account"
on public.simulator_accounts
for insert
to authenticated
with check (auth.uid() = student_id);

create policy "Students can update own simulator account"
on public.simulator_accounts
for update
to authenticated
using (auth.uid() = student_id)
with check (auth.uid() = student_id);

create policy "AFF administrator can manage simulator accounts"
on public.simulator_accounts
for all
to authenticated
using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com')
with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

create policy "Students can read own simulator attempts"
on public.simulator_attempts
for select
to authenticated
using (auth.uid() = student_id or (auth.jwt() ->> 'email') = 'acafffx@gmail.com');

create policy "Students can create own simulator attempts"
on public.simulator_attempts
for insert
to authenticated
with check (auth.uid() = student_id);

create policy "AFF administrator can review simulator attempts"
on public.simulator_attempts
for update
to authenticated
using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com')
with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

grant select, insert, update on public.simulator_accounts to authenticated;
grant select, insert, update on public.simulator_attempts to authenticated;
grant usage on sequence public.simulator_accounts_id_seq to authenticated;
grant usage on sequence public.simulator_attempts_id_seq to authenticated;

notify pgrst, 'reload schema';
