// 积分榜数据层：调 leaderboard RPC（SECURITY DEFINER 绕过 profiles RLS）。
// RPC 不存在（leaderboard.sql 未执行）或未配置 Supabase 时，安全返回空数组。
import { createClient } from "@/lib/supabase/server";

export interface LeaderRow {
  display_name: string | null;
  avatar_url: string | null;
  points: number;
}

export async function getLeaderboard(limit = 5): Promise<LeaderRow[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("leaderboard", { p_limit: limit });
  if (error || !data) return [];
  return data as LeaderRow[];
}
