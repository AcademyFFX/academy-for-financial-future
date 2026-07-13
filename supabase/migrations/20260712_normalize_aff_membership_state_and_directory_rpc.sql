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

update public.student_memberships sm
set
  selected_membership_plan = 'Free Trial',
  active_membership_plan = 'Free Trial',
  membership_plan = 'Free Trial',
  payment_status = 'Not Required',
  membership_status = 'Free Trial',
  account_status = 'Active',
  updated_at = now()
where coalesce(nullif(trim(sm.selected_membership_plan), ''), 'Free Trial') = 'Free Trial';

update public.student_memberships sm
set
  payment_status = 'Paid',
  membership_status = 'Active',
  account_status = 'Active',
  paid_at = coalesce(sm.paid_at, now()),
  activated_at = coalesce(sm.activated_at, now()),
  updated_at = now()
from public.students s
where s.auth_user_id = sm.student_id
  and lower(trim(coalesce(s.status, ''))) = 'active'
  and coalesce(nullif(trim(sm.selected_membership_plan), ''), 'Free Trial') <> 'Free Trial'
  and coalesce(nullif(trim(sm.active_membership_plan), ''), 'Free Trial') <> 'Free Trial'
  and (
    sm.payment_status is distinct from 'Paid'
    or sm.membership_status is distinct from 'Active'
    or sm.account_status is distinct from 'Active'
  );

update public.student_memberships sm
set
  active_membership_plan = 'Free Trial',
  membership_plan = 'Free Trial',
  payment_status = case
    when sm.payment_status = 'Paid' then 'Paid'
    else 'Pending'
  end,
  membership_status = case
    when sm.payment_status = 'Paid' then 'Pending Activation'
    else 'Pending Payment'
  end,
  account_status = 'Active',
  updated_at = now()
where coalesce(nullif(trim(sm.selected_membership_plan), ''), 'Free Trial') <> 'Free Trial'
  and coalesce(nullif(trim(sm.active_membership_plan), ''), 'Free Trial') = 'Free Trial'
  and (
    sm.payment_status is distinct from case when sm.payment_status = 'Paid' then 'Paid' else 'Pending' end
    or sm.membership_status in ('Free Trial', 'Not Enrolled', 'Pending Review')
    or coalesce(sm.account_status, '') in ('', 'Pending', 'Trial')
  );

update public.students s
set membership_plan = sm.active_membership_plan
from public.student_memberships sm
where s.auth_user_id = sm.student_id
  and sm.active_membership_plan <> 'Free Trial'
  and sm.payment_status = 'Paid'
  and sm.membership_status = 'Active'
  and s.membership_plan is distinct from sm.active_membership_plan;

create or replace function public.validate_aff_membership_state()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_plan text := coalesce(nullif(trim(new.selected_membership_plan), ''), 'Free Trial');
  active_plan text := coalesce(nullif(trim(new.active_membership_plan), ''), 'Free Trial');
begin
  new.selected_membership_plan := selected_plan;
  new.active_membership_plan := active_plan;
  new.membership_plan := coalesce(nullif(trim(new.membership_plan), ''), active_plan);
  new.payment_status := coalesce(nullif(trim(new.payment_status), ''), case when selected_plan = 'Free Trial' then 'Not Required' else 'Pending' end);
  new.membership_status := coalesce(nullif(trim(new.membership_status), ''), case when selected_plan = 'Free Trial' then 'Free Trial' else 'Pending Payment' end);
  new.account_status := coalesce(nullif(trim(new.account_status), ''), 'Active');

  if selected_plan = 'Free Trial' then
    new.active_membership_plan := 'Free Trial';
    new.membership_plan := 'Free Trial';
    new.payment_status := 'Not Required';
    new.membership_status := 'Free Trial';
    new.account_status := 'Active';
  else
    if new.payment_status = 'Not Required' then
      raise exception 'Invalid AFF membership state: paid membership % cannot use payment_status Not Required.', selected_plan
        using errcode = '23514';
    end if;

    if new.membership_status = 'Free Trial' then
      raise exception 'Invalid AFF membership state: paid membership % cannot use membership_status Free Trial.', selected_plan
        using errcode = '23514';
    end if;

    if active_plan <> 'Free Trial'
      and (new.payment_status <> 'Paid' or new.membership_status not in ('Active', 'Suspended', 'Cancelled')) then
      raise exception 'Invalid AFF membership state: active paid plan % requires Paid payment status and Active/Suspended/Cancelled membership status.', active_plan
        using errcode = '23514';
    end if;

    if new.membership_status = 'Active' and new.payment_status <> 'Paid' then
      raise exception 'Invalid AFF membership state: Active paid membership requires payment_status Paid.'
        using errcode = '23514';
    end if;

    if new.account_status in ('', 'Pending', 'Trial') then
      new.account_status := 'Active';
    end if;
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
  membership_status text
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
    coalesce(sm.membership_status, 'Pending Payment')::text as membership_status
  from public.students s
  left join public.student_memberships sm
    on s.auth_user_id = sm.student_id
  where lower(trim(coalesce(s.status, ''))) = 'active'
  order by s.full_name asc;
$$;

grant execute on function public.get_aff_student_directory() to authenticated;

notify pgrst, 'reload schema';

commit;
