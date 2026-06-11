"use client";

import { useState, useRef, useEffect } from "react";
import NewsCard from "./NewsCard";
import { NEWS_TABS } from "@/lib/news";
import type { FeedEntry } from "@/lib/feed";

export type { FeedEntry };

const PAGE = 6; // 每次滚到底多显示几条

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
  const [visible, setVisible] = useState(PAGE);
  const sentinelRef = useRef<HTMLButtonElement | null>(null);

  const loadMore = () => setVisible((v) => Math.min(v + PAGE, shownLenRef.current));

  const shown =
    tab === "推荐" ? entries : entries.filter((e) => e.news.category === tab);

  // 让滚动回调读到最新的可见上限，避免闭包过期
  const shownLenRef = useRef(shown.length);
  shownLenRef.current = shown.length;

  // 切换分类时重置
  useEffect(() => {
    setVisible(PAGE);
  }, [tab]);

  const hasMore = visible < shown.length;

  // 滚到底自动加载更多
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (obsEntries) => {
        if (obsEntries[0].isIntersecting) {
          setVisible((v) => (v < shownLenRef.current ? v + PAGE : v));
        }
      },
      { rootMargin: "300px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore]);

  const displayed = shown.slice(0, visible);

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
          displayed.map((e) => (
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

      {/* 滚动到底自动加载；也可点击加载（双保险） */}
      {shown.length > 0 &&
        (hasMore ? (
          <button
            ref={sentinelRef}
            onClick={loadMore}
            className="w-full py-5 flex items-center justify-center gap-2 text-[13px] text-gray-500 hover:text-gray-800 transition"
          >
            <span className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 border-t-gray-500 animate-spin" />
            加载更多
          </button>
        ) : (
          <div className="py-6 text-center text-xs text-gray-300">没有更多了</div>
        ))}
    </>
  );
}
