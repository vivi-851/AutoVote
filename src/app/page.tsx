import { NEWS } from "@/lib/news";
import { getMarketsBySlugs } from "@/lib/polymarket";
import NewsFeed, { type FeedEntry } from "@/components/NewsFeed";
import AuthButton from "@/components/AuthButton";
import { getProfile } from "@/lib/auth";
import { supabaseEnabled } from "@/lib/supabase/env";

// 信息流在请求时渲染（盘口数据来自 Polymarket，不在构建时预取）
export const dynamic = "force-dynamic";

export default async function Home() {
  // 一次性批量拉取所有新闻关联的盘口
  const slugs = NEWS.map((n) => n.marketSlug);
  const categoryBySlug = Object.fromEntries(
    NEWS.map((n) => [n.marketSlug, n.marketCategory]),
  );
  const [markets, profile] = await Promise.all([
    getMarketsBySlugs(slugs, categoryBySlug),
    getProfile(),
  ]);

  const entries: FeedEntry[] = NEWS.map((news) => ({
    news,
    market: markets.get(news.marketSlug) ?? null,
  }));

  return (
    <main className="min-h-full bg-[#fafafa]">
      {/* 顶部栏 */}
      <header className="sticky top-0 z-10 backdrop-blur bg-white/80 border-b border-black/5">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg tracking-tight">AutoVote</span>
            <span className="text-xs text-gray-400">新闻预测信息流</span>
          </div>
          <AuthButton profile={profile} enabled={supabaseEnabled} />
        </div>
      </header>

      {/* 信息流 */}
      <div className="max-w-xl mx-auto px-4 py-5">
        <div className="mb-4">
          <h1 className="text-xl font-bold text-gray-900">今日要闻</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            读新闻，顺手看看市场怎么押注 —— 你怎么看？
          </p>
        </div>

        <NewsFeed entries={entries} />
      </div>

      <footer className="max-w-xl mx-auto px-4 pb-10 pt-2 text-center text-xs text-gray-300">
        原型 · 新闻信息流 + 盘口 · 盘口数据来自 Polymarket Gamma API
      </footer>
    </main>
  );
}
