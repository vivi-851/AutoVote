-- AutoVote M2 数据库 schema
-- 在 Supabase 控制台 SQL Editor 里整段粘贴执行即可。

-- ── 用户档案（积分账户）─────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  points integer not null default 1000,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id);

-- ── 下注记录 ────────────────────────────────────────
create table if not exists public.bets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  news_id text,
  market_slug text not null,
  market_title text,
  outcome_label text not null,
  outcome_market_id text not null,
  entry_price numeric not null check (entry_price > 0 and entry_price <= 1),
  stake integer not null check (stake > 0),
  shares numeric not null,
  created_at timestamptz not null default now()
);

alter table public.bets enable row level security;

drop policy if exists bets_select_own on public.bets;
create policy bets_select_own on public.bets
  for select using (auth.uid() = user_id);

create index if not exists bets_user_idx on public.bets (user_id, created_at desc);

-- ── 新用户注册 → 自动建档并送 1000 积分 ──────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url, points)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(coalesce(new.email, 'user'), '@', 1)
    ),
    new.raw_user_meta_data ->> 'avatar_url',
    1000
  )
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── 原子下注：校验积分 → 扣分 → 写入下注 ─────────────
create or replace function public.place_bet(
  p_news_id text,
  p_market_slug text,
  p_market_title text,
  p_outcome_label text,
  p_outcome_market_id text,
  p_entry_price numeric,
  p_stake integer
) returns public.profiles language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_stake <= 0 then raise exception 'invalid stake'; end if;
  if p_entry_price <= 0 or p_entry_price > 1 then raise exception 'invalid price'; end if;

  select * into v_profile from public.profiles where id = v_uid for update;
  if v_profile.id is null then raise exception 'profile not found'; end if;
  if v_profile.points < p_stake then raise exception 'insufficient points'; end if;

  update public.profiles set points = points - p_stake
    where id = v_uid returning * into v_profile;

  insert into public.bets (
    user_id, news_id, market_slug, market_title,
    outcome_label, outcome_market_id, entry_price, stake, shares
  ) values (
    v_uid, p_news_id, p_market_slug, p_market_title,
    p_outcome_label, p_outcome_market_id, p_entry_price, p_stake,
    p_stake::numeric / p_entry_price
  );

  return v_profile;
end; $$;

grant execute on function public.place_bet to authenticated;
