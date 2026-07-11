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

alter table public.students
  add column if not exists membership_plan text not null default 'Free Trial';

create unique index if not exists student_memberships_student_id_key
on public.student_memberships (student_id);

update public.student_memberships sm
set
  selected_membership_plan = coalesce(nullif(sm.selected_membership_plan, ''), nullif(a.membership_plan, ''), nullif(sm.membership_plan, ''), 'Free Trial'),
  active_membership_plan = case
    when sm.payment_status = 'Paid' or sm.paid_at is not null then coalesce(nullif(sm.active_membership_plan, ''), nullif(sm.membership_plan, ''), 'Free Trial')
    else 'Free Trial'
  end,
  membership_plan = case
    when sm.payment_status = 'Paid' or sm.paid_at is not null then coalesce(nullif(sm.membership_plan, ''), nullif(sm.active_membership_plan, ''), 'Free Trial')
    else 'Free Trial'
  end,
  payment_status = case
    when sm.payment_status = 'Paid' or sm.paid_at is not null then 'Paid'
    when coalesce(nullif(a.membership_plan, ''), 'Free Trial') = 'Free Trial' then 'Not Required'
    else 'Pending'
  end,
  membership_status = case
    when sm.payment_status = 'Paid' or sm.paid_at is not null then 'Active'
    when coalesce(nullif(a.membership_plan, ''), 'Free Trial') = 'Free Trial' then 'Free Trial'
    else 'Pending Payment'
  end,
  account_status = 'Active',
  updated_at = now()
from public.student_applications a
where sm.student_id = a.auth_user_id
  and a.application_status = 'Approved';

insert into public.student_memberships (
  student_id,
  student_email,
  selected_membership_plan,
  active_membership_plan,
  membership_plan,
  payment_status,
  membership_status,
  account_status,
  created_at,
  updated_at
)
select
  a.auth_user_id,
  a.email,
  coalesce(nullif(a.membership_plan, ''), 'Free Trial'),
  'Free Trial',
  'Free Trial',
  case when coalesce(nullif(a.membership_plan, ''), 'Free Trial') = 'Free Trial' then 'Not Required' else 'Pending' end,
  case when coalesce(nullif(a.membership_plan, ''), 'Free Trial') = 'Free Trial' then 'Free Trial' else 'Pending Payment' end,
  'Active',
  now(),
  now()
from public.student_applications a
where a.application_status = 'Approved'
  and a.auth_user_id is not null
on conflict (student_id) do update
set
  student_email = coalesce(excluded.student_email, public.student_memberships.student_email),
  selected_membership_plan = excluded.selected_membership_plan,
  active_membership_plan = case
    when public.student_memberships.payment_status = 'Paid' or public.student_memberships.paid_at is not null then public.student_memberships.active_membership_plan
    else excluded.active_membership_plan
  end,
  membership_plan = case
    when public.student_memberships.payment_status = 'Paid' or public.student_memberships.paid_at is not null then public.student_memberships.membership_plan
    else excluded.membership_plan
  end,
  payment_status = case
    when public.student_memberships.payment_status = 'Paid' or public.student_memberships.paid_at is not null then 'Paid'
    else excluded.payment_status
  end,
  membership_status = case
    when public.student_memberships.payment_status = 'Paid' or public.student_memberships.paid_at is not null then 'Active'
    else excluded.membership_status
  end,
  account_status = 'Active',
  updated_at = now();

update public.students s
set membership_plan = coalesce(nullif(sm.active_membership_plan, ''), nullif(sm.membership_plan, ''), 'Free Trial')
from public.student_memberships sm
where s.auth_user_id = sm.student_id;

create index if not exists student_memberships_payment_status_idx
on public.student_memberships (student_id, payment_status, membership_status, account_status);

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
