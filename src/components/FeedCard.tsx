"use client";

import Image from "next/image";
import { useState } from "react";
import type { FeedCard as FeedCardData } from "@/lib/polymarket";

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
  return d.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

const catStyle: Record<string, string> = {
  Politics: "bg-blue-50 text-blue-600 ring-blue-200",
  Hot: "bg-orange-50 text-orange-600 ring-orange-200",
};

export default function FeedCard({ card }: { card: FeedCardData }) {
  // M1：预测先存在本地状态，给出即时反馈。M2 接入虚拟积分账户。
  const [picked, setPicked] = useState<string | null>(null);

  return (
    <article className="rounded-2xl border border-black/8 bg-white shadow-sm overflow-hidden">
      <div className="p-4 sm:p-5">
        {/* 头部：分类 + 成交量 + 截止 */}
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
              <p className="mt-1 text-[13px] text-gray-500 line-clamp-2">
                {card.description}
              </p>
            )}
          </div>
        </div>

        {/* 一键预测区 */}
        <div className="mt-4 space-y-2">
          {card.isBinary ? (
            <div className="grid grid-cols-2 gap-2">
              {card.outcomes.map((o) => {
                const isYes = o.label.toLowerCase() === "yes";
                const active = picked === o.marketId;
                return (
                  <button
                    key={o.marketId}
                    onClick={() => setPicked(active ? null : o.marketId)}
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
                const active = picked === o.marketId;
                return (
                  <button
                    key={o.marketId}
                    onClick={() => setPicked(active ? null : o.marketId)}
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

        {/* 底部反馈 */}
        <div className="mt-3 flex items-center justify-between text-xs">
          {picked ? (
            <span className="text-green-600 font-medium">
              ✓ 已记录你的预测（M2 接入积分下注）
            </span>
          ) : (
            <span className="text-gray-400">你怎么看？点一下表态</span>
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
