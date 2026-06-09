create table if not exists public.student_memberships (
  id bigserial primary key,
  student_id uuid not null references auth.users(id) on delete cascade,
  student_email text not null,
  membership_plan text not null default 'Free Trial',
  membership_status text not null default 'Not Enrolled',
  account_status text not null default 'Restricted',
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_checkout_session_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id),
  constraint student_memberships_account_status_check check (account_status in ('Trial', 'Active', 'Pending', 'Restricted', 'Cancelled'))
);

create table if not exists public.billing_history (
  id bigserial primary key,
  student_id uuid not null references auth.users(id) on delete cascade,
  stripe_event_id text,
  event_type text not null,
  amount numeric,
  currency text not null default 'USD',
  status text not null default 'recorded',
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.billing_coupons (
  id bigserial primary key,
  code text not null unique,
  description text,
  stripe_promotion_code_id text,
  active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.student_memberships enable row level security;
alter table public.billing_history enable row level security;
alter table public.billing_coupons enable row level security;

drop policy if exists "Students can read their membership" on public.student_memberships;
drop policy if exists "Students can create their membership" on public.student_memberships;
drop policy if exists "Students can update their membership checkout state" on public.student_memberships;
drop policy if exists "AFF administrator can manage memberships" on public.student_memberships;
drop policy if exists "Students can read their billing history" on public.billing_history;
drop policy if exists "AFF administrator can manage billing history" on public.billing_history;
drop policy if exists "Authenticated students can read active coupons" on public.billing_coupons;
drop policy if exists "AFF administrator can manage billing coupons" on public.billing_coupons;

create policy "Students can read their membership"
on public.student_memberships
for select
to authenticated
using (auth.uid() = student_id or (auth.jwt() ->> 'email') = 'acafffx@gmail.com');

create policy "AFF administrator can manage memberships"
on public.student_memberships
for all
to authenticated
using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com')
with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

create policy "Students can read their billing history"
on public.billing_history
for select
to authenticated
using (auth.uid() = student_id or (auth.jwt() ->> 'email') = 'acafffx@gmail.com');

create policy "AFF administrator can manage billing history"
on public.billing_history
for all
to authenticated
using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com')
with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

create policy "Authenticated students can read active coupons"
on public.billing_coupons
for select
to authenticated
using (active = true and (expires_at is null or expires_at > now()));

create policy "AFF administrator can manage billing coupons"
on public.billing_coupons
for all
to authenticated
using ((auth.jwt() ->> 'email') = 'acafffx@gmail.com')
with check ((auth.jwt() ->> 'email') = 'acafffx@gmail.com');

insert into public.billing_coupons (code, description, stripe_promotion_code_id, active)
select 'AFFWELCOME', 'Academy welcome coupon. Add the Stripe promotion code ID after creating it in Stripe.', null, true
where not exists (
  select 1
  from public.billing_coupons
  where code = 'AFFWELCOME'
);

grant select on public.student_memberships to authenticated;
grant select on public.billing_history to authenticated;
grant select on public.billing_coupons to authenticated;
grant usage on sequence public.student_memberships_id_seq to authenticated;
grant usage on sequence public.billing_history_id_seq to authenticated;
grant usage on sequence public.billing_coupons_id_seq to authenticated;

notify pgrst, 'reload schema';
