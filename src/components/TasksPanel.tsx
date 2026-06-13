"use client";

// /tasks 页面主体（登录用户）：等级 + 签到/连续 + 每日任务 + 赛季进度 + 积分流水。
// 走 daily_status / claim_daily_signin / claim_quest_chest RPC + 直接读 point_ledger（RLS 仅自己）。

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n";
import { levelInfo } from "@/lib/levels";

interface Status {
  auth: boolean;
  signedIn: boolean;
  streak: number;
  signinReward: number;
  cycle: number;
  reads: number;
  readCap: number;
  questReadTarget: number;
  votes: number;
  voteTarget: number;
  questComplete: boolean;
  questClaimed: boolean;
  questReward: number;
  xp: number;
  level: number;
  seasonName: string | null;
  seasonTheme: string | null;
  seasonEnds: string | null;
  seasonVotes: number;
  seasonPnl: number;
}

interface Ledger {
  amount: number;
  source: string;
  created_at: string;
}

function localDate(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export default function TasksPanel() {
  const { t } = useT();
  const router = useRouter();
  const [st, setSt] = useState<Status | null>(null);
  const [ledger, setLedger] = useState<Ledger[]>([]);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    const sb = createClient();
    if (!sb) return;
    const [{ data: status }, { data: rows }] = await Promise.all([
      sb.rpc("daily_status", { p_local_date: localDate() }),
      sb
        .from("point_ledger")
        .select("amount, source, created_at")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    if (status && (status as Status).auth) setSt(status as Status);
    if (rows) setLedger(rows as Ledger[]);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const sb = createClient();
      if (!sb) return;
      const [{ data: status }, { data: rows }] = await Promise.all([
        sb.rpc("daily_status", { p_local_date: localDate() }),
        sb
          .from("point_ledger")
          .select("amount, source, created_at")
          .order("created_at", { ascending: false })
          .limit(20),
      ]);
      if (cancelled) return;
      if (status && (status as Status).auth) setSt(status as Status);
      if (rows) setLedger(rows as Ledger[]);
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
      router.refresh();
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

  const lv = levelInfo(st.xp);
  const sourceLabel: Record<string, string> = {
    signin: t("签到"),
    read: t("阅读"),
    quest: t("每日任务"),
    season: t("赛季奖励"),
    bet: t("下注"),
    sell: t("平仓"),
  };

  const quests = [
    { ok: st.signedIn, label: t("签到") },
    {
      ok: st.reads >= st.questReadTarget,
      label: `${t("阅读")} ${Math.min(st.reads, st.questReadTarget)}/${st.questReadTarget}`,
    },
    {
      ok: st.votes >= st.voteTarget,
      label: `${t("表态")} ${Math.min(st.votes, st.voteTarget)}/${st.voteTarget}`,
    },
  ];

  return (
    <div className="space-y-4">
      {/* 等级卡 */}
      <section className="rounded-2xl border border-black/8 dark:border-white/10 bg-white dark:bg-gray-900 shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{lv.badge}</span>
            <div>
              <div className={`text-sm font-bold ${lv.color}`}>
                Lv.{lv.level} · {t(lv.title)}
              </div>
              <div className="text-[11px] text-gray-400 dark:text-gray-500">
                {lv.xp} XP · {t("距下一级还需")} {Math.max(lv.nextAt - lv.xp, 0)} XP
              </div>
            </div>
          </div>
        </div>
        <div className="mt-3 h-2 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-400 to-purple-500"
            style={{ width: `${Math.round(lv.progress * 100)}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {[
            `${t("每日阅读上限")} ${lv.readCap} ${t("篇")}`,
            lv.signinBonus > 0 ? `${t("签到加成")} +${lv.signinBonus}` : null,
            lv.earlyAccess ? t("AI 新盘口抢先看") : null,
            lv.avatarHalo ? t("专属头像光环") : null,
          ]
            .filter(Boolean)
            .map((p, i) => (
              <span
                key={i}
                className="text-[11px] rounded-full bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 px-2 py-0.5"
              >
                {p}
              </span>
            ))}
        </div>
      </section>

      {/* 签到卡 */}
      <section className="rounded-2xl border border-black/8 dark:border-white/10 bg-white dark:bg-gray-900 shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              📅 {t("每日签到")}
            </span>
            {st.streak > 0 && (
              <span className="text-[12px] text-amber-600 dark:text-amber-400">
                🔥 {t("连续")} {st.streak} {t("天")}
              </span>
            )}
          </div>
          {st.signedIn ? (
            <span className="text-[12px] text-gray-400 dark:text-gray-500">✓ {t("已签到")}</span>
          ) : (
            <button
              onClick={signin}
              disabled={busy}
              className="rounded-full bg-amber-500 hover:bg-amber-400 text-white text-[13px] font-semibold px-4 py-1.5 transition disabled:opacity-60"
            >
              {t("签到领")} {st.signinReward}
            </button>
          )}
        </div>
        <div className="mt-3 flex items-center gap-1.5">
          {Array.from({ length: 7 }).map((_, i) => {
            const day = i + 1;
            const done = st.signedIn ? day <= st.cycle : day < st.cycle;
            const today = !st.signedIn && day === st.cycle;
            return (
              <div
                key={i}
                className={`h-7 flex-1 rounded-lg flex items-center justify-center text-[10px] font-medium ${
                  done
                    ? "bg-amber-400 text-white"
                    : today
                    ? "bg-amber-100 dark:bg-amber-500/30 text-amber-700 dark:text-amber-300 ring-1 ring-amber-300"
                    : "bg-gray-100 dark:bg-white/10 text-gray-400"
                }`}
              >
                {day === 7 ? "🎁" : day}
              </div>
            );
          })}
        </div>
      </section>

      {/* 每日任务卡 */}
      <section className="rounded-2xl border border-black/8 dark:border-white/10 bg-white dark:bg-gray-900 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
            ✅ {t("今日任务")}
          </span>
          {st.questClaimed ? (
            <span className="text-[12px] text-gray-400 dark:text-gray-500">✓ +{st.questReward}</span>
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
        <div className="space-y-2">
          {quests.map((q, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 text-[13px] ${
                q.ok ? "text-green-600 dark:text-green-400" : "text-gray-600 dark:text-gray-300"
              }`}
            >
              <span>{q.ok ? "☑" : "☐"}</span>
              {q.label}
            </div>
          ))}
        </div>
      </section>

      {/* 赛季进度卡 */}
      {st.seasonName && (
        <Link
          href="/leaderboard"
          className="block rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-4 shadow-sm hover:opacity-95 transition"
        >
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-[12px] text-white/70">{t("当前赛季")}</div>
              <div className="text-sm font-bold truncate">{st.seasonName}</div>
              {st.seasonTheme && (
                <div className="text-[12px] text-white/85 mt-0.5">🎯 {st.seasonTheme}</div>
              )}
            </div>
            <div className="text-right shrink-0 ml-3">
              <div className="text-[12px] text-white/70">{t("本赛季盈亏")}</div>
              <div className="text-base font-bold tabular-nums">
                {st.seasonPnl >= 0 ? "+" : ""}
                {st.seasonPnl.toLocaleString()}
              </div>
              <div className="text-[11px] text-white/70">
                {st.seasonVotes}
                {t("注")} · {t("看榜")} ›
              </div>
            </div>
          </div>
        </Link>
      )}

      {/* 积分流水 */}
      {ledger.length > 0 && (
        <section className="rounded-2xl border border-black/8 dark:border-white/10 bg-white dark:bg-gray-900 shadow-sm p-4">
          <div className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
            🧾 {t("积分明细")}
          </div>
          <div className="space-y-2">
            {ledger.map((l, i) => (
              <div key={i} className="flex items-center justify-between text-[13px]">
                <span className="text-gray-600 dark:text-gray-300">
                  {sourceLabel[l.source] ?? l.source}
                </span>
                <span
                  className={`font-semibold tabular-nums ${
                    l.amount >= 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-gray-400 dark:text-gray-500"
                  }`}
                >
                  {l.amount >= 0 ? "+" : ""}
                  {l.amount}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 rounded-full bg-amber-500 text-white text-sm font-medium px-4 py-2 shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
