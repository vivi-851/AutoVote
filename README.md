# AutoVote · 预测信息流原型

把预测市场做成一条"刷新闻"的信息流，验证**信息流形态能否把预测市场带给更泛的用户**。
定位：`Surf AI（信息流/AI 摘要）` × `Polymarket（预测市场概率与结算）`，但用**虚拟积分**而非真钱，把门槛压到「点一下表态」。

## 当前进度：Milestone 1 ✅（能看：信息流跑通）

- 接入 **Polymarket Gamma API**（只读），拉取**政治 + 泛热点**事件
- 信息流卡片页：标题 / 配图 / 分类 / 成交量 / 截止时间 / 当前市场概率
- 一键预测交互（二元 Yes/No 与多选项两种形态），M1 先做即时反馈
- 数据每 5 分钟缓存刷新

### Roadmap
| 阶段 | 目标 | 状态 |
|---|---|---|
| **M1** | 能看：信息流静态跑通 | ✅ 完成 |
| **M2** | 能玩：Google 登录 + 虚拟积分 + 一键下注 + 我的预测页 | ⬜ 下一步 |
| **M3** | 能活：新闻源 + 语义匹配 + AI 生成卡片文案，定时刷新 | ⬜ |
| **M4** | 能验证：埋点（曝光→预测点击率、人均预测、回访）+ 小范围实测 | ⬜ |

## 技术栈
Next.js 16（App Router）· TypeScript · Tailwind · 部署 Vercel
后续：Supabase（Auth + Postgres）做积分账户、Claude API 做新闻-市场匹配。

## 本地运行

```bash
npm install
npm run dev          # 实时拉 Polymarket（需可访问 gamma-api.polymarket.com）
npm run dev:fixture  # 离线/演示模式，读 src/lib/_fixtures 的真实数据快照
npm run build        # 生产构建
```

打开 http://localhost:3000

> `src/lib/_fixtures/*.json` 是 Polymarket 真实数据的快照，用于离线开发与演示，可能过期。
> 生产环境走实时 API（首页为 `force-dynamic` 动态渲染，fetch 层缓存 5 分钟）。

## 部署到 Vercel
1. Import 本仓库
2. Framework 自动识别为 Next.js，无需额外配置（M1 无需环境变量）
3. Deploy

## 目录
```
src/
  app/page.tsx              # 信息流首页（Server Component，请求时取数据）
  components/FeedCard.tsx    # 信息流卡片（Client Component，一键预测交互）
  lib/polymarket.ts          # Polymarket Gamma API 数据层 + 卡片转换
  lib/_fixtures/             # 真实数据快照（离线/演示用）
```
