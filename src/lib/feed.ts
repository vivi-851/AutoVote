// 统一信息流数据层
// - 配了 GNEWS_API_KEY：市场优先，从 Polymarket 活跃市场出发，为每个市场搜配套真实新闻
// - 没配：回退到手工策划的 NEWS（demo 内容），保证线上始终可用

import { unstable_cache } from "next/cache";
import { NEWS, getNewsById, type NewsItem } from "./news";
import {
  getFeed,
  getMarketsBySlugs,
  getMarketBySlug,
  getMarketsPage,
  type FeedCard,
} from "./polymarket";
import { gnewsEnabled, searchNews, buildQuery, type GNewsArticle } from "./gnews";
import { searchVideo, youtubeEnabled } from "./youtube";
import {
  getGeneratedEntries,
  getGeneratedEntry,
  getGeneratedEntriesPage,
} from "./generated";

export interface FeedEntry {
  news: NewsItem;
  market: FeedCard | null;
}

// 把 AI 生成盘口均匀插进 Polymarket 信息流（每 2 条插 1 条生成）
function interleave(gen: FeedEntry[], poly: FeedEntry[]): FeedEntry[] {
  if (gen.length === 0) return poly;
  if (poly.length === 0) return gen;
  const out: FeedEntry[] = [];
  let gi = 0;
  for (let i = 0; i < poly.length; i++) {
    out.push(poly[i]);
    if ((i + 1) % 2 === 0 && gi < gen.length) out.push(gen[gi++]);
  }
  while (gi < gen.length) out.push(gen[gi++]);
  return out;
}

const REAL_FEED_SIZE = 14;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 60) return `${Math.max(1, m)}分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}小时前`;
  return `${Math.floor(h / 24)}天前`;
}

// 由 slug 稳定派生一个互动数（原型 mock，避免每次刷新跳动）
function pseudoCount(seed: string, min: number, max: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return min + (h % (max - min));
}

function leadText(market: FeedCard): string | null {
  const top = market.outcomes[0];
  if (!top) return null;
  const lead = market.isBinary
    ? top.label.toLowerCase() === "yes"
      ? "会发生"
      : "不会"
    : top.label;
  return `市场观点：${lead} ${Math.round(top.probability * 100)}%`;
}

function buildTldr(market: FeedCard, art: GNewsArticle): string[] {
  const out: string[] = [];
  const desc = (art.description || "").trim();
  if (desc) out.push(desc);
  const lead = leadText(market);
  if (lead) out.push(lead);
  const content = (art.content || "").replace(/\s*\[\d+ chars\]$/, "").trim();
  if (content && content !== desc) out.push(content.slice(0, 200));
  return out.slice(0, 3);
}

// 真实新闻 → NewsItem（市场优先：market 必有，news 来自 GNews）
function articleToNews(market: FeedCard, art: GNewsArticle): NewsItem {
  let host = "";
  try {
    host = new URL(art.url).hostname.replace(/^www\./, "");
  } catch {
    host = "news";
  }
  return {
    id: market.slug,
    source: art.source?.name || host,
    handle: `@${host.split(".")[0]}`,
    category: market.newsCategory,
    headline: art.title,
    summary: art.description || art.content?.slice(0, 160) || market.title,
    tldr: buildTldr(market, art),
    publishedAgo: timeAgo(art.publishedAt),
    marketSlug: market.slug,
    marketCategory: market.category,
    originalUrl: art.url,
    likes: pseudoCount(market.slug, 200, 4000),
    comments: pseudoCount(market.slug + "c", 20, 320),
  };
}

// 没有匹配到新闻时，用市场本身兜底（详情页始终可用）
function marketOnlyNews(market: FeedCard): NewsItem {
  return {
    id: market.slug,
    source: "Polymarket",
    handle: "@polymarket",
    category: market.newsCategory,
    headline: market.title,
    summary: market.description || "",
    tldr: [market.description, leadText(market)].filter(Boolean) as string[],
    publishedAgo: "",
    marketSlug: market.slug,
    marketCategory: market.category,
    originalUrl: market.polymarketUrl,
    likes: pseudoCount(market.slug, 200, 4000),
    comments: pseudoCount(market.slug + "c", 20, 320),
  };
}

// 组装真实信息流：GNews 免费版严格限流并发，必须串行 + 间隔（~1.3s）请求。
// 整份结果用 unstable_cache 缓存 6 小时，慢的组装每 6 小时只跑一次。
async function assembleRealFeed(): Promise<FeedEntry[]> {
  const cards = (await getFeed({ noStore: true })).slice(0, REAL_FEED_SIZE);
  const entries: FeedEntry[] = [];
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const arts = await searchNews(buildQuery(card.title), 1, { noStore: true });
    if (arts[0]) entries.push({ news: articleToNews(card, arts[0]), market: card });
    if (i < cards.length - 1) await sleep(1500); // 避免 GNews 429（配合 searchNews 内重试）
  }

  // 给前几条配一个相关 YouTube 视频（每条 100 单位配额，控制数量）
  if (youtubeEnabled) {
    const n = Math.min(4, entries.length);
    for (let i = 0; i < n; i++) {
      const e = entries[i];
      // 加 "news" 偏向正规新闻频道、避开泛搜垃圾结果
      const vid = await searchVideo(`${buildQuery(e.market!.title)} news`, { noStore: true });
      if (vid) e.news.video = vid;
    }
  }

  return entries;
}

const getCachedRealFeed = unstable_cache(assembleRealFeed, ["real-feed-v3"], {
  revalidate: 21600, // 6 小时
});

// ── 信息流列表 ──────────────────────────────────────
export async function getFeedEntries(): Promise<FeedEntry[]> {
  const base = gnewsEnabled ? await getCachedRealFeed() : [];
  const [polymarket, generated] = await Promise.all([
    base.length > 0 ? Promise.resolve(base) : curatedEntries(),
    getGeneratedEntries(14),
  ]);
  return interleave(generated, polymarket);
}

async function curatedEntries(): Promise<FeedEntry[]> {
  const slugs = NEWS.map((n) => n.marketSlug);
  const categoryBySlug = Object.fromEntries(
    NEWS.map((n) => [n.marketSlug, n.marketCategory]),
  );
  const markets = await getMarketsBySlugs(slugs, categoryBySlug);
  return NEWS.map((news) => ({ news, market: markets.get(news.marketSlug) ?? null }));
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── 无限分页：加载下一批（Polymarket 按成交量翻页 + 新闻 + AI 盘口）──
export interface MorePage {
  entries: FeedEntry[];
  pmOffset: number;
  genOffset: number;
  done: boolean;
}

export async function loadMoreEntries(
  pmOffset: number,
  genOffset: number,
): Promise<MorePage> {
  const PM = 6;
  const GEN = 3;

  const cards = gnewsEnabled ? await getMarketsPage(pmOffset, PM) : [];
  const articles = await Promise.all(
    cards.map((c) => searchNews(buildQuery(c.title), 1)),
  );
  const pm: FeedEntry[] = [];
  cards.forEach((c, i) => {
    const a = articles[i]?.[0];
    if (a) pm.push({ news: articleToNews(c, a), market: c });
  });

  const gen = await getGeneratedEntriesPage(genOffset, GEN);

  return {
    entries: interleave(gen, pm),
    pmOffset: pmOffset + cards.length,
    genOffset: genOffset + gen.length,
    done: cards.length === 0 && gen.length === 0,
  };
}

// ── 单条（详情页）─────────────────────────────────
export async function getFeedEntry(id: string): Promise<FeedEntry | null> {
  if (UUID_RE.test(id)) return getGeneratedEntry(id); // AI 生成盘口

  if (gnewsEnabled) {
    const market = await getMarketBySlug(id);
    if (!market) {
      // 可能是回退期的策划 id
      const curated = getNewsById(id);
      if (!curated) return null;
      const m = await getMarketBySlug(curated.marketSlug, curated.marketCategory);
      return { news: curated, market: m };
    }
    const arts = await searchNews(buildQuery(market.title), 1);
    const news = arts[0] ? articleToNews(market, arts[0]) : marketOnlyNews(market);
    return { news, market };
  }

  const curated = getNewsById(id);
  if (!curated) return null;
  const market = await getMarketBySlug(curated.marketSlug, curated.marketCategory);
  return { news: curated, market };
}
