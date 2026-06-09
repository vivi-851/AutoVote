import { getFeed } from "@/lib/polymarket";
import FeedCard from "@/components/FeedCard";

// 信息流在请求时渲染（数据来自 Polymarket，不在构建时预取）
export const dynamic = "force-dynamic";

export default async function Home() {
  const cards = await getFeed();

  return (
    <main className="min-h-full bg-[#fafafa]">
      {/* 顶部栏 */}
      <header className="sticky top-0 z-10 backdrop-blur bg-white/80 border-b border-black/5">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg tracking-tight">AutoVote</span>
            <span className="text-xs text-gray-400">预测信息流</span>
          </div>
          <span className="text-xs text-gray-400">虚拟积分 · 跟随 Polymarket</span>
        </div>
      </header>

      {/* 信息流 */}
      <div className="max-w-xl mx-auto px-4 py-5">
        <div className="mb-4">
          <h1 className="text-xl font-bold text-gray-900">今天大家在预测什么</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            刷新闻顺手表个态，看看你和市场谁更准
          </p>
        </div>

        {cards.length === 0 ? (
          <div className="text-center text-gray-400 py-20 text-sm">
            暂时拉不到市场数据，稍后再试
          </div>
        ) : (
          <div className="space-y-3">
            {cards.map((card) => (
              <FeedCard key={card.id} card={card} />
            ))}
          </div>
        )}
      </div>

      <footer className="max-w-xl mx-auto px-4 pb-10 pt-2 text-center text-xs text-gray-300">
        原型 · Milestone 1 · 数据来自 Polymarket Gamma API
      </footer>
    </main>
  );
}
