// 手工策划的新闻信息流（原型阶段）
// 每条新闻挂一个真实的 Polymarket 市场（marketSlug），盘口赔率在渲染时实时拉取。
// tldr 是「AI 摘要」的占位（M3 接入新闻源 + LLM 自动生成）。

export interface NewsVideo {
  youtubeId: string; // YouTube 视频 ID（真实、可嵌入）
  channel: string; // 频道名，信息流标注「视频 · 频道」
}

export interface NewsItem {
  id: string; // 路由用
  source: string; // 媒体名
  handle: string; // @账号
  category: string; // 政治 / 财经 / 加密 / 体育 / 科技
  headline: string; // 标题
  summary: string; // 信息流预览正文
  tldr: string[]; // 详情页 AI TL;DR 要点
  publishedAgo: string; // "2小时前"
  marketSlug: string; // 关联的 Polymarket event slug
  marketCategory: string; // 传给盘口卡的分类标签（Politics/Hot）
  originalUrl: string; // 原文来源
  video?: NewsVideo; // 有则信息流是视频卡，无则用市场配图
  likes: number; // 社交互动数（原型 mock）
  comments: number;
  generated?: boolean; // 是否为 AI 生成盘口（信息流加"AI 盘口"标记）
}

export const NEWS: NewsItem[] = [
  {
    id: "us-iran-peace-talks",
    source: "Reuters",
    handle: "@Reuters",
    category: "政治",
    headline: "美伊重启间接谈判，但「永久和平协议」前景仍存巨大分歧",
    summary:
      "据三名知情人士透露，美国与伊朗已通过阿曼斡旋重启间接谈判，焦点集中在制裁解除与铀浓缩上限。双方均称取得「有限进展」，但在核查机制上分歧依旧。",
    tldr: [
      "美伊通过阿曼斡旋重启间接谈判，议题是制裁解除 + 铀浓缩上限。",
      "双方称有「有限进展」，但核查机制仍是最大障碍。",
      "市场观点：年内达成「永久和平协议」的概率被押注者持续下调。",
      "关键变量是美国国内政治日程与以色列的态度。",
    ],
    publishedAgo: "2小时前",
    marketSlug: "us-x-iran-permanent-peace-deal-by",
    marketCategory: "Politics",
    originalUrl: "https://www.reuters.com",
    video: { youtubeId: "qTajkTgBvHk", channel: "Al Jazeera English" },
    likes: 2600,
    comments: 200,
  },
  {
    id: "iran-airspace",
    source: "Bloomberg",
    handle: "@business",
    category: "政治",
    headline: "地区紧张升级，多家航司绕飞伊朗领空",
    summary:
      "随着地区局势升温，包括汉莎、阿联酋航空在内的多家航司已调整航线绕飞伊朗领空。分析人士警告，一旦伊朗正式关闭领空，全球航油价格与航线成本将连锁上升。",
    tldr: [
      "多家国际航司已主动绕飞伊朗领空，航线成本上升。",
      "若伊朗正式关闭领空，将冲击全球航油与航运。",
      "市场观点：押注者对「短期内关闭领空」的概率分歧很大。",
    ],
    publishedAgo: "4小时前",
    marketSlug: "iran-closes-its-airspace-by",
    marketCategory: "Politics",
    originalUrl: "https://www.bloomberg.com",
    likes: 870,
    comments: 64,
  },
  {
    id: "fed-june",
    source: "Bloomberg",
    handle: "@markets",
    category: "财经",
    headline: "通胀降温但就业仍强，6 月美联储大概率按兵不动",
    summary:
      "最新 CPI 与非农数据释放出矛盾信号：通胀继续回落，但劳动力市场依旧紧俏。多数交易员据此押注美联储在 6 月会议上维持利率不变，把首次降息预期推后。",
    tldr: [
      "最新 CPI 回落、非农依旧强劲，信号矛盾。",
      "多数交易员押注 6 月维持利率不变。",
      "市场观点：「不变」是绝对主流，降息预期被推后。",
      "鲍威尔记者会措辞将决定下半年路径。",
    ],
    publishedAgo: "6小时前",
    marketSlug: "fed-decision-in-june-825",
    marketCategory: "Hot",
    originalUrl: "https://www.bloomberg.com",
    video: { youtubeId: "KtkIzI5nqTE", channel: "Yahoo Finance" },
    likes: 1500,
    comments: 132,
  },
  {
    id: "peru-election",
    source: "Associated Press",
    handle: "@AP",
    category: "政治",
    headline: "秘鲁大选进入冲刺，藤森惠子民调大幅领先",
    summary:
      "距秘鲁总统大选不到一个月，藤森惠子在多家机构民调中保持两位数领先优势。其竞争对手仍在争夺反对派选民，选情是否会在最后阶段收窄成为焦点。",
    tldr: [
      "藤森惠子在主流民调中两位数领先。",
      "反对派选票分散，尚未形成有力挑战者。",
      "市场观点：押注者给藤森惠子的胜率极高。",
      "变数在于最后阶段的弃保与投票率。",
    ],
    publishedAgo: "8小时前",
    marketSlug: "peru-presidential-election-winner",
    marketCategory: "Politics",
    originalUrl: "https://apnews.com",
    likes: 540,
    comments: 48,
  },
  {
    id: "world-cup",
    source: "ESPN",
    handle: "@ESPNFC",
    category: "体育",
    headline: "2026 世界杯夺冠赔率出炉，多支豪门并列热门",
    summary:
      "随着 2026 世界杯临近，博彩与预测市场上夺冠热门高度集中。卫冕与新生代球队赔率咬得很紧，没有任何一支队伍拥有压倒性优势，被视为近年最开放的一届。",
    tldr: [
      "多支豪门夺冠赔率接近，无压倒性热门。",
      "被视为近年最开放的一届世界杯。",
      "市场观点：头部几支球队胜率胶着，分歧大。",
    ],
    publishedAgo: "10小时前",
    marketSlug: "world-cup-winner",
    marketCategory: "Hot",
    originalUrl: "https://www.espn.com",
    video: { youtubeId: "R9wzwNlQzow", channel: "CBS Sports" },
    likes: 3400,
    comments: 287,
  },
  {
    id: "bitcoin-june",
    source: "CoinDesk",
    handle: "@CoinDesk",
    category: "加密",
    headline: "比特币 6 月高位震荡，多空围绕关键价位激烈博弈",
    summary:
      "比特币本月在高位区间反复拉锯，ETF 资金流与宏观利率预期成为主导变量。交易员对月内能否突破上方关键阻力意见分裂，期权市场隐含波动率明显抬升。",
    tldr: [
      "BTC 高位震荡，ETF 资金流 + 利率预期主导。",
      "对月内能否突破关键价位，交易员分歧明显。",
      "市场观点：不同价位档的押注分布很分散。",
      "期权隐含波动率抬升，预示大行情临近。",
    ],
    publishedAgo: "12小时前",
    marketSlug: "what-price-will-bitcoin-hit-in-june-2026",
    marketCategory: "Hot",
    originalUrl: "https://www.coindesk.com",
    video: { youtubeId: "OFedWhCN9DM", channel: "Crypto Analysis" },
    likes: 1900,
    comments: 156,
  },
  {
    id: "nba-champion",
    source: "The Athletic",
    handle: "@TheAthletic",
    category: "体育",
    headline: "NBA 季后赛白热化，夺冠概率随系列赛剧烈波动",
    summary:
      "随着季后赛深入，预测市场上的夺冠概率随每场系列赛大幅跳动。伤病、主场优势与教练调整成为左右盘口的关键因素，头部种子之间的差距正在收窄。",
    tldr: [
      "季后赛深入，夺冠概率随系列赛剧烈波动。",
      "伤病、主场、临场调整是关键变量。",
      "市场观点：头部球队胜率差距正在收窄。",
    ],
    publishedAgo: "14小时前",
    marketSlug: "2026-nba-champion",
    marketCategory: "Hot",
    originalUrl: "https://www.nytimes.com/athletic",
    video: { youtubeId: "HwceS3VfDYQ", channel: "CBS Sports" },
    likes: 2200,
    comments: 198,
  },
  {
    id: "spacex-ipo",
    source: "TechCrunch",
    handle: "@TechCrunch",
    category: "科技",
    headline: "SpaceX 上市传闻再起，估值预期成市场最大悬念",
    summary:
      "围绕 SpaceX 潜在 IPO 的讨论再度升温，星链业务的现金流被视为估值核心。投资者对其上市时收盘市值的预期跨度巨大，从数千亿到万亿美元不等。",
    tldr: [
      "SpaceX IPO 传闻升温，星链现金流是估值核心。",
      "市场对上市收盘市值预期跨度极大。",
      "市场观点：各市值档位的押注高度分散。",
      "实际时间表仍未确定，存在较大不确定性。",
    ],
    publishedAgo: "16小时前",
    marketSlug: "spacex-ipo-closing-market-cap-above",
    marketCategory: "Hot",
    originalUrl: "https://techcrunch.com",
    likes: 1100,
    comments: 89,
  },
  {
    id: "france-2027",
    source: "Le Monde",
    handle: "@lemondefr",
    category: "政治",
    headline: "法国 2027 大选提前升温，多名重量级人物角力",
    summary:
      "尽管投票仍在数年之后，法国 2027 年总统大选的潜在人选已开始公开角力。极右、中间派与左翼阵营的代表人物在民调中你追我赶，格局远未明朗。",
    tldr: [
      "法国 2027 大选潜在人选提前角力。",
      "极右、中间派、左翼代表民调胶着。",
      "市场观点：领跑者优势不稳，押注分散。",
    ],
    publishedAgo: "18小时前",
    marketSlug: "next-french-presidential-election",
    marketCategory: "Politics",
    originalUrl: "https://www.lemonde.fr",
    likes: 430,
    comments: 37,
  },
  {
    id: "dem-2028",
    source: "Politico",
    handle: "@politico",
    category: "政治",
    headline: "2028 民主党提名暗流涌动，潜在人选阵容空前拥挤",
    summary:
      "距 2028 还有数年，但民主党潜在提名人的暗中布局已经开始。多位州长、参议员与新生代人物进入讨论，预测市场上的领跑者位置频繁易主。",
    tldr: [
      "2028 民主党提名潜在人选阵容拥挤。",
      "州长、参议员、新生代人物均在讨论中。",
      "市场观点：领跑者频繁易主，无稳定热门。",
    ],
    publishedAgo: "1天前",
    marketSlug: "democratic-presidential-nominee-2028",
    marketCategory: "Politics",
    originalUrl: "https://www.politico.com",
    likes: 760,
    comments: 92,
  },
];

export function getNewsById(id: string): NewsItem | undefined {
  return NEWS.find((n) => n.id === id);
}

// 信息流分类 tab（推荐 = 全部）
export const NEWS_TABS = ["推荐", "政治", "财经", "加密", "体育", "科技"] as const;
