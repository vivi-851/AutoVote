import Link from "next/link";
import NewsFeed from "@/components/NewsFeed";
import FeaturedRail from "@/components/FeaturedRail";
import RightRail from "@/components/RightRail";
import AuthButton from "@/components/AuthButton";
import SettingsControl from "@/components/SettingsControl";
import { getProfile } from "@/lib/auth";
import { getFeedEntries } from "@/lib/feed";
import { supabaseEnabled } from "@/lib/supabase/env";
import { getServerT } from "@/lib/i18n-server";

// 信息流在请求时渲染（盘口数据来自 Polymarket，不在构建时预取）
export const dynamic = "force-dynamic";
// 真实新闻每 6 小时冷启动时需串行抓取 ~10 条，给足时间避免超时
export const maxDuration = 60;

export default async function Home() {
  const [entries, profile, { t }] = await Promise.all([
    getFeedEntries(),
    getProfile(),
    getServerT(),
  ]);

  const loggedIn = !!profile;
  const featured = entries.slice(0, 4);
  // 右栏热门盘口：取真实 Polymarket 盘口（排除 AI 盘口），按 24h 成交量排序
  const hot = entries
    .filter((e) => e.market && !e.market.genMarketId)
    .sort((a, b) => (b.market!.volume24hr ?? 0) - (a.market!.volume24hr ?? 0))
    .slice(0, 5);

  return (
    <main className="min-h-full bg-background">
      {/* 顶部栏 */}
      <header className="sticky top-0 z-10 backdrop-blur bg-white/80 dark:bg-gray-900/80 border-b border-black/5 dark:border-white/10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg tracking-tight">AutoVote</span>
            <span className="text-xs text-gray-400">{t("新闻预测信息流")}</span>
          </div>
          <div className="flex items-center gap-1">
            <Link
              href="/leaderboard"
              className="text-[13px] text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 px-2 py-1 font-medium"
            >
              🏆 {t("排行榜")}
            </Link>
            <SettingsControl />
            <AuthButton profile={profile} enabled={supabaseEnabled} />
          </div>
        </div>
      </header>

      {/* 两栏：信息流（移动端单列、桌面居中）+ 右栏（仅桌面） */}
      <div className="max-w-5xl mx-auto px-4 py-5 lg:flex lg:gap-6 lg:justify-center">
        {/* 信息流列：阅读宽度封顶 600px */}
        <div className="w-full max-w-[600px] mx-auto lg:mx-0">
          <div className="mb-4">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t("今日要闻")}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {t("读新闻，顺手看看市场怎么押注 —— 你怎么看？")}
            </p>
          </div>

          <FeaturedRail entries={featured} />

          <NewsFeed entries={entries} loggedIn={loggedIn} enabled={supabaseEnabled} />

          <footer className="pb-10 pt-6 text-center text-xs text-gray-300 dark:text-gray-600">
            News × Polymarket × AI
          </footer>
        </div>

        {/* 右栏：积分榜 + 热门盘口（仅 lg+，sticky 跟随） */}
        <aside className="hidden lg:block lg:w-[300px] shrink-0">
          <div className="sticky top-20">
            <RightRail hot={hot} />
          </div>
        </aside>
      </div>
    </main>
  );
}
