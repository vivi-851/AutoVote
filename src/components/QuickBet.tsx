"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (!market) {
    return (
      <div className="mt-3 rounded-xl border border-dashed border-black/10 px-3 py-2.5 text-xs text-gray-400">
        盘口暂不可用
      </div>
    );
  }

  function labelText(o: Outcome) {
    if (market!.isBinary) return o.label.toLowerCase() === "yes" ? "会发生" : "不会";
    return o.label;
  }

  async function bet(o: Outcome) {
    setErr(null);
    if (!enabled) return;

    if (!loggedIn) {
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
      setErr(error.message.includes("insufficient") ? "积分不足" : "下注失败");
      return;
    }
    setDone(`已押 ${QUICK_STAKE} 分「${labelText(o)}」`);
    router.refresh();
  }

  const top = market.outcomes.slice(0, 2);

  return (
    <div className="mt-3 rounded-xl border border-black/8 bg-gray-50/70 px-3 py-2.5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-medium text-gray-500 truncate">
          📊 相关盘口 · {market.title}
        </span>
        {enabled && (
          <span className="text-[10px] text-gray-400 shrink-0 ml-2">点选项押 {QUICK_STAKE} 分</span>
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
                    ? "bg-green-50 text-green-700 ring-green-200 hover:bg-green-100 active:bg-green-600 active:text-white"
                    : "bg-red-50 text-red-700 ring-red-200 hover:bg-red-100 active:bg-red-600 active:text-white"
                }`}
              >
                <span>{isYes ? "会发生" : "不会"}</span>
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
                className="w-full flex items-center gap-2 text-[13px] text-gray-700 rounded-lg px-2 py-1.5 ring-1 ring-transparent hover:bg-white hover:ring-black/10 transition disabled:opacity-60"
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
          <span className="text-[12px] font-medium text-green-600">✓ {done}</span>
        ) : err ? (
          <span className="text-[12px] font-medium text-red-500">{err}</span>
        ) : !enabled ? (
          <span className="text-[12px] text-gray-400">登录后可一键表态</span>
        ) : (
          <span className="text-[12px] text-gray-400">{loggedIn ? "点上方选项一键下注" : "点选项即可登录并下注"}</span>
        )}
        <Link href={`/news/${newsId}`} className="text-[12px] font-medium text-indigo-600 shrink-0 ml-2">
          {done ? "去加注 →" : "完整盘口 →"}
        </Link>
      </div>
    </div>
  );
}
