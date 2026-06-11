// 运营后台数据层：调 admin_metrics RPC（SECURITY DEFINER + 管理员鉴权）。
import { createClient } from "@/lib/supabase/server";

export interface Funnel {
  visitors: number;
  saw_feed: number;
  opened: number;
  bet: number;
  outbound: number;
  open_rate: number | null;
  bet_rate: number | null;
  outbound_rate: number | null;
}

export interface KindRow {
  market_kind: string;
  impressions: number;
  opens: number;
  ctr: number | null;
}

export interface EventRow {
  event_type: string;
  count: number;
}

export interface TopMarket {
  market_id: string;
  market_kind: string | null;
  opens: number;
  bets: number;
}

export interface DailyRow {
  day: string;
  visitors: number;
}

export interface Metrics {
  days: number;
  funnel: Funnel;
  by_kind: KindRow[];
  events: EventRow[];
  top_markets: TopMarket[];
  daily: DailyRow[];
}

export async function getMetrics(days: number): Promise<Metrics | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("admin_metrics", { p_days: days });
  if (error || !data) return null;
  return data as Metrics;
}
