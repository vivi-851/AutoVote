# AutoVote · 新闻预测信息流

把预测市场做成一条"刷新闻"的信息流，验证**信息流形态能否把预测市场带给更泛的用户**。
定位：`Surf AI（信息流 / AI 摘要）` × `Polymarket（预测市场概率）`，用**虚拟积分**而非真钱，把门槛压到「点一下表态」。

线上：https://auto-vote-eight.vercel.app/

## 核心体验
1. **新闻信息流（首页）** — 社交流样式的真实新闻卡（图文 / YouTube 视频 / 顶部精选横滑 / 无限滚动），每条内嵌相关盘口，可**一键用积分表态**。Polymarket 盘口与 **AI 生成盘口**混排。
2. **新闻详情** — 原文来源 + AI TL;DR 摘要 + 完整可下注盘口 + 评论区。
3. **我的预测** — 当前持仓 + 历史（已平仓/已结算）、**浮动盈亏**、组合市值曲线；支持**卖出/平仓**兑现盈亏。
4. **深浅主题（浅/深/跟随系统）+ 多语言（中/英/韩/越）**，全界面即时切换。

## 进度
| 阶段 | 目标 | 状态 |
|---|---|---|
| M1 | 能看：信息流跑通（Polymarket 盘口卡） | ✅ |
| — | news-first 重构 + 富信息流（视频 / 精选 / 社交 / 一键下注） | ✅ |
| M2 | 能玩：Google 登录 + 虚拟积分 + 下注 + 我的预测 + 盈亏曲线 | ✅ |
| M3 | 能活：真实新闻接入（GNews 市场优先匹配） | ✅ |
| — | **AI 生成盘口**：DeepSeek 从新闻生成 Yes/No 市场 + AMM 定价 + LLM 到期自动结算 | ✅ |
| — | **交易**：买入 / 卖出 / 平仓 / 加减仓（虚拟积分） | ✅ |
| — | **无限分页**（Polymarket 按成交量翻页 + 新闻 + AI 盘口） | ✅ |
| — | 深浅主题 + 中/英/韩/越 多语言 | ✅ |

## 数据来源与逻辑
- **盘口**：Polymarket Gamma API（只读），政治 + 泛热点活跃市场，按成交量翻页；历史概率走 CLOB `prices-history`（组合市值曲线用）。
- **新闻**：GNews API。**市场优先**架构 —— 从活跃市场出发，用市场标题清洗关键词为每个市场搜配套真实新闻，保证新闻与盘口天然贴合、无需 LLM 匹配。
- **AI 生成盘口**：对没有现成 Polymarket 盘口的头条新闻，用 **DeepSeek（`deepseek-chat`，OpenAI 兼容）** 生成规范的 Yes/No 预测问题 + 初始概率 + 截止日，存入 `generated_markets`。
  - **定价 AMM**：用初始概率给定价池播种 + 流动性常数，价格随下注/平仓浮动（`place_gen_bet` / `sell_bet`）。
  - **自动结算**：到期由 `/api/resolve` 让 DeepSeek 结合最新新闻判定 Yes/No，自动派分（`resolve_generated_market`）。每日 cron 触发生成与结算（`vercel.json`）。
- **账户与交易**：Supabase（Google OAuth + Postgres，全 RLS）。注册送 1000 积分；下注/平仓走原子 RPC（`place_bet` / `place_gen_bet` / `sell_bet`），校验积分→扣分/派分→记录。
- **主题/语言**：主题用 class 策略 + CSS 变量（无闪烁脚本）；i18n 以中文为 key 的字典，客户端 `useT` + 服务端 `getServerT`（cookie 驱动，切换即 `router.refresh`）。

### GNews 抓取策略
- 当前用 GNews **付费版**（实时、配额充足）。
- 首页内容池：串行 + 1.5s 间隔抓取，整份结果 `unstable_cache` 缓存 **6 小时**（控成本 + 防冷启动超时，`maxDuration=60`）。
- "加载更多"无限分页：并发拉取下一批市场的新闻（`loadMoreFeed` Server Action）。
- 无 `GNEWS_API_KEY` 时自动回退到手工策划内容（`src/lib/news.ts`），线上永不空窗。
- 历史包袱：早期为兼容免费版做了 `429 退避重试`、避开付费的 `sortby=relevance` 等，代码保留无害。

## 环境变量
| 变量 | 用途 | 必需 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL | 账户 / 交易 / AI 盘口 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 浏览器端公钥 | 同上 |
| `GNEWS_API_KEY` | GNews 服务端密钥（**勿加** `NEXT_PUBLIC`） | 真实新闻 |
| `DEEPSEEK_API_KEY` | DeepSeek 服务端密钥（AI 生成/结算盘口）。可用 `LLM_BASE_URL`/`LLM_MODEL` 覆盖换其他 OpenAI 兼容模型 | AI 盘口 |

未配置任一项时对应功能优雅降级（登录显示"待配置"、新闻回退策划内容、无 AI 盘口），不影响其余部分。
数据库 schema 依次执行：`supabase/schema.sql`（账户/下注）、`supabase/generated_markets.sql`（AI 盘口）、`supabase/trading.sql`（卖出/平仓）。

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
Next.js 16（App Router）· TypeScript · Tailwind v4 · Supabase · Vercel
新闻 GNews · 盘口 Polymarket（Gamma + CLOB）· AI DeepSeek

## 目录
```
src/
  app/
    page.tsx                  # 信息流首页（Server Component）
    news/[id]/page.tsx        # 新闻详情（id=市场 slug / 策划 id / 生成盘口 uuid）
    me/page.tsx               # 我的预测（持仓 + 历史 + 盈亏曲线 + 平仓）
    auth/callback/route.ts    # Google OAuth 回调
    actions.ts                # Server Action：无限分页 loadMoreFeed
    api/generate/route.ts     # AI 生成盘口（拉头条 → DeepSeek → 写库）
    api/resolve/route.ts      # AI 盘口到期结算（DeepSeek 判定 → 派分）
  components/
    NewsFeed / NewsCard       # 信息流（tab / 视频 / 社交 / 无限滚动）+ 卡片
    FeaturedRail / QuickBet   # 精选横滑卡 / feed 内一键下注
    FeedCard                  # 详情页完整可下注盘口（含 AI 盘口 AMM）
    ClosePositionButton       # 卖出/平仓
    YouTubeLite / PortfolioChart / AuthButton
    SettingsControl / Providers   # 主题+语言控件 / 全局 Provider
  lib/
    feed.ts                   # 统一信息流层（市场优先 + 缓存 + 无限分页 + 混入 AI 盘口）
    gnews.ts                  # GNews 客户端（查询清洗 + 429 重试 + 头条）
    polymarket.ts             # Polymarket Gamma/CLOB（含按成交量翻页）
    generated.ts / generate.ts / resolve.ts   # AI 盘口读取 / 生成 / 结算
    llm.ts                    # OpenAI 兼容 LLM 客户端（默认 DeepSeek）
    portfolio.ts / news.ts    # 组合市值序列 / 策划内容（回退）
    i18n-dict.ts / i18n.tsx / i18n-server.ts / theme.tsx   # 多语言 + 主题
    auth.ts / supabase/*      # 账户与会话
  middleware.ts               # Supabase 会话刷新（无 key 时放行）
supabase/
  schema.sql                  # profiles / bets / place_bet / 触发器
  generated_markets.sql       # 生成盘口表 + AMM + create/place_gen_bet/resolve RPC
  trading.sql                 # bets 平仓字段 + sell_bet RPC
vercel.json                   # 每日 cron：生成(08:00) / 结算(08:30)
```
