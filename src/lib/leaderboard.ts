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

// 战绩榜（reputation）：从已结算下注推导 PnL/胜率/下注数。
// 依赖 supabase/rewards.sql 的 reputation_leaderboard RPC；未执行/未配置时返回空。
export interface RepRow {
  display_name: string | null;
  avatar_url: string | null;
  votes: number; // 累计下注数
  settled: number; // 已结算笔数（胜率分母）
  wins: number; // 已结算中盈利的笔数
  pnl: number; // 已实现盈亏（积分）
  staked: number; // 已结算投入本金（ROI 分母）
}

export async function getReputationLeaderboard(limit = 5): Promise<RepRow[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("reputation_leaderboard", { p_limit: limit });
  if (error || !data) return [];
  return data as RepRow[];
}
