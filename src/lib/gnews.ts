// GNews 新闻 API 客户端（市场优先：用市场关键词搜配套真实新闻）
// 免费版可服务端/线上调用。密钥放服务端环境变量 GNEWS_API_KEY（非 NEXT_PUBLIC）。

const GNEWS = "https://gnews.io/api/v4";
const GNEWS_KEY = process.env.GNEWS_API_KEY;
export const gnewsEnabled = Boolean(GNEWS_KEY);

export interface GNewsArticle {
  title: string;
  description: string;
  content: string;
  url: string;
  image: string | null;
  publishedAt: string;
  source: { name: string; url: string };
}

// 把 Polymarket 市场标题清洗成新闻搜索词（取核心实体，最多 4 词）
// 例: "US x Iran permanent peace deal by...?" -> "US Iran peace deal"
const STOP = new Set(
  ("the a an in on at by to of for and or vs will would where who what when which " +
    "its it is are be above below under over per new next permanent total official " +
    "full number winner win play plays")
    .split(" "),
);
export function buildQuery(title: string): string {
  const cleaned = title
    .replace(/[^A-Za-z0-9 ]/g, " ") // 去掉所有标点（含 _ / . ? x 等，防 400）
    .replace(/\s+/g, " ")
    .trim();
  const tokens = cleaned
    .split(" ")
    .filter((w) => !STOP.has(w.toLowerCase()) && !/^\d+$/.test(w) && w.length > 1);
  return tokens.slice(0, 4).join(" ");
}

// 搜索单条市场对应的新闻，返回最相关/最新的若干篇
export async function searchNews(
  query: string,
  max = 3,
  opts: { noStore?: boolean } = {},
): Promise<GNewsArticle[]> {
  if (!gnewsEnabled || !query) return [];
  // 注意：sortby=relevance 是 GNews 付费功能，免费版会返回空 articles，故用默认排序
  const qs = new URLSearchParams({
    q: query,
    lang: "en",
    max: String(max),
    apikey: GNEWS_KEY!,
  });
  try {
    const res = await fetch(`${GNEWS}/search?${qs.toString()}`, {
      headers: { Accept: "application/json" },
      // 默认缓存 3 小时；在 unstable_cache 内部调用时用 no-store
      ...(opts.noStore ? { cache: "no-store" as const } : { next: { revalidate: 10800 } }),
    });
    if (!res.ok) {
      console.error("GNews fetch failed", res.status);
      return [];
    }
    const data = (await res.json()) as { articles?: GNewsArticle[] };
    return Array.isArray(data.articles) ? data.articles : [];
  } catch (err) {
    console.error("GNews fetch error", err);
    return [];
  }
}
