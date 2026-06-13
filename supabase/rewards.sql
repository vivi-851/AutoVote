-- AutoVote · 每日留存（两轨积分）v1
-- 在 Supabase SQL Editor 整段执行。依赖 schema.sql / generated_markets.sql / trading.sql。
--
-- 两轨经济：
--   轨道 A · 积分（profiles.points）—— 可下注余额，由每日活动补充（签到/阅读/任务）。
--   轨道 B · 战绩（由已结算 bets 推导）—— PnL/ROI/胜率/下注数，首页战绩榜排序用，不可刷。
--
-- 设计要点：所有发放走 SECURITY DEFINER RPC + point_ledger 流水；按「本地日期」幂等去重。

-- ── 积分流水（只增不改，审计 + 防刷 + 历史 UI 基础）──────
create table if not exists public.point_ledger (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  amount        integer not null,          -- +赚 / -花
  source        text not null,             -- signin | read | quest | bet | sell | resolve | adjust
  ref           text,                      -- 关联标识（盘口 id / 日期等）
  balance_after integer,                   -- 发放后余额快照
  created_at    timestamptz not null default now()
);
alter table public.point_ledger enable row level security;
drop policy if exists ledger_select_own on public.point_ledger;
create policy ledger_select_own on public.point_ledger for select using (auth.uid() = user_id);
create index if not exists ledger_user_idx on public.point_ledger (user_id, created_at desc);

-- ── 每日状态（签到连续）────────────────────────────────
create table if not exists public.daily_state (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  last_checkin   date,
  streak         integer not null default 0,
  longest_streak integer not null default 0,
  updated_at     timestamptz not null default now()
);
alter table public.daily_state enable row level security;
drop policy if exists daily_state_select_own on public.daily_state;
create policy daily_state_select_own on public.daily_state for select using (auth.uid() = user_id);

-- ── 每日领取记录（幂等去重：每天每种每 ref 仅一次）───────
create table if not exists public.daily_claims (
  user_id    uuid not null references auth.users (id) on delete cascade,
  day        date not null,
  kind       text not null,                -- signin | read | quest
  ref        text not null default '',     -- read 用盘口 id；其余空串
  amount     integer not null,
  created_at timestamptz not null default now(),
  primary key (user_id, day, kind, ref)
);
alter table public.daily_claims enable row level security;
drop policy if exists daily_claims_select_own on public.daily_claims;
create policy daily_claims_select_own on public.daily_claims for select using (auth.uid() = user_id);

-- ── 每日签到：连续递增，第 7 天大礼 ────────────────────
create or replace function public.claim_daily_signin(p_local_date date)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid     uuid := auth.uid();
  v_state   public.daily_state;
  v_rewards int[] := array[50,60,80,100,120,150,300];
  v_streak  int;
  v_cycle   int;
  v_reward  int;
  v_profile public.profiles;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if abs(p_local_date - current_date) > 1 then raise exception 'invalid date'; end if;

  if exists (select 1 from public.daily_claims
             where user_id = v_uid and day = p_local_date and kind = 'signin') then
    select * into v_state from public.daily_state where user_id = v_uid;
    return jsonb_build_object('claimed', false, 'already', true, 'streak', coalesce(v_state.streak, 0));
  end if;

  select * into v_state from public.daily_state where user_id = v_uid;
  if v_state.user_id is null then
    insert into public.daily_state (user_id) values (v_uid) returning * into v_state;
  end if;

  if v_state.last_checkin = p_local_date - 1 then
    v_streak := v_state.streak + 1;
  else
    v_streak := 1;
  end if;

  v_cycle  := ((v_streak - 1) % 7) + 1;   -- 1..7
  v_reward := v_rewards[v_cycle];

  insert into public.daily_claims (user_id, day, kind, ref, amount)
    values (v_uid, p_local_date, 'signin', '', v_reward);

  update public.daily_state
    set last_checkin = p_local_date, streak = v_streak,
        longest_streak = greatest(longest_streak, v_streak), updated_at = now()
    where user_id = v_uid;

  update public.profiles set points = points + v_reward where id = v_uid returning * into v_profile;
  insert into public.point_ledger (user_id, amount, source, ref, balance_after)
    values (v_uid, v_reward, 'signin', p_local_date::text, v_profile.points);

  return jsonb_build_object('claimed', true, 'reward', v_reward, 'streak', v_streak,
                            'cycle', v_cycle, 'points', v_profile.points);
end; $$;

-- ── 阅读奖励：每天前 3 篇，每篇 +10（按盘口去重）─────────
create or replace function public.claim_read_reward(p_market_id text, p_local_date date)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid     uuid := auth.uid();
  v_count   int;
  v_reward  int := 10;
  v_cap     int := 3;
  v_profile public.profiles;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if abs(p_local_date - current_date) > 1 then raise exception 'invalid date'; end if;
  if coalesce(p_market_id, '') = '' then
    return jsonb_build_object('claimed', false, 'reason', 'no_market');
  end if;

  select count(*) into v_count from public.daily_claims
    where user_id = v_uid and day = p_local_date and kind = 'read';
  if v_count >= v_cap then
    return jsonb_build_object('claimed', false, 'reason', 'cap', 'reads', v_count);
  end if;

  begin
    insert into public.daily_claims (user_id, day, kind, ref, amount)
      values (v_uid, p_local_date, 'read', p_market_id, v_reward);
  exception when unique_violation then
    return jsonb_build_object('claimed', false, 'reason', 'dup', 'reads', v_count);
  end;

  update public.profiles set points = points + v_reward where id = v_uid returning * into v_profile;
  insert into public.point_ledger (user_id, amount, source, ref, balance_after)
    values (v_uid, v_reward, 'read', p_market_id, v_profile.points);

  return jsonb_build_object('claimed', true, 'reward', v_reward,
                            'reads', v_count + 1, 'points', v_profile.points);
end; $$;

-- ── 每日任务礼包：签到 + 读 3 + 表态 2 → +100 ──────────
create or replace function public.claim_quest_chest(p_local_date date)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid     uuid := auth.uid();
  v_reward  int := 100;
  v_signin  boolean;
  v_reads   int;
  v_votes   int;
  v_profile public.profiles;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if abs(p_local_date - current_date) > 1 then raise exception 'invalid date'; end if;

  if exists (select 1 from public.daily_claims
             where user_id = v_uid and day = p_local_date and kind = 'quest') then
    return jsonb_build_object('claimed', false, 'reason', 'already');
  end if;

  v_signin := exists (select 1 from public.daily_claims
                      where user_id = v_uid and day = p_local_date and kind = 'signin');
  select count(*) into v_reads from public.daily_claims
    where user_id = v_uid and day = p_local_date and kind = 'read';
  -- 今日表态数：把本地日期午夜当作窗口边界（服务端 UTC，跨时区有 ±数小时误差，原型可接受）
  select count(*) into v_votes from public.bets
    where user_id = v_uid
      and created_at >= p_local_date::timestamptz
      and created_at <  (p_local_date + 1)::timestamptz;

  if not (v_signin and v_reads >= 3 and v_votes >= 2) then
    return jsonb_build_object('claimed', false, 'reason', 'incomplete',
                              'signin', v_signin, 'reads', v_reads, 'votes', v_votes);
  end if;

  insert into public.daily_claims (user_id, day, kind, ref, amount)
    values (v_uid, p_local_date, 'quest', '', v_reward);
  update public.profiles set points = points + v_reward where id = v_uid returning * into v_profile;
  insert into public.point_ledger (user_id, amount, source, ref, balance_after)
    values (v_uid, v_reward, 'quest', p_local_date::text, v_profile.points);

  return jsonb_build_object('claimed', true, 'reward', v_reward, 'points', v_profile.points);
end; $$;

-- ── 每日状态汇总（驱动 DailyRewards 面板，一次取回）─────
create or replace function public.daily_status(p_local_date date)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid      uuid := auth.uid();
  v_state    public.daily_state;
  v_rewards  int[] := array[50,60,80,100,120,150,300];
  v_signin   boolean;
  v_reads    int;
  v_votes    int;
  v_quest    boolean;
  v_streak   int;
  v_eff      int;
  v_cycle    int;
begin
  if v_uid is null then return jsonb_build_object('auth', false); end if;
  if abs(p_local_date - current_date) > 1 then p_local_date := current_date; end if;

  select * into v_state from public.daily_state where user_id = v_uid;
  v_signin := exists (select 1 from public.daily_claims
                      where user_id = v_uid and day = p_local_date and kind = 'signin');
  select count(*) into v_reads from public.daily_claims
    where user_id = v_uid and day = p_local_date and kind = 'read';
  select count(*) into v_votes from public.bets
    where user_id = v_uid
      and created_at >= p_local_date::timestamptz
      and created_at <  (p_local_date + 1)::timestamptz;
  v_quest := exists (select 1 from public.daily_claims
                     where user_id = v_uid and day = p_local_date and kind = 'quest');

  v_streak := coalesce(v_state.streak, 0);
  -- 有效连续天数：今天已签到 → streak；昨天签过、今天还没签 → streak（待续）；否则 0
  if v_signin or v_state.last_checkin = p_local_date - 1 then
    v_eff := v_streak;
  else
    v_eff := 0;
  end if;

  -- 今天签到能拿的奖励（预览）
  if v_signin then
    v_cycle := ((v_streak - 1) % 7) + 1;
  elsif v_state.last_checkin = p_local_date - 1 then
    v_cycle := (v_streak % 7) + 1;
  else
    v_cycle := 1;
  end if;

  return jsonb_build_object(
    'auth', true,
    'signedIn', v_signin,
    'streak', v_eff,
    'signinReward', v_rewards[v_cycle],
    'cycle', v_cycle,
    'reads', v_reads, 'readCap', 3, 'readReward', 10,
    'votes', v_votes, 'voteTarget', 2,
    'questComplete', (v_signin and v_reads >= 3 and v_votes >= 2),
    'questClaimed', v_quest, 'questReward', 100
  );
end; $$;

grant execute on function public.claim_daily_signin  to authenticated;
grant execute on function public.claim_read_reward    to authenticated;
grant execute on function public.claim_quest_chest    to authenticated;
grant execute on function public.daily_status         to authenticated;

-- ── 让 AI 盘口结算同时给 bets 盖「已结算」章（统一 PnL/胜率）──
-- 覆盖 generated_markets.sql 里的版本：派分逻辑不变，额外把相关 bets 标为已平仓。
create or replace function public.resolve_generated_market(
  p_id uuid, p_outcome text, p_note text default null
) returns void language plpgsql security definer set search_path = public as $$
declare v_label text;
begin
  if p_outcome not in ('yes','no') then raise exception 'invalid outcome'; end if;
  v_label := case when p_outcome = 'yes' then 'Yes' else 'No' end;

  update public.generated_markets
    set status = 'resolved', outcome = p_outcome, resolved_at = now(), resolution_note = p_note
    where id = p_id and status = 'open';

  -- 赢家：每份额结算 1 分
  update public.profiles pr
    set points = pr.points + sub.payout
  from (
    select user_id, floor(sum(shares))::int as payout
    from public.bets
    where gen_market_id = p_id and outcome_label = v_label
    group by user_id
  ) sub
  where pr.id = sub.user_id;

  -- 盖章：赢家 proceeds = floor(shares)、退出价 1；输家 proceeds 0、退出价 0
  update public.bets b
    set closed = true,
        exit_price = case when b.outcome_label = v_label then 1 else 0 end,
        proceeds   = case when b.outcome_label = v_label then floor(b.shares)::int else 0 end,
        closed_at  = now()
    where b.gen_market_id = p_id and not b.closed;
end; $$;
grant execute on function public.resolve_generated_market to anon, authenticated;

-- 回填：把历史已结算盘口的 bets 也盖上章（一次性，幂等）
update public.bets b
  set closed = true,
      exit_price = case when b.outcome_label = (case when gm.outcome = 'yes' then 'Yes' else 'No' end) then 1 else 0 end,
      proceeds   = case when b.outcome_label = (case when gm.outcome = 'yes' then 'Yes' else 'No' end) then floor(b.shares)::int else 0 end,
      closed_at  = coalesce(b.closed_at, gm.resolved_at, now())
  from public.generated_markets gm
  where b.gen_market_id = gm.id and gm.status = 'resolved' and not b.closed;

-- ── 战绩榜（首页右栏）：从已结算 bets 推导 PnL/胜率/下注数 ──
-- bets 的 RLS 只允许读自己，所以用 SECURITY DEFINER 绕过返回 Top N（仅暴露昵称/头像/聚合战绩）。
create or replace function public.reputation_leaderboard(p_limit int default 10)
returns table(display_name text, avatar_url text, votes int, settled int, wins int, pnl int, staked int)
language sql security definer set search_path = public stable as $$
  select p.display_name, p.avatar_url,
    count(b.*)::int                                                              as votes,
    count(*) filter (where b.closed)::int                                        as settled,
    count(*) filter (where b.closed and coalesce(b.proceeds,0) > b.stake)::int   as wins,
    coalesce(sum(coalesce(b.proceeds,0) - b.stake) filter (where b.closed), 0)::int as pnl,
    coalesce(sum(b.stake) filter (where b.closed), 0)::int                       as staked
  from public.profiles p
  join public.bets b on b.user_id = p.id
  group by p.id, p.display_name, p.avatar_url
  having count(b.*) > 0
  order by pnl desc, votes desc, p.created_at asc
  limit greatest(coalesce(p_limit, 10), 1);
$$;
grant execute on function public.reputation_leaderboard to anon, authenticated;
