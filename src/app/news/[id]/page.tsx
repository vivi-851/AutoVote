import Link from "next/link";
import { notFound } from "next/navigation";
import { getFeedEntry } from "@/lib/feed";
import FeedCard from "@/components/FeedCard";
import YouTubeLite from "@/components/YouTubeLite";
import AuthButton from "@/components/AuthButton";
import SettingsControl from "@/components/SettingsControl";
import { getProfile } from "@/lib/auth";
import { supabaseEnabled } from "@/lib/supabase/env";
import { getServerT } from "@/lib/i18n-server";

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
  const [entry, profile, { t }] = await Promise.all([
    getFeedEntry(id),
    getProfile(),
    getServerT(),
  ]);
  if (!entry) notFound();
  const { news, market } = entry;

  return (
    <main className="min-h-full bg-background">
      {/* 顶部栏 */}
      <header className="sticky top-0 z-10 backdrop-blur bg-white/80 dark:bg-gray-900/80 border-b border-black/5 dark:border-white/10">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link
            href="/"
            className="text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white text-sm flex items-center gap-1"
          >
            <span className="text-lg leading-none">‹</span> {t("返回")}
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <SettingsControl />
            <AuthButton profile={profile} enabled={supabaseEnabled} />
          </div>
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
              <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">{news.source}</div>
              <div className="text-xs text-gray-400 dark:text-gray-500">
                {news.handle} · {news.publishedAgo}
              </div>
            </div>
          </div>
          <h1 className="text-xl font-bold leading-snug text-gray-900 dark:text-gray-100">
            {news.headline}
          </h1>

          {/* 视频（可播放） */}
          {news.video && (
            <div className="mt-3">
              <YouTubeLite id={news.video.youtubeId} channel={news.video.channel} />
            </div>
          )}

          <p className="mt-2 text-[14px] leading-relaxed text-gray-600 dark:text-gray-300">
            {news.summary}
          </p>
          {/^https?:\/\//.test(news.originalUrl) &&
            !news.originalUrl.includes("example.com") && (
              <a
                href={news.originalUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-block mt-2 text-[13px] text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {t("查看原文 ↗")}
              </a>
            )}
        </div>

        {/* AI TL;DR */}
        <div className="rounded-2xl border border-black/8 dark:border-white/10 bg-white dark:bg-gray-900 p-4 sm:p-5 shadow-sm">
          <div className="flex items-center gap-1.5 mb-3">
            <span className="text-[13px] font-bold text-indigo-600 dark:text-indigo-400">TL;DR</span>
            <span className="text-[11px] text-gray-400">· {t("AI 摘要")}</span>
          </div>
          <ul className="space-y-2">
            {news.tldr.map((point, i) => (
              <li key={i} className="flex gap-2 text-[14px] leading-relaxed text-gray-700 dark:text-gray-300">
                <span className="text-indigo-400 shrink-0">•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 关联盘口（完整可表态） */}
        <div>
          <div className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 px-1">
            {t("相关预测市场")}
          </div>
          {market ? (
            <FeedCard
              card={market}
              newsId={news.id}
              loggedIn={!!profile}
              enabled={supabaseEnabled}
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-black/10 dark:border-white/10 p-6 text-center text-sm text-gray-400 dark:text-gray-500">
              {t("盘口暂不可用")}
            </div>
          )}
        </div>

        {/* 评论区 */}
        <div className="rounded-2xl border border-black/8 dark:border-white/10 bg-white dark:bg-gray-900 p-4 sm:p-5 shadow-sm">
          <div className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
            {t("评论")} · {MOCK_COMMENTS.length}
          </div>
          <div className="space-y-3.5">
            {MOCK_COMMENTS.map((c, i) => (
              <div key={i} className="flex gap-2.5">
                <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[11px] font-bold text-gray-500 dark:text-gray-300 shrink-0">
                  {c.user.slice(0, 1)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-gray-800 dark:text-gray-100">{c.user}</span>
                    <span className="text-[11px] text-gray-400 dark:text-gray-500">{c.ago}</span>
                  </div>
                  <p className="text-[13px] text-gray-600 dark:text-gray-300 mt-0.5">{c.text}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-[12px] text-gray-300 dark:text-gray-600 text-center">
            {t("评论与发帖将在 M2 接入真实账户后开放")}
          </div>
        </div>
      </div>
    </main>
  );
}
