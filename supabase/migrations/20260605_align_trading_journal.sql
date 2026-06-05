-- Align the existing trading_journal table with app/journal/page.tsx.
-- Run this in the Supabase SQL Editor.

alter table public.trading_journal
  add column if not exists trade_direction text not null default 'Buy',
  add column if not exists risk_percentage numeric not null default 0,
  add column if not exists trade_notes text,
  add column if not exists screenshot_url text,
  add column if not exists created_at timestamptz not null default now();

-- Preserve existing notes in the new application-facing notes column.
update public.trading_journal
set trade_notes = notes
where trade_notes is null
  and notes is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'trading_journal_trade_direction_check'
      and conrelid = 'public.trading_journal'::regclass
  ) then
    alter table public.trading_journal
      add constraint trading_journal_trade_direction_check
      check (trade_direction in ('Buy', 'Sell'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'trading_journal_risk_percentage_check'
      and conrelid = 'public.trading_journal'::regclass
  ) then
    alter table public.trading_journal
      add constraint trading_journal_risk_percentage_check
      check (risk_percentage >= 0);
  end if;
end $$;

alter table public.trading_journal enable row level security;

drop policy if exists "Students can read own trading journal" on public.trading_journal;
drop policy if exists "Students can create own trading journal entries" on public.trading_journal;

create policy "Students can read own trading journal"
on public.trading_journal
for select
using (auth.uid() = student_id);

create policy "Students can create own trading journal entries"
on public.trading_journal
for insert
with check (auth.uid() = student_id);
