import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseEnabled } from "@/lib/supabase/env";

// 赛季结算：找到已过期（ends_at <= now）的活跃赛季 → close_season（派奖励 + 名人堂 + 开下一季）。
// ?id=<uuid> 强制结算某一季（忽略时间，测试用）。每月 cron 触发（vercel.json）。
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface SeasonRow {
  id: string;
  name: string;
  ends_at: string;
}

export async function GET(request: NextRequest) {
  const secret = process.env.GENERATE_SECRET;
  if (secret && request.nextUrl.searchParams.get("key") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!supabaseEnabled) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 400 });
  }

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "no supabase client" }, { status: 400 });

  const forceId = request.nextUrl.searchParams.get("id");

  let query = supabase.from("seasons").select("id, name, ends_at").eq("status", "active");
  if (forceId) {
    query = query.eq("id", forceId);
  } else {
    query = query.lte("ends_at", new Date().toISOString());
  }
  const { data } = await query;
  const seasons = (data as SeasonRow[]) ?? [];

  const closed: { id: string; name: string; winners: number }[] = [];
  for (const s of seasons) {
    const { data: count, error } = await supabase.rpc("close_season", { p_season_id: s.id });
    if (error) {
      console.error("close_season failed", s.id, error.message);
      continue;
    }
    closed.push({ id: s.id, name: s.name, winners: (count as number) ?? 0 });
  }

  return NextResponse.json({ candidates: seasons.length, closed });
}
