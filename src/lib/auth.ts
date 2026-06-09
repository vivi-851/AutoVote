import { createClient } from "@/lib/supabase/server";

export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  points: number;
}

// 服务端：取当前登录用户的档案（含积分）。未登录/未配置时返回 null。
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, email, display_name, avatar_url, points")
    .eq("id", user.id)
    .single();

  return (data as Profile) ?? null;
}
