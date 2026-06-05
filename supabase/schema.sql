create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'student',
  division text not null default 'Forex Training Division',
  created_at timestamptz not null default now()
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  level text not null,
  summary text not null,
  lesson_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  progress integer not null default 0 check (progress between 0 and 100),
  created_at timestamptz not null default now()
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses(id) on delete cascade,
  title text not null,
  due_date date,
  created_at timestamptz not null default now()
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  file_url text,
  notes text,
  status text not null default 'submitted',
  created_at timestamptz not null default now()
);

create table public.trading_journal (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  currency_pair text not null,
  trade_direction text not null check (trade_direction in ('Buy', 'Sell')),
  entry_price numeric not null,
  stop_loss numeric not null,
  take_profit numeric not null,
  risk_percentage numeric not null check (risk_percentage >= 0),
  trade_notes text,
  screenshot_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.enrollments enable row level security;
alter table public.submissions enable row level security;
alter table public.trading_journal enable row level security;

create policy "Students can read own profile" on public.profiles for select using (auth.uid() = id);
create policy "Students can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Students can read own enrollments" on public.enrollments for select using (auth.uid() = student_id);
create policy "Students can manage own submissions" on public.submissions for all using (auth.uid() = student_id);
create policy "Students can read own trading journal" on public.trading_journal for select using (auth.uid() = student_id);
create policy "Students can create own trading journal entries" on public.trading_journal for insert with check (auth.uid() = student_id);
