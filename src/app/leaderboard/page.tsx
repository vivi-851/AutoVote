import Link from "next/link";
import AuthButton from "@/components/AuthButton";
import SettingsControl from "@/components/SettingsControl";
import LeaderboardTabs from "@/components/LeaderboardTabs";
import { getProfile } from "@/lib/auth";
import { supabaseEnabled } from "@/lib/supabase/env";
import { getServerT } from "@/lib/i18n-server";
import {
  getReputationLeaderboard,
  getCurrentSeason,
  getSeasonLeaderboard,
  getSeasonHallOfFame,
} from "@/lib/leaderboard";

export const dynamic = "force-dynamic";

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default async function LeaderboardPage() {
  const { t } = await getServerT();
  const [profile, season, allTime] = await Promise.all([
    getProfile(),
    getCurrentSeason(),
    getReputationLeaderboard(50),
  ]);

  const [seasonRows, hall] = await Promise.all([
    season ? getSeasonLeaderboard(season.id, 50) : Promise.resolve([]),
    season ? getSeasonHallOfFame(season.id) : Promise.resolve([]),
  ]);

  return (
    <main className="min-h-full bg-background">
      <header className="sticky top-0 z-10 backdrop-blur bg-white/80 dark:bg-gray-900/80 border-b border-black/5 dark:border-white/10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link
            href="/"
            className="text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white text-sm flex items-center gap-1"
          >
            <span className="text-lg leading-none">‹</span> {t("返回")}
          </Link>
          <span className="font-semibold text-gray-800 dark:text-gray-100">🏆 {t("排行榜")}</span>
          <div className="ml-auto flex items-center gap-1">
            <SettingsControl />
            <AuthButton profile={profile} enabled={supabaseEnabled} />
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        {/* 赛季横幅（themed） */}
        {season && (
          <section className="rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-[12px] text-white/70">{t("当前赛季")}</div>
                <div className="text-base font-bold truncate">{season.name}</div>
                {season.theme && (
                  <div className="text-[12px] text-white/85 mt-0.5">🎯 {season.theme}</div>
                )}
              </div>
              <div className="text-right shrink-0 ml-3">
                <div className="text-[12px] text-white/70">{t("截止")}</div>
                <div className="text-sm font-semibold tabular-nums">{fmtDate(season.ends_at)}</div>
              </div>
            </div>
          </section>
        )}

        {/* 榜单（本赛季 / 总榜）*/}
        <LeaderboardTabs season={seasonRows} allTime={allTime} hasSeason={!!season} />

        {/* 上赛季名人堂（若有结算结果）*/}
        {hall.length > 0 && (
          <section className="rounded-2xl border border-black/8 dark:border-white/10 bg-white dark:bg-gray-900 shadow-sm p-4">
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
              🏛️ {t("名人堂")}
            </div>
            <div className="space-y-2">
              {hall.map((h) => (
                <div key={h.rank} className="flex items-center gap-2.5 text-[13px]">
                  <span className="w-6 text-center">{h.badge ?? h.rank}</span>
                  <span className="flex-1 truncate text-gray-700 dark:text-gray-200">
                    {h.display_name || "玩家"}
                  </span>
                  <span className="text-gray-400 dark:text-gray-500 tabular-nums">
                    {h.pnl >= 0 ? "+" : ""}
                    {h.pnl.toLocaleString()}
                  </span>
                  <span className="text-amber-600 dark:text-amber-400 font-medium tabular-nums">
                    +{h.reward}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        <p className="text-center text-[11px] text-gray-300 dark:text-gray-600 pb-6">
          {t("按已实现盈亏（PnL）排名 · 赢家才上榜")}
        </p>
      </div>
    </main>
  );
}
