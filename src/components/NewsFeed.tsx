"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import NewsCard from "./NewsCard";
import { NEWS_TABS } from "@/lib/news";
import { loadMoreFeed } from "@/app/actions";
import { useT } from "@/lib/i18n";
import type { FeedEntry } from "@/lib/feed";

export type { FeedEntry };

const PAGE = 6; // 每次多显示几条

export default function NewsFeed({
  entries,
  loggedIn,
  enabled,
}: {
  entries: FeedEntry[];
  loggedIn: boolean;
  enabled: boolean;
}) {
  const { t } = useT();
  const [tab, setTab] = useState<string>("推荐");
  const [visible, setVisible] = useState(PAGE);

  // 服务端分页加载的「更多」条目
  const [extra, setExtra] = useState<FeedEntry[]>([]);
  const [pmOffset, setPmOffset] = useState(
    () => entries.filter((e) => e.market && !e.market.genMarketId).length,
  );
  const [genOffset, setGenOffset] = useState(
    () => entries.filter((e) => e.market?.genMarketId).length,
  );
  const [loadingMore, setLoadingMore] = useState(false);
  const [ended, setEnded] = useState(false);

  const allEntries = useMemo(() => [...entries, ...extra], [entries, extra]);
  const shown =
    tab === "推荐"
      ? allEntries
      : allEntries.filter((e) => e.news.category === tab);

  const stateRef = useRef({ visible, shownLen: shown.length, tab, loadingMore, ended });
  stateRef.current = { visible, shownLen: shown.length, tab, loadingMore, ended };

  useEffect(() => {
    setVisible(PAGE);
  }, [tab]);

  const loadMore = useCallback(async () => {
    const s = stateRef.current;
    // 本地池还有没显示的 → 先放出来
    if (s.visible < s.shownLen) {
      setVisible((v) => v + PAGE);
      return;
    }
    // 池子放完了 → 只有「推荐」tab 去服务端拉真正的下一页
    if (s.tab !== "推荐" || s.loadingMore || s.ended) return;
    setLoadingMore(true);
    try {
      const res = await loadMoreFeed(pmOffset, genOffset);
      setExtra((prev) => {
        const have = new Set([...entries, ...prev].map((e) => e.news.id));
        const fresh = res.entries.filter((e) => !have.has(e.news.id));
        return [...prev, ...fresh];
      });
      setPmOffset(res.pmOffset);
      setGenOffset(res.genOffset);
      setVisible((v) => v + PAGE);
      if (res.done) setEnded(true);
    } finally {
      setLoadingMore(false);
    }
  }, [entries, pmOffset, genOffset]);

  // 滚到底自动触发
  const sentinelRef = useRef<HTMLButtonElement | null>(null);
  const hasLocalMore = visible < shown.length;
  const canServerMore = tab === "推荐" && !ended;
  const showLoader = hasLocalMore || canServerMore;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (es) => {
        if (es[0].isIntersecting) loadMore();
      },
      { rootMargin: "400px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [showLoader, loadMore]);

  const displayed = shown.slice(0, visible);

  return (
    <>
      {/* 分类 tab */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {NEWS_TABS.map((tabValue) => {
          const active = tabValue === tab;
          return (
            <button
              key={tabValue}
              onClick={() => setTab(tabValue)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-medium transition ${
                active
                  ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                  : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 ring-1 ring-black/8 dark:ring-white/10 hover:text-gray-800 dark:hover:text-gray-100"
              }`}
            >
              {t(tabValue)}
            </button>
          );
        })}
      </div>

      {/* 卡片流 */}
      <div className="mt-4 space-y-3">
        {shown.length === 0 ? (
          <div className="text-center text-gray-400 py-16 text-sm">
            {t("该分类暂时没有内容")}
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

      {/* 滚到底自动加载；也可点击 */}
      {shown.length > 0 &&
        (showLoader ? (
          <button
            ref={sentinelRef}
            onClick={loadMore}
            disabled={loadingMore}
            className="w-full py-5 flex items-center justify-center gap-2 text-[13px] text-gray-500 hover:text-gray-800 transition disabled:opacity-60"
          >
            <span className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 border-t-gray-500 animate-spin" />
            {loadingMore ? t("加载中…") : t("加载更多")}
          </button>
        ) : (
          <div className="py-6 text-center text-xs text-gray-300 dark:text-gray-600">{t("没有更多了")}</div>
        ))}
    </>
  );
}
