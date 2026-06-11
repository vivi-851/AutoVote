// YouTube Data API v3 —— 按关键词搜一个可嵌入的相关视频
// 服务端密钥 YOUTUBE_API_KEY（非 NEXT_PUBLIC）。每次 search 花 100 单位，免费 1 万/天。

const YT_KEY = process.env.YOUTUBE_API_KEY;
export const youtubeEnabled = Boolean(YT_KEY);

export interface YtVideo {
  youtubeId: string;
  channel: string;
}

export async function searchVideo(
  query: string,
  opts: { noStore?: boolean } = {},
): Promise<YtVideo | null> {
  if (!youtubeEnabled || !query) return null;
  const qs = new URLSearchParams({
    part: "snippet",
    type: "video",
    videoEmbeddable: "true",
    maxResults: "1",
    safeSearch: "moderate",
    relevanceLanguage: "en",
    q: query,
    key: YT_KEY!,
  });
  try {
    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${qs.toString()}`, {
      headers: { Accept: "application/json" },
      // 视频随话题变化慢：缓存 24h 省配额
      ...(opts.noStore ? { cache: "no-store" as const } : { next: { revalidate: 86400 } }),
    });
    if (!res.ok) {
      console.error("YouTube search failed", res.status);
      return null;
    }
    const data = (await res.json()) as {
      items?: { id?: { videoId?: string }; snippet?: { channelTitle?: string } }[];
    };
    const item = data.items?.[0];
    const id = item?.id?.videoId;
    if (!id) return null;
    return { youtubeId: id, channel: item?.snippet?.channelTitle || "YouTube" };
  } catch (err) {
    console.error("YouTube search error", err);
    return null;
  }
}
