-- AutoVote · 留存 v2：等级（XP + 实用特权）+ 主题赛季（Themed season + race）
-- 在 Supabase SQL Editor 整段执行。依赖 schema.sql / generated_markets.sql / trading.sql / rewards.sql。
-- 设计：本文件按「后定义覆盖」原则，create or replace 了 v1 的 claim_read_reward /
--       claim_daily_signin / resolve_generated_market / daily_status / reputation_leaderboard，
--       追加 XP 与赛季逻辑；逐句幂等，可重复执行。

-- ════════════════════════════════════════════════════
-- 一、等级（XP）
-- ════════════════════════════════════════════════════
alter table public.profiles add column if not exists xp integer not null default 0;

-- 等级曲线：level = floor(sqrt(xp/100)) + 1（L2=100, L3=400, L4=900, L5=1600 …）
create or replace function public.level_for_xp(p_xp integer)
returns integer language sql immutable as $$
  select greatest(1, floor(sqrt(greatest(p_xp, 0) / 100.0))::int + 1);
$$;

-- 等级实用特权（服务端口径，前端 lib/levels.ts 同步同一公式）：
--   每日阅读上限：3 + min(floor(level/5), 3)  → L5=4 / L10=5 / L15=6
--   签到等级加成：(level-1) * 2 积分
create or replace function public.read_cap_for_level(p_level integer)
returns integer language sql immutable as $$
  select 3 + least(floor(p_level / 5.0)::int, 3);
$$;

-- XP 发放：积分流水触发（签到/阅读/任务），下注触发，结算给赢家加成
create or replace function public.xp_from_ledger()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set xp = xp + case new.source
    when 'signin' then 5 when 'read' then 5 when 'quest' then 20 else 0 end
  where id = new.user_id;
  return new;
end; $$;
drop trigger if exists xp_from_ledger on public.point_ledger;
create trigger xp_from_ledger after insert on public.point_ledger
  for each row execute function public.xp_from_ledger();

create or replace function public.xp_from_bet()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set xp = xp + 10 where id = new.user_id;
  return new;
end; $$;
drop trigger if exists xp_from_bet on public.bets;
create trigger xp_from_bet after insert on public.bets
  for each row execute function public.xp_from_bet();

-- 回填历史 XP（一次性）：每注 +10。结算赢家加成由下方 resolve 回填章节处理。
update public.profiles p
  set xp = sub.xp
  from (select user_id, (count(*) * 10)::int as xp from public.bets group by user_id) sub
  where p.id = sub.user_id and p.xp = 0;

-- ════════════════════════════════════════════════════
-- 二、覆盖 v1 函数：阅读上限随等级、签到等级加成、结算 XP
-- ════════════════════════════════════════════════════

-- 阅读奖励：上限随等级提升（其余同 v1）
create or replace function public.claim_read_reward(p_market_id text, p_local_date date)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid     uuid := auth.uid();
  v_count   int;
  v_reward  int := 10;
  v_level   int;
  v_cap     int;
  v_profile public.profiles;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if abs(p_local_date - current_date) > 1 then raise exception 'invalid date'; end if;
  if coalesce(p_market_id, '') = '' then
    return jsonb_build_object('claimed', false, 'reason', 'no_market');
  end if;

  select level_for_xp(xp) into v_level from public.profiles where id = v_uid;
  v_cap := read_cap_for_level(coalesce(v_level, 1));

  select count(*) into v_count from public.daily_claims
    where user_id = v_uid and day = p_local_date and kind = 'read';
  if v_count >= v_cap then
    return jsonb_build_object('claimed', false, 'reason', 'cap', 'reads', v_count, 'cap', v_cap);
  end if;

  begin
    insert into public.daily_claims (user_id, day, kind, ref, amount)
      values (v_uid, p_local_date, 'read', p_market_id, v_reward);
  exception when unique_violation then
    return jsonb_build_object('claimed', false, 'reason', 'dup', 'reads', v_count, 'cap', v_cap);
  end;

  update public.profiles set points = points + v_reward where id = v_uid returning * into v_profile;
  insert into public.point_ledger (user_id, amount, source, ref, balance_after)
    values (v_uid, v_reward, 'read', p_market_id, v_profile.points);

  return jsonb_build_object('claimed', true, 'reward', v_reward,
                            'reads', v_count + 1, 'cap', v_cap, 'points', v_profile.points);
end; $$;
grant execute on function public.claim_read_reward to authenticated;

-- 签到：在 v1 基础上叠加等级加成 (level-1)*2
create or replace function public.claim_daily_signin(p_local_date date)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid     uuid := auth.uid();
  v_state   public.daily_state;
  v_rewards int[] := array[50,60,80,100,120,150,300];
  v_streak  int;
  v_cycle   int;
  v_base    int;
  v_bonus   int;
  v_reward  int;
  v_level   int;
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

  v_cycle := ((v_streak - 1) % 7) + 1;
  v_base  := v_rewards[v_cycle];
  select level_for_xp(xp) into v_level from public.profiles where id = v_uid;
  v_bonus  := greatest(coalesce(v_level, 1) - 1, 0) * 2;
  v_reward := v_base + v_bonus;

  insert into public.daily_claims (user_id, day, kind, ref, amount)
    values (v_uid, p_local_date, 'signin', '', v_reward);

  update public.daily_state
    set last_checkin = p_local_date, streak = v_streak,
        longest_streak = greatest(longest_streak, v_streak), updated_at = now()
    where user_id = v_uid;

  update public.profiles set points = points + v_reward where id = v_uid returning * into v_profile;
  insert into public.point_ledger (user_id, amount, source, ref, balance_after)
    values (v_uid, v_reward, 'signin', p_local_date::text, v_profile.points);

  return jsonb_build_object('claimed', true, 'reward', v_reward, 'base', v_base, 'bonus', v_bonus,
                            'streak', v_streak, 'cycle', v_cycle, 'points', v_profile.points);
end; $$;
grant execute on function public.claim_daily_signin to authenticated;

-- 结算：派分 + 盖章（同 v1）+ 给押对的赢家 +50 XP
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

  update public.profiles pr
    set points = pr.points + sub.payout
  from (
    select user_id, floor(sum(shares))::int as payout
    from public.bets
    where gen_market_id = p_id and outcome_label = v_label
    group by user_id
  ) sub
  where pr.id = sub.user_id;

  -- 押对的赢家：每条独立下注 +50 XP（结算前未盖章的才算）
  update public.profiles pr
    set xp = pr.xp + sub.bonus
  from (
    select user_id, (count(*) * 50)::int as bonus
    from public.bets
    where gen_market_id = p_id and outcome_label = v_label and not closed
    group by user_id
  ) sub
  where pr.id = sub.user_id;

  update public.bets b
    set closed = true,
        exit_price = case when b.outcome_label = v_label then 1 else 0 end,
        proceeds   = case when b.outcome_label = v_label then floor(b.shares)::int else 0 end,
        closed_at  = now()
    where b.gen_market_id = p_id and not b.closed;
end; $$;
grant execute on function public.resolve_generated_market to anon, authenticated;

-- ════════════════════════════════════════════════════
-- 三、主题赛季（themed season + PnL race + 名人堂）
-- ════════════════════════════════════════════════════
create table if not exists public.seasons (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  theme          text,                 -- 主题文案（横幅展示）
  theme_category text,                 -- 关联分类（政治/财经/加密/体育/科技/热点），用于内容侧重
  starts_at      timestamptz not null,
  ends_at        timestamptz not null,
  status         text not null default 'active',  -- active | ended
  created_at     timestamptz not null default now()
);
alter table public.seasons enable row level security;
drop policy if exists seasons_select_all on public.seasons;
create policy seasons_select_all on public.seasons for select using (true);

-- 名人堂 / 赛季结算结果
create table if not exists public.season_results (
  season_id    uuid not null references public.seasons (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  rank         int not null,
  display_name text,
  avatar_url   text,
  pnl          int not null,
  reward       int not null,
  badge        text,
  created_at   timestamptz not null default now(),
  primary key (season_id, user_id)
);
alter table public.season_results enable row level security;
drop policy if exists season_results_select_all on public.season_results;
create policy season_results_select_all on public.season_results for select using (true);

-- 当前活跃赛季
create or replace function public.current_season()
returns public.seasons language sql security definer set search_path = public stable as $$
  select * from public.seasons
  where status = 'active' and now() >= starts_at and now() < ends_at
  order by starts_at desc limit 1;
$$;
grant execute on function public.current_season to anon, authenticated;

-- 赛季榜：按「赛季窗口内已结算 PnL」排序（窗口由 closed_at / created_at 界定）
create or replace function public.season_leaderboard(p_season_id uuid, p_limit int default 50)
returns table(display_name text, avatar_url text, xp int, votes int, settled int, wins int, pnl int, staked int)
language sql security definer set search_path = public stable as $$
  with s as (select starts_at, ends_at from public.seasons where id = p_season_id)
  select p.display_name, p.avatar_url, p.xp,
    count(*) filter (where b.created_at >= s.starts_at and b.created_at < s.ends_at)::int as votes,
    count(*) filter (where b.closed and b.closed_at >= s.starts_at and b.closed_at < s.ends_at)::int as settled,
    count(*) filter (where b.closed and b.closed_at >= s.starts_at and b.closed_at < s.ends_at
                       and coalesce(b.proceeds,0) > b.stake)::int as wins,
    coalesce(sum(coalesce(b.proceeds,0) - b.stake)
             filter (where b.closed and b.closed_at >= s.starts_at and b.closed_at < s.ends_at), 0)::int as pnl,
    coalesce(sum(b.stake)
             filter (where b.closed and b.closed_at >= s.starts_at and b.closed_at < s.ends_at), 0)::int as staked
  from public.profiles p
  join public.bets b on b.user_id = p.id
  cross join s
  group by p.id, p.display_name, p.avatar_url, p.xp
  having count(*) filter (where b.created_at >= s.starts_at and b.created_at < s.ends_at) > 0
  order by pnl desc, votes desc, p.created_at asc
  limit greatest(coalesce(p_limit, 50), 1);
$$;
grant execute on function public.season_leaderboard to anon, authenticated;

-- 名人堂读取
create or replace function public.season_hall_of_fame(p_season_id uuid)
returns setof public.season_results language sql security definer set search_path = public stable as $$
  select * from public.season_results where season_id = p_season_id order by rank asc;
$$;
grant execute on function public.season_hall_of_fame to anon, authenticated;

-- 结算赛季：Top10 入名人堂 + 派奖励积分 + 标记 ended + 自动开下一赛季（由 cron/admin 调用）
create or replace function public.close_season(p_season_id uuid)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_s       public.seasons;
  v_rank    int := 0;
  v_reward  int;
  v_rewards int[] := array[1000,600,400,200,200,200,200,200,200,200];
  r         record;
  v_count   int := 0;
begin
  select * into v_s from public.seasons where id = p_season_id;
  if v_s.id is null then raise exception 'season not found'; end if;
  if v_s.status = 'ended' then return 0; end if;

  for r in
    select p.id as user_id, p.display_name, p.avatar_url,
      coalesce(sum(coalesce(b.proceeds,0) - b.stake)
               filter (where b.closed and b.closed_at >= v_s.starts_at and b.closed_at < v_s.ends_at), 0)::int as pnl
    from public.profiles p
    join public.bets b on b.user_id = p.id
    group by p.id
    having count(*) filter (where b.created_at >= v_s.starts_at and b.created_at < v_s.ends_at) > 0
    order by pnl desc
    limit 10
  loop
    v_rank := v_rank + 1;
    v_reward := v_rewards[v_rank];
    insert into public.season_results (season_id, user_id, rank, display_name, avatar_url, pnl, reward, badge)
      values (p_season_id, r.user_id, v_rank, r.display_name, r.avatar_url, r.pnl, v_reward,
              case when v_rank = 1 then '🥇' when v_rank = 2 then '🥈' when v_rank = 3 then '🥉' else '🎖' end)
      on conflict (season_id, user_id)
      do update set rank = excluded.rank, pnl = excluded.pnl, reward = excluded.reward, badge = excluded.badge;
    update public.profiles set points = points + v_reward where id = r.user_id;
    insert into public.point_ledger (user_id, amount, source, ref, balance_after)
      select r.user_id, v_reward, 'season', p_season_id::text, points
      from public.profiles where id = r.user_id;
    v_count := v_count + 1;
  end loop;

  update public.seasons set status = 'ended' where id = p_season_id;

  -- 自动开下一赛季（延续主题，月度窗口）
  insert into public.seasons (name, theme, theme_category, starts_at, ends_at, status)
  values (to_char(v_s.ends_at, 'YYYY·MM') || ' 赛季', v_s.theme, v_s.theme_category,
          v_s.ends_at, v_s.ends_at + interval '1 month', 'active');

  return v_count;
end; $$;
grant execute on function public.close_season to anon, authenticated;

-- 种子：若没有任何活跃赛季，开一个当月主题赛季
insert into public.seasons (name, theme, theme_category, starts_at, ends_at, status)
select to_char(now(), 'YYYY·MM') || ' 赛季', '全球大事·预测季', '热点',
       date_trunc('month', now()), date_trunc('month', now()) + interval '1 month', 'active'
where not exists (select 1 from public.seasons where status = 'active' and now() < ends_at);

-- ════════════════════════════════════════════════════
-- 四、扩展读取：战绩榜带 XP、每日状态带等级 + 赛季
-- ════════════════════════════════════════════════════

-- 总战绩榜：附带 xp（前端据此算等级）
create or replace function public.reputation_leaderboard(p_limit int default 10)
returns table(display_name text, avatar_url text, xp int, votes int, settled int, wins int, pnl int, staked int)
language sql security definer set search_path = public stable as $$
  select p.display_name, p.avatar_url, p.xp,
    count(b.*)::int                                                              as votes,
    count(*) filter (where b.closed)::int                                        as settled,
    count(*) filter (where b.closed and coalesce(b.proceeds,0) > b.stake)::int   as wins,
    coalesce(sum(coalesce(b.proceeds,0) - b.stake) filter (where b.closed), 0)::int as pnl,
    coalesce(sum(b.stake) filter (where b.closed), 0)::int                       as staked
  from public.profiles p
  join public.bets b on b.user_id = p.id
  group by p.id, p.display_name, p.avatar_url, p.xp
  having count(b.*) > 0
  order by pnl desc, votes desc, p.created_at asc
  limit greatest(coalesce(p_limit, 10), 1);
$$;
grant execute on function public.reputation_leaderboard to anon, authenticated;

-- 每日状态：v1 字段 + 等级（xp/level/readCap）+ 赛季（名称/截止/本赛季表态与 PnL）
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
  v_xp       int;
  v_level    int;
  v_cap      int;
  v_season   public.seasons;
  v_s_votes  int := 0;
  v_s_pnl    int := 0;
begin
  if v_uid is null then return jsonb_build_object('auth', false); end if;
  if abs(p_local_date - current_date) > 1 then p_local_date := current_date; end if;

  select * into v_state from public.daily_state where user_id = v_uid;
  select xp into v_xp from public.profiles where id = v_uid;
  v_level := level_for_xp(coalesce(v_xp, 0));
  v_cap   := read_cap_for_level(v_level);

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
  if v_signin or v_state.last_checkin = p_local_date - 1 then v_eff := v_streak; else v_eff := 0; end if;

  if v_signin then
    v_cycle := ((v_streak - 1) % 7) + 1;
  elsif v_state.last_checkin = p_local_date - 1 then
    v_cycle := (v_streak % 7) + 1;
  else
    v_cycle := 1;
  end if;

  select * into v_season from public.current_season();
  if v_season.id is not null then
    select count(*)::int,
           coalesce(sum(coalesce(b.proceeds,0) - b.stake)
                    filter (where b.closed and b.closed_at >= v_season.starts_at and b.closed_at < v_season.ends_at), 0)::int
      into v_s_votes, v_s_pnl
    from public.bets b
    where b.user_id = v_uid and b.created_at >= v_season.starts_at and b.created_at < v_season.ends_at;
  end if;

  return jsonb_build_object(
    'auth', true,
    'signedIn', v_signin,
    'streak', v_eff,
    'signinReward', v_rewards[v_cycle] + greatest(v_level - 1, 0) * 2,
    'cycle', v_cycle,
    'reads', v_reads, 'readCap', v_cap, 'readReward', 10, 'questReadTarget', 3,
    'votes', v_votes, 'voteTarget', 2,
    'questComplete', (v_signin and v_reads >= 3 and v_votes >= 2),
    'questClaimed', v_quest, 'questReward', 100,
    'xp', coalesce(v_xp, 0), 'level', v_level,
    'seasonName', v_season.name, 'seasonTheme', v_season.theme,
    'seasonEnds', v_season.ends_at, 'seasonVotes', v_s_votes, 'seasonPnl', v_s_pnl
  );
end; $$;
grant execute on function public.daily_status to authenticated;
