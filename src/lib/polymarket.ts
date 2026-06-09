// Polymarket Gamma API 只读数据层
// 文档: https://docs.polymarket.com  Gamma endpoint: https://gamma-api.polymarket.com

const GAMMA = "https://gamma-api.polymarket.com";

// ---- 原始返回类型（只挑我们用得到的字段）----
interface RawMarket {
  id: string;
  question: string;
  groupItemTitle?: string;
  outcomes?: string; // JSON 字符串: ["Yes","No"]
  outcomePrices?: string; // JSON 字符串: ["0.62","0.38"]
  closed?: boolean;
  active?: boolean;
}

interface RawEvent {
  id: string;
  ticker: string;
  slug: string;
  title: string;
  description?: string;
  image?: string;
  icon?: string;
  volume?: number;
  volume24hr?: number;
  liquidity?: number;
  endDate?: string;
  closed?: boolean;
  active?: boolean;
  markets?: RawMarket[];
  tags?: { label: string; slug: string }[];
}

// ---- 给前端用的干净类型 ----
export interface Outcome {
  label: string; // 选项名（如 "Yes" / "Macron" / "< Mar 31"）
  marketId: string; // 对应的市场 id，下注时用
  probability: number; // 0~1
}

export interface FeedCard {
  id: string; // event id
  slug: string;
  title: string;
  description: string;
  image: string | null;
  volume: number;
  volume24hr: number;
  endDate: string | null;
  category: string; // 标签，如 "Politics"
  // 信息流卡片要展示的预测选项（已按概率排序，最多取前 4）
  outcomes: Outcome[];
  // 是否是简单的 Yes/No 二元市场（决定卡片交互形态）
  isBinary: boolean;
  polymarketUrl: string;
}

function parseJsonArray(s: string | undefined): string[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

// 把一个 event 转成信息流卡片
function toFeedCard(ev: RawEvent, category: string): FeedCard | null {
  const markets = (ev.markets ?? []).filter((m) => m.active && !m.closed);
  if (markets.length === 0) return null;

  let outcomes: Outcome[] = [];
  let isBinary = false;

  if (markets.length === 1) {
    // 单市场：通常是 Yes/No 二元
    const m = markets[0];
    const labels = parseJsonArray(m.outcomes);
    const prices = parseJsonArray(m.outcomePrices).map(Number);
    if (labels.length >= 2 && prices.length >= 2) {
      isBinary = labels.length === 2;
      outcomes = labels.map((label, i) => ({
        label,
        marketId: m.id,
        probability: prices[i] ?? 0,
      }));
    }
  } else {
    // 多市场：每个市场是一个选项（negRisk 事件），取各自的 Yes 概率
    outcomes = markets
      .map((m) => {
        const labels = parseJsonArray(m.outcomes);
        const prices = parseJsonArray(m.outcomePrices).map(Number);
        const yesIdx = labels.findIndex((l) => l.toLowerCase() === "yes");
        const prob = yesIdx >= 0 ? prices[yesIdx] ?? 0 : prices[0] ?? 0;
        return {
          label: m.groupItemTitle || m.question,
          marketId: m.id,
          probability: prob,
        };
      })
      .filter((o) => o.probability > 0);
  }

  if (outcomes.length === 0) return null;

  outcomes.sort((a, b) => b.probability - a.probability);
  outcomes = outcomes.slice(0, 4);

  return {
    id: ev.id,
    slug: ev.slug,
    title: ev.title,
    description: (ev.description ?? "").split("\n")[0].slice(0, 240),
    image: ev.image || ev.icon || null,
    volume: ev.volume ?? 0,
    volume24hr: ev.volume24hr ?? 0,
    endDate: ev.endDate ?? null,
    category,
    outcomes,
    isBinary,
    polymarketUrl: `https://polymarket.com/event/${ev.slug}`,
  };
}

// 离线/演示模式：USE_FIXTURE=1 时读本地快照，绕开网络（本地开发用，生产走实时）
async function readFixture(tag?: string): Promise<RawEvent[]> {
  const { readFile } = await import("node:fs/promises");
  const path = await import("node:path");
  const file = tag === "politics" ? "politics.json" : "trending.json";
  const full = path.join(process.cwd(), "src/lib/_fixtures", file);
  try {
    return JSON.parse(await readFile(full, "utf8")) as RawEvent[];
  } catch {
    return [];
  }
}

async function fetchEvents(params: Record<string, string>): Promise<RawEvent[]> {
  if (process.env.USE_FIXTURE === "1") {
    return readFixture(params.tag_slug);
  }
  const qs = new URLSearchParams({
    closed: "false",
    active: "true",
    archived: "false",
    limit: "30",
    order: "volume24hr",
    ascending: "false",
    ...params,
  });
  try {
    const res = await fetch(`${GAMMA}/events?${qs.toString()}`, {
      headers: { Accept: "application/json" },
      // 信息流：缓存 5 分钟，避免每次请求都打 Polymarket
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      console.error("Gamma fetch failed", res.status);
      return [];
    }
    return (await res.json()) as RawEvent[];
  } catch (err) {
    console.error("Gamma fetch error", err);
    return [];
  }
}

// 拉政治 + 泛热点（按 24h 成交量排序）的信息流
export async function getFeed(): Promise<FeedCard[]> {
  const [politics, trending] = await Promise.all([
    fetchEvents({ tag_slug: "politics", limit: "20" }),
    fetchEvents({ limit: "20" }), // 不带标签 = 全站热门
  ]);

  const seen = new Set<string>();
  const cards: FeedCard[] = [];

  const push = (evs: RawEvent[], cat: string) => {
    for (const ev of evs) {
      if (seen.has(ev.id)) continue;
      const card = toFeedCard(ev, cat);
      if (card) {
        seen.add(ev.id);
        cards.push(card);
      }
    }
  };

  push(politics, "Politics");
  push(trending, "Hot");

  // 按 24h 成交量排序，热的在前
  cards.sort((a, b) => b.volume24hr - a.volume24hr);
  return cards;
}

// 按 slug 批量取盘口（给新闻信息流挂载内嵌市场用）
// 返回 slug -> FeedCard 的映射；categoryBySlug 给每条新闻指定分类标签
export async function getMarketsBySlugs(
  slugs: string[],
  categoryBySlug: Record<string, string> = {},
): Promise<Map<string, FeedCard>> {
  const map = new Map<string, FeedCard>();
  if (slugs.length === 0) return map;

  const ingest = (evs: RawEvent[]) => {
    for (const ev of evs) {
      if (!slugs.includes(ev.slug)) continue;
      const card = toFeedCard(ev, categoryBySlug[ev.slug] ?? "Hot");
      if (card) map.set(ev.slug, card);
    }
  };

  if (process.env.USE_FIXTURE === "1") {
    const evs = [...(await readFixture("politics")), ...(await readFixture("trending"))];
    ingest(evs);
    return map;
  }

  const qs = new URLSearchParams({ closed: "false", archived: "false" });
  for (const s of slugs) qs.append("slug", s);
  try {
    const res = await fetch(`${GAMMA}/events?${qs.toString()}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      console.error("Gamma slug fetch failed", res.status);
      return map;
    }
    ingest((await res.json()) as RawEvent[]);
  } catch (err) {
    console.error("Gamma slug fetch error", err);
  }
  return map;
}

export async function getMarketBySlug(
  slug: string,
  category = "Hot",
): Promise<FeedCard | null> {
  const map = await getMarketsBySlugs([slug], { [slug]: category });
  return map.get(slug) ?? null;
}
