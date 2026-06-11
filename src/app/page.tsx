import NewsFeed from "@/components/NewsFeed";
import FeaturedRail from "@/components/FeaturedRail";
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

  return (
    <main className="min-h-full bg-background">
      {/* 顶部栏 */}
      <header className="sticky top-0 z-10 backdrop-blur bg-white/80 dark:bg-gray-900/80 border-b border-black/5 dark:border-white/10">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg tracking-tight">AutoVote</span>
            <span className="text-xs text-gray-400">{t("新闻预测信息流")}</span>
          </div>
          <div className="flex items-center gap-1">
            <SettingsControl />
            <AuthButton profile={profile} enabled={supabaseEnabled} />
          </div>
        </div>
      </header>

      {/* 信息流 */}
      <div className="max-w-xl mx-auto px-4 py-5">
        <div className="mb-4">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t("今日要闻")}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {t("读新闻，顺手看看市场怎么押注 —— 你怎么看？")}
          </p>
        </div>

        <FeaturedRail entries={featured} />

        <NewsFeed entries={entries} loggedIn={loggedIn} enabled={supabaseEnabled} />
      </div>

      <footer className="max-w-xl mx-auto px-4 pb-10 pt-2 text-center text-xs text-gray-300 dark:text-gray-600">
        News × Polymarket × AI
      </footer>
    </main>
  );
}
