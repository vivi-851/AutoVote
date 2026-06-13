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

// 战绩榜（reputation）：从已结算下注推导 PnL/胜率/下注数 + XP（算等级）。
// 依赖 supabase/rewards.sql + v2.sql 的 reputation_leaderboard RPC；未执行/未配置时返回空。
export interface RepRow {
  display_name: string | null;
  avatar_url: string | null;
  xp: number; // 累计经验（前端据此算等级；v1 RPC 无此字段时回退 0）
  votes: number; // 累计下注数
  settled: number; // 已结算笔数（胜率分母）
  wins: number; // 已结算中盈利的笔数
  pnl: number; // 已实现盈亏（积分）
  staked: number; // 已结算投入本金（ROI 分母）
}

function normalizeRep(rows: unknown[]): RepRow[] {
  return (rows as Partial<RepRow>[]).map((r) => ({
    display_name: r.display_name ?? null,
    avatar_url: r.avatar_url ?? null,
    xp: r.xp ?? 0,
    votes: r.votes ?? 0,
    settled: r.settled ?? 0,
    wins: r.wins ?? 0,
    pnl: r.pnl ?? 0,
    staked: r.staked ?? 0,
  }));
}

export async function getReputationLeaderboard(limit = 5): Promise<RepRow[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("reputation_leaderboard", { p_limit: limit });
  if (error || !data) return [];
  return normalizeRep(data as unknown[]);
}

// ── 赛季（themed season + race）─────────────────────────
export interface Season {
  id: string;
  name: string;
  theme: string | null;
  theme_category: string | null;
  starts_at: string;
  ends_at: string;
  status: string;
}

export interface HallRow {
  rank: number;
  display_name: string | null;
  avatar_url: string | null;
  pnl: number;
  reward: number;
  badge: string | null;
}

export async function getCurrentSeason(): Promise<Season | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("current_season");
  if (error || !data) return null;
  // RPC 返回单行表 → 取第一行
  const row = Array.isArray(data) ? data[0] : data;
  return (row as Season) ?? null;
}

export async function getSeasonLeaderboard(seasonId: string, limit = 50): Promise<RepRow[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("season_leaderboard", {
    p_season_id: seasonId,
    p_limit: limit,
  });
  if (error || !data) return [];
  return normalizeRep(data as unknown[]);
}

export async function getSeasonHallOfFame(seasonId: string): Promise<HallRow[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("season_hall_of_fame", { p_season_id: seasonId });
  if (error || !data) return [];
  return data as HallRow[];
}
