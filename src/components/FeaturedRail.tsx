import Link from "next/link";
import type { FeedEntry } from "@/lib/feed";
import { getServerT } from "@/lib/i18n-server";

const THEMES = [
  "from-blue-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-fuchsia-500 to-purple-600",
];

function pct(p: number) {
  return `${Math.round(p * 100)}%`;
}

// 顶部「精选」横滑卡：彩色 AI 速读卡 + 盘口领先项
export default async function FeaturedRail({ entries }: { entries: FeedEntry[] }) {
  if (entries.length === 0) return null;
  const { t } = await getServerT();

  return (
    <div className="mb-5">
      <div className="flex items-center gap-1.5 mb-2 px-0.5">
        <span className="text-[13px] font-bold text-gray-800 dark:text-gray-100">🔥 {t("精选热点")}</span>
        <span className="text-[11px] text-gray-400">{t("市场在热押的几条")}</span>
      </div>
      <div className="-mx-4 px-4 overflow-x-auto scrollbar-none">
        <div className="flex gap-3 w-max pb-1">
          {entries.map((e, i) => {
            const top = e.market?.outcomes[0];
            const lead =
              top &&
              (e.market!.isBinary
                ? top.label.toLowerCase() === "yes"
                  ? t("会发生")
                  : t("不会")
                : top.label);
            return (
              <Link
                key={e.news.id}
                href={`/news/${e.news.id}`}
                className={`w-[228px] shrink-0 rounded-2xl bg-gradient-to-br ${
                  THEMES[i % THEMES.length]
                } text-white p-4 shadow-sm hover:brightness-105 transition`}
              >
                <div className="text-[11px] font-medium opacity-80 mb-1.5">
                  {t(e.news.category)} · {t("AI 速读")}
                </div>
                <div className="text-[14px] font-semibold leading-snug line-clamp-3 min-h-[3.6em]">
                  {e.news.headline}
                </div>
                {top && (
                  <div className="mt-2.5 inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-medium">
                    {lead} <span className="tabular-nums">{pct(top.probability)}</span>
                  </div>
                )}
                <div className="mt-2 text-[11px] opacity-75">{e.news.source}</div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
