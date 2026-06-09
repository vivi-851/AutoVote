import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_URL, SUPABASE_ANON_KEY, supabaseEnabled } from "./env";

// 服务端 Supabase 客户端（读 cookie 中的会话）。未配置密钥时返回 null。
export async function createClient() {
  if (!supabaseEnabled) return null;
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Component 中调用 set 会抛错，可忽略（由 middleware 刷新会话）
        }
      },
    },
  });
}
