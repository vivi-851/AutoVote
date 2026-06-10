import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseEnabled } from "@/lib/supabase/env";
import { llmEnabled } from "@/lib/llm";
import { resolveMarkets } from "@/lib/resolve";
import type { GenMarketRow } from "@/lib/generated";

// 到期结算：找到期开放盘口 → LLM 判定 → resolve_generated_market 派分。
// ?id=<uuid> 强制结算某条（忽略日期，测试用）；?dry=1 只判定不写库。
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.GENERATE_SECRET;
  if (secret && request.nextUrl.searchParams.get("key") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!llmEnabled) return NextResponse.json({ error: "LLM not configured" }, { status: 400 });
  if (!supabaseEnabled) return NextResponse.json({ error: "Supabase not configured" }, { status: 400 });

  const sp = request.nextUrl.searchParams;
  const forceId = sp.get("id");
  const dry = sp.get("dry") === "1";
  const minConfidence = Number(sp.get("minconf")) || 0.6;

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "no supabase client" }, { status: 400 });

  // 选取目标盘口
  let query = supabase.from("generated_markets").select("*").eq("status", "open");
  if (forceId) {
    query = query.eq("id", forceId);
  } else {
    query = query.lte("end_date", new Date().toISOString().slice(0, 10)).limit(10);
  }
  const { data } = await query;
  const markets = (data as GenMarketRow[]) ?? [];

  if (markets.length === 0) {
    return NextResponse.json({ candidates: 0, decisions: [] });
  }

  const decisions = await resolveMarkets(
    markets,
    async (id, outcome, note) => {
      const { error } = await supabase.rpc("resolve_generated_market", {
        p_id: id,
        p_outcome: outcome,
        p_note: note,
      });
      if (error) console.error("resolve_generated_market failed", error.message);
      return !error;
    },
    { minConfidence, dry },
  );

  return NextResponse.json({ candidates: markets.length, dry, decisions });
}
