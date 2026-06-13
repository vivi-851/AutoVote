// 等级体系（XP）。纯函数，客户端/服务端共用。
// 公式必须与 supabase/v2.sql 的 level_for_xp / read_cap_for_level 保持一致：
//   level   = floor(sqrt(xp / 100)) + 1
//   readCap = 3 + min(floor(level / 5), 3)
//   签到等级加成 = (level - 1) * 2

export function levelForXp(xp: number): number {
  return Math.max(1, Math.floor(Math.sqrt(Math.max(xp, 0) / 100)) + 1);
}

// 升到 level 所需的累计 XP（level_for_xp 的反函数下界）
export function xpForLevel(level: number): number {
  const l = Math.max(1, Math.floor(level));
  return (l - 1) * (l - 1) * 100;
}

export function readCapForLevel(level: number): number {
  return 3 + Math.min(Math.floor(level / 5), 3);
}

export function signinBonusForLevel(level: number): number {
  return Math.max(level - 1, 0) * 2;
}

export interface LevelInfo {
  level: number;
  title: string; // 段位称号（DICT key）
  badge: string; // emoji 徽章
  color: string; // tailwind 文字色
  xp: number;
  intoLevel: number; // 当前等级内已累计 XP
  span: number; // 当前等级跨度（升级所需）
  progress: number; // 0~1
  nextAt: number; // 下一级所需累计 XP
  // 实用特权（原始值，UI 自行拼本地化文案，避免把数字写进 DICT key）
  readCap: number;
  signinBonus: number;
  earlyAccess: boolean; // L7+：AI 新盘口抢先看
  avatarHalo: boolean; // L10+：专属头像光环
}

// 段位阶梯（单一数据源）。title / desc 为中文 DICT key，UI 走 t() 翻译。
export interface Tier {
  minLevel: number; // 进入该段位的最低等级
  title: string;
  badge: string; // emoji
  color: string; // tailwind 文字色
  desc: string; // 段位说明（hover 展示）
}

export const TIERS: Tier[] = [
  { minLevel: 1, title: "新人", badge: "🌱", color: "text-emerald-500", desc: "刚起步 · 每日阅读上限 3 篇" },
  { minLevel: 2, title: "入门玩家", badge: "⭐", color: "text-blue-500", desc: "解锁签到等级加成，越签越多" },
  { minLevel: 4, title: "进阶玩家", badge: "🔥", color: "text-orange-500", desc: "稳定参与 · 签到加成持续提升" },
  { minLevel: 7, title: "老练玩家", badge: "🦅", color: "text-indigo-500", desc: "每日阅读上限 4 篇 · AI 新盘口抢先看" },
  { minLevel: 10, title: "大师", badge: "💎", color: "text-cyan-500", desc: "每日阅读上限 5 篇 · 专属头像光环" },
  { minLevel: 15, title: "宗师", badge: "👑", color: "text-amber-500", desc: "每日阅读上限 6 篇 · 顶尖战绩象征" },
  { minLevel: 20, title: "预言家", badge: "🔮", color: "text-fuchsia-500", desc: "最高段位 · 预测之王" },
];

// 取某等级所属段位（最高的 minLevel ≤ level）
export function tierForLevel(level: number): Tier {
  let cur = TIERS[0];
  for (const tr of TIERS) if (level >= tr.minLevel) cur = tr;
  return cur;
}

export function levelInfo(xp: number): LevelInfo {
  const level = levelForXp(xp);
  const base = xpForLevel(level);
  const nextAt = xpForLevel(level + 1);
  const span = Math.max(nextAt - base, 1);
  const intoLevel = xp - base;
  const { title, badge, color } = tierForLevel(level);
  return {
    level,
    title,
    badge,
    color,
    xp,
    intoLevel,
    span,
    progress: Math.min(intoLevel / span, 1),
    nextAt,
    readCap: readCapForLevel(level),
    signinBonus: signinBonusForLevel(level),
    earlyAccess: level >= 7,
    avatarHalo: level >= 10,
  };
}
