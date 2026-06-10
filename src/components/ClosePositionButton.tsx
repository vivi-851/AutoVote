"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// 平仓按钮：按当前价卖出持仓、兑现盈亏。二次点击确认。
export default function ClosePositionButton({
  betId,
  price,
  proceeds,
}: {
  betId: string;
  price: number; // 当前价（Polymarket 盘口用；生成盘口后端会用池子价）
  proceeds: number; // 预计到账积分（估算）
}) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function close() {
    const supabase = createClient();
    if (!supabase) return;
    setBusy(true);
    setErr(null);
    const { error } = await supabase.rpc("sell_bet", {
      p_bet_id: betId,
      p_price: price,
      p_fraction: 1,
    });
    setBusy(false);
    if (error) {
      setErr("平仓失败");
      return;
    }
    router.refresh();
  }

  if (err) return <span className="text-[12px] text-red-500">{err}</span>;

  return armed ? (
    <span className="inline-flex items-center gap-2">
      <button
        onClick={close}
        disabled={busy}
        className="rounded-lg bg-gray-900 text-white text-[12px] font-medium px-3 py-1 hover:bg-gray-700 disabled:opacity-60"
      >
        {busy ? "平仓中…" : `确认平仓 ~${proceeds} 分`}
      </button>
      <button onClick={() => setArmed(false)} className="text-[12px] text-gray-400">
        取消
      </button>
    </span>
  ) : (
    <button
      onClick={() => setArmed(true)}
      className="rounded-lg ring-1 ring-black/15 text-[12px] font-medium px-3 py-1 text-gray-700 hover:bg-gray-50"
    >
      平仓
    </button>
  );
}
