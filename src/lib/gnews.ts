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

// 把 Polymarket 市场标题清洗成新闻搜索词
// 例: "US x Iran permanent peace deal by...?" -> "US Iran permanent peace deal"
export function buildQuery(title: string): string {
  let q = title
    .replace(/by\.\.\.\??/gi, " ")
    .replace(/\bwinner\b/gi, " ")
    .replace(/[?#"]/g, " ")
    .replace(/\b\d{4}\b/g, " ") // 去掉年份
    .replace(/\bx\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  // 取前 6 个词，避免查询过长稀释相关性
  q = q.split(" ").slice(0, 6).join(" ");
  return q;
}

// 搜索单条市场对应的新闻，返回最相关/最新的若干篇
export async function searchNews(
  query: string,
  max = 3,
): Promise<GNewsArticle[]> {
  if (!gnewsEnabled || !query) return [];
  const qs = new URLSearchParams({
    q: query,
    lang: "en",
    max: String(max),
    sortby: "relevance",
    apikey: GNEWS_KEY!,
  });
  try {
    const res = await fetch(`${GNEWS}/search?${qs.toString()}`, {
      headers: { Accept: "application/json" },
      // 真实新闻：缓存 3 小时，控制免费额度（100 次/天）
      next: { revalidate: 10800 },
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
