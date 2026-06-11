# AutoVote · 新闻预测信息流

把预测市场做成一条"刷新闻"的信息流，验证**信息流形态能否把预测市场带给更泛的用户**。
定位：`Surf AI（信息流 / AI 摘要）` × `Polymarket（预测市场概率）`，用**虚拟积分**而非真钱，把门槛压到「点一下表态」。

线上：https://auto-vote-eight.vercel.app/

## 战略定位与商业化路径

> 一句话：**AutoVote 是一家消费级新闻流的预测市场产品。

### 为什么是「新闻流」而非「预测市场」
两种定位存在取舍：
- **A · 真实预测市场的普及版** —— 赔率可信度第一，那个数字本身就是产品，必须真钱 + 流动性背书。
- **B · 带轻量预测玩法的新闻流** —— 参与感第一，赔率只是「点一下表态」的钩子，覆盖面与上瘾感优先。

冲突不在在三处：
①那个数字的**意义相反**（认知准确 vs 注意力诱饵）；
②**覆盖面与可信度成反比**（要本地/长尾内容就得制造盘口，违背 A 的可信度）；
③**不对称性 —— B 能诚实地容纳 A，A 却无法在不误导用户的前提下容纳 B**。叠加我们用的是**虚拟积分**（用户并未真正参与真钱市场，Polymarket 赔率只作「高质量内容」展示），方向其实早已偏向 B。

→ **我们选 B。**

### B 不是放弃 A，而是通往更大的 A
预测市场行业的真正瓶颈不是「能否抽水」，而是「有没有足够多的人来玩」。B 解决的正是这个：
- **B 是获客与留存层**；A 式的「对成交量抽水」是**将来叠加的变现层**。参考 Robinhood —— 把硬核交易做成消费级体验先触达大众，再靠订单流 / 融资 / 订阅变现。产品的「手感」（消费级新闻流）≠ 公司的「商业模式」（仍可是对市场抽水）。
- **虚拟积分是合规上坡口**：真钱预测市场强监管（牌照、KYC、各地封禁，尤其难覆盖韩越），虚拟积分让我们能全球、无牌照、快速验证并积累用户。商业化是**有意推迟**，不是缺失。

### 商业化：预留「缝」，不建「机器」
| 路径 | 预留形态 | 时点 |
|---|---|---|
| 导流返佣 | 「去真实市场」外链统一走**出站 choke-point**，将来一处接 ref 参数 + 计点击 | 中期，门槛最低 |
| 广告 / 赞助盘口 | feed 条目带 `source: organic / sponsored`，可在第 N 位注入；`FeaturedRail` 为高价位 | 需规模后 |
| 订阅 / Premium | AI 洞察、深度数据、去广告、组合分析 | 中期 |
| 数据 | 聚合情绪 / 预测数据对外 | 远期 |
| 真钱抽水 | 有量与流动性后，在同一套 UX 叠真钱层 → 真正成为 A | 终局 |

原则：**现在只在代码里留好低成本可接的接口，变现引擎等有量再建。**

### 现在唯一值得投入的「商业化」动作：漏斗埋点
`信息流曝光 → 点开卡片 → QuickBet 下注 → 出站到真实市场` 这条转化漏斗，一份数据同时服务两端：对**增长**，是验证「新闻流能否把泛用户转化为预测市场参与者」这一核心论点的唯一证据；对**变现**，是将来谈返佣分成与广告报价的筹码。

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
数据库 schema 依次执行：`supabase/schema.sql`（账户/下注）、`supabase/generated_markets.sql`（AI 盘口）、`supabase/trading.sql`（卖出/平仓）、`supabase/events.sql`（漏斗埋点）、`supabase/admin.sql`（运营后台）、`supabase/leaderboard.sql`（积分榜）。

埋点字段字典与漏斗 SQL 见 [`docs/analytics.md`](docs/analytics.md)。

**运营后台** `/admin`（仅管理员）：漏斗看板（访客→点开→下注→出站、真实 vs AI 盘口 CTR、事件计数、每日趋势、热门盘口）。设管理员：`update public.profiles set is_admin = true where email = '你的邮箱';`

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
    admin/                    # 运营后台（管理员）：layout 鉴权门 + 漏斗看板
    auth/callback/route.ts    # Google OAuth 回调
    actions.ts                # Server Action：无限分页 loadMoreFeed
    api/generate/route.ts     # AI 生成盘口（拉头条 → DeepSeek → 写库）
    api/resolve/route.ts      # AI 盘口到期结算（DeepSeek 判定 → 派分）
  components/
    NewsFeed / NewsCard       # 信息流（tab / 视频 / 社交 / 无限滚动）+ 卡片
    FeaturedRail / QuickBet   # 精选横滑卡 / feed 内一键下注
    RightRail                 # PC 右栏：积分榜 + 热门盘口（移动端不渲染）
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
    track.ts / outbound.ts    # 客户端漏斗埋点 / 出站返佣 choke-point
  middleware.ts               # Supabase 会话刷新 + 写入匿名 id（埋点 anon_id）
supabase/
  schema.sql                  # profiles / bets / place_bet / 触发器
  generated_markets.sql       # 生成盘口表 + AMM + create/place_gen_bet/resolve RPC
  trading.sql                 # bets 平仓字段 + sell_bet RPC
  events.sql                  # 漏斗埋点事件表（append-only + RLS）
  admin.sql                   # is_admin 标记 + admin_metrics 看板 RPC
  leaderboard.sql             # 积分榜 RPC（SECURITY DEFINER 绕过 profiles RLS）
docs/
  analytics.md                # 埋点字段字典 + 漏斗 SQL
vercel.json                   # 每日 cron：生成(08:00) / 结算(08:30)
```
