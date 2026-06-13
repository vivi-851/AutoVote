import Link from "next/link";
import { getMetrics, getRetention } from "@/lib/admin";
import { tierForLevel } from "@/lib/levels";

export const dynamic = "force-dynamic";

const SOURCE_LABEL: Record<string, string> = {
  signin: "签到",
  read: "阅读",
  quest: "每日任务",
  season: "赛季奖励",
  bet: "下注",
  sell: "平仓",
};

const RANGES = [7, 30, 90];

function pctStr(n: number | null) {
  return n == null ? "—" : `${n}%`;
}

// 漏斗一级
function FunnelStep({
  label,
  value,
  rate,
  rateLabel,
}: {
  label: string;
  value: number;
  rate?: number | null;
  rateLabel?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-28 text-[13px] text-gray-500 dark:text-gray-400 shrink-0">{label}</div>
      <div className="flex-1">
        <div className="text-2xl font-bold tabular-nums text-gray-900 dark:text-gray-100">
          {value.toLocaleString()}
        </div>
      </div>
      {rate !== undefined && (
        <div className="text-right shrink-0 w-24">
          <div className="text-[13px] font-semibold text-indigo-600 dark:text-indigo-400 tabular-nums">
            {pctStr(rate)}
          </div>
          <div className="text-[11px] text-gray-400">{rateLabel}</div>
        </div>
      )}
    </div>
  );
}

function RStat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-xl bg-gray-50 dark:bg-white/5 py-3">
      <div className="text-2xl font-bold tabular-nums text-gray-900 dark:text-gray-100">
        {value.toLocaleString()}
      </div>
      <div className="text-[12px] text-gray-500 dark:text-gray-400">{label}</div>
      {sub && <div className="text-[11px] text-gray-400">{sub}</div>}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-black/8 dark:border-white/10 bg-white dark:bg-gray-900 p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">{title}</h2>
      {children}
    </section>
  );
}

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days: daysParam } = await searchParams;
  const days = RANGES.includes(Number(daysParam)) ? Number(daysParam) : 7;
  const [m, r] = await Promise.all([getMetrics(days), getRetention(days)]);

  if (!m) {
    return (
      <div className="rounded-2xl border border-dashed border-black/10 dark:border-white/10 p-10 text-center text-sm text-gray-500">
        暂无数据。请确认已执行 <code className="px-1 bg-gray-100 dark:bg-white/10 rounded">supabase/events.sql</code> 与{" "}
        <code className="px-1 bg-gray-100 dark:bg-white/10 rounded">supabase/admin.sql</code>，
        并在前台产生一些浏览 / 下注行为后再回来。
      </div>
    );
  }

  const f = m.funnel;
  const maxDaily = Math.max(1, ...m.daily.map((d) => d.visitors));

  return (
    <div className="space-y-5">
      {/* 时间范围 */}
      <div className="flex items-center gap-2">
        <span className="text-[13px] text-gray-500 dark:text-gray-400">时间范围</span>
        {RANGES.map((r) => (
          <Link
            key={r}
            href={`/admin?days=${r}`}
            className={`px-3 py-1 rounded-full text-[13px] font-medium transition ${
              r === days
                ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 ring-1 ring-black/8 dark:ring-white/10"
            }`}
          >
            近 {r} 天
          </Link>
        ))}
      </div>

      {/* 漏斗 */}
      <Card title="转化漏斗（按访客去重）">
        <div className="space-y-4">
          <FunnelStep label="访客" value={f.visitors} />
          <FunnelStep label="看到信息流" value={f.saw_feed} />
          <FunnelStep label="点开详情" value={f.opened} rate={f.open_rate} rateLabel="点开率" />
          <FunnelStep label="下注" value={f.bet} rate={f.bet_rate} rateLabel="下注率" />
          <FunnelStep label="去真实市场" value={f.outbound} rate={f.outbound_rate} rateLabel="出站率" />
        </div>
      </Card>

      {/* ── 留存 / 参与 ───────────────────────────────── */}
      {r && (
        <>
          <Card title="留存动作（范围内）">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
              <RStat label="签到" value={r.signins} sub={`${r.signin_users} 人`} />
              <RStat label="阅读领取" value={r.reads} />
              <RStat label="任务完成" value={r.quests} />
              <RStat label="新注册" value={r.new_users} />
              <RStat
                label="活跃峰值 DAU"
                value={r.dau.length ? Math.max(...r.dau.map((d) => d.users)) : 0}
              />
            </div>
          </Card>

          <Card title="每日活跃用户 DAU">
            {r.dau.length === 0 ? (
              <p className="text-[13px] text-gray-400">暂无活跃</p>
            ) : (
              <div className="flex items-end gap-1.5 h-32">
                {(() => {
                  const max = Math.max(1, ...r.dau.map((d) => d.users));
                  return r.dau.map((d) => (
                    <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full rounded-t bg-emerald-400/80 dark:bg-emerald-500/70 hover:bg-emerald-500 transition"
                        style={{ height: `${(d.users / max) * 100}%` }}
                        title={`${d.day}: ${d.users}`}
                      />
                      <span className="text-[10px] text-gray-400 tabular-nums">{d.day.slice(5)}</span>
                    </div>
                  ));
                })()}
              </div>
            )}
          </Card>

          <div className="grid sm:grid-cols-2 gap-5">
            {/* 积分发放按来源 */}
            <Card title="积分发放 · 按来源">
              {r.points_by_source.length === 0 ? (
                <p className="text-[13px] text-gray-400">暂无发放</p>
              ) : (
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="text-gray-400 text-left">
                      <th className="font-medium pb-2">来源</th>
                      <th className="font-medium pb-2 text-right">发放积分</th>
                      <th className="font-medium pb-2 text-right">笔数</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-700 dark:text-gray-200">
                    {r.points_by_source.map((s) => (
                      <tr key={s.source} className="border-t border-black/5 dark:border-white/10">
                        <td className="py-2">{SOURCE_LABEL[s.source] ?? s.source}</td>
                        <td className="py-2 text-right tabular-nums font-semibold text-amber-600 dark:text-amber-400">
                          {s.amount >= 0 ? "+" : ""}
                          {s.amount.toLocaleString()}
                        </td>
                        <td className="py-2 text-right tabular-nums">{s.count.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>

            {/* 等级分布 */}
            <Card title="等级分布（全站快照）">
              {r.levels.length === 0 ? (
                <p className="text-[13px] text-gray-400">暂无用户</p>
              ) : (
                (() => {
                  const max = Math.max(1, ...r.levels.map((l) => l.users));
                  return (
                    <div className="space-y-1.5">
                      {r.levels.map((l) => (
                        <div key={l.level} className="flex items-center gap-2 text-[13px]">
                          <span className="w-14 shrink-0 text-gray-500 dark:text-gray-400">
                            {tierForLevel(l.level).badge} Lv.{l.level}
                          </span>
                          <div className="flex-1 bg-gray-100 dark:bg-white/10 rounded-full h-3 overflow-hidden">
                            <div
                              className="h-full bg-indigo-400 dark:bg-indigo-500"
                              style={{ width: `${(l.users / max) * 100}%` }}
                            />
                          </div>
                          <span className="w-10 text-right tabular-nums text-gray-700 dark:text-gray-200">
                            {l.users}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })()
              )}
            </Card>
          </div>

          {/* 当前赛季 */}
          {r.season && (
            <Card title="当前赛季">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-base font-bold text-gray-900 dark:text-gray-100 truncate">
                    {r.season.name}
                  </div>
                  {r.season.theme && (
                    <div className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">
                      🎯 {r.season.theme}
                    </div>
                  )}
                </div>
                <div className="flex gap-5 shrink-0 text-center">
                  <div>
                    <div className="text-2xl font-bold tabular-nums text-gray-900 dark:text-gray-100">
                      {r.season.participants}
                    </div>
                    <div className="text-[11px] text-gray-400">参与人数</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold tabular-nums text-green-600 dark:text-green-400">
                      {r.season.top_pnl >= 0 ? "+" : ""}
                      {r.season.top_pnl.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-gray-400">最高 PnL</div>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </>
      )}

      <div className="grid sm:grid-cols-2 gap-5">
        {/* 分盘口类型 CTR */}
        <Card title="曝光→点开 CTR · 真实盘口 vs AI 盘口">
          {m.by_kind.length === 0 ? (
            <p className="text-[13px] text-gray-400">暂无曝光数据</p>
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-gray-400 text-left">
                  <th className="font-medium pb-2">类型</th>
                  <th className="font-medium pb-2 text-right">曝光</th>
                  <th className="font-medium pb-2 text-right">点开</th>
                  <th className="font-medium pb-2 text-right">CTR</th>
                </tr>
              </thead>
              <tbody className="text-gray-700 dark:text-gray-200">
                {m.by_kind.map((k) => (
                  <tr key={k.market_kind} className="border-t border-black/5 dark:border-white/10">
                    <td className="py-2">{k.market_kind}</td>
                    <td className="py-2 text-right tabular-nums">{k.impressions}</td>
                    <td className="py-2 text-right tabular-nums">{k.opens}</td>
                    <td className="py-2 text-right tabular-nums font-semibold text-indigo-600 dark:text-indigo-400">
                      {pctStr(k.ctr)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        {/* 事件计数 */}
        <Card title="事件计数">
          {m.events.length === 0 ? (
            <p className="text-[13px] text-gray-400">暂无事件</p>
          ) : (
            <ul className="space-y-1.5 text-[13px]">
              {m.events.map((e) => (
                <li key={e.event_type} className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300 font-mono">{e.event_type}</span>
                  <span className="tabular-nums text-gray-900 dark:text-gray-100 font-semibold">
                    {e.count.toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* 每日访客趋势 */}
      <Card title="每日访客">
        {m.daily.length === 0 ? (
          <p className="text-[13px] text-gray-400">暂无数据</p>
        ) : (
          <div className="flex items-end gap-1.5 h-32">
            {m.daily.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1 group">
                <div
                  className="w-full rounded-t bg-indigo-400/80 dark:bg-indigo-500/70 hover:bg-indigo-500 transition"
                  style={{ height: `${(d.visitors / maxDaily) * 100}%` }}
                  title={`${d.day}: ${d.visitors}`}
                />
                <span className="text-[10px] text-gray-400 tabular-nums">
                  {d.day.slice(5)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 热门盘口 */}
      <Card title="下注最多的盘口 Top 10">
        {m.top_markets.length === 0 ? (
          <p className="text-[13px] text-gray-400">还没有下注</p>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-gray-400 text-left">
                <th className="font-medium pb-2">盘口</th>
                <th className="font-medium pb-2">类型</th>
                <th className="font-medium pb-2 text-right">点开</th>
                <th className="font-medium pb-2 text-right">下注</th>
              </tr>
            </thead>
            <tbody className="text-gray-700 dark:text-gray-200">
              {m.top_markets.map((tm) => (
                <tr key={tm.market_id} className="border-t border-black/5 dark:border-white/10">
                  <td className="py-2">
                    <Link href={`/news/${tm.market_id}`} className="text-indigo-600 dark:text-indigo-400 hover:underline truncate inline-block max-w-[260px] align-bottom">
                      {tm.market_id}
                    </Link>
                  </td>
                  <td className="py-2 text-gray-500">{tm.market_kind ?? "—"}</td>
                  <td className="py-2 text-right tabular-nums">{tm.opens}</td>
                  <td className="py-2 text-right tabular-nums font-semibold">{tm.bets}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
