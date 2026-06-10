import NewsFeed from "@/components/NewsFeed";
import FeaturedRail from "@/components/FeaturedRail";
import AuthButton from "@/components/AuthButton";
import { getProfile } from "@/lib/auth";
import { getFeedEntries } from "@/lib/feed";
import { gnewsEnabled } from "@/lib/gnews";
import { supabaseEnabled } from "@/lib/supabase/env";

// 信息流在请求时渲染（盘口数据来自 Polymarket，不在构建时预取）
export const dynamic = "force-dynamic";
// 真实新闻每 6 小时冷启动时需串行抓取 ~10 条，给足时间避免超时
export const maxDuration = 60;

export default async function Home() {
  const [entries, profile] = await Promise.all([getFeedEntries(), getProfile()]);

  const loggedIn = !!profile;
  const featured = entries.slice(0, 4);

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

        <FeaturedRail entries={featured} />

        <NewsFeed entries={entries} loggedIn={loggedIn} enabled={supabaseEnabled} />
      </div>

      <footer className="max-w-xl mx-auto px-4 pb-10 pt-2 text-center text-xs text-gray-300">
        {gnewsEnabled
          ? "新闻来自 GNews · 盘口来自 Polymarket · 市场优先匹配"
          : "原型 · 策划内容 · 盘口数据来自 Polymarket Gamma API"}
      </footer>
    </main>
  );
}
