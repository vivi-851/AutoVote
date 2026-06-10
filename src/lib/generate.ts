// AI 生成盘口：读新闻内容 → LLM 生成规范的 Yes/No 预测问题 + 初始概率 + 截止日
import { chatJSON, llmEnabled } from "./llm";
import { topHeadlines, type GNewsArticle } from "./gnews";

export interface MarketDraft {
  question: string;
  category: string;
  yesProbability: number;
  endDate: string; // YYYY-MM-DD
  rationale?: string;
  news: { headline: string; url: string; source: string };
}

const SYSTEM =
  "You convert a news article into ONE objectively-resolvable Yes/No prediction market. " +
  "Output STRICT JSON only, no prose. Schema: " +
  '{"question": string (a clear yes/no question with a concrete, checkable condition AND an explicit deadline date), ' +
  '"yes_probability": number between 0 and 1 (your honest estimate), ' +
  '"end_date": "YYYY-MM-DD" (a realistic resolution date, within ~3 months unless the event is clearly later), ' +
  '"category": one of ["政治","财经","加密","体育","科技","热点"], ' +
  '"rationale": short string}. ' +
  "The question must be answerable Yes/No by the deadline using public news, neutral and non-offensive. " +
  `Today is ${new Date().toISOString().slice(0, 10)}.`;

interface RawDraft {
  question?: string;
  yes_probability?: number;
  end_date?: string;
  category?: string;
  rationale?: string;
}

const CATEGORIES = ["政治", "财经", "加密", "体育", "科技", "热点"];

function validDate(s?: string): string {
  const d = s ? new Date(s) : null;
  if (!d || Number.isNaN(d.getTime()) || d.getTime() < Date.now()) {
    // 兜底：默认 30 天后
    return new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
  }
  return d.toISOString().slice(0, 10);
}

export async function generateFromArticle(a: GNewsArticle): Promise<MarketDraft | null> {
  if (!llmEnabled) return null;
  const text = (a.description || a.content || "").slice(0, 800);
  const out = await chatJSON<RawDraft>(
    SYSTEM,
    `NEWS:\nTitle: ${a.title}\n${text}`,
    { temperature: 0.5, maxTokens: 1200 },
  );
  if (!out?.question || typeof out.yes_probability !== "number") return null;

  let p = out.yes_probability;
  if (!(p > 0 && p < 1)) p = 0.5;
  p = Math.min(0.95, Math.max(0.05, p)); // 收敛极端值，避免赔率爆炸

  return {
    question: out.question.trim().slice(0, 200),
    category: CATEGORIES.includes(out.category || "") ? out.category! : "热点",
    yesProbability: p,
    endDate: validDate(out.end_date),
    rationale: out.rationale?.slice(0, 240),
    news: { headline: a.title, url: a.url, source: a.source?.name || "" },
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// 拉一批头条 → 串行生成盘口草稿（对 Gemini 速率限制友好；2.0-flash 足够快）
export async function generateDrafts(limit = 6): Promise<MarketDraft[]> {
  if (!llmEnabled) return [];
  const articles = (await topHeadlines("general", Math.max(limit + 3, 10))).filter(
    (a) => a.title,
  );
  const drafts: MarketDraft[] = [];
  for (const a of articles) {
    if (drafts.length >= limit) break;
    const d = await generateFromArticle(a);
    if (d) drafts.push(d);
    await sleep(300);
  }
  return drafts;
}
