// AI 生成盘口的读取与转换（供信息流/详情/我的预测复用现有卡片）
import { createClient } from "@/lib/supabase/server";
import type { FeedCard } from "@/lib/polymarket";
import type { NewsItem } from "@/lib/news";

export interface GenMarketRow {
  id: string;
  question: string;
  category: string | null;
  news_headline: string | null;
  news_url: string | null;
  news_source: string | null;
  init_prob: number;
  pool_yes: number;
  pool_no: number;
  end_date: string | null;
  status: string;
  outcome: string | null;
  created_at: string;
}

export interface FeedEntry {
  news: NewsItem;
  market: FeedCard | null;
}

function pseudo(seed: string, min: number, max: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return min + (h % (max - min));
}

export function genPriceYes(row: { pool_yes: number; pool_no: number }): number {
  const t = row.pool_yes + row.pool_no;
  return t > 0 ? row.pool_yes / t : 0.5;
}

function toEntry(row: GenMarketRow): FeedEntry {
  const priceYes = genPriceYes(row);
  const market: FeedCard = {
    id: row.id,
    slug: row.id,
    title: row.question,
    description: "",
    image: null,
    volume: 0,
    volume24hr: 0,
    endDate: row.end_date ? new Date(row.end_date).toISOString() : null,
    category: "Hot",
    newsCategory: row.category || "热点",
    outcomes: [
      { label: "Yes", marketId: row.id, probability: priceYes, clobTokenId: "" },
      { label: "No", marketId: row.id, probability: 1 - priceYes, clobTokenId: "" },
    ],
    isBinary: true,
    polymarketUrl: row.news_url || "#",
    genMarketId: row.id,
  };
  const news: NewsItem = {
    id: row.id,
    source: row.news_source || "AI 盘口",
    handle: "@ai",
    category: row.category || "热点",
    headline: row.news_headline || row.question,
    summary: row.question,
    tldr: [row.question, `初始概率 ${Math.round(row.init_prob * 100)}%（AI 估计，随下注浮动）`],
    publishedAgo: "AI 生成",
    marketSlug: row.id,
    marketCategory: "Hot",
    originalUrl: row.news_url || "#",
    likes: pseudo(row.id, 50, 800),
    comments: pseudo(row.id + "c", 5, 90),
    generated: true,
  };
  return { news, market };
}

// 信息流用：最近的开放生成盘口
export async function getGeneratedEntries(limit = 8): Promise<FeedEntry[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("generated_markets")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(limit);
  return ((data as GenMarketRow[]) ?? []).map(toEntry);
}

export async function getGeneratedEntry(id: string): Promise<FeedEntry | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("generated_markets")
    .select("*")
    .eq("id", id)
    .single();
  return data ? toEntry(data as GenMarketRow) : null;
}

// 我的预测用：按一组 gen id 取当前价/状态
export async function getGenMarketsByIds(
  ids: string[],
): Promise<Map<string, GenMarketRow>> {
  const map = new Map<string, GenMarketRow>();
  if (ids.length === 0) return map;
  const supabase = await createClient();
  if (!supabase) return map;
  const { data } = await supabase.from("generated_markets").select("*").in("id", ids);
  for (const r of (data as GenMarketRow[]) ?? []) map.set(r.id, r);
  return map;
}
