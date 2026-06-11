-- AutoVote · 积分榜（右栏）
-- 在 Supabase SQL Editor 整段执行。依赖 schema.sql。
--
-- profiles 的 RLS 只允许用户读自己那行，所以排行榜需要一个 SECURITY DEFINER 函数
-- 绕过 RLS 返回 Top N（仅暴露昵称 / 头像 / 积分，用于游戏化排行）。

create or replace function public.leaderboard(p_limit int default 5)
returns table(display_name text, avatar_url text, points int)
language sql security definer set search_path = public stable as $$
  select display_name, avatar_url, points
  from public.profiles
  order by points desc, created_at asc
  limit greatest(coalesce(p_limit, 5), 1);
$$;

grant execute on function public.leaderboard to anon, authenticated;
