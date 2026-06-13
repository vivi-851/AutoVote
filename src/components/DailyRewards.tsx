"use client";

// 首页每日奖励面板（仅登录用户）：签到 + 连续天数 + 每日任务清单。
// 通过 daily_status / claim_daily_signin / claim_quest_chest RPC 驱动（rewards.sql）。
// 未配置 Supabase 或未登录时自动不渲染。

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n";

interface Status {
  auth: boolean;
  signedIn: boolean;
  streak: number;
  signinReward: number;
  cycle: number;
  reads: number;
  readCap: number;
  readReward: number;
  votes: number;
  voteTarget: number;
  questComplete: boolean;
  questClaimed: boolean;
  questReward: number;
}

// 用户本地日期（YYYY-MM-DD），用于按本地「今天」幂等发放
function localDate(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

export default function DailyRewards() {
  const { t } = useT();
  const router = useRouter();
  const [st, setSt] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    const sb = createClient();
    if (!sb) return;
    const { data } = await sb.rpc("daily_status", { p_local_date: localDate() });
    if (data && (data as Status).auth) setSt(data as Status);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const sb = createClient();
      if (!sb) return;
      const { data } = await sb.rpc("daily_status", { p_local_date: localDate() });
      if (!cancelled && data && (data as Status).auth) setSt(data as Status);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }

  async function signin() {
    const sb = createClient();
    if (!sb || busy) return;
    setBusy(true);
    const { data } = await sb.rpc("claim_daily_signin", { p_local_date: localDate() });
    setBusy(false);
    if (data?.claimed) {
      flash(`${t("签到成功")} +${data.reward}`);
      router.refresh(); // 刷新顶部余额
    }
    await load();
  }

  async function chest() {
    const sb = createClient();
    if (!sb || busy) return;
    setBusy(true);
    const { data } = await sb.rpc("claim_quest_chest", { p_local_date: localDate() });
    setBusy(false);
    if (data?.claimed) {
      flash(`${t("任务全清")} +${data.reward}`);
      router.refresh();
    }
    await load();
  }

  if (!st) return null;

  const questItems = [
    { ok: st.signedIn, label: t("签到") },
    { ok: st.reads >= st.readCap, label: `${t("阅读")} ${Math.min(st.reads, st.readCap)}/${st.readCap}` },
    { ok: st.votes >= st.voteTarget, label: `${t("表态")} ${Math.min(st.votes, st.voteTarget)}/${st.voteTarget}` },
  ];

  return (
    <div className="mb-4 rounded-2xl border border-black/8 dark:border-white/10 bg-white dark:bg-gray-900 shadow-sm p-4">
      {/* 头部：签到 + 连续天数 */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base">🎁</span>
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
            {t("每日奖励")}
          </span>
          {st.streak > 0 && (
            <span className="text-[12px] text-amber-600 dark:text-amber-400 whitespace-nowrap">
              🔥 {t("连续")} {st.streak} {t("天")}
            </span>
          )}
        </div>
        {st.signedIn ? (
          <span className="shrink-0 text-[12px] text-gray-400 dark:text-gray-500 px-3 py-1.5">
            ✓ {t("已签到")}
          </span>
        ) : (
          <button
            onClick={signin}
            disabled={busy}
            className="shrink-0 rounded-full bg-amber-500 hover:bg-amber-400 text-white text-[13px] font-semibold px-4 py-1.5 transition disabled:opacity-60"
          >
            {t("签到领")} {st.signinReward}
          </button>
        )}
      </div>

      {/* 7 天循环进度点 */}
      <div className="mt-3 flex items-center gap-1.5">
        {Array.from({ length: 7 }).map((_, i) => {
          const day = i + 1;
          const done = st.signedIn ? day <= st.cycle : day < st.cycle;
          const isToday = !st.signedIn && day === st.cycle;
          return (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full ${
                done
                  ? "bg-amber-400"
                  : isToday
                  ? "bg-amber-200 dark:bg-amber-500/40"
                  : "bg-gray-100 dark:bg-white/10"
              }`}
              title={day === 7 ? "+300" : ""}
            />
          );
        })}
      </div>

      {/* 每日任务 */}
      <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[13px] font-medium text-gray-700 dark:text-gray-200">
            {t("今日任务")}
          </span>
          {st.questClaimed ? (
            <span className="text-[12px] text-gray-400 dark:text-gray-500">
              ✓ +{st.questReward}
            </span>
          ) : (
            <button
              onClick={chest}
              disabled={busy || !st.questComplete}
              className={`rounded-full text-[12px] font-semibold px-3 py-1 transition ${
                st.questComplete
                  ? "bg-indigo-500 hover:bg-indigo-400 text-white"
                  : "bg-gray-100 dark:bg-white/10 text-gray-400 dark:text-gray-500 cursor-not-allowed"
              }`}
            >
              {t("领取")} +{st.questReward}
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {questItems.map((q, i) => (
            <span
              key={i}
              className={`text-[12px] flex items-center gap-1 ${
                q.ok
                  ? "text-green-600 dark:text-green-400"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              <span>{q.ok ? "☑" : "☐"}</span>
              {q.label}
            </span>
          ))}
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 rounded-full bg-amber-500 text-white text-sm font-medium px-4 py-2 shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
