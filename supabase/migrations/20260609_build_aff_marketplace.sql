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
  student_id uuid not null references auth.users(id) on delete cascade,
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
  affiliate_id bigint not null references public.marketplace_affiliates(id) on delete cascade,
  purchase_id bigint not null references public.marketplace_purchases(id) on delete cascade,
  product_id text not null,
  student_id uuid not null references auth.users(id) on delete cascade,
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

alter table public.marketplace_products enable row level security;
alter table public.marketplace_bundles enable row level security;
alter table public.marketplace_purchases enable row level security;
alter table public.marketplace_coupons enable row level security;
alter table public.marketplace_affiliates enable row level security;
alter table public.marketplace_affiliate_commissions enable row level security;

drop policy if exists "Students can view active marketplace products" on public.marketplace_products;
drop policy if exists "AFF administrator can manage marketplace products" on public.marketplace_products;
drop policy if exists "Students can view marketplace bundles" on public.marketplace_bundles;
drop policy if exists "AFF administrator can manage marketplace bundles" on public.marketplace_bundles;
drop policy if exists "Students can view own marketplace purchases" on public.marketplace_purchases;
drop policy if exists "AFF administrator can manage marketplace purchases" on public.marketplace_purchases;
drop policy if exists "Authenticated users can view active marketplace coupons" on public.marketplace_coupons;
drop policy if exists "AFF administrator can manage marketplace coupons" on public.marketplace_coupons;
drop policy if exists "Authenticated users can view active affiliate codes" on public.marketplace_affiliates;
drop policy if exists "AFF administrator can manage marketplace affiliates" on public.marketplace_affiliates;
drop policy if exists "AFF administrator can manage affiliate commissions" on public.marketplace_affiliate_commissions;

create policy "Students can view active marketplace products"
on public.marketplace_products
for select
to authenticated
using (active = true or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

create policy "AFF administrator can manage marketplace products"
on public.marketplace_products
for all
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

create policy "Students can view marketplace bundles"
on public.marketplace_bundles
for select
to authenticated
using (true);

create policy "AFF administrator can manage marketplace bundles"
on public.marketplace_bundles
for all
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

create policy "Students can view own marketplace purchases"
on public.marketplace_purchases
for select
to authenticated
using (auth.uid() = student_id or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

create policy "AFF administrator can manage marketplace purchases"
on public.marketplace_purchases
for all
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

create policy "Authenticated users can view active marketplace coupons"
on public.marketplace_coupons
for select
to authenticated
using (active = true and (expires_at is null or expires_at > now()));

create policy "AFF administrator can manage marketplace coupons"
on public.marketplace_coupons
for all
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

create policy "Authenticated users can view active affiliate codes"
on public.marketplace_affiliates
for select
to authenticated
using (active = true);

create policy "AFF administrator can manage marketplace affiliates"
on public.marketplace_affiliates
for all
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

create policy "AFF administrator can manage affiliate commissions"
on public.marketplace_affiliate_commissions
for all
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

grant select, insert, update, delete on public.marketplace_products to authenticated;
grant select, insert, update, delete on public.marketplace_bundles to authenticated;
grant select, insert, update, delete on public.marketplace_purchases to authenticated;
grant select, insert, update, delete on public.marketplace_coupons to authenticated;
grant select, insert, update, delete on public.marketplace_affiliates to authenticated;
grant select, insert, update, delete on public.marketplace_affiliate_commissions to authenticated;
grant usage, select on sequence public.marketplace_products_id_seq to authenticated;
grant usage, select on sequence public.marketplace_bundles_id_seq to authenticated;
grant usage, select on sequence public.marketplace_purchases_id_seq to authenticated;
grant usage, select on sequence public.marketplace_coupons_id_seq to authenticated;
grant usage, select on sequence public.marketplace_affiliates_id_seq to authenticated;
grant usage, select on sequence public.marketplace_affiliate_commissions_id_seq to authenticated;

insert into public.marketplace_products (
  product_id,
  title,
  category,
  product_type,
  description,
  price_label,
  price_cents,
  price_env,
  instructor_name,
  access_url,
  featured
)
values
  ('forex-foundations-course', 'Forex Foundations Course', 'Courses', 'course', 'Core academy course covering currency pairs, sessions, pips, spreads, orders, brokers, and market mechanics.', '$297', 29700, 'STRIPE_MARKETPLACE_FOREX_FOUNDATIONS_PRICE_ID', 'Dr. Jean Rene Moricette', '/courses', true),
  ('forex-anatomy-certification', 'Forex Anatomy Certification', 'Certifications', 'certification', 'Certification pathway for market structure, liquidity, institutional orders, order flow, central banks, and broker execution.', '$497', 49700, 'STRIPE_MARKETPLACE_FOREX_ANATOMY_CERTIFICATION_PRICE_ID', 'Dr. Jean Rene Moricette', '/exams', true),
  ('premium-mentorship-intensive', 'Premium Mentorship Intensive', 'Mentorship', 'mentorship', 'Instructor-guided mentorship with assignment review, journal feedback, certification planning, and market discipline coaching.', '$1,997', 199700, 'STRIPE_MARKETPLACE_PREMIUM_MENTORSHIP_PRICE_ID', 'Dr. Jean Rene Moricette', '/messages', false),
  ('professional-trading-journal', 'Professional Trading Journal Template', 'Trading Journals', 'journal', 'Digital journal system for trade plans, risk percentage, execution notes, screenshots, and post-trade review discipline.', '$47', 4700, 'STRIPE_MARKETPLACE_TRADING_JOURNAL_PRICE_ID', 'Academy for Financial Future', '/journal', false),
  ('institutional-case-study-pack', 'Institutional Case Study Pack', 'Case Studies', 'case-study', 'Downloadable case studies on liquidity sweeps, order blocks, market structure shifts, and central bank volatility.', '$97', 9700, 'STRIPE_MARKETPLACE_CASE_STUDY_PACK_PRICE_ID', 'Academy for Financial Future', '/marketplace', false),
  ('live-market-workshop', 'Live Market Workshop', 'Workshops', 'workshop', 'Interactive workshop seat for London/New York session preparation, trade planning, and risk management review.', '$197', 19700, 'STRIPE_MARKETPLACE_LIVE_WORKSHOP_PRICE_ID', 'Dr. Jean Rene Moricette', '/live-trading-room', false),
  ('aff-download-library', 'AFF Digital Download Library', 'Digital Downloads', 'download', 'Digital pack of worksheets, risk templates, certification prep sheets, lesson notes, and academy checklists.', '$67', 6700, 'STRIPE_MARKETPLACE_DOWNLOAD_LIBRARY_PRICE_ID', 'Academy for Financial Future', '/courses', false),
  ('certification-bundle', 'Certification Success Bundle', 'Bundles', 'bundle', 'Bundled course, exam prep, trading journal, case studies, and certification fee support for serious students.', '$797', 79700, 'STRIPE_MARKETPLACE_CERTIFICATION_BUNDLE_PRICE_ID', 'Dr. Jean Rene Moricette', '/certificates', true)
on conflict (product_id) do update
set title = excluded.title,
    category = excluded.category,
    product_type = excluded.product_type,
    description = excluded.description,
    price_label = excluded.price_label,
    price_cents = excluded.price_cents,
    price_env = excluded.price_env,
    instructor_name = excluded.instructor_name,
    access_url = excluded.access_url,
    featured = excluded.featured,
    active = true,
    updated_at = now();

insert into public.marketplace_bundles (bundle_product_id, child_product_id)
values
  ('certification-bundle', 'forex-foundations-course'),
  ('certification-bundle', 'forex-anatomy-certification'),
  ('certification-bundle', 'professional-trading-journal'),
  ('certification-bundle', 'institutional-case-study-pack'),
  ('certification-bundle', 'aff-download-library')
on conflict (bundle_product_id, child_product_id) do nothing;

insert into public.marketplace_coupons (code, description, discount_label, stripe_promotion_code_id, active)
values
  ('AFFMARKET', 'Academy marketplace welcome coupon. Add Stripe promotion code ID after creating it in Stripe.', 'Marketplace welcome offer', null, true),
  ('AFFCERT', 'Certification pathway coupon. Add Stripe promotion code ID after creating it in Stripe.', 'Certification support offer', null, true)
on conflict (code) do update
set description = excluded.description,
    discount_label = excluded.discount_label,
    active = excluded.active;

insert into public.marketplace_affiliates (code, affiliate_name, affiliate_email, commission_rate, active)
values
  ('AFFPARTNER', 'Academy Referral Partner', 'acafffx@gmail.com', 10, true)
on conflict (code) do update
set affiliate_name = excluded.affiliate_name,
    affiliate_email = excluded.affiliate_email,
    commission_rate = excluded.commission_rate,
    active = excluded.active;

notify pgrst, 'reload schema';
