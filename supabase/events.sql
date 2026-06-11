-- AutoVote · 漏斗埋点事件表（append-only）
-- 在 Supabase SQL Editor 整段执行。字段含义见 docs/analytics.md。
--
-- 设计要点：
-- 1) 只写不读：放开 insert（含匿名），不放开 select。分析只在 SQL 后台（service 角色绕过 RLS）查。
-- 2) user_id 由触发器强制写成 auth.uid()，客户端无法伪造；未登录则为 null。
-- 3) anon_id（cookie）贯穿登录前后，登录后可借同一 anon_id 把匿名行为接到 user_id 上。

create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  user_id     uuid references auth.users(id) on delete set null, -- 登录用户（触发器写入）
  anon_id     text,            -- 匿名访客 id（cookie av_anon），贯穿登录前后
  session_id  text,            -- 单次浏览会话 id（sessionStorage）
  event_type  text not null,   -- 事件类型，见字典
  market_id   text,            -- 盘口标识：Polymarket slug / 生成盘口 uuid
  market_kind text,            -- polymarket | generated | sponsored
  source      text,            -- organic | sponsored（广告位预留）
  position    int,             -- 在信息流中的位次（曝光/点开用）
  props       jsonb not null default '{}'::jsonb, -- 其余上下文（side/stake/from/target...）
  path        text             -- 触发时的页面路径
);

create index if not exists events_type_time_idx on public.events (event_type, created_at desc);
create index if not exists events_time_idx       on public.events (created_at desc);
create index if not exists events_anon_idx       on public.events (anon_id);

-- user_id 一律以服务端会话为准，忽略客户端传入，杜绝伪造
create or replace function public.events_set_uid()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.user_id := auth.uid();
  return new;
end; $$;

drop trigger if exists events_set_uid on public.events;
create trigger events_set_uid before insert on public.events
  for each row execute function public.events_set_uid();

-- RLS：放开 insert（匿名 + 登录），不放开 select
alter table public.events enable row level security;

drop policy if exists events_insert_any on public.events;
create policy events_insert_any on public.events
  for insert to anon, authenticated with check (true);
