import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { supabaseEnabled } from "@/lib/supabase/env";
import { getProfile } from "@/lib/auth";
import { getMarketsBySlugs } from "@/lib/polymarket";
import { buildPortfolioSeries, type Position } from "@/lib/portfolio";
import { getGenMarketsByIds, genPriceYes } from "@/lib/generated";
import AuthButton from "@/components/AuthButton";
import SettingsControl from "@/components/SettingsControl";
import PortfolioChart from "@/components/PortfolioChart";
import ClosePositionButton from "@/components/ClosePositionButton";
import { getServerT } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

type T = (zh: string) => string;

interface BetRow {
  id: string;
  news_id: string | null;
  market_slug: string | null;
  market_title: string | null;
  outcome_label: string;
  outcome_market_id: string;
  entry_price: number;
  stake: number;
  shares: number;
  created_at: string;
  gen_market_id: string | null;
  closed: boolean;
  exit_price: number | null;
  proceeds: number | null;
}

function Shell({ t, children }: { t: T; children: React.ReactNode }) {
  return (
    <main className="min-h-full bg-background">
      <header className="sticky top-0 z-10 backdrop-blur bg-white/80 dark:bg-gray-900/80 border-b border-black/5 dark:border-white/10">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/" className="text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white text-sm flex items-center gap-1">
            <span className="text-lg leading-none">‹</span> {t("返回")}
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <SettingsControl />
            <span className="text-xs text-gray-400 ml-1">{t("我的预测")}</span>
          </div>
        </div>
      </header>
      <div className="max-w-xl mx-auto px-4 py-5">{children}</div>
    </main>
  );
}

export default async function MyPredictions() {
  const { t } = await getServerT();
  if (!supabaseEnabled) {
    return (
      <Shell t={t}>
        <div className="text-center text-gray-400 py-20 text-sm">
          {t("账户系统待接入 Supabase 后开放")}
        </div>
      </Shell>
    );
  }

  const profile = await getProfile();
  if (!profile) {
    return (
      <Shell t={t}>
        <div className="text-center py-20">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t("登录后查看你的预测与积分")}</p>
          <AuthButton profile={null} enabled={supabaseEnabled} />
        </div>
      </Shell>
    );
  }

  const supabase = await createClient();
  const { data } = await supabase!
    .from("bets")
    .select("*")
    .order("created_at", { ascending: false });
  const bets = (data ?? []) as BetRow[];

  // 拉所有相关市场的当前价，做实时浮动盈亏
  const slugs = [...new Set(bets.map((b) => b.market_slug).filter((s): s is string => !!s))];
  const genIds = [...new Set(bets.map((b) => b.gen_market_id).filter((s): s is string => !!s))];
  const [markets, genMarkets] = await Promise.all([
    getMarketsBySlugs(slugs),
    getGenMarketsByIds(genIds),
  ]);

  const rows = bets.map((b) => {
    const detailId = b.gen_market_id ?? b.news_id ?? b.market_slug ?? null;
    const generated = !!b.gen_market_id;

    // 已平仓：用退出价/到账兑现
    if (b.closed) {
      const value = b.proceeds ?? 0;
      return {
        ...b, detailId, generated, curPrice: b.exit_price ?? b.entry_price,
        value, pnl: value - b.stake, live: true, clobTokenId: "",
        resolved: false, isClosed: true,
      };
    }

    // AI 生成盘口：当前价从池子算；已结算则按输赢计值
    if (b.gen_market_id) {
      const gm = genMarkets.get(b.gen_market_id);
      const isYes = b.outcome_label.toLowerCase() === "yes";
      let curPrice = b.entry_price;
      let resolved = false;
      let value = b.shares * b.entry_price;
      if (gm) {
        const py = genPriceYes(gm);
        curPrice = isYes ? py : 1 - py;
        if (gm.status === "resolved") {
          resolved = true;
          const won = gm.outcome === (isYes ? "yes" : "no");
          value = won ? b.shares : 0;
        } else {
          value = b.shares * curPrice;
        }
      }
      return { ...b, detailId, generated, curPrice, value, pnl: value - b.stake, live: !!gm, clobTokenId: "", resolved, isClosed: false };
    }

    const market = markets.get(b.market_slug ?? "") ?? null;
    const outcome =
      market?.outcomes.find(
        (o) => o.marketId === b.outcome_market_id && o.label === b.outcome_label,
      ) ?? null;
    const current = outcome?.probability ?? null;
    const curPrice = current ?? b.entry_price;
    const value = b.shares * curPrice;
    return { ...b, detailId, generated, curPrice, value, pnl: value - b.stake, live: current !== null, clobTokenId: outcome?.clobTokenId ?? "", resolved: false, isClosed: false };
  });

  // 当前持仓（活跃）vs 历史（已平仓 / 已结算）
  const openRows = rows.filter((r) => !r.isClosed && !r.resolved);
  const historyRows = rows.filter((r) => r.isClosed || r.resolved);

  // 概览只统计当前持仓
  const totalStaked = openRows.reduce((s, r) => s + r.stake, 0);
  const totalValue = openRows.reduce((s, r) => s + r.value, 0);
  const totalPnl = totalValue - totalStaked;

  // 组合市值曲线（按当前持仓回看各盘口近一月真实概率）
  const positions: Position[] = openRows
    .filter((r) => r.clobTokenId)
    .map((r) => ({ shares: r.shares, clobTokenId: r.clobTokenId, entryPrice: r.entry_price }));
  const series = await buildPortfolioSeries(positions);

  return (
    <Shell t={t}>
      {/* 概览卡 */}
      <div className="rounded-2xl bg-white dark:bg-gray-900 ring-1 ring-black/8 dark:ring-white/10 shadow-sm p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs text-gray-400 dark:text-gray-500">{t("可用积分")}</div>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
              {profile.points.toLocaleString()}
            </div>
          </div>
          <AuthButton profile={profile} enabled={supabaseEnabled} />
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label={t("持仓本金")} value={Math.round(totalStaked).toLocaleString()} />
          <Stat label={t("当前市值")} value={Math.round(totalValue).toLocaleString()} />
          <Stat
            label={t("浮动盈亏")}
            value={`${totalPnl >= 0 ? "+" : ""}${Math.round(totalPnl).toLocaleString()}`}
            color={totalPnl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}
          />
        </div>

        {/* 组合市值曲线 */}
        {series.length >= 2 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-[11px] text-gray-400 dark:text-gray-500 mb-1">
              <span>{t("持仓市值走势（近一月）")}</span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 border-t border-dashed border-gray-400" />
                {t("成本线")}
              </span>
            </div>
            <PortfolioChart series={series} cost={totalStaked} />
          </div>
        )}
      </div>

      <div className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 px-1">
        {t("持仓")} · {openRows.length}
      </div>
      {openRows.length === 0 ? (
        <div className="text-center text-gray-400 dark:text-gray-500 py-10 text-sm">
          {t("暂无持仓 —— 回信息流挑条新闻表个态吧")}
        </div>
      ) : (
        <div className="space-y-2.5">
          {openRows.map((r) => (
            <PositionCard key={r.id} r={r} t={t} />
          ))}
        </div>
      )}

      {historyRows.length > 0 && (
        <>
          <div className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 mt-6 px-1">
            {t("历史")} · {historyRows.length}
          </div>
          <div className="space-y-2.5">
            {historyRows.map((r) => (
              <PositionCard key={r.id} r={r} t={t} />
            ))}
          </div>
        </>
      )}
    </Shell>
  );
}

interface PosRow {
  id: string;
  market_title: string | null;
  market_slug: string | null;
  outcome_label: string;
  stake: number;
  entry_price: number;
  curPrice: number;
  value: number;
  pnl: number;
  live: boolean;
  generated: boolean;
  resolved: boolean;
  isClosed: boolean;
  detailId: string | null;
}

function PositionCard({ r, t }: { r: PosRow; t: T }) {
  const up = r.pnl >= 0;
  const active = !r.isClosed && !r.resolved;
  const pricePct = `${Math.round(r.curPrice * 100)}%`;

  const inner = (
    <div className="flex items-start justify-between gap-3 p-3.5">
      <div className="min-w-0">
        <div className="text-[14px] font-medium text-gray-900 dark:text-gray-100 truncate">
          {r.generated && <span className="text-indigo-500 dark:text-indigo-400">🤖 </span>}
          {r.market_title ?? r.market_slug}
        </div>
        <div className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">
          {r.outcome_label} · {r.stake}{t("分")} @ {Math.round(r.entry_price * 100)}%
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className={`text-[15px] font-bold tabular-nums ${up ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
          {up ? "+" : ""}
          {Math.round(r.pnl)}
        </div>
        <div className="text-[11px] text-gray-400 dark:text-gray-500">
          {r.isClosed
            ? `${t("已平仓")} · ${pricePct}`
            : r.resolved
            ? t("已结算")
            : `${t("现")}${pricePct}${r.live ? "" : ` · ${t("待更新")}`}`}
        </div>
      </div>
    </div>
  );

  return (
    <div
      className={`rounded-xl bg-white dark:bg-gray-900 ring-1 ring-black/8 dark:ring-white/10 shadow-sm overflow-hidden ${
        r.isClosed ? "opacity-75" : ""
      }`}
    >
      {r.detailId ? (
        <Link href={`/news/${r.detailId}`} className="block hover:bg-gray-50/60 dark:hover:bg-white/5 transition">
          {inner}
        </Link>
      ) : (
        inner
      )}
      {active && (
        <div className="flex items-center justify-end px-3.5 pb-3 -mt-1">
          <ClosePositionButton betId={r.id} price={r.curPrice} proceeds={Math.round(r.value)} />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl bg-gray-50 dark:bg-white/5 py-2.5">
      <div className="text-[11px] text-gray-400 dark:text-gray-500">{label}</div>
      <div className={`text-[15px] font-semibold tabular-nums ${color ?? "text-gray-800 dark:text-gray-100"}`}>
        {value}
      </div>
    </div>
  );
}
