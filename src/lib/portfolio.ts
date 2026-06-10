import { getPriceHistory, type PricePoint } from "./polymarket";

export interface Position {
  shares: number;
  clobTokenId: string;
  entryPrice: number;
}

export interface SeriesPoint {
  t: number; // unix 秒
  value: number; // 该时刻的持仓市值（积分）
}

// last point with time <= t（步进取值，前向填充）
function priceAt(h: PricePoint[], t: number): number {
  if (t <= h[0].t) return h[0].p;
  if (t >= h[h.length - 1].t) return h[h.length - 1].p;
  let lo = 0,
    hi = h.length - 1,
    ans = h[0].p;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (h[mid].t <= t) {
      ans = h[mid].p;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return ans;
}

// 用各持仓 token 的真实历史概率，按当前份额重建「组合市值」走势
export async function buildPortfolioSeries(
  positions: Position[],
  points = 120,
): Promise<SeriesPoint[]> {
  if (positions.length === 0) return [];

  const histories = await Promise.all(
    positions.map((p) => getPriceHistory(p.clobTokenId)),
  );
  const nonEmpty = histories.filter((h) => h.length > 0);
  if (nonEmpty.length === 0) return [];

  // 取所有历史的重叠窗口，保证每个持仓在窗口内都有数据
  const tStart = Math.max(...nonEmpty.map((h) => h[0].t));
  const tEnd = Math.max(...nonEmpty.map((h) => h[h.length - 1].t));
  if (!(tEnd > tStart)) return [];

  const series: SeriesPoint[] = [];
  for (let i = 0; i < points; i++) {
    const t = Math.round(tStart + ((tEnd - tStart) * i) / (points - 1));
    let value = 0;
    for (let k = 0; k < positions.length; k++) {
      const h = histories[k];
      const price = h.length ? priceAt(h, t) : positions[k].entryPrice;
      value += positions[k].shares * price;
    }
    series.push({ t, value });
  }
  return series;
}
