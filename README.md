# AutoVote · 新闻预测信息流

把预测市场做成一条"刷新闻"的信息流，验证**信息流形态能否把预测市场带给更泛的用户**。
定位：`Surf AI（信息流 / AI 摘要）` × `Polymarket（预测市场概率）`，用**虚拟积分**而非真钱，把门槛压到「点一下表态」。

线上：https://auto-vote-eight.vercel.app/

## 核心体验（三层）
1. **新闻信息流（首页）** — 社交流样式的真实新闻卡（图文 / YouTube 视频 / 顶部精选横滑），每条内嵌一个相关盘口，可**一键用积分表态**。
2. **新闻详情** — 原文来源 + AI TL;DR 摘要 + 完整可下注盘口 + 评论区。
3. **我的预测** — 持仓、按 Polymarket 实时概率计算的**浮动盈亏**、组合市值曲线。

## 进度
| 阶段 | 目标 | 状态 |
|---|---|---|
| M1 | 能看：信息流跑通（Polymarket 盘口卡） | ✅ |
| — | news-first 重构：新闻为主体，盘口内嵌 | ✅ |
| — | 富信息流：YouTube 视频 + 精选横滑 + 社交互动 + feed 内一键下注 | ✅ |
| M2 | 能玩：Google 登录 + 虚拟积分 + 下注 + 我的预测 + 盈亏曲线 | ✅ |
| M3 | 能活：真实新闻接入（GNews 市场优先匹配） | ✅ |
| 下一步 | 根据新闻内容**生成盘口**（AI 生成预测问题）；真实评论；LLM 精排 | ⬜ |

## 数据来源与匹配逻辑
- **盘口**：Polymarket Gamma API（只读），拉政治 + 泛热点活跃市场；历史概率走 CLOB `prices-history`（组合市值曲线用）。
- **新闻**：GNews API。采用**市场优先**架构 —— 从 Polymarket 活跃市场出发，用市场标题清洗出关键词，为每个市场搜配套真实新闻。保证每条信息流都有盘口、新闻与盘口天然贴合，且匹配无需 LLM。
- **账户**：Supabase（Google OAuth + Postgres）。新用户注册送 1000 积分；下注走原子 RPC `place_bet`（校验积分→扣分→记录），全部 Row Level Security。
- **AI 摘要**：当前用真实文章摘要 + 市场领先项拼出 TL;DR（无需 LLM）；后续可接 LLM 精排与生成。

### GNews 免费版的关键约束（已在代码中规避）
- 100 次/天、严格限流并发、文章有 12 小时延迟、`sortby=relevance` 为付费功能。
- 因此信息流抓取是**串行 + 1.5s 间隔 + 429 退避重试**，整份结果 `unstable_cache` 缓存 **6 小时**（每 6 小时冷启动抓 ~10 条，其余请求秒回）。`maxDuration=60` 防冷启动超时。
- 无 `GNEWS_API_KEY` 时自动回退到手工策划内容（`src/lib/news.ts`），线上永不空窗。

## 环境变量
| 变量 | 用途 | 必需 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL | 账户功能 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 浏览器端公钥 | 账户功能 |
| `GNEWS_API_KEY` | GNews 服务端密钥（**勿加** `NEXT_PUBLIC`） | 真实新闻 |

未配置任一项时，对应功能优雅降级（登录显示"待配置"、新闻回退策划内容），不影响其余部分。
数据库 schema 见 `supabase/schema.sql`（在 Supabase SQL Editor 整段执行）。

## 本地运行
```bash
npm install
cp .env.local.example .env.local   # 填入 Supabase / GNews（可选）
npm run dev            # 实时拉外部 API
npm run dev:fixture    # 离线/演示，读 src/lib/_fixtures 的 Polymarket 快照
npm run build
```
打开 http://localhost:3000

## 技术栈
Next.js 16（App Router）· TypeScript · Tailwind · Supabase · Vercel
新闻 GNews · 盘口 Polymarket（Gamma + CLOB）

## 目录
```
src/
  app/
    page.tsx                  # 信息流首页（Server Component）
    news/[id]/page.tsx        # 新闻详情（id=市场 slug 或策划 id）
    me/page.tsx               # 我的预测（持仓 + 盈亏曲线）
    auth/callback/route.ts    # Google OAuth 回调
  components/
    NewsFeed / NewsCard       # 信息流 + 卡片（分类 tab、视频、社交行）
    FeaturedRail              # 顶部精选横滑卡
    QuickBet                  # feed 内一键下注
    FeedCard                  # 详情页完整可下注盘口
    YouTubeLite               # 轻量 YouTube 嵌入
    PortfolioChart            # 组合市值 SVG 曲线
    AuthButton                # Google 登录 / 积分 / 菜单
  lib/
    feed.ts                   # 统一信息流层（真实/策划，市场优先匹配 + 缓存）
    gnews.ts                  # GNews 客户端（查询清洗 + 429 重试）
    polymarket.ts             # Polymarket Gamma/CLOB 数据层
    news.ts                   # 手工策划内容（回退用）
    portfolio.ts              # 组合市值序列重建
    auth.ts / supabase/*      # 账户与会话
  middleware.ts               # Supabase 会话刷新（无 key 时放行）
supabase/schema.sql           # profiles / bets / place_bet RPC / 触发器
```
