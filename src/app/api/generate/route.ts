import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseEnabled } from "@/lib/supabase/env";
import { llmEnabled } from "@/lib/llm";
import { generateDrafts } from "@/lib/generate";

// 生成 AI 盘口：拉头条 → LLM 生成 → 写库。
// 由我手动触发或 cron 调用。若设置了 GENERATE_SECRET，需带 ?key= 匹配。
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.GENERATE_SECRET;
  if (secret && request.nextUrl.searchParams.get("key") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!llmEnabled) return NextResponse.json({ error: "LLM not configured" }, { status: 400 });
  if (!supabaseEnabled) return NextResponse.json({ error: "Supabase not configured" }, { status: 400 });

  const limit = Math.min(Number(request.nextUrl.searchParams.get("limit")) || 6, 12);
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "no supabase client" }, { status: 400 });

  const drafts = await generateDrafts(limit);
  const created: { id: string; question: string }[] = [];

  for (const d of drafts) {
    const { data, error } = await supabase.rpc("create_generated_market", {
      p_question: d.question,
      p_category: d.category,
      p_news_headline: d.news.headline,
      p_news_url: d.news.url,
      p_news_source: d.news.source,
      p_init_prob: d.yesProbability,
      p_end_date: d.endDate,
    });
    if (error) {
      console.error("create_generated_market failed", error.message);
      continue;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (row?.id) created.push({ id: row.id, question: row.question });
  }

  return NextResponse.json({ generated: drafts.length, created: created.length, markets: created });
}
