"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n";
import { track } from "@/lib/track";
import type { FeedCard, Outcome } from "@/lib/polymarket";

const QUICK_STAKE = 100; // feed 内一键表态的默认下注额

function pct(p: number) {
  return `${Math.round(p * 100)}%`;
}

export default function QuickBet({
  market,
  newsId,
  loggedIn,
  enabled,
}: {
  market: FeedCard | null;
  newsId: string;
  loggedIn: boolean;
  enabled: boolean;
}) {
  const router = useRouter();
  const { t } = useT();
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (!market) {
    return (
      <div className="mt-3 rounded-xl border border-dashed border-black/10 dark:border-white/10 px-3 py-2.5 text-xs text-gray-400 dark:text-gray-500">
        {t("盘口暂不可用")}
      </div>
    );
  }

  function labelText(o: Outcome) {
    if (market!.isBinary) return o.label.toLowerCase() === "yes" ? t("会发生") : t("不会");
    return o.label;
  }

  async function bet(o: Outcome) {
    setErr(null);
    if (!enabled) return;

    if (!loggedIn) {
      track("signin_click", { market_id: newsId, props: { from: "quickbet" } });
      const supabase = createClient();
      await supabase?.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      return;
    }

    const supabase = createClient();
    if (!supabase) return;
    const key = o.marketId + o.label;
    setBusy(key);
    const { error } = market!.genMarketId
      ? await supabase.rpc("place_gen_bet", {
          p_gen_id: market!.genMarketId,
          p_side: o.label.toLowerCase() === "yes" ? "yes" : "no",
          p_stake: QUICK_STAKE,
        })
      : await supabase.rpc("place_bet", {
          p_news_id: newsId,
          p_market_slug: market!.slug,
          p_market_title: market!.title,
          p_outcome_label: o.label,
          p_outcome_market_id: o.marketId,
          p_entry_price: o.probability,
          p_stake: QUICK_STAKE,
        });
    setBusy(null);
    if (error) {
      setErr(error.message.includes("insufficient") ? t("积分不足") : t("下注失败"));
      return;
    }
    track("quickbet", {
      market_id: newsId,
      market_kind: market!.genMarketId ? "generated" : "polymarket",
      props: { side: o.label.toLowerCase(), stake: QUICK_STAKE, placement: "feed" },
    });
    setDone(`${labelText(o)} · ${QUICK_STAKE}${t("分")}`);
    router.refresh();
  }

  const top = market.outcomes.slice(0, 2);

  return (
    <div className="mt-3 rounded-xl border border-black/8 dark:border-white/10 bg-gray-50/70 dark:bg-white/5 px-3 py-2.5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 truncate">
          📊 {t("相关盘口")} · {market.title}
        </span>
        {enabled && (
          <span className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0 ml-2">
            {QUICK_STAKE}{t("分")}
          </span>
        )}
      </div>

      {market.isBinary ? (
        <div className="grid grid-cols-2 gap-2">
          {top.map((o) => {
            const isYes = o.label.toLowerCase() === "yes";
            const key = o.marketId + o.label;
            return (
              <button
                key={o.label}
                onClick={() => bet(o)}
                disabled={busy === key}
                className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[13px] font-medium ring-1 transition disabled:opacity-60 ${
                  isYes
                    ? "bg-green-50 dark:bg-green-500/15 text-green-700 dark:text-green-300 ring-green-200 dark:ring-green-500/30 hover:bg-green-100 active:bg-green-600 active:text-white"
                    : "bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-300 ring-red-200 dark:ring-red-500/30 hover:bg-red-100 active:bg-red-600 active:text-white"
                }`}
              >
                <span>{isYes ? t("会发生") : t("不会")}</span>
                <span className="tabular-nums">{pct(o.probability)}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="space-y-1.5">
          {top.map((o) => {
            const key = o.marketId + o.label;
            return (
              <button
                key={o.marketId}
                onClick={() => bet(o)}
                disabled={busy === key}
                className="w-full flex items-center gap-2 text-[13px] text-gray-700 dark:text-gray-200 rounded-lg px-2 py-1.5 ring-1 ring-transparent hover:bg-white dark:hover:bg-white/10 hover:ring-black/10 dark:hover:ring-white/15 transition disabled:opacity-60"
              >
                <span className="flex-1 truncate text-left">{o.label}</span>
                <div className="w-16 h-1.5 rounded-full bg-black/10 overflow-hidden">
                  <div className="h-full bg-indigo-400" style={{ width: pct(o.probability) }} />
                </div>
                <span className="tabular-nums w-9 text-right font-medium">{pct(o.probability)}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-2 flex items-center justify-between">
        {done ? (
          <span className="text-[12px] font-medium text-green-600 dark:text-green-400">✓ {done}</span>
        ) : err ? (
          <span className="text-[12px] font-medium text-red-500">{err}</span>
        ) : !enabled ? (
          <span className="text-[12px] text-gray-400 dark:text-gray-500">{t("登录后可一键表态")}</span>
        ) : (
          <span className="text-[12px] text-gray-400 dark:text-gray-500">{loggedIn ? t("点上方选项一键下注") : t("点选项即可登录并下注")}</span>
        )}
        <Link href={`/news/${newsId}`} className="text-[12px] font-medium text-indigo-600 dark:text-indigo-400 shrink-0 ml-2">
          {done ? t("去加注 →") : t("完整盘口 →")}
        </Link>
      </div>
    </div>
  );
}
