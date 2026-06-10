// LLM 客户端（OpenAI 兼容格式，默认接 Gemini，方便以后换模型）
// 服务端密钥 GEMINI_API_KEY（非 NEXT_PUBLIC）。可用 LLM_BASE_URL / LLM_MODEL 覆盖。

const LLM_KEY =
  process.env.DEEPSEEK_API_KEY || process.env.LLM_API_KEY || process.env.GEMINI_API_KEY;
const LLM_BASE_URL = process.env.LLM_BASE_URL || "https://api.deepseek.com";
const LLM_MODEL = process.env.LLM_MODEL || "deepseek-chat";

export const llmEnabled = Boolean(LLM_KEY);

// 从可能带 ```json 包裹 / 多余文本的回复中提取 JSON
function extractJson<T>(text: string): T | null {
  if (!text) return null;
  let s = text.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start >= 0 && end > start) s = s.slice(start, end + 1);
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

// 让模型返回 JSON 对象并解析；失败返回 null
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function chatJSON<T>(
  system: string,
  user: string,
  opts: { temperature?: number; maxTokens?: number } = {},
): Promise<T | null> {
  if (!llmEnabled) return null;
  const body = JSON.stringify({
    model: LLM_MODEL,
    temperature: opts.temperature ?? 0.4,
    max_tokens: opts.maxTokens ?? 1200,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

  // Gemini 偶发 503/429（过载/限流）→ 退避重试
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(`${LLM_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${LLM_KEY}` },
        cache: "no-store",
        body,
      });
      if ((res.status === 503 || res.status === 429 || res.status === 500) && attempt < 3) {
        await sleep(1500 * (attempt + 1));
        continue;
      }
      if (!res.ok) {
        console.error("LLM call failed", res.status, (await res.text().catch(() => "")).slice(0, 200));
        return null;
      }
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      return extractJson<T>(data.choices?.[0]?.message?.content ?? "");
    } catch (err) {
      if (attempt < 3) {
        await sleep(1500);
        continue;
      }
      console.error("LLM call error", err);
      return null;
    }
  }
  return null;
}
