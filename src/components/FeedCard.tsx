"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FeedCard as FeedCardData, Outcome } from "@/lib/polymarket";
import { createClient } from "@/lib/supabase/client";

function pct(p: number) {
  return `${Math.round(p * 100)}%`;
}

function fmtVolume(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function fmtEnd(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  // 固定 UTC，避免服务端(UTC)与客户端(本地时区)格式化不一致导致 hydration 不匹配
  return d.toLocaleDateString("zh-CN", { month: "short", day: "numeric", timeZone: "UTC" });
}

const catStyle: Record<string, string> = {
  Politics: "bg-blue-50 text-blue-600 ring-blue-200",
  Hot: "bg-orange-50 text-orange-600 ring-orange-200",
};

const STAKES = [50, 100, 500];

export default function FeedCard({
  card,
  newsId,
  loggedIn = false,
  enabled = false,
}: {
  card: FeedCardData;
  newsId?: string;
  loggedIn?: boolean;
  enabled?: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Outcome | null>(null);
  const [stake, setStake] = useState<number>(100);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onPick(o: Outcome) {
    setError(null);
    setDone(null);

    // 未配置后端：占位提示
    if (!enabled) {
      setSelected(o);
      return;
    }

    // 未登录：直接触发 Google 登录
    if (!loggedIn) {
      const supabase = createClient();
      if (supabase) {
        await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: `${window.location.origin}/auth/callback` },
        });
      }
      return;
    }

    setSelected((prev) => (prev?.marketId === o.marketId && prev?.label === o.label ? null : o));
  }

  async function confirmBet() {
    if (!selected) return;
    const supabase = createClient();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    const { error: err } = card.genMarketId
      ? await supabase.rpc("place_gen_bet", {
          p_gen_id: card.genMarketId,
          p_side: selected.label.toLowerCase() === "yes" ? "yes" : "no",
          p_stake: stake,
        })
      : await supabase.rpc("place_bet", {
          p_news_id: newsId ?? null,
          p_market_slug: card.slug,
          p_market_title: card.title,
          p_outcome_label: selected.label,
          p_outcome_market_id: selected.marketId,
          p_entry_price: selected.probability,
          p_stake: stake,
        });
    setBusy(false);
    if (err) {
      setError(err.message.includes("insufficient") ? "积分不足" : "下注失败，请重试");
      return;
    }
    setDone(`已用 ${stake} 分押注「${labelText(selected)}」@ ${pct(selected.probability)}`);
    setSelected(null);
    router.refresh(); // 刷新头部积分
  }

  function labelText(o: Outcome) {
    if (card.isBinary) return o.label.toLowerCase() === "yes" ? "会发生" : "不会";
    return o.label;
  }

  const potential = selected ? Math.round(stake / selected.probability) : 0;

  return (
    <article className="rounded-2xl border border-black/8 bg-white shadow-sm overflow-hidden">
      <div className="p-4 sm:p-5">
        {/* 头部 */}
        <div className="flex items-center gap-2 text-xs mb-3">
          <span
            className={`px-2 py-0.5 rounded-full ring-1 font-medium ${
              catStyle[card.category] ?? "bg-gray-50 text-gray-600 ring-gray-200"
            }`}
          >
            {card.category === "Politics" ? "政治" : "热点"}
          </span>
          <span className="text-gray-400">{fmtVolume(card.volume)} 成交</span>
          {fmtEnd(card.endDate) && (
            <span className="text-gray-400">· 截止 {fmtEnd(card.endDate)}</span>
          )}
        </div>

        {/* 标题 + 图片 */}
        <div className="flex gap-3">
          {card.image && (
            <Image
              src={card.image}
              alt=""
              width={56}
              height={56}
              className="w-14 h-14 rounded-xl object-cover shrink-0"
              unoptimized
            />
          )}
          <div className="min-w-0">
            <h2 className="font-semibold leading-snug text-[15px] text-gray-900">
              {card.title}
            </h2>
            {card.description && (
              <p className="mt-1 text-[13px] text-gray-500 line-clamp-2">{card.description}</p>
            )}
          </div>
        </div>

        {/* 选项区 */}
        <div className="mt-4 space-y-2">
          {card.isBinary ? (
            <div className="grid grid-cols-2 gap-2">
              {card.outcomes.map((o) => {
                const isYes = o.label.toLowerCase() === "yes";
                const active = selected?.marketId === o.marketId && selected?.label === o.label;
                return (
                  <button
                    key={o.label}
                    onClick={() => onPick(o)}
                    className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium ring-1 transition ${
                      active
                        ? isYes
                          ? "bg-green-600 text-white ring-green-600"
                          : "bg-red-600 text-white ring-red-600"
                        : isYes
                        ? "bg-green-50 text-green-700 ring-green-200 hover:bg-green-100"
                        : "bg-red-50 text-red-700 ring-red-200 hover:bg-red-100"
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
              {card.outcomes.map((o) => {
                const active = selected?.marketId === o.marketId && selected?.label === o.label;
                return (
                  <button
                    key={o.marketId}
                    onClick={() => onPick(o)}
                    className={`w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm ring-1 transition ${
                      active
                        ? "bg-indigo-600 text-white ring-indigo-600"
                        : "bg-gray-50 text-gray-700 ring-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    <span className="flex-1 text-left truncate">{o.label}</span>
                    <div className="w-20 h-1.5 rounded-full bg-black/10 overflow-hidden">
                      <div
                        className={active ? "h-full bg-white" : "h-full bg-indigo-400"}
                        style={{ width: pct(o.probability) }}
                      />
                    </div>
                    <span className="tabular-nums w-9 text-right font-medium">
                      {pct(o.probability)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 下注面板 */}
        {selected && enabled && loggedIn && (
          <div className="mt-3 rounded-xl bg-gray-50 ring-1 ring-black/8 p-3">
            <div className="text-[13px] text-gray-600 mb-2">
              用积分押注「<b>{labelText(selected)}</b>」@ {pct(selected.probability)}
            </div>
            <div className="flex items-center gap-2 mb-2">
              {STAKES.map((s) => (
                <button
                  key={s}
                  onClick={() => setStake(s)}
                  className={`flex-1 rounded-lg py-1.5 text-[13px] font-medium ring-1 transition ${
                    stake === s
                      ? "bg-gray-900 text-white ring-gray-900"
                      : "bg-white text-gray-600 ring-black/10 hover:bg-gray-100"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-gray-400">
                押中约可得 <b className="text-green-600">{potential}</b> 分
              </span>
              <button
                onClick={confirmBet}
                disabled={busy}
                className="rounded-lg bg-indigo-600 text-white text-[13px] font-medium px-4 py-1.5 hover:bg-indigo-500 transition disabled:opacity-60"
              >
                {busy ? "下注中…" : "确认下注"}
              </button>
            </div>
            {error && <div className="mt-2 text-[12px] text-red-500">{error}</div>}
          </div>
        )}

        {/* 未配置后端的占位提示 */}
        {selected && !enabled && (
          <div className="mt-3 text-[12px] text-gray-400">
            积分下注待接入后端（配置 Supabase 后开放）
          </div>
        )}

        {/* 底部状态 */}
        <div className="mt-3 flex items-center justify-between text-xs">
          {done ? (
            <span className="text-green-600 font-medium">✓ {done}</span>
          ) : !loggedIn && enabled ? (
            <span className="text-gray-400">点选项即可登录并用积分下注</span>
          ) : (
            <span className="text-gray-400">你怎么看？点一下用积分表态</span>
          )}
          <a
            href={card.polymarketUrl}
            target="_blank"
            rel="noreferrer"
            className="text-gray-300 hover:text-gray-500"
          >
            来源 ↗
          </a>
        </div>
      </div>
    </article>
  );
}
