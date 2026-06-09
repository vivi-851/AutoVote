// Supabase 环境变量守卫
// 没配密钥时 supabaseEnabled=false，全站的账户/下注功能优雅降级，
// 信息流照常运行，避免在配置完成前打断线上 demo。

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const supabaseEnabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
