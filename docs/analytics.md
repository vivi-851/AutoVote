# 埋点字段字典与漏斗

AutoVote 的转化漏斗埋点。建表见 [`supabase/events.sql`](../supabase/events.sql)，写入逻辑见 [`src/lib/track.ts`](../src/lib/track.ts)。

> 一份数据，两个用途：**增长** —— 验证「新闻流能否把泛用户转化为预测市场参与者」；**变现** —— 将来谈返佣分成 / 广告报价的筹码。详见 README「战略定位与商业化路径」。

## 身份标识

| 标识 | 来源 | 生命周期 | 用途 |
|---|---|---|---|
| `anon_id` | cookie `av_anon`（middleware 首次访问写入，1 年） | 跨会话、跨登录态 | 漏斗顶端（未登录）也能追踪；登录后用同一 anon_id 把匿名行为接到 user_id |
| `session_id` | sessionStorage `av_session` | 单次浏览会话（关标签即失效） | 会话内去重、按会话聚合 |
| `user_id` | 服务端 `auth.uid()`，由触发器写入 | 登录后 | 关联用户/下注/积分；客户端无法伪造 |

## 事件类型（event_type）

漏斗主干 ④ + 辅助若干。每行额外带 `anon_id / session_id / user_id / path / created_at`。

| event_type | 触发时机 | 关键字段 |
|---|---|---|
| `feed_impression` | 信息流卡片**首次进入视口**（每会话每卡去重，批量上报） | `market_id` `market_kind` `source` `position` |
| `card_open` | 点开新闻详情页 | `market_id` `market_kind` `source` `position` |
| `quickbet` | 下注**成功**（feed 内一键 / 详情页完整盘口） | `market_id` `market_kind` `props.side` `props.stake` `props.placement` |
| `outbound_market` | 点击「去真实市场」外链（返佣 choke-point） | `market_id` `market_kind` `props.target` |
| `signin_click` | 点击 Google 登录（跳转前） | `props.from` |
| `load_more` | 信息流向服务端加载下一页 | `props.pm_offset` `props.gen_offset` |

## 字段取值

| 字段 | 取值 | 说明 |
|---|---|---|
| `market_id` | Polymarket slug / 生成盘口 uuid | 等于 `news.id`，是跨事件 join 的主键 |
| `market_kind` | `polymarket` `generated` `sponsored` | 真实盘口 / AI 生成盘口 / 赞助盘口（预留） |
| `source` | `organic` `sponsored` | 自然内容 / 广告位（预留） |
| `position` | 整数 | 卡片在信息流中的位次（0 起） |
| `props.side` | `yes` `no` / 选项名 | 下注方向 |
| `props.stake` | 整数 | 下注积分 |
| `props.placement` | `feed` `detail` | 下注发生在信息流内还是详情页 |
| `props.from` | `quickbet` `feedcard` `header` | 登录是从哪触发的 |
| `props.target` | url | 外链目标 |

## 漏斗查询（Supabase SQL Editor）

### 总漏斗（近 7 天，按 anon_id 去重的访客漏斗）
```sql
with f as (
  select anon_id,
    max((event_type='feed_impression')::int) as impressed,
    max((event_type='card_open')::int)       as opened,
    max((event_type='quickbet')::int)        as bet,
    max((event_type='outbound_market')::int) as outbound
  from public.events
  where created_at > now() - interval '7 days' and anon_id is not null
  group by anon_id
)
select
  count(*)                              as visitors,
  sum(impressed)                        as saw_feed,
  sum(opened)                           as opened_detail,
  sum(bet)                              as placed_bet,
  sum(outbound)                         as went_to_market,
  round(100.0*sum(opened)/nullif(sum(impressed),0),1)  as open_rate_pct,
  round(100.0*sum(bet)/nullif(sum(opened),0),1)        as bet_rate_pct,
  round(100.0*sum(outbound)/nullif(sum(bet),0),1)      as outbound_rate_pct
from f;
```

### 曝光→点开 CTR：按盘口类型拆（真实盘口 vs AI 盘口哪个更抓人）
```sql
select market_kind,
  count(*) filter (where event_type='feed_impression') as impressions,
  count(*) filter (where event_type='card_open')       as opens,
  round(100.0*count(*) filter (where event_type='card_open')
        / nullif(count(*) filter (where event_type='feed_impression'),0),1) as ctr_pct
from public.events
where created_at > now() - interval '7 days'
group by market_kind order by impressions desc;
```

### 下注量与下注额分布
```sql
select market_kind, props->>'placement' as placement,
  count(*) as bets, sum((props->>'stake')::int) as total_stake
from public.events
where event_type='quickbet' and created_at > now() - interval '7 days'
group by 1,2 order by bets desc;
```

## 隐私

- 仅采集行为事件，不采集 PII；`anon_id`/`session_id` 为随机 id。
- `events` 表只写不读（无 select 策略），原始行不经 API 暴露。
- 暂不引入 Google Analytics —— 领域漏斗靠自建 `events`；GA 适合将来做获客渠道归因时再加，二者互补不替代。
