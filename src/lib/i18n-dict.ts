// 多语言字典（以中文原文为 key）。纯数据，服务端/客户端共用。
export type Lang = "zh" | "en" | "ko" | "vi";

export const LANGS: { code: Lang; label: string }[] = [
  { code: "zh", label: "中文" },
  { code: "en", label: "English" },
  { code: "ko", label: "한국어" },
  { code: "vi", label: "Tiếng Việt" },
];

type Tr = Partial<Record<Exclude<Lang, "zh">, string>>;
export const DICT: Record<string, Tr> = {
  "新闻预测信息流": { en: "News × Predictions", ko: "뉴스 예측 피드", vi: "Tin tức × Dự đoán" },
  "今日要闻": { en: "Today's Headlines", ko: "오늘의 뉴스", vi: "Tin nổi bật" },
  "读新闻，顺手看看市场怎么押注 —— 你怎么看？": {
    en: "Read the news, see how the market bets — what's your call?",
    ko: "뉴스를 보고 시장의 베팅을 확인하세요 — 당신의 예측은?",
    vi: "Đọc tin, xem thị trường đặt cược — bạn nghĩ sao?",
  },
  "精选热点": { en: "Featured", ko: "추천 핫이슈", vi: "Nổi bật" },
  "市场在热押的几条": { en: "What the market is betting on", ko: "시장이 주목하는 이슈", vi: "Thị trường đang chú ý" },
  "AI 速读": { en: "AI brief", ko: "AI 요약", vi: "AI tóm tắt" },
  "加载更多": { en: "Load more", ko: "더 보기", vi: "Tải thêm" },
  "加载中…": { en: "Loading…", ko: "불러오는 중…", vi: "Đang tải…" },
  "没有更多了": { en: "No more", ko: "더 이상 없음", vi: "Hết rồi" },
  "该分类暂时没有内容": { en: "Nothing in this category yet", ko: "이 카테고리에 콘텐츠가 없습니다", vi: "Chưa có nội dung" },

  // 分类
  "推荐": { en: "For You", ko: "추천", vi: "Dành cho bạn" },
  "政治": { en: "Politics", ko: "정치", vi: "Chính trị" },
  "财经": { en: "Finance", ko: "경제", vi: "Tài chính" },
  "加密": { en: "Crypto", ko: "암호화폐", vi: "Tiền mã hóa" },
  "体育": { en: "Sports", ko: "스포츠", vi: "Thể thao" },
  "科技": { en: "Tech", ko: "기술", vi: "Công nghệ" },
  "热点": { en: "Trending", ko: "이슈", vi: "Xu hướng" },

  // 卡片 / 盘口
  "AI 盘口": { en: "AI market", ko: "AI 마켓", vi: "Thị trường AI" },
  "分享": { en: "Share", ko: "공유", vi: "Chia sẻ" },
  "相关盘口": { en: "Related market", ko: "관련 마켓", vi: "Thị trường liên quan" },
  "会发生": { en: "Yes", ko: "예", vi: "Có" },
  "不会": { en: "No", ko: "아니오", vi: "Không" },
  "查看完整盘口并表态 →": { en: "Open full market →", ko: "전체 마켓 보기 →", vi: "Xem thị trường →" },
  "完整盘口 →": { en: "Full market →", ko: "전체 마켓 →", vi: "Thị trường →" },
  "去加注 →": { en: "Add more →", ko: "추가 베팅 →", vi: "Đặt thêm →" },
  "登录后可一键表态": { en: "Sign in to bet in one tap", ko: "로그인 후 한 번에 베팅", vi: "Đăng nhập để đặt cược" },
  "点上方选项一键下注": { en: "Tap an option above to bet", ko: "위 옵션을 눌러 베팅", vi: "Chạm để đặt cược" },
  "点选项即可登录并下注": { en: "Tap an option to sign in & bet", ko: "옵션을 눌러 로그인·베팅", vi: "Chạm để đăng nhập & cược" },
  "积分不足": { en: "Not enough points", ko: "포인트 부족", vi: "Không đủ điểm" },
  "下注失败": { en: "Bet failed", ko: "베팅 실패", vi: "Đặt cược thất bại" },

  // 登录
  "Google 登录": { en: "Sign in with Google", ko: "Google 로그인", vi: "Đăng nhập Google" },
  "登录（待配置）": { en: "Sign in (setup pending)", ko: "로그인 (설정 대기)", vi: "Đăng nhập (chưa cấu hình)" },
  "我的预测": { en: "My Predictions", ko: "내 예측", vi: "Dự đoán của tôi" },
  "退出登录": { en: "Sign out", ko: "로그아웃", vi: "Đăng xuất" },
  "分": { en: " pts", ko: "P", vi: " điểm" },

  // 详情页
  "返回": { en: "Back", ko: "뒤로", vi: "Quay lại" },
  "新闻详情": { en: "Article", ko: "기사", vi: "Bài viết" },
  "查看原文 ↗": { en: "Read original ↗", ko: "원문 보기 ↗", vi: "Đọc gốc ↗" },
  "AI 摘要": { en: "AI summary", ko: "AI 요약", vi: "AI tóm tắt" },
  "相关预测市场": { en: "Related prediction market", ko: "관련 예측 마켓", vi: "Thị trường dự đoán" },
  "盘口暂不可用": { en: "Market unavailable", ko: "마켓 이용 불가", vi: "Không có thị trường" },
  "你怎么看？点一下用积分表态": { en: "What's your call? Tap to bet points", ko: "예측은? 눌러서 베팅", vi: "Bạn nghĩ sao? Chạm để cược" },
  "来源 ↗": { en: "Source ↗", ko: "출처 ↗", vi: "Nguồn ↗" },
  "确认下注": { en: "Confirm bet", ko: "베팅 확인", vi: "Xác nhận" },
  "下注中…": { en: "Betting…", ko: "베팅 중…", vi: "Đang cược…" },

  // 我的预测
  "可用积分": { en: "Available points", ko: "사용 가능 포인트", vi: "Điểm khả dụng" },
  "持仓本金": { en: "Cost basis", ko: "투자 원금", vi: "Vốn" },
  "当前市值": { en: "Current value", ko: "현재 가치", vi: "Giá trị hiện tại" },
  "浮动盈亏": { en: "Unrealized P&L", ko: "평가 손익", vi: "Lãi/lỗ tạm tính" },
  "持仓市值走势（近一月）": { en: "Holdings value (past month)", ko: "보유 가치 추이 (한 달)", vi: "Giá trị danh mục (1 tháng)" },
  "成本线": { en: "Cost line", ko: "원가선", vi: "Đường vốn" },
  "持仓": { en: "Holdings", ko: "보유", vi: "Danh mục" },
  "历史": { en: "History", ko: "내역", vi: "Lịch sử" },
  "暂无持仓 —— 回信息流挑条新闻表个态吧": {
    en: "No holdings — go pick a story and place a bet",
    ko: "보유 없음 — 피드에서 베팅해 보세요",
    vi: "Chưa có — quay lại đặt cược nào",
  },
  "查看盘口 →": { en: "View market →", ko: "마켓 보기 →", vi: "Xem thị trường →" },
  "查看原新闻 →": { en: "View article →", ko: "기사 보기 →", vi: "Xem bài →" },
  "现": { en: "now ", ko: "현재 ", vi: "nay " },
  "待更新": { en: "updating", ko: "업데이트 중", vi: "đang cập nhật" },
  "已结算": { en: "Settled", ko: "정산됨", vi: "Đã quyết toán" },
  "已平仓": { en: "Closed", ko: "청산됨", vi: "Đã đóng" },
  "平仓": { en: "Close", ko: "청산", vi: "Đóng" },
  "取消": { en: "Cancel", ko: "취소", vi: "Hủy" },
  "平仓中…": { en: "Closing…", ko: "청산 중…", vi: "Đang đóng…" },
  "平仓失败": { en: "Close failed", ko: "청산 실패", vi: "Đóng thất bại" },
  "登录后查看你的预测与积分": { en: "Sign in to see your predictions & points", ko: "로그인하여 예측·포인트 확인", vi: "Đăng nhập để xem dự đoán & điểm" },
  "账户系统待接入 Supabase 后开放": { en: "Accounts open after Supabase is connected", ko: "Supabase 연결 후 계정 제공", vi: "Tài khoản mở sau khi kết nối Supabase" },
  "评论": { en: "Comments", ko: "댓글", vi: "Bình luận" },
  "评论与发帖将在 M2 接入真实账户后开放": {
    en: "Comments open after real accounts are connected",
    ko: "실계정 연결 후 댓글 제공",
    vi: "Bình luận mở sau khi có tài khoản thật",
  },

  // 每日奖励 / 任务
  "每日奖励": { en: "Daily Rewards", ko: "데일리 보상", vi: "Thưởng mỗi ngày" },
  "连续": { en: "Streak", ko: "연속", vi: "Chuỗi" },
  "天": { en: "d", ko: "일", vi: "ngày" },
  "签到": { en: "Check in", ko: "출석", vi: "Điểm danh" },
  "签到领": { en: "Check in +", ko: "출석 +", vi: "Điểm danh +" },
  "已签到": { en: "Checked in", ko: "출석 완료", vi: "Đã điểm danh" },
  "签到成功": { en: "Checked in!", ko: "출석 완료!", vi: "Đã điểm danh!" },
  "今日任务": { en: "Today's Quests", ko: "오늘의 미션", vi: "Nhiệm vụ hôm nay" },
  "阅读": { en: "Read", ko: "읽기", vi: "Đọc" },
  "表态": { en: "Vote", ko: "베팅", vi: "Đặt cược" },
  "领取": { en: "Claim", ko: "받기", vi: "Nhận" },
  "任务全清": { en: "All quests done!", ko: "미션 완료!", vi: "Hoàn thành!" },
  "阅读奖励": { en: "Read reward", ko: "읽기 보상", vi: "Thưởng đọc" },

  // 战绩榜
  "战绩榜": { en: "Top Predictors", ko: "랭킹", vi: "Bảng thành tích" },
  "胜率": { en: "Win", ko: "승률", vi: "Thắng" },
  "注": { en: " bets", ko: "건", vi: " cược" },
  "暂未结算": { en: "Unsettled", ko: "미정산", vi: "Chưa quyết toán" },

  // 排行榜页 / 赛季
  "排行榜": { en: "Leaderboard", ko: "랭킹", vi: "Bảng xếp hạng" },
  "本赛季": { en: "This Season", ko: "이번 시즌", vi: "Mùa này" },
  "总榜": { en: "All-time", ko: "전체", vi: "Mọi thời" },
  "当前赛季": { en: "Current season", ko: "현재 시즌", vi: "Mùa hiện tại" },
  "截止": { en: "Ends", ko: "종료", vi: "Kết thúc" },
  "名人堂": { en: "Hall of Fame", ko: "명예의 전당", vi: "Vinh danh" },
  "按已实现盈亏（PnL）排名 · 赢家才上榜": {
    en: "Ranked by realized PnL · winners only",
    ko: "실현 손익(PnL) 순 · 승자만",
    vi: "Xếp theo PnL đã chốt · chỉ người thắng",
  },
  "暂无战绩，去表个态": { en: "No record yet — go make a call", ko: "기록 없음 — 베팅해 보세요", vi: "Chưa có — đặt cược nào" },
  "本赛季盈亏": { en: "Season P&L", ko: "시즌 손익", vi: "Lãi/lỗ mùa" },
  "看榜": { en: "View", ko: "랭킹 보기", vi: "Xem bảng" },

  // 每日任务页 / 等级
  "每日任务": { en: "Daily Quests", ko: "데일리 미션", vi: "Nhiệm vụ" },
  "每日签到": { en: "Daily check-in", ko: "데일리 출석", vi: "Điểm danh" },
  "登录后赚积分、做任务、冲榜": {
    en: "Sign in to earn points, do quests, climb the board",
    ko: "로그인하고 포인트·미션·랭킹에 도전",
    vi: "Đăng nhập để kiếm điểm, làm nhiệm vụ, leo hạng",
  },
  "距下一级还需": { en: "to next level:", ko: "다음 레벨까지", vi: "lên cấp cần" },
  "每日阅读上限": { en: "Daily read cap", ko: "일일 읽기 한도", vi: "Đọc tối đa/ngày" },
  "篇": { en: "", ko: "개", vi: "" },
  "签到加成": { en: "Check-in bonus", ko: "출석 보너스", vi: "Thưởng điểm danh" },
  "AI 新盘口抢先看": { en: "Early AI markets", ko: "AI 신규 마켓 우선", vi: "Xem sớm thị trường AI" },
  "专属头像光环": { en: "Avatar halo", ko: "프로필 후광", vi: "Vầng hào quang" },
  "积分明细": { en: "Points history", ko: "포인트 내역", vi: "Lịch sử điểm" },
  "赛季奖励": { en: "Season reward", ko: "시즌 보상", vi: "Thưởng mùa" },
  "下注": { en: "Bet", ko: "베팅", vi: "Đặt cược" },

  // 等级称号
  "新人": { en: "Rookie", ko: "초보", vi: "Tân binh" },
  "入门玩家": { en: "Beginner", ko: "입문자", vi: "Người mới" },
  "进阶玩家": { en: "Rising", ko: "중급자", vi: "Đang lên" },
  "老练玩家": { en: "Seasoned", ko: "숙련자", vi: "Lão luyện" },
  "大师": { en: "Master", ko: "마스터", vi: "Cao thủ" },
  "宗师": { en: "Grandmaster", ko: "그랜드마스터", vi: "Đại sư" },
  "预言家": { en: "Oracle", ko: "예언자", vi: "Nhà tiên tri" },

  // 段位说明（hover）
  "段位说明": { en: "Tiers", ko: "등급 안내", vi: "Hạng bậc" },
  "悬停查看": { en: "hover for details", ko: "마우스를 올려 확인", vi: "di chuột để xem" },
  "起": { en: "+", ko: " 이상", vi: " trở lên" },
  "刚起步 · 每日阅读上限 3 篇": {
    en: "Just starting · 3 reads/day",
    ko: "시작 단계 · 하루 3개 읽기",
    vi: "Mới bắt đầu · 3 bài/ngày",
  },
  "解锁签到等级加成，越签越多": {
    en: "Unlocks check-in level bonus",
    ko: "출석 레벨 보너스 해제",
    vi: "Mở thưởng điểm danh theo cấp",
  },
  "稳定参与 · 签到加成持续提升": {
    en: "Steady play · bigger check-in bonus",
    ko: "꾸준한 참여 · 출석 보너스 증가",
    vi: "Chơi đều · thưởng điểm danh tăng",
  },
  "每日阅读上限 4 篇 · AI 新盘口抢先看": {
    en: "4 reads/day · early AI markets",
    ko: "하루 4개 읽기 · AI 신규 마켓 우선",
    vi: "4 bài/ngày · xem sớm thị trường AI",
  },
  "每日阅读上限 5 篇 · 专属头像光环": {
    en: "5 reads/day · avatar halo",
    ko: "하루 5개 읽기 · 프로필 후광",
    vi: "5 bài/ngày · vầng hào quang",
  },
  "每日阅读上限 6 篇 · 顶尖战绩象征": {
    en: "6 reads/day · elite status",
    ko: "하루 6개 읽기 · 최상위 상징",
    vi: "6 bài/ngày · biểu tượng đỉnh cao",
  },
  "最高段位 · 预测之王": {
    en: "Top tier · king of predictions",
    ko: "최고 등급 · 예측의 왕",
    vi: "Hạng cao nhất · vua dự đoán",
  },

  // 设置
  "浅色": { en: "Light", ko: "라이트", vi: "Sáng" },
  "深色": { en: "Dark", ko: "다크", vi: "Tối" },
  "跟随系统": { en: "System", ko: "시스템", vi: "Hệ thống" },
  "主题": { en: "Theme", ko: "테마", vi: "Giao diện" },
  "语言": { en: "Language", ko: "언어", vi: "Ngôn ngữ" },
};

export function translate(zh: string, lang: Lang): string {
  if (lang === "zh") return zh;
  return DICT[zh]?.[lang] ?? zh;
}
