"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { NewsItem } from "@/lib/news";
import type { FeedCard } from "@/lib/polymarket";
import YouTubeLite from "./YouTubeLite";
import QuickBet from "./QuickBet";
import { useT } from "@/lib/i18n";
import { track, trackImpression } from "@/lib/track";

// 盘口类型：用于埋点拆分（真实盘口 vs AI 盘口）
function marketKind(news: NewsItem, market: FeedCard | null): string | null {
  if (news.generated || market?.genMarketId) return "generated";
  if (market) return "polymarket";
  return null;
}

function fmtCount(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return `${n}`;
}

const catColor: Record<string, string> = {
  政治: "bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-300 ring-blue-200 dark:ring-blue-500/30",
  财经: "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-500/30",
  加密: "bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-300 ring-amber-200 dark:ring-amber-500/30",
  体育: "bg-violet-50 dark:bg-violet-500/15 text-violet-600 dark:text-violet-300 ring-violet-200 dark:ring-violet-500/30",
  科技: "bg-cyan-50 dark:bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 ring-cyan-200 dark:ring-cyan-500/30",
};

export default function NewsCard({
  news,
  market,
  loggedIn,
  enabled,
  position,
}: {
  news: NewsItem;
  market: FeedCard | null;
  loggedIn: boolean;
  enabled: boolean;
  position?: number;
}) {
  const { t } = useT();
  const hasVideo = !!news.video;
  const ref = useRef<HTMLElement | null>(null);
  const kind = marketKind(news, market);
  const [heroFailed, setHeroFailed] = useState(false);
  const newsImage = news.image && !heroFailed ? news.image : null;

  // 曝光埋点：卡片首次进入视口时上报一次
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (es) => {
        if (es[0].isIntersecting) {
          trackImpression({ market_id: news.id, market_kind: kind, source: "organic", position });
          obs.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [news.id, kind, position]);

  return (
    <article
      ref={ref}
      className="rounded-2xl border border-black/8 dark:border-white/10 bg-white dark:bg-gray-900 shadow-sm overflow-hidden hover:shadow-md transition"
    >
      {/* 媒体置顶：视频 > GNews 新闻图 > Polymarket 盘口图 > 纯文字（无媒体块） */}
      {hasVideo ? (
        <YouTubeLite
          id={news.video!.youtubeId}
          channel={news.video!.channel}
          rounded="rounded-none"
        />
      ) : newsImage ? (
        <div className="relative aspect-video bg-gray-100 dark:bg-gray-800">
          <Image
            src={newsImage}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, 600px"
            className="object-cover"
            unoptimized
            onError={() => setHeroFailed(true)}
          />
        </div>
      ) : market?.image ? (
        // 盘口图多为方形 logo：磨砂底 + 居中 contain，不被 16:9 裁烂
        <div className="relative aspect-video overflow-hidden bg-gray-100 dark:bg-gray-800">
          <div
            className="absolute inset-0 bg-cover bg-center blur-xl scale-110 opacity-40"
            style={{ backgroundImage: `url(${market.image})` }}
          />
          <Image
            src={market.image}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, 600px"
            className="object-contain p-6"
            unoptimized
          />
        </div>
      ) : null}

      {/* 文本区：点击进详情 */}
      <Link
        href={`/news/${news.id}`}
        onClick={() =>
          track("card_open", { market_id: news.id, market_kind: kind, source: "organic", position })
        }
        className="block px-4 sm:px-5 pt-3.5"
      >
        <div className="flex items-center gap-2 mb-2.5">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-[11px] font-bold text-gray-600 shrink-0">
            {news.source.slice(0, 1)}
          </div>
          <div className="min-w-0 flex items-center gap-1.5">
            <span className="text-[13px] font-semibold text-gray-800 dark:text-gray-100">{news.source}</span>
            <span className="text-[12px] text-gray-400 dark:text-gray-500 truncate">{news.handle}</span>
          </div>
          <span className="ml-auto text-[11px] text-gray-400 dark:text-gray-500 shrink-0">{news.publishedAgo}</span>
        </div>

        <span className="inline-flex items-center gap-1.5 mb-2">
          <span
            className={`px-2 py-0.5 rounded-full ring-1 text-[11px] font-medium ${
              catColor[news.category] ?? "bg-gray-50 dark:bg-white/10 text-gray-600 dark:text-gray-300 ring-gray-200 dark:ring-white/15"
            }`}
          >
            {t(news.category)}
          </span>
          {news.generated && (
            <span className="px-2 py-0.5 rounded-full ring-1 text-[11px] font-medium bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 ring-indigo-200 dark:ring-indigo-500/30">
              🤖 {t("AI 盘口")}
            </span>
          )}
        </span>

        <h2 className="font-semibold leading-snug text-[15px] text-gray-900 dark:text-gray-100">
          {news.headline}
        </h2>
        <p className="mt-1 text-[13px] leading-relaxed text-gray-500 dark:text-gray-400 line-clamp-3">
          {news.summary}
        </p>
      </Link>

      {/* 内嵌盘口：feed 内一键表态（不跳详情） */}
      <div className="px-4 sm:px-5">
        <QuickBet market={market} newsId={news.id} loggedIn={loggedIn} enabled={enabled} />
      </div>

      {/* 互动行 */}
      <div className="flex items-center gap-5 px-4 sm:px-5 py-3 mt-1 text-gray-400 dark:text-gray-500 text-[13px]">
        <span className="flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-[1.8]">
            <path d="M12 21s-7.5-4.6-10-9.3C.4 8.4 1.9 4.9 5.2 4.5c2-.2 3.6 1 4.8 2.6C11.2 5.5 12.8 4.3 14.8 4.5c3.3.4 4.8 3.9 3.2 7.2C19.5 16.4 12 21 12 21z" />
          </svg>
          {fmtCount(news.likes)}
        </span>
        <span className="flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-[1.8]">
            <path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l.9-4.5A8 8 0 1 1 21 12z" />
          </svg>
          {fmtCount(news.comments)}
        </span>
        <span className="flex items-center gap-1.5 ml-auto">
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-[1.8]">
            <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13" />
          </svg>
          {t("分享")}
        </span>
      </div>
    </article>
  );
}
