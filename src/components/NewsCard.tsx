import Link from "next/link";
import Image from "next/image";
import type { NewsItem } from "@/lib/news";
import type { FeedCard } from "@/lib/polymarket";
import YouTubeLite from "./YouTubeLite";

function pct(p: number) {
  return `${Math.round(p * 100)}%`;
}

function fmtCount(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return `${n}`;
}

const catColor: Record<string, string> = {
  政治: "bg-blue-50 text-blue-600 ring-blue-200",
  财经: "bg-emerald-50 text-emerald-600 ring-emerald-200",
  加密: "bg-amber-50 text-amber-600 ring-amber-200",
  体育: "bg-violet-50 text-violet-600 ring-violet-200",
  科技: "bg-cyan-50 text-cyan-600 ring-cyan-200",
};

// 内嵌盘口预览（不可下注，点击进详情才表态）
function OddsPreview({ market }: { market: FeedCard | null }) {
  if (!market) {
    return (
      <div className="mt-3 rounded-xl border border-dashed border-black/10 px-3 py-2.5 text-xs text-gray-400">
        盘口暂不可用
      </div>
    );
  }

  const top = market.outcomes.slice(0, 2);

  return (
    <div className="mt-3 rounded-xl border border-black/8 bg-gray-50/70 px-3 py-2.5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-medium text-gray-500 truncate">
          📊 相关盘口 · {market.title}
        </span>
      </div>
      {market.isBinary ? (
        <div className="grid grid-cols-2 gap-2">
          {top.map((o) => {
            const isYes = o.label.toLowerCase() === "yes";
            return (
              <div
                key={o.marketId}
                className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[13px] font-medium ring-1 ${
                  isYes
                    ? "bg-green-50 text-green-700 ring-green-200"
                    : "bg-red-50 text-red-700 ring-red-200"
                }`}
              >
                <span>{isYes ? "会发生" : "不会"}</span>
                <span className="tabular-nums">{pct(o.probability)}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-1.5">
          {top.map((o) => (
            <div
              key={o.marketId}
              className="flex items-center gap-2 text-[13px] text-gray-700"
            >
              <span className="flex-1 truncate">{o.label}</span>
              <div className="w-16 h-1.5 rounded-full bg-black/10 overflow-hidden">
                <div className="h-full bg-indigo-400" style={{ width: pct(o.probability) }} />
              </div>
              <span className="tabular-nums w-9 text-right font-medium">
                {pct(o.probability)}
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="mt-2 text-[12px] font-medium text-indigo-600">
        查看完整盘口并表态 →
      </div>
    </div>
  );
}

export default function NewsCard({
  news,
  market,
}: {
  news: NewsItem;
  market: FeedCard | null;
}) {
  const hasVideo = !!news.video;

  return (
    <article className="rounded-2xl border border-black/8 bg-white shadow-sm overflow-hidden hover:shadow-md transition">
      {/* 视频卡：顶部大图，点击播放（不跳转） */}
      {hasVideo && (
        <div className="px-3 pt-3">
          <YouTubeLite id={news.video!.youtubeId} channel={news.video!.channel} />
        </div>
      )}

      <Link href={`/news/${news.id}`} className="block px-4 sm:px-5 pt-3.5">
        {/* 来源行 */}
        <div className="flex items-center gap-2 mb-2.5">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-[11px] font-bold text-gray-600 shrink-0">
            {news.source.slice(0, 1)}
          </div>
          <div className="min-w-0 flex items-center gap-1.5">
            <span className="text-[13px] font-semibold text-gray-800">{news.source}</span>
            <span className="text-[12px] text-gray-400 truncate">{news.handle}</span>
          </div>
          <span className="ml-auto text-[11px] text-gray-400 shrink-0">{news.publishedAgo}</span>
        </div>

        {/* 分类 chip */}
        <span
          className={`inline-block px-2 py-0.5 rounded-full ring-1 text-[11px] font-medium mb-2 ${
            catColor[news.category] ?? "bg-gray-50 text-gray-600 ring-gray-200"
          }`}
        >
          {news.category}
        </span>

        {/* 标题 + 正文（图文卡带紧凑配图） */}
        <div className="flex gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold leading-snug text-[15px] text-gray-900">
              {news.headline}
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-gray-500 line-clamp-3">
              {news.summary}
            </p>
          </div>
          {!hasVideo && market?.image && (
            <Image
              src={market.image}
              alt=""
              width={76}
              height={76}
              className="w-[76px] h-[76px] rounded-xl object-cover shrink-0"
              unoptimized
            />
          )}
        </div>

        {/* 内嵌盘口 */}
        <OddsPreview market={market} />
      </Link>

      {/* 互动行（社交流元素） */}
      <div className="flex items-center gap-5 px-4 sm:px-5 py-3 mt-1 text-gray-400 text-[13px]">
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
          分享
        </span>
      </div>
    </article>
  );
}
