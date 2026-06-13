"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n";
import { levelInfo } from "@/lib/levels";
import type { RepRow } from "@/lib/leaderboard";

const MEDAL = ["🥇", "🥈", "🥉"];

function Row({ r, i, t }: { r: RepRow; i: number; t: (s: string) => string }) {
  const name = r.display_name || "玩家";
  const lv = levelInfo(r.xp);
  const up = r.pnl >= 0;
  const roi = r.staked > 0 ? Math.round((r.pnl / r.staked) * 100) : null;
  const winrate = r.settled > 0 ? Math.round((r.wins / r.settled) * 100) : null;

  return (
    <div className="flex items-center gap-3 px-3 py-3 border-b border-black/5 dark:border-white/10 last:border-0">
      <span className={`w-6 text-center text-[14px] ${i < 3 ? "" : "text-gray-400"}`}>
        {MEDAL[i] ?? i + 1}
      </span>
      <span className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-300 to-purple-400 text-white text-[12px] font-bold flex items-center justify-center shrink-0">
        {name.slice(0, 1).toUpperCase()}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[14px] text-gray-800 dark:text-gray-100 truncate">{name}</span>
          <span className={`text-[11px] font-medium ${lv.color} shrink-0`} title={t(lv.title)}>
            {lv.badge} Lv.{lv.level}
          </span>
        </div>
        <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
          {winrate !== null ? `${t("胜率")} ${winrate}%` : t("暂未结算")}
          {roi !== null && ` · ROI ${roi >= 0 ? "+" : ""}${roi}%`}
          {` · ${r.votes}${t("注")}`}
        </div>
      </div>
      <span
        className={`text-[15px] font-bold tabular-nums shrink-0 ${
          up ? "text-green-600 dark:text-green-400" : "text-red-500"
        }`}
      >
        {up ? "+" : ""}
        {r.pnl.toLocaleString()}
      </span>
    </div>
  );
}

export default function LeaderboardTabs({
  season,
  allTime,
  hasSeason,
}: {
  season: RepRow[];
  allTime: RepRow[];
  hasSeason: boolean;
}) {
  const { t } = useT();
  const [tab, setTab] = useState<"season" | "all">(hasSeason ? "season" : "all");
  const rows = tab === "season" ? season : allTime;

  return (
    <div className="rounded-2xl border border-black/8 dark:border-white/10 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
      {/* Tab 切换 */}
      <div className="flex border-b border-black/5 dark:border-white/10">
        {hasSeason && (
          <button
            onClick={() => setTab("season")}
            className={`flex-1 py-3 text-[13px] font-medium transition ${
              tab === "season"
                ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-500"
                : "text-gray-400 dark:text-gray-500"
            }`}
          >
            {t("本赛季")}
          </button>
        )}
        <button
          onClick={() => setTab("all")}
          className={`flex-1 py-3 text-[13px] font-medium transition ${
            tab === "all"
              ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-500"
              : "text-gray-400 dark:text-gray-500"
          }`}
        >
          {t("总榜")}
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">
          {t("暂无战绩，去表个态")}
        </div>
      ) : (
        rows.map((r, i) => <Row key={i} r={r} i={i} t={t} />)
      )}
    </div>
  );
}
