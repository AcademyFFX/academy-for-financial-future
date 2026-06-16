create table if not exists public.tv_channels (
  id bigserial primary key,
  channel_name text not null unique,
  category text not null,
  description text not null,
  artwork_label text not null,
  artwork_url text,
  href text not null default '/tv-studio',
  is_featured boolean not null default true,
  display_order integer not null default 0,
  status text not null default 'Active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tv_channels_status_check check (status in ('Active', 'Inactive', 'Archived'))
);

create index if not exists tv_channels_status_order_idx
  on public.tv_channels (status, display_order);

alter table public.tv_channels enable row level security;

drop policy if exists "Authenticated users can read active TV channels" on public.tv_channels;
drop policy if exists "AFF admin can manage TV channels" on public.tv_channels;

create policy "Authenticated users can read active TV channels"
on public.tv_channels
for select
to authenticated
using (
  status = 'Active'
  or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com'
);

create policy "AFF admin can manage TV channels"
on public.tv_channels
for all
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

grant select, insert, update, delete on public.tv_channels to authenticated;
grant usage, select on sequence public.tv_channels_id_seq to authenticated;

insert into public.tv_channels (
  channel_name,
  category,
  description,
  artwork_label,
  artwork_url,
  href,
  is_featured,
  display_order,
  status
)
values
  (
    'AFF TV Studio',
    'All',
    'Live streaming, program scheduling, on-demand episodes, masterclasses, hosts, guests, and replay archives.',
    'AFF',
    null,
    '/tv-studio',
    true,
    1,
    'Active'
  ),
  (
    'Community Awareness TV',
    'Community Awareness TV',
    'Community Awareness, Public Affairs, Leadership Series, and Civic Dialogue programming.',
    'CATV',
    null,
    '/tv-studio',
    true,
    2,
    'Active'
  ),
  (
    'Destiny Alignment TV',
    'Destiny Alignment TV',
    'Destiny Alignment, Faith & Purpose, and Leadership Development programming.',
    'DATV',
    null,
    '/tv-studio',
    true,
    3,
    'Active'
  ),
  (
    'Eyes on Society TV',
    'Eyes on Society TV',
    'Exploring the issues, ideas, challenges, and opportunities shaping modern society.',
    'EOSTV',
    null,
    '/broadcast-network/eyes-on-society',
    true,
    4,
    'Active'
  )
on conflict (channel_name) do update set
  category = excluded.category,
  description = excluded.description,
  artwork_label = excluded.artwork_label,
  artwork_url = excluded.artwork_url,
  href = excluded.href,
  is_featured = excluded.is_featured,
  display_order = excluded.display_order,
  status = excluded.status,
  updated_at = now();

notify pgrst, 'reload schema';
