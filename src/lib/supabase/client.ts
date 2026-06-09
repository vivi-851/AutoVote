"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY, supabaseEnabled } from "./env";

// 浏览器端 Supabase 客户端。未配置密钥时返回 null，调用方需判空。
export function createClient() {
  if (!supabaseEnabled) return null;
  return createBrowserClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
}
