import { createClient } from "@/lib/supabase/server";

export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  points: number;
  xp: number; // 累计经验（v2）；列未迁移时回退 0
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

  if (!data) return null;
  const profile = { ...(data as Omit<Profile, "xp">), xp: 0 } as Profile;

  // xp 列可能尚未迁移（v2.sql 未执行）→ 单独容错查询，失败不影响登录
  const { data: xpRow } = await supabase
    .from("profiles")
    .select("xp")
    .eq("id", user.id)
    .single();
  if (xpRow && typeof (xpRow as { xp?: number }).xp === "number") {
    profile.xp = (xpRow as { xp: number }).xp;
  }

  return profile;
}

// 当前登录用户是否管理员。与 getProfile 解耦、并对「列不存在」（admin.sql 未执行）容错，
// 避免运营后台的鉴权耦合进主站登录流程。
export async function isAdmin(): Promise<boolean> {
  const supabase = await createClient();
  if (!supabase) return false;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data, error } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (error) return false;
  return Boolean((data as { is_admin?: boolean })?.is_admin);
}
