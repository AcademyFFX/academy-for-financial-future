begin;

alter table public.student_memberships
  add column if not exists selected_membership_plan text not null default 'Free Trial',
  add column if not exists active_membership_plan text not null default 'Free Trial',
  add column if not exists payment_status text not null default 'Pending';

alter table public.students
  add column if not exists membership_plan text not null default 'Free Trial';

update public.student_memberships sm
set
  selected_membership_plan = coalesce(nullif(sm.selected_membership_plan, ''), nullif(a.membership_plan, ''), nullif(sm.membership_plan, ''), 'Free Trial'),
  active_membership_plan = case
    when sm.account_status = 'Active' and sm.membership_status not in ('Pending Payment', 'Pending Activation', 'Cancelled', 'Suspended') then coalesce(nullif(sm.active_membership_plan, ''), nullif(sm.membership_plan, ''), 'Free Trial')
    else coalesce(nullif(sm.active_membership_plan, ''), 'Free Trial')
  end,
  membership_plan = case
    when sm.account_status = 'Active' and sm.membership_status not in ('Pending Payment', 'Pending Activation', 'Cancelled', 'Suspended') then coalesce(nullif(sm.membership_plan, ''), nullif(sm.active_membership_plan, ''), 'Free Trial')
    else 'Free Trial'
  end,
  payment_status = case
    when sm.account_status = 'Active' and sm.membership_status not in ('Pending Payment', 'Pending Activation', 'Cancelled', 'Suspended') then 'Paid'
    when coalesce(sm.payment_status, '') = '' then 'Pending'
    else sm.payment_status
  end,
  membership_status = case
    when sm.account_status = 'Active' and sm.membership_status not in ('Pending Payment', 'Pending Activation', 'Cancelled', 'Suspended') then 'Active'
    when sm.membership_status in ('Cancelled', 'Suspended', 'Pending Activation') then sm.membership_status
    else 'Pending Payment'
  end,
  account_status = case
    when sm.account_status = 'Active' and sm.membership_status not in ('Pending Payment', 'Pending Activation', 'Cancelled', 'Suspended') then 'Active'
    when sm.account_status = 'Trial' then 'Trial'
    when sm.account_status = 'Cancelled' then 'Cancelled'
    else 'Pending'
  end,
  updated_at = now()
from public.student_applications a
where sm.student_id = a.auth_user_id;

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
  'Pending',
  now(),
  now()
from public.student_applications a
where a.auth_user_id is not null
  and not exists (
    select 1
    from public.student_memberships sm
    where sm.student_id = a.auth_user_id
  );

update public.students s
set membership_plan = coalesce(nullif(sm.active_membership_plan, ''), nullif(sm.membership_plan, ''), 'Free Trial')
from public.student_memberships sm
where s.auth_user_id = sm.student_id;

create index if not exists student_memberships_payment_status_idx
on public.student_memberships (student_id, payment_status, membership_status, account_status);

notify pgrst, 'reload schema';

commit;
