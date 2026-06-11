-- AutoVote · 运营后台
-- 在 Supabase SQL Editor 整段执行。依赖 schema.sql / events.sql。
--
-- 用法：建完后把自己设为管理员（替换成你的登录邮箱）：
--   update public.profiles set is_admin = true where email = 'you@example.com';

-- 管理员标记
alter table public.profiles add column if not exists is_admin boolean not null default false;

-- 看板聚合：一次返回漏斗 / 分类型 CTR / 事件计数 / 热门盘口 / 每日趋势。
-- SECURITY DEFINER 绕过 events 的 RLS（只写不读），但入口强制校验管理员身份。
create or replace function public.admin_metrics(p_days int default 7)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v_since timestamptz := now() - (p_days || ' days')::interval;
  v_funnel jsonb; v_by_kind jsonb; v_events jsonb; v_top jsonb; v_daily jsonb;
begin
  if v_uid is null or not exists (
    select 1 from public.profiles where id = v_uid and is_admin
  ) then
    raise exception 'not authorized';
  end if;

  -- 访客漏斗（按 anon_id 去重）
  with f as (
    select anon_id,
      max((event_type='feed_impression')::int) as impressed,
      max((event_type='card_open')::int)       as opened,
      max((event_type='quickbet')::int)        as bet,
      max((event_type='outbound_market')::int) as outbound
    from public.events
    where created_at > v_since and anon_id is not null
    group by anon_id
  )
  select jsonb_build_object(
    'visitors', count(*),
    'saw_feed', coalesce(sum(impressed),0),
    'opened',   coalesce(sum(opened),0),
    'bet',      coalesce(sum(bet),0),
    'outbound', coalesce(sum(outbound),0),
    'open_rate',     round(100.0*sum(opened)  /nullif(sum(impressed),0),1),
    'bet_rate',      round(100.0*sum(bet)     /nullif(sum(opened),0),1),
    'outbound_rate', round(100.0*sum(outbound)/nullif(sum(bet),0),1)
  ) into v_funnel from f;

  -- 按盘口类型的曝光→点开 CTR
  select coalesce(jsonb_agg(x order by x.impressions desc), '[]'::jsonb) into v_by_kind
  from (
    select coalesce(market_kind,'unknown') as market_kind,
      count(*) filter (where event_type='feed_impression') as impressions,
      count(*) filter (where event_type='card_open')       as opens,
      round(100.0*count(*) filter (where event_type='card_open')
            /nullif(count(*) filter (where event_type='feed_impression'),0),1) as ctr
    from public.events
    where created_at > v_since
    group by coalesce(market_kind,'unknown')
  ) x;

  -- 各事件计数
  select coalesce(jsonb_agg(
           jsonb_build_object('event_type', event_type, 'count', c) order by c desc
         ), '[]'::jsonb) into v_events
  from (
    select event_type, count(*) c from public.events
    where created_at > v_since group by event_type
  ) y;

  -- 下注最多的盘口 Top 10
  select coalesce(jsonb_agg(x order by x.bets desc), '[]'::jsonb) into v_top
  from (
    select market_id, market_kind,
      count(*) filter (where event_type='card_open') as opens,
      count(*) filter (where event_type='quickbet')  as bets
    from public.events
    where created_at > v_since and market_id is not null
    group by market_id, market_kind
    having count(*) filter (where event_type='quickbet') > 0
    order by bets desc
    limit 10
  ) x;

  -- 每日访客趋势
  select coalesce(jsonb_agg(
           jsonb_build_object('day', d, 'visitors', v) order by d
         ), '[]'::jsonb) into v_daily
  from (
    select date_trunc('day', created_at)::date as d, count(distinct anon_id) as v
    from public.events where created_at > v_since group by 1
  ) z;

  return jsonb_build_object(
    'days', p_days,
    'funnel', coalesce(v_funnel, '{}'::jsonb),
    'by_kind', v_by_kind,
    'events', v_events,
    'top_markets', v_top,
    'daily', v_daily
  );
end; $$;

grant execute on function public.admin_metrics to authenticated;
