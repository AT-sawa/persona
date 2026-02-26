-- Supabase SQLエディタで実行するスキーマ定義

create table cases (
  id            uuid default gen_random_uuid() primary key,
  case_no       text,
  title         text not null,
  category      text,
  background    text,
  description   text,
  industry      text,
  start_date    text,
  extendable    text,
  occupancy     text,
  fee           text,
  office_days   text,
  location      text,
  must_req      text,
  nice_to_have  text,
  flow          text,
  status        text default 'active',
  published_at  timestamptz default now(),
  created_at    timestamptz default now(),
  is_active     boolean default true
);

create table profiles (
  id          uuid references auth.users primary key,
  full_name   text,
  email       text,
  phone       text,
  background  text,
  skills      text[],
  created_at  timestamptz default now()
);

create table entries (
  id         uuid default gen_random_uuid() primary key,
  case_id    uuid references cases(id),
  user_id    uuid references profiles(id),
  status     text default 'pending',
  message    text,
  created_at timestamptz default now()
);

alter table cases enable row level security;
alter table profiles enable row level security;
alter table entries enable row level security;

create policy "cases_public_read" on cases for select using (is_active = true);
create policy "profiles_self" on profiles using (auth.uid() = id) with check (auth.uid() = id);
create policy "entries_self" on entries using (auth.uid() = user_id) with check (auth.uid() = user_id);
