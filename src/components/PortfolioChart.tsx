import type { SeriesPoint } from "@/lib/portfolio";

// 轻量 SVG 组合市值曲线（含成本基线）
export default function PortfolioChart({
  series,
  cost,
}: {
  series: SeriesPoint[];
  cost: number;
}) {
  if (series.length < 2) return null;

  const W = 320;
  const H = 110;
  const padY = 10;

  const values = series.map((s) => s.value);
  const lo = Math.min(...values, cost);
  const hi = Math.max(...values, cost);
  const span = hi - lo || 1;

  const x = (i: number) => (i / (series.length - 1)) * W;
  const y = (v: number) => padY + (1 - (v - lo) / span) * (H - 2 * padY);

  const line = series.map((s, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(s.value).toFixed(1)}`).join(" ");
  const area = `${line} L${W},${H} L0,${H} Z`;

  const last = series[series.length - 1].value;
  const up = last >= cost;
  const stroke = up ? "#16a34a" : "#ef4444";
  const fill = up ? "#16a34a" : "#ef4444";
  const baseY = y(cost);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-28" preserveAspectRatio="none">
      <defs>
        <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill} stopOpacity="0.22" />
          <stop offset="100%" stopColor={fill} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* 成本基线 */}
      <line
        x1="0"
        y1={baseY}
        x2={W}
        y2={baseY}
        stroke="#9ca3af"
        strokeWidth="1"
        strokeDasharray="4 4"
        opacity="0.6"
      />
      <path d={area} fill="url(#pg)" />
      <path d={line} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
