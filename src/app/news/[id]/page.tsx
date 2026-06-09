import Link from "next/link";
import { notFound } from "next/navigation";
import { getNewsById } from "@/lib/news";
import { getMarketBySlug } from "@/lib/polymarket";
import FeedCard from "@/components/FeedCard";

export const dynamic = "force-dynamic";

// 评论区占位（M2 接入真实用户与积分后替换）
const MOCK_COMMENTS = [
  { user: "Caleb", ago: "30分钟前", text: "我没那么确定，现在市场波动太大了。" },
  { user: "Liam", ago: "2小时前", text: "盘口已经反应得差不多了，进场性价比不高。" },
  { user: "Sofia", ago: "3小时前", text: "新闻里第 3 点才是关键，市场好像还没充分定价。" },
];

export default async function NewsDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const news = getNewsById(id);
  if (!news) notFound();

  const market = await getMarketBySlug(news.marketSlug, news.marketCategory);

  return (
    <main className="min-h-full bg-[#fafafa]">
      {/* 顶部栏 */}
      <header className="sticky top-0 z-10 backdrop-blur bg-white/80 border-b border-black/5">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link
            href="/"
            className="text-gray-500 hover:text-gray-900 text-sm flex items-center gap-1"
          >
            <span className="text-lg leading-none">‹</span> 返回
          </Link>
          <span className="text-xs text-gray-400 ml-auto">新闻详情</span>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 py-5 space-y-4">
        {/* 来源 + 标题 */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-xs font-bold text-gray-600">
              {news.source.slice(0, 1)}
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-800">{news.source}</div>
              <div className="text-xs text-gray-400">
                {news.handle} · {news.publishedAgo}
              </div>
            </div>
          </div>
          <h1 className="text-xl font-bold leading-snug text-gray-900">
            {news.headline}
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-gray-600">
            {news.summary}
          </p>
          <a
            href={news.originalUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-block mt-2 text-[13px] text-indigo-600 hover:underline"
          >
            查看原文 ↗
          </a>
        </div>

        {/* AI TL;DR */}
        <div className="rounded-2xl border border-black/8 bg-white p-4 sm:p-5 shadow-sm">
          <div className="flex items-center gap-1.5 mb-3">
            <span className="text-[13px] font-bold text-indigo-600">TL;DR</span>
            <span className="text-[11px] text-gray-400">· AI 摘要</span>
          </div>
          <ul className="space-y-2">
            {news.tldr.map((point, i) => (
              <li key={i} className="flex gap-2 text-[14px] leading-relaxed text-gray-700">
                <span className="text-indigo-400 shrink-0">•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 关联盘口（完整可表态） */}
        <div>
          <div className="text-sm font-semibold text-gray-700 mb-2 px-1">
            相关预测市场
          </div>
          {market ? (
            <FeedCard card={market} />
          ) : (
            <div className="rounded-2xl border border-dashed border-black/10 p-6 text-center text-sm text-gray-400">
              盘口暂不可用
            </div>
          )}
        </div>

        {/* 评论区 */}
        <div className="rounded-2xl border border-black/8 bg-white p-4 sm:p-5 shadow-sm">
          <div className="text-sm font-semibold text-gray-700 mb-3">
            评论 · {MOCK_COMMENTS.length}
          </div>
          <div className="space-y-3.5">
            {MOCK_COMMENTS.map((c, i) => (
              <div key={i} className="flex gap-2.5">
                <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-[11px] font-bold text-gray-500 shrink-0">
                  {c.user.slice(0, 1)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-gray-800">{c.user}</span>
                    <span className="text-[11px] text-gray-400">{c.ago}</span>
                  </div>
                  <p className="text-[13px] text-gray-600 mt-0.5">{c.text}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-[12px] text-gray-300 text-center">
            评论与发帖将在 M2 接入真实账户后开放
          </div>
        </div>
      </div>
    </main>
  );
}
