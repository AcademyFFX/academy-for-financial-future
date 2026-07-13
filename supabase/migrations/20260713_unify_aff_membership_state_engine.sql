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
  account_status text not null default 'Restricted',
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
  add column if not exists account_status text not null default 'Restricted',
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

create or replace function public.aff_normalize_membership_plan(plan_value text)
returns text
language sql
immutable
as $$
  select case trim(coalesce(plan_value, ''))
    when 'Monthly Membership' then 'Monthly Membership'
    when 'Annual Membership' then 'Annual Membership'
    when 'Premium Mentorship' then 'Premium Mentorship'
    when 'Certification Fee' then 'Certification Fee'
    else 'Free Trial'
  end;
$$;

update public.student_memberships sm
set
  selected_membership_plan = public.aff_normalize_membership_plan(
    case
      when public.aff_normalize_membership_plan(sm.active_membership_plan) <> 'Free Trial' then sm.active_membership_plan
      else coalesce(nullif(sm.selected_membership_plan, ''), nullif(sm.membership_plan, ''), 'Free Trial')
    end
  ),
  active_membership_plan = public.aff_normalize_membership_plan(
    case
      when public.aff_normalize_membership_plan(sm.active_membership_plan) <> 'Free Trial' then sm.active_membership_plan
      else 'Free Trial'
    end
  ),
  membership_plan = public.aff_normalize_membership_plan(
    case
      when public.aff_normalize_membership_plan(sm.active_membership_plan) <> 'Free Trial' then sm.active_membership_plan
      else 'Free Trial'
    end
  ),
  payment_status = case
    when public.aff_normalize_membership_plan(sm.active_membership_plan) <> 'Free Trial' then 'Paid'
    when public.aff_normalize_membership_plan(coalesce(nullif(sm.selected_membership_plan, ''), sm.membership_plan)) = 'Free Trial' then 'Not Required'
    else 'Pending'
  end,
  membership_status = case
    when public.aff_normalize_membership_plan(sm.active_membership_plan) <> 'Free Trial' then 'Active Membership'
    when public.aff_normalize_membership_plan(coalesce(nullif(sm.selected_membership_plan, ''), sm.membership_plan)) = 'Free Trial' then 'Free Trial'
    else 'Pending Payment'
  end,
  account_status = case
    when public.aff_normalize_membership_plan(sm.active_membership_plan) <> 'Free Trial' then 'Active'
    when public.aff_normalize_membership_plan(coalesce(nullif(sm.selected_membership_plan, ''), sm.membership_plan)) = 'Free Trial' then 'Trial'
    else 'Restricted'
  end,
  paid_at = case
    when public.aff_normalize_membership_plan(sm.active_membership_plan) <> 'Free Trial' then coalesce(sm.paid_at, now())
    else sm.paid_at
  end,
  activated_at = case
    when public.aff_normalize_membership_plan(sm.active_membership_plan) <> 'Free Trial' then coalesce(sm.activated_at, now())
    else sm.activated_at
  end,
  updated_at = now();

update public.students s
set membership_plan = sm.active_membership_plan
from public.student_memberships sm
where s.auth_user_id = sm.student_id
  and s.membership_plan is distinct from sm.active_membership_plan;

create or replace function public.validate_aff_membership_state()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_plan text := public.aff_normalize_membership_plan(new.selected_membership_plan);
  current_plan text := public.aff_normalize_membership_plan(coalesce(new.active_membership_plan, new.membership_plan));
begin
  if new.membership_status = 'Suspended' or new.account_status = 'Suspended' then
    new.selected_membership_plan := case when selected_plan = 'Free Trial' then current_plan else selected_plan end;
    new.active_membership_plan := current_plan;
    new.membership_plan := current_plan;
    new.payment_status := case when new.payment_status = 'Paid' then 'Paid' else 'Pending' end;
    new.membership_status := 'Suspended';
    new.account_status := 'Suspended';
  elsif new.membership_status = 'Cancelled' or new.account_status = 'Cancelled' then
    new.selected_membership_plan := 'Free Trial';
    new.active_membership_plan := 'Free Trial';
    new.membership_plan := 'Free Trial';
    new.payment_status := 'Not Required';
    new.membership_status := 'Cancelled';
    new.account_status := 'Cancelled';
  elsif current_plan <> 'Free Trial' then
    new.selected_membership_plan := current_plan;
    new.active_membership_plan := current_plan;
    new.membership_plan := current_plan;
    new.payment_status := 'Paid';
    new.membership_status := 'Active Membership';
    new.account_status := 'Active';
    new.paid_at := coalesce(new.paid_at, now());
    new.activated_at := coalesce(new.activated_at, now());
  elsif selected_plan = 'Free Trial' then
    new.selected_membership_plan := 'Free Trial';
    new.active_membership_plan := 'Free Trial';
    new.membership_plan := 'Free Trial';
    new.payment_status := 'Not Required';
    new.membership_status := 'Free Trial';
    new.account_status := 'Trial';
  else
    new.selected_membership_plan := selected_plan;
    new.active_membership_plan := 'Free Trial';
    new.membership_plan := 'Free Trial';
    new.payment_status := 'Pending';
    new.membership_status := 'Pending Payment';
    new.account_status := 'Restricted';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'validate_aff_membership_state_before_write'
      and tgrelid = 'public.student_memberships'::regclass
  ) then
    create trigger validate_aff_membership_state_before_write
    before insert or update on public.student_memberships
    for each row
    execute function public.validate_aff_membership_state();
  end if;
end;
$$;

create or replace function public.get_aff_student_directory()
returns table (
  student_id text,
  full_name text,
  email text,
  enrollment_date text,
  certification_level text,
  enrollment_status text,
  active_membership_plan text,
  membership_status text,
  payment_status text,
  account_status text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.student_id::text,
    s.full_name::text,
    s.email::text,
    s.enrollment_date::text,
    s.certification_level::text,
    s.status::text as enrollment_status,
    coalesce(sm.active_membership_plan, s.membership_plan, 'Free Trial')::text as active_membership_plan,
    coalesce(sm.membership_status, 'Free Trial')::text as membership_status,
    coalesce(sm.payment_status, 'Not Required')::text as payment_status,
    coalesce(sm.account_status, 'Trial')::text as account_status
  from public.students s
  left join public.student_memberships sm
    on s.auth_user_id = sm.student_id
  where lower(trim(coalesce(s.status, ''))) = 'active'
  order by s.full_name asc;
$$;

grant execute on function public.get_aff_student_directory() to authenticated;

create or replace view public.aff_membership_audit as
select
  s.student_id as aff_student_id,
  s.full_name,
  s.email,
  s.status as enrollment_status,
  sm.selected_membership_plan,
  sm.active_membership_plan as current_plan,
  sm.payment_status,
  sm.membership_status,
  sm.account_status,
  case
    when sm.selected_membership_plan = 'Free Trial'
      and sm.active_membership_plan = 'Free Trial'
      and sm.payment_status = 'Not Required'
      and sm.membership_status = 'Free Trial'
      and sm.account_status = 'Trial' then 'Valid Free Trial'
    when sm.selected_membership_plan in ('Monthly Membership', 'Annual Membership', 'Premium Mentorship', 'Certification Fee')
      and sm.active_membership_plan = sm.selected_membership_plan
      and sm.payment_status = 'Paid'
      and sm.membership_status = 'Active Membership'
      and sm.account_status = 'Active' then 'Valid Paid Membership'
    when sm.payment_status = 'Pending'
      and sm.membership_status = 'Pending Payment'
      and sm.account_status = 'Restricted' then 'Valid Pending Payment'
    else 'Needs Review'
  end as membership_audit_status
from public.students s
left join public.student_memberships sm
  on s.auth_user_id = sm.student_id;

grant select on public.aff_membership_audit to authenticated;

notify pgrst, 'reload schema';

commit;
