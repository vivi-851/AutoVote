// AI 生成盘口的到期结算：搜最新新闻 → LLM 判定 Yes/No → 派分
import { chatJSON, llmEnabled } from "./llm";
import { searchNews, buildQuery } from "./gnews";
import type { GenMarketRow } from "./generated";

export interface Judgement {
  outcome: "yes" | "no" | "unknown";
  confidence: number;
  note: string;
}

const SYSTEM =
  "You are resolving a Yes/No prediction market. Given the QUESTION and RECENT NEWS, " +
  "decide the real-world outcome. Output STRICT JSON only: " +
  '{"outcome": "yes" | "no" | "unknown", "confidence": number 0..1, "note": short reason}. ' +
  "Answer 'yes' or 'no' ONLY if the news clearly determines the outcome; otherwise 'unknown'. " +
  `Today is ${new Date().toISOString().slice(0, 10)}.`;

export async function judgeMarket(
  question: string,
  endDate: string | null,
  articles: { title: string; description?: string; publishedAt?: string }[],
): Promise<Judgement | null> {
  if (!llmEnabled) return null;
  const newsBlock =
    articles.length > 0
      ? articles
          .slice(0, 5)
          .map((a) => `- ${a.title} (${(a.publishedAt || "").slice(0, 10)}): ${a.description || ""}`)
          .join("\n")
      : "(no fresh news found)";
  const out = await chatJSON<Judgement>(
    SYSTEM,
    `QUESTION: ${question}\nDEADLINE: ${endDate ?? "n/a"}\nRECENT NEWS:\n${newsBlock}`,
    { temperature: 0.1, maxTokens: 800 },
  );
  if (!out || !["yes", "no", "unknown"].includes(out.outcome)) return null;
  return {
    outcome: out.outcome,
    confidence: typeof out.confidence === "number" ? out.confidence : 0,
    note: (out.note || "").slice(0, 240),
  };
}

export interface ResolveDecision {
  id: string;
  question: string;
  outcome: string;
  confidence: number;
  note: string;
  resolved: boolean;
}

// 对一组到期盘口逐个判定（dry=true 时只判不写库）
export async function resolveMarkets(
  markets: GenMarketRow[],
  rpc: (id: string, outcome: "yes" | "no", note: string) => Promise<boolean>,
  opts: { minConfidence?: number; dry?: boolean } = {},
): Promise<ResolveDecision[]> {
  const minConf = opts.minConfidence ?? 0.6;
  const out: ResolveDecision[] = [];

  for (const m of markets) {
    const articles = await searchNews(buildQuery(m.question), 5, { noStore: true });
    const j = await judgeMarket(m.question, m.end_date, articles);
    if (!j) {
      out.push({ id: m.id, question: m.question, outcome: "error", confidence: 0, note: "judge failed", resolved: false });
      continue;
    }
    const decide = j.outcome !== "unknown" && j.confidence >= minConf;
    let resolved = false;
    if (decide && !opts.dry) {
      resolved = await rpc(m.id, j.outcome as "yes" | "no", j.note);
    }
    out.push({
      id: m.id,
      question: m.question,
      outcome: j.outcome,
      confidence: j.confidence,
      note: j.note,
      resolved,
    });
  }
  return out;
}
