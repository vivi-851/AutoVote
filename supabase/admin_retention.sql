-- AutoVote · 运营后台「留存/参与」看板
-- 在 Supabase SQL Editor 整段执行。依赖 admin.sql（is_admin）/ rewards.sql / v2.sql。
--
-- 留存行为（签到/阅读/任务/等级/赛季）只写权威表，不写 events，所以漏斗看板看不到。
-- 这里直接从 point_ledger / daily_claims / profiles / bets / seasons 聚合，数据准、不依赖埋点。

create or replace function public.admin_retention(p_days int default 7)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid        uuid := auth.uid();
  v_since      timestamptz := now() - (p_days || ' days')::interval;
  v_since_date date := (now() - (p_days || ' days')::interval)::date;
  v_dau        jsonb;
  v_by_source  jsonb;
  v_levels     jsonb;
  v_signins    int; v_signin_users int; v_reads int; v_quests int; v_new_users int;
  v_season     public.seasons;
  v_participants int := 0;
  v_top_pnl    int := 0;
  v_season_json jsonb := null;
begin
  if v_uid is null or not exists (select 1 from public.profiles where id = v_uid and is_admin) then
    raise exception 'not authorized';
  end if;

  -- 每日活跃用户（有积分流水或下注即算活跃）
  select coalesce(jsonb_agg(jsonb_build_object('day', d, 'users', u) order by d), '[]'::jsonb)
    into v_dau
  from (
    select d, count(distinct uid) as u from (
      select date_trunc('day', created_at)::date as d, user_id as uid
        from public.point_ledger where created_at > v_since and user_id is not null
      union
      select date_trunc('day', created_at)::date as d, user_id as uid
        from public.bets where created_at > v_since
    ) a group by d
  ) z;

  -- 留存动作计数（范围内，按本地领取日期）
  select
    coalesce(count(*) filter (where kind = 'signin'), 0),
    coalesce(count(distinct user_id) filter (where kind = 'signin'), 0),
    coalesce(count(*) filter (where kind = 'read'), 0),
    coalesce(count(*) filter (where kind = 'quest'), 0)
  into v_signins, v_signin_users, v_reads, v_quests
  from public.daily_claims where day >= v_since_date;

  select count(*) into v_new_users from public.profiles where created_at > v_since;

  -- 积分发放（按来源，范围内）
  select coalesce(jsonb_agg(jsonb_build_object('source', source, 'amount', amt, 'count', c) order by amt desc), '[]'::jsonb)
    into v_by_source
  from (
    select source, sum(amount)::int as amt, count(*)::int as c
    from public.point_ledger where created_at > v_since group by source
  ) s;

  -- 等级分布（当前快照）
  select coalesce(jsonb_agg(jsonb_build_object('level', lvl, 'users', c) order by lvl), '[]'::jsonb)
    into v_levels
  from (select level_for_xp(xp) as lvl, count(*)::int as c from public.profiles group by 1) l;

  -- 当前赛季参与
  select * into v_season from public.current_season();
  if v_season.id is not null then
    select count(distinct user_id)::int into v_participants from public.bets
      where created_at >= v_season.starts_at and created_at < v_season.ends_at;
    select coalesce(max(pnl), 0)::int into v_top_pnl from (
      select user_id, sum(coalesce(proceeds,0) - stake)
             filter (where closed and closed_at >= v_season.starts_at and closed_at < v_season.ends_at) as pnl
      from public.bets group by user_id
    ) p;
    v_season_json := jsonb_build_object(
      'name', v_season.name, 'theme', v_season.theme,
      'ends_at', v_season.ends_at, 'participants', v_participants, 'top_pnl', v_top_pnl
    );
  end if;

  return jsonb_build_object(
    'days', p_days,
    'dau', v_dau,
    'signins', v_signins, 'signin_users', v_signin_users,
    'reads', v_reads, 'quests', v_quests, 'new_users', v_new_users,
    'points_by_source', v_by_source,
    'levels', v_levels,
    'season', v_season_json
  );
end; $$;

grant execute on function public.admin_retention to authenticated;
