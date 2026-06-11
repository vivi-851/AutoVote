"use server";

import { loadMoreEntries, type MorePage } from "@/lib/feed";

// 无限滚动：客户端调用，返回下一批信息流条目
export async function loadMoreFeed(
  pmOffset: number,
  genOffset: number,
): Promise<MorePage> {
  return loadMoreEntries(pmOffset, genOffset);
}
