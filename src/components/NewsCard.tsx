import Link from "next/link";
import Image from "next/image";
import type { NewsItem } from "@/lib/news";
import type { FeedCard } from "@/lib/polymarket";

function pct(p: number) {
  return `${Math.round(p * 100)}%`;
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

  const top = market.outcomes.slice(0, market.isBinary ? 2 : 2);

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
  return (
    <Link
      href={`/news/${news.id}`}
      className="block rounded-2xl border border-black/8 bg-white shadow-sm overflow-hidden hover:shadow-md hover:border-black/15 transition"
    >
      <div className="p-4 sm:p-5">
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

        {/* 标题 + 正文 + 配图 */}
        <div className="flex gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold leading-snug text-[15px] text-gray-900">
              {news.headline}
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-gray-500 line-clamp-3">
              {news.summary}
            </p>
          </div>
          {market?.image && (
            <Image
              src={market.image}
              alt=""
              width={72}
              height={72}
              className="w-[72px] h-[72px] rounded-xl object-cover shrink-0"
              unoptimized
            />
          )}
        </div>

        {/* 内嵌盘口 */}
        <OddsPreview market={market} />
      </div>
    </Link>
  );
}
