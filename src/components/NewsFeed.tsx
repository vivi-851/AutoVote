"use client";

import { useState } from "react";
import NewsCard from "./NewsCard";
import { NEWS_TABS, type NewsItem } from "@/lib/news";
import type { FeedCard } from "@/lib/polymarket";

export interface FeedEntry {
  news: NewsItem;
  market: FeedCard | null;
}

export default function NewsFeed({
  entries,
  loggedIn,
  enabled,
}: {
  entries: FeedEntry[];
  loggedIn: boolean;
  enabled: boolean;
}) {
  const [tab, setTab] = useState<string>("推荐");

  const shown =
    tab === "推荐" ? entries : entries.filter((e) => e.news.category === tab);

  return (
    <>
      {/* 分类 tab */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {NEWS_TABS.map((t) => {
          const active = t === tab;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-medium transition ${
                active
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-500 ring-1 ring-black/8 hover:text-gray-800"
              }`}
            >
              {t}
            </button>
          );
        })}
      </div>

      {/* 卡片流 */}
      <div className="mt-4 space-y-3">
        {shown.length === 0 ? (
          <div className="text-center text-gray-400 py-16 text-sm">
            该分类暂时没有内容
          </div>
        ) : (
          shown.map((e) => (
            <NewsCard
              key={e.news.id}
              news={e.news}
              market={e.market}
              loggedIn={loggedIn}
              enabled={enabled}
            />
          ))
        )}
      </div>
    </>
  );
}
