import Link from "next/link";
import type { FeedEntry } from "@/lib/feed";
import { getLeaderboard } from "@/lib/leaderboard";
import { getServerT } from "@/lib/i18n-server";

function pct(p: number) {
  return `${Math.round(p * 100)}%`;
}

const MEDAL = ["🥇", "🥈", "🥉"];

const catColor: Record<string, string> = {
  政治: "bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-300 ring-blue-200 dark:ring-blue-500/30",
  财经: "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-500/30",
  加密: "bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-300 ring-amber-200 dark:ring-amber-500/30",
  体育: "bg-violet-50 dark:bg-violet-500/15 text-violet-600 dark:text-violet-300 ring-violet-200 dark:ring-violet-500/30",
  科技: "bg-cyan-50 dark:bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 ring-cyan-200 dark:ring-cyan-500/30",
};

// PC 右栏：积分榜 + 热门盘口 + 引导卡（仅 lg+ 显示，移动端不渲染）
export default async function RightRail({ hot }: { hot: FeedEntry[] }) {
  const [{ t }, leaders] = await Promise.all([getServerT(), getLeaderboard(5)]);

  return (
    <div className="space-y-4">
      {/* 积分榜 */}
      {leaders.length > 0 && (
        <section className="rounded-2xl border border-black/8 dark:border-white/10 bg-white dark:bg-gray-900 shadow-sm p-4">
          <div className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
            🏆 {t("积分榜")}
          </div>
          <div className="space-y-2.5">
            {leaders.map((l, i) => {
              const name = l.display_name || "玩家";
              return (
                <div key={i} className="flex items-center gap-2.5">
                  <span className={`w-5 text-center text-[13px] ${i < 3 ? "" : "text-gray-400"}`}>
                    {MEDAL[i] ?? i + 1}
                  </span>
                  <span className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-300 to-purple-400 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                    {name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="text-[13px] text-gray-700 dark:text-gray-200 flex-1 truncate">
                    {name}
                  </span>
                  <span className="text-[13px] font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                    {l.points.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 热门盘口 */}
      {hot.length > 0 && (
        <section className="rounded-2xl border border-black/8 dark:border-white/10 bg-white dark:bg-gray-900 shadow-sm p-4">
          <div className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
            🔥 {t("热门盘口")}
          </div>
          <div className="space-y-3">
            {hot.map((e) => {
              const m = e.market!;
              const top = m.outcomes[0];
              const lead =
                top &&
                (m.isBinary
                  ? top.label.toLowerCase() === "yes"
                    ? t("会发生")
                    : t("不会")
                  : top.label);
              const up = top ? top.probability >= 0.5 : true;
              return (
                <Link key={e.news.id} href={`/news/${e.news.id}`} className="block group">
                  <div className="text-[13px] text-gray-800 dark:text-gray-100 leading-snug line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                    {m.title}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[11px]">
                    <span
                      className={`px-2 py-0.5 rounded-full ring-1 font-medium ${
                        catColor[e.news.category] ??
                        "bg-gray-50 dark:bg-white/10 text-gray-600 dark:text-gray-300 ring-gray-200 dark:ring-white/15"
                      }`}
                    >
                      {t(e.news.category)}
                    </span>
                    {top && (
                      <span
                        className={`px-1.5 py-0.5 rounded font-medium tabular-nums ${
                          up
                            ? "bg-green-50 dark:bg-green-500/15 text-green-700 dark:text-green-300"
                            : "bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-300"
                        }`}
                      >
                        {lead} {pct(top.probability)}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* 引导卡 */}
      <section className="rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-4 shadow-sm">
        <div className="text-[13px] font-semibold">{t("你怎么看？")}</div>
        <div className="text-[12px] text-white/80 mt-1 leading-relaxed">
          {t("读新闻，顺手用积分对结果表个态 —— 点一下就行。")}
        </div>
      </section>
    </div>
  );
}
