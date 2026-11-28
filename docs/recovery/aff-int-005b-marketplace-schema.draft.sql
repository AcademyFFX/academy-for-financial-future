-- REVIEW ONLY: fresh disposable schema; supersedes 002D, do not install both.
begin;
create table if not exists public.billing_coupons (
  id bigserial primary key,
  code text not null unique,
  description text,
  stripe_promotion_code_id text,
  active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.marketplace_products (
  id bigserial primary key,
  product_id text not null unique,
  title text not null,
  category text not null,
  product_type text not null,
  description text not null,
  price_label text not null,
  price_cents integer not null,
  price_env text not null,
  instructor_name text not null default 'Dr. Jean Rene Moricette',
  access_url text not null default '/marketplace',
  featured boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketplace_products_price_check check (price_cents >= 0),
  constraint marketplace_products_type_check check (product_type in ('course', 'certification', 'mentorship', 'journal', 'case-study', 'workshop', 'download', 'bundle'))
);

create table if not exists public.marketplace_bundles (
  id bigserial primary key,
  bundle_product_id text not null references public.marketplace_products(product_id) on delete cascade,
  child_product_id text not null references public.marketplace_products(product_id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (bundle_product_id, child_product_id)
);

create table if not exists public.marketplace_purchases (
  id bigserial primary key,
  student_id uuid not null references auth.users(id) on delete restrict,
  student_email text not null,
  product_id text not null,
  product_title text not null,
  product_category text not null,
  product_type text not null,
  instructor_name text not null,
  amount numeric not null default 0,
  currency text not null default 'USD',
  purchase_status text not null default 'Checkout Started',
  access_url text,
  coupon_code text,
  affiliate_code text,
  stripe_checkout_session_id text,
  stripe_customer_id text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketplace_purchases_status_check check (purchase_status in ('Checkout Started', 'Paid', 'Payment Pending', 'Refunded', 'Cancelled'))
);

create table if not exists public.marketplace_coupons (
  id bigserial primary key,
  code text not null unique,
  description text,
  discount_label text,
  stripe_promotion_code_id text,
  active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.marketplace_affiliates (
  id bigserial primary key,
  code text not null unique,
  affiliate_name text not null,
  affiliate_email text,
  commission_rate numeric not null default 10,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint marketplace_affiliates_commission_check check (commission_rate >= 0 and commission_rate <= 100)
);

create table if not exists public.marketplace_affiliate_commissions (
  id bigserial primary key,
  affiliate_id bigint not null references public.marketplace_affiliates(id) on delete restrict,
  purchase_id bigint not null references public.marketplace_purchases(id) on delete restrict,
  product_id text not null,
  student_id uuid not null references auth.users(id) on delete restrict,
  gross_amount numeric not null default 0,
  commission_rate numeric not null default 0,
  commission_amount numeric not null default 0,
  commission_status text not null default 'Pending',
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  constraint marketplace_commissions_status_check check (commission_status in ('Pending', 'Approved', 'Paid', 'Voided'))
);

create index if not exists marketplace_products_active_category_idx
on public.marketplace_products (active, category);

create index if not exists marketplace_purchases_student_created_idx
on public.marketplace_purchases (student_id, created_at desc);

create index if not exists marketplace_purchases_status_idx
on public.marketplace_purchases (purchase_status, created_at desc);

create index if not exists marketplace_commissions_affiliate_idx
on public.marketplace_affiliate_commissions (affiliate_id, created_at desc);


alter table public.billing_coupons enable row level security;
revoke all on public.billing_coupons from public, anon, authenticated;
grant select on public.billing_coupons to authenticated;
grant select, insert, update, delete on public.billing_coupons to service_role;
grant usage, select on sequence public.billing_coupons_id_seq to service_role;
create policy aff_admin_read on public.billing_coupons for select to authenticated using (public.is_aff_admin());
alter table public.marketplace_products enable row level security;
revoke all on public.marketplace_products from public, anon, authenticated;
grant select on public.marketplace_products to authenticated;
grant select, insert, update, delete on public.marketplace_products to service_role;
grant usage, select on sequence public.marketplace_products_id_seq to service_role;
create policy aff_admin_read on public.marketplace_products for select to authenticated using (public.is_aff_admin());
create policy aff_active_read on public.marketplace_products for select to authenticated using (active);
alter table public.marketplace_bundles enable row level security;
revoke all on public.marketplace_bundles from public, anon, authenticated;
grant select on public.marketplace_bundles to authenticated;
grant select, insert, update, delete on public.marketplace_bundles to service_role;
grant usage, select on sequence public.marketplace_bundles_id_seq to service_role;
create policy aff_admin_read on public.marketplace_bundles for select to authenticated using (public.is_aff_admin());
create policy aff_active_bundle_read on public.marketplace_bundles for select to authenticated using (exists (select 1 from public.marketplace_products p where p.product_id = bundle_product_id and p.active) and exists (select 1 from public.marketplace_products p where p.product_id = child_product_id and p.active));
alter table public.marketplace_purchases enable row level security;
revoke all on public.marketplace_purchases from public, anon, authenticated;
-- Purchase history must use an owner-scoped server API; do not expose access URLs.
revoke all on public.marketplace_purchases from authenticated;
grant select, insert, update on public.marketplace_purchases to service_role;
grant usage, select on sequence public.marketplace_purchases_id_seq to service_role;
create policy aff_admin_read on public.marketplace_purchases for select to authenticated using (public.is_aff_admin());
create policy aff_owner_read on public.marketplace_purchases for select to authenticated using (auth.uid() = student_id);
alter table public.marketplace_coupons enable row level security;
revoke all on public.marketplace_coupons from public, anon, authenticated;
grant select on public.marketplace_coupons to authenticated;
grant select, insert, update, delete on public.marketplace_coupons to service_role;
grant usage, select on sequence public.marketplace_coupons_id_seq to service_role;
create policy aff_admin_read on public.marketplace_coupons for select to authenticated using (public.is_aff_admin());
alter table public.marketplace_affiliates enable row level security;
revoke all on public.marketplace_affiliates from public, anon, authenticated;
grant select on public.marketplace_affiliates to authenticated;
grant select, insert, update, delete on public.marketplace_affiliates to service_role;
grant usage, select on sequence public.marketplace_affiliates_id_seq to service_role;
create policy aff_admin_read on public.marketplace_affiliates for select to authenticated using (public.is_aff_admin());
alter table public.marketplace_affiliate_commissions enable row level security;
revoke all on public.marketplace_affiliate_commissions from public, anon, authenticated;
grant select on public.marketplace_affiliate_commissions to authenticated;
grant select, insert, update on public.marketplace_affiliate_commissions to service_role;
grant usage, select on sequence public.marketplace_affiliate_commissions_id_seq to service_role;
create policy aff_admin_read on public.marketplace_affiliate_commissions for select to authenticated using (public.is_aff_admin());
create unique index marketplace_purchase_session_unique on public.marketplace_purchases(stripe_checkout_session_id) where stripe_checkout_session_id is not null;
create unique index marketplace_commission_purchase_affiliate_unique on public.marketplace_affiliate_commissions(purchase_id, affiliate_id);
-- No product seeds, payment activation, or entitlement grants in this draft.
notify pgrst, 'reload schema';
commit;
