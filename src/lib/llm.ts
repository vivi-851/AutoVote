// LLM 客户端（OpenAI 兼容格式，默认接 Gemini，方便以后换模型）
// 服务端密钥 GEMINI_API_KEY（非 NEXT_PUBLIC）。可用 LLM_BASE_URL / LLM_MODEL 覆盖。

const LLM_KEY = process.env.GEMINI_API_KEY || process.env.LLM_API_KEY;
const LLM_BASE_URL =
  process.env.LLM_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai";
const LLM_MODEL = process.env.LLM_MODEL || "gemini-2.5-flash";

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
export async function chatJSON<T>(
  system: string,
  user: string,
  opts: { temperature?: number; maxTokens?: number } = {},
): Promise<T | null> {
  if (!llmEnabled) return null;
  try {
    const res = await fetch(`${LLM_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LLM_KEY}`,
      },
      cache: "no-store",
      body: JSON.stringify({
        model: LLM_MODEL,
        temperature: opts.temperature ?? 0.4,
        max_tokens: opts.maxTokens ?? 600,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) {
      console.error("LLM call failed", res.status, await res.text().catch(() => ""));
      return null;
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content ?? "";
    return extractJson<T>(content);
  } catch (err) {
    console.error("LLM call error", err);
    return null;
  }
}
