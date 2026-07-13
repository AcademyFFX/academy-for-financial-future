begin;

create table if not exists public.student_memberships (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  student_email text,
  selected_membership_plan text not null default 'Free Trial',
  active_membership_plan text not null default 'Free Trial',
  membership_plan text not null default 'Free Trial',
  payment_status text not null default 'Pending',
  membership_status text not null default 'Pending Payment',
  account_status text not null default 'Active',
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_checkout_session_id text,
  paid_at timestamptz,
  activated_at timestamptz,
  suspended_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.student_memberships
  add column if not exists student_email text,
  add column if not exists selected_membership_plan text not null default 'Free Trial',
  add column if not exists active_membership_plan text not null default 'Free Trial',
  add column if not exists membership_plan text not null default 'Free Trial',
  add column if not exists payment_status text not null default 'Pending',
  add column if not exists membership_status text not null default 'Pending Payment',
  add column if not exists account_status text not null default 'Active',
  add column if not exists trial_ends_at timestamptz,
  add column if not exists current_period_end timestamptz,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_checkout_session_id text,
  add column if not exists paid_at timestamptz,
  add column if not exists activated_at timestamptz,
  add column if not exists suspended_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists student_memberships_student_id_key
on public.student_memberships (student_id);

create or replace view public.aff_student_directory as
select
  s.id,
  s.student_id as aff_student_id,
  s.full_name,
  s.email,
  s.certification_level,
  s.enrollment_date,
  s.status as enrollment_status,
  s.profile_photo_url,
  coalesce(sm.active_membership_plan, s.membership_plan, 'Free Trial') as active_membership_plan,
  coalesce(sm.membership_status, 'Pending Payment') as membership_status
from public.students s
left join public.student_memberships sm
  on s.auth_user_id = sm.student_id
where lower(coalesce(s.status, '')) = 'active';

grant select on public.aff_student_directory to authenticated;

alter table public.student_memberships enable row level security;

grant select, insert, update on public.student_memberships to authenticated;

drop policy if exists "Students can read their membership" on public.student_memberships;
create policy "Students can read their membership"
on public.student_memberships
for select
to authenticated
using (
  auth.uid() = student_id
  or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com'
);

drop policy if exists "Students can create their membership" on public.student_memberships;
create policy "Students can create their membership"
on public.student_memberships
for insert
to authenticated
with check (
  auth.uid() = student_id
  or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com'
);

drop policy if exists "Students can update their membership checkout state" on public.student_memberships;
create policy "Students can update their membership checkout state"
on public.student_memberships
for update
to authenticated
using (
  auth.uid() = student_id
  or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com'
)
with check (
  auth.uid() = student_id
  or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com'
);

drop policy if exists "AFF administrator can manage memberships" on public.student_memberships;
create policy "AFF administrator can manage memberships"
on public.student_memberships
for all
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

notify pgrst, 'reload schema';

commit;
