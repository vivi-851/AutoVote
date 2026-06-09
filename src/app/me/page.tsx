import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { supabaseEnabled } from "@/lib/supabase/env";
import { getProfile } from "@/lib/auth";
import { getMarketsBySlugs } from "@/lib/polymarket";
import AuthButton from "@/components/AuthButton";

export const dynamic = "force-dynamic";

interface BetRow {
  id: string;
  news_id: string | null;
  market_slug: string;
  market_title: string | null;
  outcome_label: string;
  outcome_market_id: string;
  entry_price: number;
  stake: number;
  shares: number;
  created_at: string;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-full bg-[#fafafa]">
      <header className="sticky top-0 z-10 backdrop-blur bg-white/80 border-b border-black/5">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/" className="text-gray-500 hover:text-gray-900 text-sm flex items-center gap-1">
            <span className="text-lg leading-none">‹</span> 返回
          </Link>
          <span className="ml-auto text-xs text-gray-400">我的预测</span>
        </div>
      </header>
      <div className="max-w-xl mx-auto px-4 py-5">{children}</div>
    </main>
  );
}

export default async function MyPredictions() {
  if (!supabaseEnabled) {
    return (
      <Shell>
        <div className="text-center text-gray-400 py-20 text-sm">
          账户系统待接入 Supabase 后开放
        </div>
      </Shell>
    );
  }

  const profile = await getProfile();
  if (!profile) {
    return (
      <Shell>
        <div className="text-center py-20">
          <p className="text-sm text-gray-500 mb-4">登录后查看你的预测与积分</p>
          <AuthButton profile={null} enabled={supabaseEnabled} />
        </div>
      </Shell>
    );
  }

  const supabase = await createClient();
  const { data } = await supabase!
    .from("bets")
    .select("*")
    .order("created_at", { ascending: false });
  const bets = (data ?? []) as BetRow[];

  // 拉所有相关市场的当前价，做实时浮动盈亏
  const slugs = [...new Set(bets.map((b) => b.market_slug))];
  const markets = await getMarketsBySlugs(slugs);

  const rows = bets.map((b) => {
    const market = markets.get(b.market_slug) ?? null;
    const current =
      market?.outcomes.find(
        (o) => o.marketId === b.outcome_market_id && o.label === b.outcome_label,
      )?.probability ?? null;
    const curPrice = current ?? b.entry_price;
    const value = b.shares * curPrice;
    const pnl = value - b.stake;
    return { ...b, curPrice, value, pnl, live: current !== null };
  });

  const totalStaked = rows.reduce((s, r) => s + r.stake, 0);
  const totalValue = rows.reduce((s, r) => s + r.value, 0);
  const totalPnl = totalValue - totalStaked;

  return (
    <Shell>
      {/* 概览卡 */}
      <div className="rounded-2xl bg-white ring-1 ring-black/8 shadow-sm p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs text-gray-400">可用积分</div>
            <div className="text-2xl font-bold text-amber-600 tabular-nums">
              {profile.points.toLocaleString()}
            </div>
          </div>
          <AuthButton profile={profile} enabled={supabaseEnabled} />
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="持仓本金" value={Math.round(totalStaked).toLocaleString()} />
          <Stat label="当前市值" value={Math.round(totalValue).toLocaleString()} />
          <Stat
            label="浮动盈亏"
            value={`${totalPnl >= 0 ? "+" : ""}${Math.round(totalPnl).toLocaleString()}`}
            color={totalPnl >= 0 ? "text-green-600" : "text-red-500"}
          />
        </div>
      </div>

      <div className="text-sm font-semibold text-gray-700 mb-2 px-1">
        持仓 · {rows.length}
      </div>

      {rows.length === 0 ? (
        <div className="text-center text-gray-400 py-16 text-sm">
          还没有下注 —— 回信息流挑条新闻表个态吧
        </div>
      ) : (
        <div className="space-y-2.5">
          {rows.map((r) => {
            const up = r.pnl >= 0;
            return (
              <div
                key={r.id}
                className="rounded-xl bg-white ring-1 ring-black/8 shadow-sm p-3.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[14px] font-medium text-gray-900 truncate">
                      {r.market_title ?? r.market_slug}
                    </div>
                    <div className="text-[12px] text-gray-500 mt-0.5">
                      押「{r.outcome_label}」· {r.stake} 分 @ {Math.round(r.entry_price * 100)}%
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-[15px] font-bold tabular-nums ${up ? "text-green-600" : "text-red-500"}`}>
                      {up ? "+" : ""}
                      {Math.round(r.pnl)}
                    </div>
                    <div className="text-[11px] text-gray-400">
                      现 {Math.round(r.curPrice * 100)}%{r.live ? "" : " · 待更新"}
                    </div>
                  </div>
                </div>
                {r.news_id && (
                  <Link
                    href={`/news/${r.news_id}`}
                    className="inline-block mt-2 text-[12px] text-indigo-600 hover:underline"
                  >
                    查看原新闻 →
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-center text-[11px] text-gray-300 mt-6">
        浮动盈亏按 Polymarket 实时概率计算 · 市场结算后转为最终成绩
      </p>
    </Shell>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl bg-gray-50 py-2.5">
      <div className="text-[11px] text-gray-400">{label}</div>
      <div className={`text-[15px] font-semibold tabular-nums ${color ?? "text-gray-800"}`}>
        {value}
      </div>
    </div>
  );
}
